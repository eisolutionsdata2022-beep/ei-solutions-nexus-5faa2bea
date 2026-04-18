import { collection, doc, setDoc, onSnapshot, addDoc, getDocs, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// NOTE: Phase 1 uses a P2P mesh — each retailer opens a peer connection to every
// active trainer (host). For 3-4 trainers + ~15-20 students this is sustainable.
// To scale to 100+ participants migrate this signaling layer to a mediasoup SFU
// (a dedicated Node VPS) — keep the Firestore room/host docs and replace the
// per-peer offer/answer/ICE collections with SFU transport messages.

export type ParticipantRole = "trainer" | "retailer";
export type LiveMode = "camera" | "avatar";

export interface RoomParticipant {
  id: string;
  name: string;
  role: ParticipantRole;
  hasVideo: boolean;
  hasAudio: boolean;
  joinedAt?: string;
}

export interface LiveHost {
  id: string;
  name: string;
  mode: LiveMode;
  avatarType?: "2d" | "rpm";
  avatarId?: string;
  micOn: boolean;
  cameraOn: boolean;
  startedAt: string;
}

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

// ============= ROOM =============

export async function ensureRoom(trainingId: string, creatorId: string, creatorName: string): Promise<void> {
  const roomRef = doc(db, "rooms", trainingId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) {
    await setDoc(roomRef, {
      createdBy: creatorId,
      createdByName: creatorName,
      createdAt: new Date().toISOString(),
      active: true,
    });
  } else if (snap.data()?.active === false) {
    await updateDoc(roomRef, { active: true });
  }
}

export async function closeRoomIfEmpty(trainingId: string): Promise<void> {
  const hostsSnap = await getDocs(collection(db, "rooms", trainingId, "hosts"));
  if (hostsSnap.empty) {
    await updateDoc(doc(db, "rooms", trainingId), { active: false });
  }
}

export async function isRoomActive(trainingId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "rooms", trainingId));
  return snap.exists() && snap.data()?.active === true;
}

// ============= HOSTS (multiple trainers live) =============

export async function goLive(
  trainingId: string,
  hostId: string,
  hostName: string,
  mode: LiveMode,
  avatar?: { type: "2d" | "rpm"; id: string }
): Promise<void> {
  await setDoc(doc(db, "rooms", trainingId, "hosts", hostId), {
    name: hostName,
    mode,
    avatarType: avatar?.type ?? null,
    avatarId: avatar?.id ?? null,
    micOn: true,
    cameraOn: mode === "camera",
    startedAt: new Date().toISOString(),
  });
}

export async function updateHost(
  trainingId: string,
  hostId: string,
  patch: Partial<Pick<LiveHost, "mode" | "avatarType" | "avatarId" | "micOn" | "cameraOn">>
): Promise<void> {
  await updateDoc(doc(db, "rooms", trainingId, "hosts", hostId), patch as any);
}

export async function endLive(trainingId: string, hostId: string): Promise<void> {
  await deleteDoc(doc(db, "rooms", trainingId, "hosts", hostId));
  // cleanup signaling docs for this host
  const subs = ["offers", "answers", "callerICE", "calleeICE"];
  for (const sub of subs) {
    const snap = await getDocs(collection(db, "rooms", trainingId, "hosts", hostId, sub));
    for (const d of snap.docs) await deleteDoc(d.ref);
  }
}

export function onHosts(trainingId: string, cb: (hosts: LiveHost[]) => void): () => void {
  return onSnapshot(collection(db, "rooms", trainingId, "hosts"), (snap) => {
    const list: LiveHost[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as LiveHost));
    list.sort((a, b) => (a.startedAt || "").localeCompare(b.startedAt || ""));
    cb(list);
  });
}

// ============= PARTICIPANTS =============

export async function addParticipant(
  trainingId: string,
  userId: string,
  name: string,
  role: ParticipantRole
): Promise<void> {
  await setDoc(doc(db, "rooms", trainingId, "participants", userId), {
    name,
    role,
    hasVideo: false,
    hasAudio: false,
    joinedAt: new Date().toISOString(),
  });
}

export async function removeParticipant(trainingId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, "rooms", trainingId, "participants", userId));
}

export function onParticipants(trainingId: string, cb: (parts: RoomParticipant[]) => void): () => void {
  return onSnapshot(collection(db, "rooms", trainingId, "participants"), (snap) => {
    const list: RoomParticipant[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as RoomParticipant));
    cb(list);
  });
}

// ============= SIGNALING (per-host + per-viewer pair) =============
// Path: rooms/{trainingId}/hosts/{hostId}/{offers|answers|callerICE|calleeICE}/{viewerId}

export async function viewerSendOffer(
  trainingId: string,
  hostId: string,
  viewerId: string,
  offer: RTCSessionDescriptionInit
): Promise<void> {
  await setDoc(doc(db, "rooms", trainingId, "hosts", hostId, "offers", viewerId), {
    type: offer.type,
    sdp: offer.sdp,
    at: new Date().toISOString(),
  });
}

export async function hostSendAnswer(
  trainingId: string,
  hostId: string,
  viewerId: string,
  answer: RTCSessionDescriptionInit
): Promise<void> {
  await setDoc(doc(db, "rooms", trainingId, "hosts", hostId, "answers", viewerId), {
    type: answer.type,
    sdp: answer.sdp,
    at: new Date().toISOString(),
  });
}

export function hostListenForOffers(
  trainingId: string,
  hostId: string,
  cb: (viewerId: string, offer: RTCSessionDescriptionInit) => void
): () => void {
  return onSnapshot(collection(db, "rooms", trainingId, "hosts", hostId, "offers"), (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added") {
        cb(change.doc.id, change.doc.data() as RTCSessionDescriptionInit);
      }
    });
  });
}

export function viewerListenForAnswer(
  trainingId: string,
  hostId: string,
  viewerId: string,
  cb: (answer: RTCSessionDescriptionInit) => void
): () => void {
  return onSnapshot(doc(db, "rooms", trainingId, "hosts", hostId, "answers", viewerId), (snap) => {
    if (snap.exists()) cb(snap.data() as RTCSessionDescriptionInit);
  });
}

// ICE — caller = viewer (sends offer), callee = host
export async function addIceCandidate(
  trainingId: string,
  hostId: string,
  viewerId: string,
  side: "caller" | "callee",
  candidate: RTCIceCandidateInit
): Promise<void> {
  const sub = side === "caller" ? "callerICE" : "calleeICE";
  await addDoc(collection(db, "rooms", trainingId, "hosts", hostId, sub, viewerId, "items"), {
    ...candidate,
  });
}

export function onIceCandidates(
  trainingId: string,
  hostId: string,
  viewerId: string,
  side: "caller" | "callee",
  cb: (candidate: RTCIceCandidateInit) => void
): () => void {
  const sub = side === "caller" ? "callerICE" : "calleeICE";
  return onSnapshot(collection(db, "rooms", trainingId, "hosts", hostId, sub, viewerId, "items"), (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added") cb(change.doc.data() as RTCIceCandidateInit);
    });
  });
}

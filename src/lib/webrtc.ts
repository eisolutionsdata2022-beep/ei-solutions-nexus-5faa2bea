import { collection, doc, setDoc, onSnapshot, addDoc, getDocs, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export interface RoomParticipant {
  id: string;
  name: string;
  role: "trainer" | "retailer";
  hasVideo: boolean;
  hasAudio: boolean;
}

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

// Trainer creates a room
export async function createRoom(trainingId: string, trainerId: string, trainerName: string): Promise<string> {
  const roomRef = doc(db, "rooms", trainingId);
  await setDoc(roomRef, {
    hostId: trainerId,
    hostName: trainerName,
    createdAt: new Date().toISOString(),
    active: true,
  });
  return trainingId;
}

// Close a room
export async function closeRoom(trainingId: string) {
  const roomRef = doc(db, "rooms", trainingId);
  await updateDoc(roomRef, { active: false });
  // Clean up subcollections
  const callerCandidates = await getDocs(collection(db, "rooms", trainingId, "callerCandidates"));
  for (const d of callerCandidates.docs) await deleteDoc(d.ref);
  const calleeCandidates = await getDocs(collection(db, "rooms", trainingId, "calleeCandidates"));
  for (const d of calleeCandidates.docs) await deleteDoc(d.ref);
  const participants = await getDocs(collection(db, "rooms", trainingId, "participants"));
  for (const d of participants.docs) await deleteDoc(d.ref);
}

// Check if room is active
export async function isRoomActive(trainingId: string): Promise<boolean> {
  const roomRef = doc(db, "rooms", trainingId);
  const snap = await getDoc(roomRef);
  return snap.exists() && snap.data()?.active === true;
}

// Add participant
export async function addParticipant(trainingId: string, userId: string, name: string, role: "trainer" | "retailer") {
  await setDoc(doc(db, "rooms", trainingId, "participants", userId), {
    name,
    role,
    hasVideo: role === "trainer",
    hasAudio: role === "trainer",
    joinedAt: new Date().toISOString(),
  });
}

// Remove participant
export async function removeParticipant(trainingId: string, userId: string) {
  await deleteDoc(doc(db, "rooms", trainingId, "participants", userId));
}

// Listen to participants
export function onParticipants(trainingId: string, cb: (participants: RoomParticipant[]) => void) {
  return onSnapshot(collection(db, "rooms", trainingId, "participants"), (snap) => {
    const list: RoomParticipant[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as RoomParticipant));
    cb(list);
  });
}

// Signaling: store offer
export async function storeOffer(trainingId: string, peerId: string, offer: RTCSessionDescriptionInit) {
  await setDoc(doc(db, "rooms", trainingId, "offers", peerId), {
    type: offer.type,
    sdp: offer.sdp,
  });
}

// Signaling: store answer
export async function storeAnswer(trainingId: string, peerId: string, answer: RTCSessionDescriptionInit) {
  await setDoc(doc(db, "rooms", trainingId, "answers", peerId), {
    type: answer.type,
    sdp: answer.sdp,
  });
}

// Signaling: listen for answer
export function onAnswer(trainingId: string, peerId: string, cb: (answer: RTCSessionDescriptionInit) => void) {
  return onSnapshot(doc(db, "rooms", trainingId, "answers", peerId), (snap) => {
    if (snap.exists()) {
      cb(snap.data() as RTCSessionDescriptionInit);
    }
  });
}

// Signaling: listen for offer
export function onOffer(trainingId: string, peerId: string, cb: (offer: RTCSessionDescriptionInit) => void) {
  return onSnapshot(doc(db, "rooms", trainingId, "offers", peerId), (snap) => {
    if (snap.exists()) {
      cb(snap.data() as RTCSessionDescriptionInit);
    }
  });
}

// ICE candidates
export async function addIceCandidate(trainingId: string, peerId: string, direction: "caller" | "callee", candidate: RTCIceCandidateInit) {
  await addDoc(collection(db, "rooms", trainingId, `${direction}Candidates_${peerId}`), {
    ...candidate,
  });
}

export function onIceCandidates(trainingId: string, peerId: string, direction: "caller" | "callee", cb: (candidate: RTCIceCandidateInit) => void) {
  return onSnapshot(collection(db, "rooms", trainingId, `${direction}Candidates_${peerId}`), (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added") {
        cb(change.doc.data() as RTCIceCandidateInit);
      }
    });
  });
}

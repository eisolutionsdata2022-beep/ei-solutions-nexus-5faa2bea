/**
 * Private back-channel signaling: an approved student streams ONLY to trainers.
 * Path: rooms/{trainingId}/backchannels/{studentId}/{offers|answers|callerICE|calleeICE}/{trainerId}
 *
 * Mirrors webrtc.ts host model but isolated so other students never see/hear
 * approved students.
 *
 * The student is the host (one peer connection per trainer subscriber).
 * Trainer is the viewer (sends offer).
 */
import { collection, doc, setDoc, addDoc, getDocs, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface BackChannel {
  id: string;          // studentId
  studentName: string;
  hasMic: boolean;
  hasCam: boolean;
  hasScreen: boolean;
  startedAt: string;
}

const path = (trainingId: string, studentId: string) =>
  doc(db, "rooms", trainingId, "backchannels", studentId);

export async function announceBackChannel(
  trainingId: string,
  studentId: string,
  studentName: string,
  flags: { hasMic: boolean; hasCam: boolean; hasScreen: boolean }
): Promise<void> {
  await setDoc(path(trainingId, studentId), {
    studentName,
    ...flags,
    startedAt: new Date().toISOString(),
  });
}

export async function updateBackChannel(
  trainingId: string,
  studentId: string,
  patch: Partial<{ hasMic: boolean; hasCam: boolean; hasScreen: boolean }>
): Promise<void> {
  await setDoc(path(trainingId, studentId), patch, { merge: true });
}

export async function closeBackChannel(trainingId: string, studentId: string): Promise<void> {
  await deleteDoc(path(trainingId, studentId)).catch(() => {});
  for (const sub of ["offers", "answers", "callerICE", "calleeICE"] as const) {
    const snap = await getDocs(collection(db, "rooms", trainingId, "backchannels", studentId, sub)).catch(() => null);
    if (snap) {
      for (const d of snap.docs) await deleteDoc(d.ref).catch(() => {});
    }
  }
}

export function onBackChannels(
  trainingId: string,
  cb: (list: BackChannel[]) => void
): () => void {
  return onSnapshot(collection(db, "rooms", trainingId, "backchannels"), (snap) => {
    const list: BackChannel[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<BackChannel, "id">) }));
    list.sort((a, b) => (a.startedAt || "").localeCompare(b.startedAt || ""));
    cb(list);
  });
}

// ------------------ Signaling: trainer = viewer (sends offer), student = host ------------------

export async function trainerSendOffer(
  trainingId: string,
  studentId: string,
  trainerId: string,
  offer: RTCSessionDescriptionInit
): Promise<void> {
  await setDoc(doc(db, "rooms", trainingId, "backchannels", studentId, "offers", trainerId), {
    type: offer.type,
    sdp: offer.sdp,
    at: new Date().toISOString(),
  });
}

export async function studentSendAnswer(
  trainingId: string,
  studentId: string,
  trainerId: string,
  answer: RTCSessionDescriptionInit
): Promise<void> {
  await setDoc(doc(db, "rooms", trainingId, "backchannels", studentId, "answers", trainerId), {
    type: answer.type,
    sdp: answer.sdp,
    at: new Date().toISOString(),
  });
}

export function studentListenForOffers(
  trainingId: string,
  studentId: string,
  cb: (trainerId: string, offer: RTCSessionDescriptionInit) => void
): () => void {
  return onSnapshot(collection(db, "rooms", trainingId, "backchannels", studentId, "offers"), (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added" || change.type === "modified") {
        cb(change.doc.id, change.doc.data() as RTCSessionDescriptionInit);
      }
    });
  });
}

export function trainerListenForAnswer(
  trainingId: string,
  studentId: string,
  trainerId: string,
  cb: (answer: RTCSessionDescriptionInit) => void
): () => void {
  return onSnapshot(doc(db, "rooms", trainingId, "backchannels", studentId, "answers", trainerId), (snap) => {
    if (snap.exists()) cb(snap.data() as RTCSessionDescriptionInit);
  });
}

export async function bcAddIce(
  trainingId: string,
  studentId: string,
  trainerId: string,
  side: "caller" | "callee", // caller = trainer (offers), callee = student (answers)
  candidate: RTCIceCandidateInit
): Promise<void> {
  const sub = side === "caller" ? "callerICE" : "calleeICE";
  await addDoc(collection(db, "rooms", trainingId, "backchannels", studentId, sub, trainerId, "items"), {
    ...candidate,
  });
}

export function onBcIce(
  trainingId: string,
  studentId: string,
  trainerId: string,
  side: "caller" | "callee",
  cb: (c: RTCIceCandidateInit) => void
): () => void {
  const sub = side === "caller" ? "callerICE" : "calleeICE";
  return onSnapshot(collection(db, "rooms", trainingId, "backchannels", studentId, sub, trainerId, "items"), (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added") cb(change.doc.data() as RTCIceCandidateInit);
    });
  });
}

export async function clearTrainerSignaling(
  trainingId: string,
  studentId: string,
  trainerId: string
): Promise<void> {
  const tasks: Promise<unknown>[] = [
    deleteDoc(doc(db, "rooms", trainingId, "backchannels", studentId, "offers", trainerId)).catch(() => {}),
    deleteDoc(doc(db, "rooms", trainingId, "backchannels", studentId, "answers", trainerId)).catch(() => {}),
  ];
  for (const sub of ["callerICE", "calleeICE"] as const) {
    const items = await getDocs(collection(db, "rooms", trainingId, "backchannels", studentId, sub, trainerId, "items")).catch(() => null);
    if (items) items.forEach((d) => tasks.push(deleteDoc(d.ref).catch(() => {})));
  }
  await Promise.all(tasks);
}

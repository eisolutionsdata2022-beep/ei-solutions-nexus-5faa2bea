/**
 * Per-permission request system for live classroom.
 * Students request mic/camera/screen-share access; trainers approve, reject,
 * or revoke. Approved students stream a "back-channel" visible only to trainers.
 *
 * Firestore: rooms/{trainingId}/permissions/{requestId}
 *  - requestId convention: `${studentId}_${type}` (one active request per type per student)
 */
import { collection, doc, setDoc, deleteDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type PermissionType = "mic" | "cam" | "screen";
export type PermissionStatus = "pending" | "approved" | "rejected" | "revoked";

export interface PermissionRequest {
  id: string;
  studentId: string;
  studentName: string;
  type: PermissionType;
  status: PermissionStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

const reqId = (studentId: string, type: PermissionType) => `${studentId}_${type}`;

export async function requestPermission(
  trainingId: string,
  studentId: string,
  studentName: string,
  type: PermissionType
): Promise<void> {
  await setDoc(doc(db, "rooms", trainingId, "permissions", reqId(studentId, type)), {
    studentId,
    studentName,
    type,
    status: "pending" as PermissionStatus,
    requestedAt: new Date().toISOString(),
  });
}

export async function decidePermission(
  trainingId: string,
  studentId: string,
  type: PermissionType,
  status: "approved" | "rejected" | "revoked",
  decidedBy: string
): Promise<void> {
  await updateDoc(doc(db, "rooms", trainingId, "permissions", reqId(studentId, type)), {
    status,
    decidedAt: new Date().toISOString(),
    decidedBy,
  });
}

export async function withdrawPermission(
  trainingId: string,
  studentId: string,
  type: PermissionType
): Promise<void> {
  await deleteDoc(doc(db, "rooms", trainingId, "permissions", reqId(studentId, type))).catch(() => {});
}

export function onPermissions(
  trainingId: string,
  cb: (list: PermissionRequest[]) => void
): () => void {
  return onSnapshot(collection(db, "rooms", trainingId, "permissions"), (snap) => {
    const list: PermissionRequest[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<PermissionRequest, "id">) }));
    list.sort((a, b) => (a.requestedAt || "").localeCompare(b.requestedAt || ""));
    cb(list);
  });
}

/**
 * Convenience: filter for one student's current state per type.
 */
export function permissionMap(list: PermissionRequest[], studentId: string): Record<PermissionType, PermissionRequest | null> {
  const out: Record<PermissionType, PermissionRequest | null> = { mic: null, cam: null, screen: null };
  for (const p of list) {
    if (p.studentId === studentId) out[p.type] = p;
  }
  return out;
}

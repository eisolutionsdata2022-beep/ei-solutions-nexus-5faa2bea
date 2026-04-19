/**
 * Certificate reissue requests (admin-approved).
 * Stored at certificateReissues/{autoId}.
 */
import { addDoc, collection, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";

export type ReissueType = "franchise" | "vle";
export type ReissueStatus = "pending" | "approved" | "rejected";

export interface CertificateReissueRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: ReissueType;
  reason: string;
  status: ReissueStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export async function requestReissue(opts: {
  userId: string;
  userName: string;
  userEmail: string;
  type: ReissueType;
  reason: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, "certificateReissues"), {
    ...opts,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export function subscribeMyReissues(uid: string, cb: (list: CertificateReissueRequest[]) => void) {
  const q = query(collection(db, "certificateReissues"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    const out: CertificateReissueRequest[] = [];
    snap.forEach((d) => out.push({ id: d.id, ...d.data() } as CertificateReissueRequest));
    out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    cb(out);
  });
}

export async function listAllReissues(): Promise<CertificateReissueRequest[]> {
  const snap = await getDocs(query(collection(db, "certificateReissues"), orderBy("createdAt", "desc")));
  const out: CertificateReissueRequest[] = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() } as CertificateReissueRequest));
  return out;
}

export async function reviewReissue(id: string, status: "approved" | "rejected", reviewedBy: string, note?: string) {
  await updateDoc(doc(db, "certificateReissues", id), {
    status,
    reviewedBy,
    reviewedAt: new Date().toISOString(),
    reviewNote: note || "",
  });
}

/**
 * IPPB Work Badge
 * ---------------
 * Separate from the marketplace Work Badge. Only retailers who hold an
 * approved IPPB badge can create IPPB account-opening requests.
 *
 * Storage:
 *   - applications: collection "ippbBadgeApplications"
 *   - flag on user:  users/{uid}.ippbBadge = true | false
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export interface IPPBBadgeApplicationDoc {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  /** Why retailer wants to do IPPB (training/experience) */
  reason: string;
  /** Did they watch the IPPB workflow video / read /help/ippb? */
  acknowledgedHelp: boolean;
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export async function applyForIPPBBadge(
  app: Omit<IPPBBadgeApplicationDoc, "id" | "status" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "ippbBadgeApplications"), {
    ...app,
    status: "pending",
    createdAt: new Date().toISOString(),
    _ts: serverTimestamp(),
  });
  return ref.id;
}

export async function reviewIPPBBadge(
  applicationId: string,
  userId: string,
  approve: boolean,
  reviewerId: string,
  note?: string
): Promise<void> {
  await updateDoc(doc(db, "ippbBadgeApplications", applicationId), {
    status: approve ? "approved" : "rejected",
    reviewNote: note || "",
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewerId,
  });
  await setDoc(
    doc(db, "users", userId),
    approve
      ? { ippbBadge: true, ippbBadgeAt: new Date().toISOString() }
      : { ippbBadge: false },
    { merge: true }
  );
}

export async function hasIPPBBadge(userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", userId));
  return !!(snap.exists() && (snap.data() as any).ippbBadge);
}

export async function revokeIPPBBadge(userId: string): Promise<void> {
  await setDoc(
    doc(db, "users", userId),
    { ippbBadge: false, ippbBadgeRevokedAt: new Date().toISOString() },
    { merge: true }
  );
}

/**
 * IPPB Badge system — only retailers with an admin-approved IPPB Badge
 * can create IPPB account-opening requests AND can receive biometric
 * capture requests from staff tablets / IPPB apps.
 *
 * Mirrors the Work Badge pattern (src/lib/job-marketplace.ts).
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type IPPBBadgeStatus = "pending" | "approved" | "rejected";

export interface IPPBBadgeApplicationDoc {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  /** Branch / city / district where retailer plans to operate */
  branchLocation: string;
  /** Whether they have a real RD-Service device (MFS110 / Mantra etc.) */
  hasDevice: boolean;
  deviceModel?: string;
  /** Aadhaar / PAN already KYC'd? Note about IPPB experience */
  experience: string;
  /** Optional: link to certificate / authorization letter */
  authorizationDoc?: string;
  status: IPPBBadgeStatus;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

export async function applyForIPPBBadge(
  app: Omit<IPPBBadgeApplicationDoc, "id" | "status" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, "ippbBadgeApplications"), {
    ...app,
    status: "pending" as IPPBBadgeStatus,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

export async function reviewIPPBBadge(
  applicationId: string,
  userId: string,
  approve: boolean,
  note?: string
): Promise<void> {
  await updateDoc(doc(db, "ippbBadgeApplications", applicationId), {
    status: approve ? "approved" : "rejected",
    reviewNote: note || "",
    reviewedAt: new Date().toISOString(),
  });
  if (approve) {
    await setDoc(
      doc(db, "users", userId),
      { ippbBadge: true, ippbBadgeAt: new Date().toISOString() },
      { merge: true }
    );
  } else {
    await setDoc(doc(db, "users", userId), { ippbBadge: false }, { merge: true });
  }
}

/** Server-side check: throws if a retailer does not hold an approved badge. */
export async function assertIPPBBadge(retailerId: string): Promise<void> {
  const snap = await getDoc(doc(db, "users", retailerId));
  if (!snap.exists()) throw new Error("Retailer not found");
  const data = snap.data() as { ippbBadge?: boolean; role?: string };
  if (!data.ippbBadge) {
    throw new Error(
      "IPPB Badge required. Apply at /retailer/ippb-badge and wait for admin approval."
    );
  }
}

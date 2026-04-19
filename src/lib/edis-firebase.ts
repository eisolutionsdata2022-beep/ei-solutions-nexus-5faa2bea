/**
 * E-dis (E-District) v2 — Firestore helpers.
 * Collection: edisApplications
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { atomicCredit } from "./firebase-transactions";
import type { EdisApplication, EdisStatus } from "./edis-types";

const COL = "edisApplications";

export async function createEdisApplication(app: Omit<EdisApplication, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COL), app);
  return ref.id;
}

export function listenRetailerApplications(retailerId: string, cb: (list: EdisApplication[]) => void): Unsubscribe {
  const q = query(collection(db, COL), where("retailerId", "==", retailerId));
  return onSnapshot(q, (snap) => {
    const list: EdisApplication[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<EdisApplication, "id">) }));
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    cb(list);
  });
}

export function listenAllApplications(cb: (list: EdisApplication[]) => void): Unsubscribe {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list: EdisApplication[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<EdisApplication, "id">) }));
    cb(list);
  });
}

export async function approveEdisApplication(id: string, opts: { reviewedBy: string; staffRemark: string; govReceiptNo: string }): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    status: "approved",
    staffRemark: opts.staffRemark,
    govReceiptNo: opts.govReceiptNo,
    reviewedBy: opts.reviewedBy,
    reviewedAt: new Date().toISOString(),
  });
}

export async function completeEdisApplication(id: string, opts: { reviewedBy: string; staffRemark: string; govReceiptNo: string }): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    status: "completed",
    staffRemark: opts.staffRemark,
    govReceiptNo: opts.govReceiptNo,
    reviewedBy: opts.reviewedBy,
    reviewedAt: new Date().toISOString(),
  });
}

export async function rejectEdisApplicationAndRefund(id: string, opts: { reviewedBy: string; rejectionReason: string }): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Application not found");
  const app = snap.data() as EdisApplication;
  if (app.status === "rejected") return;

  if (app.walletDebited && app.fee > 0) {
    await atomicCredit(app.retailerId, app.fee, {
      source: "edis_refund",
      description: `E-dis refund · ${app.serviceName} · ${app.applicationNo}`,
      applicationId: id,
    });
  }
  await updateDoc(ref, {
    status: "rejected",
    rejectionReason: opts.rejectionReason,
    reviewedBy: opts.reviewedBy,
    reviewedAt: new Date().toISOString(),
    refundedAt: new Date().toISOString(),
  });
}

export async function setPendingEdisApplication(id: string, staffRemark: string): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    status: "pending",
    staffRemark,
    rejectionReason: "",
    reviewedAt: new Date().toISOString(),
  });
}

export async function updateEdisRemark(id: string, remark: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { staffRemark: remark });
}

export async function deleteEdisApplication(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export type { EdisApplication, EdisStatus };

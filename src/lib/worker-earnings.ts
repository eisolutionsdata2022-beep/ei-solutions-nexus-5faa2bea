import {
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { atomicCredit } from "./firebase-transactions";

export interface WorkerEarningsDoc {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  updatedAt: string;
}

export interface EarningsLedgerEntry {
  id: string;
  userId: string;
  type: "credit" | "debit";
  amount: number;
  source: "job-payout" | "transfer-to-wallet" | "adjustment";
  jobId?: string;
  jobTitle?: string;
  description: string;
  createdAt: string;
}

export interface EarningsTransferRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  remarks?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

/* ---------- balance ops ---------- */

export async function getWorkerEarnings(userId: string): Promise<WorkerEarningsDoc> {
  const ref = doc(db, "workerEarnings", userId);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as WorkerEarningsDoc;
  return { userId, balance: 0, lifetimeEarned: 0, updatedAt: new Date().toISOString() };
}

export function subscribeWorkerEarnings(
  userId: string,
  cb: (e: WorkerEarningsDoc) => void
) {
  return onSnapshot(doc(db, "workerEarnings", userId), (snap) => {
    if (snap.exists()) cb(snap.data() as WorkerEarningsDoc);
    else cb({ userId, balance: 0, lifetimeEarned: 0, updatedAt: new Date().toISOString() });
  });
}

export function subscribeEarningsLedger(
  userId: string,
  cb: (entries: EarningsLedgerEntry[]) => void
) {
  return onSnapshot(
    query(collection(db, "workerEarningsLedger"), where("userId", "==", userId)),
    (snap) => {
      const list: EarningsLedgerEntry[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      cb(list);
    }
  );
}

/** Atomically credit a worker's earnings balance and write a ledger row. */
export async function creditWorkerEarnings(
  userId: string,
  amount: number,
  meta: { source: EarningsLedgerEntry["source"]; description: string; jobId?: string; jobTitle?: string }
) {
  if (amount <= 0) throw new Error("Amount must be positive");
  const ref = doc(db, "workerEarnings", userId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists() ? (snap.data() as WorkerEarningsDoc) : { userId, balance: 0, lifetimeEarned: 0, updatedAt: "" };
    tx.set(ref, {
      userId,
      balance: (cur.balance || 0) + amount,
      lifetimeEarned: (cur.lifetimeEarned || 0) + amount,
      updatedAt: new Date().toISOString(),
    });
  });
  await addDoc(collection(db, "workerEarningsLedger"), {
    userId,
    type: "credit",
    amount,
    source: meta.source,
    jobId: meta.jobId,
    jobTitle: meta.jobTitle,
    description: meta.description,
    createdAt: new Date().toISOString(),
  });
}

/** Atomically debit (used when admin approves the transfer to main wallet). */
export async function debitWorkerEarnings(
  userId: string,
  amount: number,
  meta: { source: EarningsLedgerEntry["source"]; description: string }
) {
  if (amount <= 0) throw new Error("Amount must be positive");
  const ref = doc(db, "workerEarnings", userId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("No earnings balance");
    const cur = snap.data() as WorkerEarningsDoc;
    if ((cur.balance || 0) < amount) throw new Error("Insufficient earnings balance");
    tx.update(ref, {
      balance: cur.balance - amount,
      updatedAt: new Date().toISOString(),
    });
  });
  await addDoc(collection(db, "workerEarningsLedger"), {
    userId,
    type: "debit",
    amount,
    source: meta.source,
    description: meta.description,
    createdAt: new Date().toISOString(),
  });
}

/* ---------- transfer requests ---------- */

export async function requestEarningsTransfer(
  userId: string,
  userEmail: string,
  userName: string,
  amount: number
) {
  if (amount <= 0) throw new Error("Enter a valid amount");
  const earnings = await getWorkerEarnings(userId);
  if (earnings.balance < amount) throw new Error("Requested amount exceeds your earnings balance");
  await addDoc(collection(db, "earningsTransferRequests"), {
    userId,
    userEmail,
    userName,
    amount,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
}

export function subscribeEarningsTransferRequests(
  cb: (reqs: EarningsTransferRequest[]) => void
) {
  return onSnapshot(
    query(collection(db, "earningsTransferRequests"), orderBy("createdAt", "desc")),
    (snap) => {
      const list: EarningsTransferRequest[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      cb(list);
    }
  );
}

export function subscribeMyTransferRequests(
  userId: string,
  cb: (reqs: EarningsTransferRequest[]) => void
) {
  return onSnapshot(
    query(collection(db, "earningsTransferRequests"), where("userId", "==", userId)),
    (snap) => {
      const list: EarningsTransferRequest[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      cb(list);
    }
  );
}

/** Admin approves a transfer: debit earnings, credit main wallet. */
export async function approveEarningsTransfer(
  reqId: string,
  adminId: string,
  remarks?: string
) {
  const reqRef = doc(db, "earningsTransferRequests", reqId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) throw new Error("Request not found");
  const r = snap.data() as EarningsTransferRequest;
  if (r.status !== "pending") throw new Error("Request already processed");

  await debitWorkerEarnings(r.userId, r.amount, {
    source: "transfer-to-wallet",
    description: `Transfer to main wallet (approved by admin)`,
  });
  await atomicCredit(r.userId, r.amount, {
    source: "earnings-transfer",
    description: `Job earnings transferred to wallet`,
  });
  await updateDoc(reqRef, {
    status: "approved",
    remarks: remarks || "",
    processedAt: new Date().toISOString(),
    processedBy: adminId,
  });
}

export async function rejectEarningsTransfer(
  reqId: string,
  adminId: string,
  remarks?: string
) {
  const reqRef = doc(db, "earningsTransferRequests", reqId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) throw new Error("Request not found");
  const r = snap.data() as EarningsTransferRequest;
  if (r.status !== "pending") throw new Error("Request already processed");
  await updateDoc(reqRef, {
    status: "rejected",
    remarks: remarks || "",
    processedAt: new Date().toISOString(),
    processedBy: adminId,
  });
}

// Suppress unused setDoc import warning (kept for future use)
void setDoc;

/**
 * Rewards Wallet — separate balance that holds REFERRAL + GAME earnings.
 *
 * Why separate?
 *  - Referral payouts and game rewards must NOT auto-credit the main wallet.
 *  - The retailer accumulates them here, then requests an admin transfer
 *    to move the balance into the main `wallets/{uid}` doc.
 *
 * Collections used:
 *  - rewardsWallets/{uid}    → { balance, updatedAt }
 *  - rewardsLedger/{auto}    → audit trail of credits/debits in this wallet
 *  - rewardsTransferRequests/{auto} → user → admin payout requests
 */
import {
  doc, getDoc, setDoc, addDoc, collection, runTransaction,
  onSnapshot, query, where, orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { atomicCredit } from "./firebase-transactions";

export interface RewardsWalletDoc {
  uid: string;
  balance: number;
  updatedAt: string;
}

export interface RewardsLedgerEntry {
  id: string;
  uid: string;
  type: "credit" | "debit";
  amount: number;
  source: string;       // e.g. "referral_bonus", "game_spin", "transfer_to_main"
  description: string;
  createdAt: string;
  refId?: string;       // optional pointer (transferRequestId, gamePlayId, etc.)
}

export interface TransferRequestDoc {
  id: string;
  uid: string;
  userName?: string;
  userEmail?: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  userNote?: string;
  adminNote?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
}

/* ─────────────────── Reads ─────────────────── */

export async function getRewardsBalance(uid: string): Promise<number> {
  const snap = await getDoc(doc(db, "rewardsWallets", uid));
  return snap.exists() ? Number((snap.data() as any).balance || 0) : 0;
}

export function subscribeRewardsBalance(
  uid: string,
  cb: (balance: number) => void,
) {
  return onSnapshot(doc(db, "rewardsWallets", uid), (snap) => {
    cb(snap.exists() ? Number((snap.data() as any).balance || 0) : 0);
  });
}

export function subscribeRewardsLedger(
  uid: string,
  cb: (rows: RewardsLedgerEntry[]) => void,
) {
  // No orderBy — sort client-side to avoid composite index requirements.
  const q = query(collection(db, "rewardsLedger"), where("uid", "==", uid));
  return onSnapshot(q, (snap) => {
    const rows: RewardsLedgerEntry[] = [];
    snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    cb(rows);
  });
}

export function subscribeMyTransferRequests(
  uid: string,
  cb: (rows: TransferRequestDoc[]) => void,
) {
  const q = query(collection(db, "rewardsTransferRequests"), where("uid", "==", uid));
  return onSnapshot(q, (snap) => {
    const rows: TransferRequestDoc[] = [];
    snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
    rows.sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
    cb(rows);
  });
}

export function subscribeAllTransferRequests(
  cb: (rows: TransferRequestDoc[]) => void,
) {
  const q = query(collection(db, "rewardsTransferRequests"), orderBy("requestedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const rows: TransferRequestDoc[] = [];
    snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
    cb(rows);
  });
}

/* ─────────────────── Writes ─────────────────── */

/**
 * Credit the rewards wallet (used by referral payouts + game rewards).
 * Atomic via runTransaction. Logs to rewardsLedger.
 */
export async function creditRewards(
  uid: string,
  amount: number,
  meta: { source: string; description: string; refId?: string },
): Promise<number> {
  if (amount <= 0) return await getRewardsBalance(uid);
  const ref = doc(db, "rewardsWallets", uid);
  const newBal = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? Number((snap.data() as any).balance || 0) : 0;
    const updated = current + amount;
    if (snap.exists()) {
      tx.update(ref, { balance: updated, updatedAt: new Date().toISOString() });
    } else {
      tx.set(ref, { uid, balance: updated, updatedAt: new Date().toISOString() });
    }
    return updated;
  });
  await addDoc(collection(db, "rewardsLedger"), {
    uid,
    type: "credit",
    amount,
    source: meta.source,
    description: meta.description,
    refId: meta.refId ?? null,
    createdAt: new Date().toISOString(),
  });
  return newBal;
}

const MIN_TRANSFER = 50;

/**
 * Retailer creates a transfer request. We do NOT debit yet — admin approves first.
 * (Funds are protected from double-requests by checking pending sum on the client UI.)
 */
export async function requestTransferToMainWallet(args: {
  uid: string;
  userName?: string;
  userEmail?: string;
  amount: number;
  userNote?: string;
}): Promise<string> {
  const { uid, userName, userEmail, amount, userNote } = args;
  if (!Number.isFinite(amount) || amount < MIN_TRANSFER) {
    throw new Error(`Minimum transfer is ₹${MIN_TRANSFER}`);
  }
  const balance = await getRewardsBalance(uid);
  if (amount > balance) throw new Error("Amount exceeds available rewards balance");

  // Reject if a pending request already exists (one at a time keeps math simple)
  const pendingSnap = await new Promise<TransferRequestDoc[]>((resolve) => {
    const unsub = onSnapshot(
      query(
        collection(db, "rewardsTransferRequests"),
        where("uid", "==", uid),
        where("status", "==", "pending"),
      ),
      (s) => {
        const rows: TransferRequestDoc[] = [];
        s.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
        unsub();
        resolve(rows);
      },
    );
  });
  if (pendingSnap.length > 0) {
    throw new Error("You already have a pending transfer request. Please wait for admin review.");
  }

  const docRef = await addDoc(collection(db, "rewardsTransferRequests"), {
    uid,
    userName: userName ?? null,
    userEmail: userEmail ?? null,
    amount,
    status: "pending",
    userNote: (userNote || "").trim(),
    requestedAt: new Date().toISOString(),
  });
  return docRef.id;
}

/**
 * Admin approves: atomically debit rewards wallet & credit main wallet.
 * Reads everything inside the txn to avoid race conditions.
 */
export async function adminApproveTransfer(
  requestId: string,
  adminUid: string,
  adminNote?: string,
) {
  const reqRef = doc(db, "rewardsTransferRequests", requestId);

  const { req } = await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists()) throw new Error("Request not found");
    const r = { id: reqSnap.id, ...(reqSnap.data() as any) } as TransferRequestDoc;
    if (r.status !== "pending") throw new Error("Request is not pending");

    const rwRef = doc(db, "rewardsWallets", r.uid);
    const rwSnap = await tx.get(rwRef);
    const current = rwSnap.exists() ? Number((rwSnap.data() as any).balance || 0) : 0;
    if (current < r.amount) throw new Error("User no longer has sufficient rewards balance");

    tx.update(rwRef, {
      balance: current - r.amount,
      updatedAt: new Date().toISOString(),
    });
    tx.update(reqRef, {
      status: "approved",
      adminNote: (adminNote || "").trim(),
      processedAt: new Date().toISOString(),
      processedBy: adminUid,
    });
    return { req: r };
  });

  // Outside the txn (different doc / collection): credit main wallet + ledger
  await atomicCredit(req.uid, req.amount, {
    source: "rewards_transfer",
    description: `Rewards transfer approved (req ${requestId})`,
  });
  await addDoc(collection(db, "rewardsLedger"), {
    uid: req.uid,
    type: "debit",
    amount: req.amount,
    source: "transfer_to_main",
    description: `Transferred to main wallet (admin approved)`,
    refId: requestId,
    createdAt: new Date().toISOString(),
  });
}

export async function adminRejectTransfer(
  requestId: string,
  adminUid: string,
  adminNote: string,
) {
  if (!adminNote.trim()) throw new Error("Please add a reason for rejection");
  const ref = doc(db, "rewardsTransferRequests", requestId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Request not found");
    const r = snap.data() as TransferRequestDoc;
    if (r.status !== "pending") throw new Error("Request is not pending");
    tx.update(ref, {
      status: "rejected",
      adminNote: adminNote.trim(),
      processedAt: new Date().toISOString(),
      processedBy: adminUid,
    });
  });
}

export const REWARDS_MIN_TRANSFER = MIN_TRANSFER;

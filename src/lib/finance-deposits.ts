/**
 * Firestore data layer for Deposits suite.
 * Multi-tenant per retailerId, branch-tagged via branchId (forward-only).
 *
 * Collections:
 *   financeDeposits          — one doc per account (SB/FD/RD/PIGMY)
 *   financeDepositCollections — one doc per collection / installment / day
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import {
  type FinanceDeposit,
  type DepositCollection,
  type DepositProduct,
  DEPOSIT_PRODUCT_PREFIX,
} from "./finance-deposit-types";

// ─── ID generators ──────────────────────────────────────────────────────────
export async function getNextDepositAccountNo(
  retailerId: string,
  product: DepositProduct,
): Promise<string> {
  const q = query(
    collection(db, "financeDeposits"),
    where("retailerId", "==", retailerId),
    where("product", "==", product),
  );
  const snap = await getDocs(q);
  const prefix = DEPOSIT_PRODUCT_PREFIX[product];
  return `${prefix}-${String(snap.size + 1).padStart(4, "0")}`;
}

export async function getNextDepositReceiptNo(retailerId: string): Promise<string> {
  const q = query(
    collection(db, "financeDepositCollections"),
    where("retailerId", "==", retailerId),
  );
  const snap = await getDocs(q);
  return `DCR-${String(snap.size + 1).padStart(5, "0")}`;
}

// ─── Deposits CRUD ──────────────────────────────────────────────────────────
export async function addDeposit(d: Omit<FinanceDeposit, "id">): Promise<string> {
  const r = await addDoc(collection(db, "financeDeposits"), d);
  return r.id;
}

export async function updateDeposit(id: string, data: Partial<FinanceDeposit>) {
  await updateDoc(doc(db, "financeDeposits", id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteDeposit(id: string) {
  await deleteDoc(doc(db, "financeDeposits", id));
}

export function subscribeDeposits(
  retailerId: string,
  cb: (list: FinanceDeposit[]) => void,
) {
  const q = query(collection(db, "financeDeposits"), where("retailerId", "==", retailerId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceDeposit));
    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    cb(list);
  });
}

/** Cross-retailer subscription for admin branch reporting. */
export function subscribeDepositsAll(cb: (list: FinanceDeposit[]) => void) {
  const q = query(collection(db, "financeDeposits"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceDeposit));
    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    cb(list);
  });
}

// ─── Collections (RD / Pigmy / SB top-ups) ──────────────────────────────────
/**
 * Atomically record a collection AND update the deposit's running totals.
 * For FD: collections are typically NOT used (single principal at open),
 * but we allow the call so admins can record top-ups manually if desired.
 */
export async function recordDepositCollection(
  entry: Omit<DepositCollection, "id">,
): Promise<{ collectionId: string; newTotal: number; newCount: number }> {
  const depositRef = doc(db, "financeDeposits", entry.depositId);
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(depositRef);
    if (!snap.exists()) throw new Error("Deposit account not found");
    const dep = snap.data() as FinanceDeposit;
    const newTotal = (dep.totalCollected || 0) + entry.amount;
    const newCount = (dep.totalCollections || 0) + 1;
    tx.update(depositRef, {
      totalCollected: newTotal,
      totalCollections: newCount,
      lastCollectionDate: entry.collectedAt,
      updatedAt: new Date().toISOString(),
    });
    return { newTotal, newCount };
  });
  const r = await addDoc(collection(db, "financeDepositCollections"), entry);
  return { collectionId: r.id, ...result };
}

export function subscribeDepositCollections(
  retailerId: string,
  cb: (list: DepositCollection[]) => void,
) {
  const q = query(
    collection(db, "financeDepositCollections"),
    where("retailerId", "==", retailerId),
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DepositCollection));
    list.sort((a, b) => (b.collectedAt || "").localeCompare(a.collectedAt || ""));
    cb(list);
  });
}

export function subscribeDepositCollectionsAll(cb: (list: DepositCollection[]) => void) {
  const q = query(collection(db, "financeDepositCollections"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DepositCollection));
    list.sort((a, b) => (b.collectedAt || "").localeCompare(a.collectedAt || ""));
    cb(list);
  });
}

export function subscribeDepositCollectionsByDeposit(
  depositId: string,
  cb: (list: DepositCollection[]) => void,
) {
  const q = query(
    collection(db, "financeDepositCollections"),
    where("depositId", "==", depositId),
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DepositCollection));
    list.sort((a, b) => (b.collectedAt || "").localeCompare(a.collectedAt || ""));
    cb(list);
  });
}

// ─── Closure / Withdrawal ───────────────────────────────────────────────────
export async function closeDeposit(
  depositId: string,
  payoutAmount: number,
  status: "Closed" | "Matured" | "Withdrawn" = "Closed",
  signatureDataUrl?: string,
  retailerId?: string,
) {
  let signatureUrl: string | undefined;
  if (signatureDataUrl && retailerId) {
    const path = `finance/${retailerId}/deposit-closures/${depositId}_${Date.now()}.png`;
    const r = ref(storage, path);
    await uploadString(r, signatureDataUrl, "data_url");
    signatureUrl = await getDownloadURL(r);
  }
  await updateDoc(doc(db, "financeDeposits", depositId), {
    status,
    closedAt: new Date().toISOString(),
    closedAmount: payoutAmount,
    closedSignatureUrl: signatureUrl ?? null,
    updatedAt: new Date().toISOString(),
  });
}

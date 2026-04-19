/**
 * DMT v2 — Firestore helpers using new collections (dmtCustomersV2, etc.)
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { atomicCredit } from "./firebase-transactions";
import {
  type DmtCustomer,
  type DmtBeneficiary,
  type DmtTransfer,
  DMT_RETAILER_COMMISSION_PERCENT,
  currentMonthKey,
} from "./dmt-types";

const COL_CUSTOMERS = "dmtCustomersV2";
const COL_BENEFICIARIES = "dmtBeneficiariesV2";
const COL_TRANSFERS = "dmtTransfersV2";

// ── Customers ───────────────────────────────────────────────────────────
export async function findCustomerByMobile(retailerId: string, mobile: string): Promise<DmtCustomer | null> {
  const q = query(
    collection(db, COL_CUSTOMERS),
    where("retailerId", "==", retailerId),
    where("mobile", "==", mobile),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<DmtCustomer, "id">) };
}

export async function createCustomer(input: Omit<DmtCustomer, "id" | "createdAt" | "monthlyUsed" | "monthKey">): Promise<DmtCustomer> {
  const data: Omit<DmtCustomer, "id"> = {
    ...input,
    monthlyUsed: 0,
    monthKey: currentMonthKey(),
    createdAt: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, COL_CUSTOMERS), data);
  return { id: ref.id, ...data };
}

export async function bumpCustomerUsage(customerId: string, amount: number): Promise<void> {
  const ref = doc(db, COL_CUSTOMERS, customerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const c = snap.data() as DmtCustomer;
  const nowKey = currentMonthKey();
  const used = c.monthKey === nowKey ? (c.monthlyUsed || 0) + amount : amount;
  await updateDoc(ref, { monthlyUsed: used, monthKey: nowKey });
}

export function listenRetailerCustomers(retailerId: string, cb: (list: DmtCustomer[]) => void): Unsubscribe {
  const q = query(collection(db, COL_CUSTOMERS), where("retailerId", "==", retailerId));
  return onSnapshot(q, (snap) => {
    const list: DmtCustomer[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<DmtCustomer, "id">) }));
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    cb(list);
  });
}

// ── Beneficiaries ───────────────────────────────────────────────────────
export function listenBeneficiaries(customerId: string, cb: (list: DmtBeneficiary[]) => void): Unsubscribe {
  const q = query(collection(db, COL_BENEFICIARIES), where("customerId", "==", customerId));
  return onSnapshot(q, (snap) => {
    const list: DmtBeneficiary[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<DmtBeneficiary, "id">) }));
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    cb(list);
  });
}

export async function addBeneficiary(b: Omit<DmtBeneficiary, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, COL_BENEFICIARIES), {
    ...b,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function deleteBeneficiary(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_BENEFICIARIES, id));
}

// ── Transfers ───────────────────────────────────────────────────────────
export async function createTransfer(t: Omit<DmtTransfer, "id" | "createdAt" | "status">): Promise<string> {
  const ref = await addDoc(collection(db, COL_TRANSFERS), {
    ...t,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export function listenRetailerTransfers(retailerId: string, cb: (list: DmtTransfer[]) => void): Unsubscribe {
  const q = query(collection(db, COL_TRANSFERS), where("retailerId", "==", retailerId));
  return onSnapshot(q, (snap) => {
    const list: DmtTransfer[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<DmtTransfer, "id">) }));
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    cb(list);
  });
}

export function listenAllTransfers(cb: (list: DmtTransfer[]) => void): Unsubscribe {
  const q = query(collection(db, COL_TRANSFERS), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list: DmtTransfer[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<DmtTransfer, "id">) }));
    cb(list);
  });
}

export async function markTransferProcessing(id: string, staffId: string, staffName: string): Promise<void> {
  await updateDoc(doc(db, COL_TRANSFERS, id), {
    status: "processing",
    staffId,
    staffName,
    processedAt: new Date().toISOString(),
  });
}

export async function markTransferSuccess(id: string, utr: string, staffRemark: string = ""): Promise<void> {
  const ref = doc(db, COL_TRANSFERS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Transfer not found");
  const t = snap.data() as DmtTransfer;
  if (t.status === "success") return;

  const commission = +((t.charge * DMT_RETAILER_COMMISSION_PERCENT) / 100).toFixed(2);
  if (commission > 0) {
    await atomicCredit(t.retailerId, commission, {
      source: "dmt_commission",
      description: `DMT commission · ${t.beneficiaryName} (${DMT_RETAILER_COMMISSION_PERCENT}% of ₹${t.charge})`,
      transferId: id,
    });
  }

  await updateDoc(ref, {
    status: "success",
    utr,
    staffRemark,
    retailerCommission: commission,
  });
}

export async function markTransferFailedAndRefund(id: string, reason: string): Promise<void> {
  const ref = doc(db, COL_TRANSFERS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Transfer not found");
  const t = snap.data() as DmtTransfer;
  if (t.status === "refunded" || t.status === "success") return;

  const refundRef = `RFD${Date.now().toString().slice(-10)}`;
  if (t.walletDebited) {
    await atomicCredit(t.retailerId, t.totalDebit, {
      source: "dmt_refund",
      description: `DMT refund · ${t.beneficiaryName} · ${t.beneficiaryAccount}`,
      transferId: id,
      refundRef,
    });
  }
  await updateDoc(ref, {
    status: "refunded",
    failureReason: reason,
    refundedAt: new Date().toISOString(),
    refundRef,
  });
}

export async function deleteTransfer(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_TRANSFERS, id));
}

export async function updateTransferRemark(id: string, remark: string): Promise<void> {
  await updateDoc(doc(db, COL_TRANSFERS, id), { staffRemark: remark });
}

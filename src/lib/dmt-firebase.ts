/**
 * DMT Firestore helpers — customers, beneficiaries, transfers, config.
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
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
  type DmtConfig,
  DEFAULT_DMT_CONFIG,
  currentMonthKey,
  calculateDmtCharges,
} from "./dmt-types";

// ── Config ──────────────────────────────────────────────────────────────
export async function loadDmtConfig(): Promise<DmtConfig> {
  const ref = doc(db, "config", "dmt");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { ...DEFAULT_DMT_CONFIG, ...(snap.data() as DmtConfig) };
  }
  return DEFAULT_DMT_CONFIG;
}

export async function saveDmtConfig(cfg: DmtConfig): Promise<void> {
  await setDoc(doc(db, "config", "dmt"), cfg, { merge: true });
}

// ── Customers ───────────────────────────────────────────────────────────
export async function findCustomerByMobile(
  retailerId: string,
  mobile: string
): Promise<DmtCustomer | null> {
  const q = query(
    collection(db, "dmtCustomers"),
    where("retailerId", "==", retailerId),
    where("mobile", "==", mobile)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<DmtCustomer, "id">) };
}

export async function createCustomer(
  retailerId: string,
  mobile: string,
  name: string,
  monthlyLimit: number
): Promise<DmtCustomer> {
  const data: Omit<DmtCustomer, "id"> = {
    retailerId,
    mobile,
    name,
    kycStatus: "basic",
    monthlyLimit,
    monthlyUsed: 0,
    monthKey: currentMonthKey(),
    createdAt: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, "dmtCustomers"), data);
  return { id: ref.id, ...data };
}

export async function bumpCustomerUsage(customerId: string, amount: number) {
  const ref = doc(db, "dmtCustomers", customerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const c = snap.data() as DmtCustomer;
  const nowKey = currentMonthKey();
  const used = c.monthKey === nowKey ? (c.monthlyUsed || 0) + amount : amount;
  await updateDoc(ref, { monthlyUsed: used, monthKey: nowKey });
}

// ── Beneficiaries ───────────────────────────────────────────────────────
export function listenBeneficiaries(
  customerId: string,
  cb: (list: DmtBeneficiary[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "dmtBeneficiaries"),
    where("customerId", "==", customerId)
  );
  return onSnapshot(q, (snap) => {
    const list: DmtBeneficiary[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<DmtBeneficiary, "id">) }));
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    cb(list);
  });
}

export async function addBeneficiary(b: Omit<DmtBeneficiary, "id" | "createdAt">) {
  return addDoc(collection(db, "dmtBeneficiaries"), {
    ...b,
    createdAt: new Date().toISOString(),
  });
}

export async function updateBeneficiary(id: string, patch: Partial<DmtBeneficiary>) {
  await updateDoc(doc(db, "dmtBeneficiaries", id), patch);
}

export async function deleteBeneficiary(id: string) {
  await deleteDoc(doc(db, "dmtBeneficiaries", id));
}

// ── Transfers ───────────────────────────────────────────────────────────
export async function createTransfer(t: Omit<DmtTransfer, "id" | "createdAt" | "status">): Promise<string> {
  const ref = await addDoc(collection(db, "dmtTransfers"), {
    ...t,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export function listenRetailerTransfers(
  retailerId: string,
  cb: (list: DmtTransfer[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "dmtTransfers"),
    where("retailerId", "==", retailerId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const list: DmtTransfer[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as DmtTransfer) }));
    cb(list);
  });
}

export function listenAllTransfers(cb: (list: DmtTransfer[]) => void): Unsubscribe {
  const q = query(collection(db, "dmtTransfers"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list: DmtTransfer[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as DmtTransfer) }));
    cb(list);
  });
}

export async function markTransferProcessing(id: string, staffId: string, staffName: string) {
  await updateDoc(doc(db, "dmtTransfers", id), {
    status: "processing",
    staffId,
    staffName,
    processedAt: new Date().toISOString(),
  });
}

export async function markTransferSuccess(id: string, utr: string): Promise<void> {
  const ref = doc(db, "dmtTransfers", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Transfer not found");
  const t = snap.data() as DmtTransfer;
  if (t.status === "success") return;

  // Pay retailer commission from base charge
  const cfg = await loadDmtConfig();
  const pct = Math.max(0, Math.min(100, cfg.retailerCommissionPercent || 0));
  const commission = +((t.charge * pct) / 100).toFixed(2);

  if (commission > 0) {
    await atomicCredit(t.retailerId, commission, {
      source: "dmt_commission",
      description: `DMT commission · ${t.beneficiaryName} (${pct}% of ₹${t.charge})`,
      transferId: id,
    });
  }

  await updateDoc(ref, {
    status: "success",
    utr,
    retailerCommission: commission,
  });
}

/** Mark failed and auto-refund full debit amount to retailer wallet. */
export async function markTransferFailedAndRefund(
  id: string,
  reason: string
): Promise<void> {
  const ref = doc(db, "dmtTransfers", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Transfer not found");
  const t = snap.data() as DmtTransfer;
  if (t.status === "refunded" || t.status === "success") return;

  const refundRef = `RFD${Date.now().toString().slice(-10)}`;
  await atomicCredit(t.retailerId, t.totalDebit, {
    source: "dmt_refund",
    description: `DMT refund · ${t.beneficiaryName} · ${t.beneficiaryAccount}`,
    transferId: id,
    refundRef,
  });
  await updateDoc(ref, {
    status: "refunded",
    failureReason: reason,
    refundedAt: new Date().toISOString(),
    refundRef,
  });
}

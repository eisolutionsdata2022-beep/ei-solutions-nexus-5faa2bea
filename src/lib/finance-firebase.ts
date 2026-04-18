/**
 * Firestore data layer for the Finance / Gold Loan module.
 * Multi-tenant: each retailer owns their customers, loans, payments, cash entries.
 * Admin reads across all retailers via *_all variants.
 */
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  getDoc,
  runTransaction,
  Timestamp,
  limit as fsLimit,
} from "firebase/firestore";
import { ref, uploadBytes, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import type {
  FinanceCustomer,
  FinanceLoan,
  LoanPayment,
  CashEntry,
  FinanceSettings,
} from "./finance-types";
import {
  DEFAULT_INTEREST_RATE,
  DEFAULT_LTV,
  DEFAULT_GOLD_RATE,
  DEFAULT_PENALTY_RATE,
} from "./finance-types";

// ─── Settings ───────────────────────────────────────────────────────────────
export async function getFinanceSettings(retailerId: string): Promise<FinanceSettings> {
  const snap = await getDoc(doc(db, "financeSettings", retailerId));
  if (snap.exists()) return snap.data() as FinanceSettings;
  // default
  return {
    retailerId,
    companyName: "My Gold Loan",
    branchName: "Main Branch",
    phone: "",
    whatsapp: "",
    address: "",
    receiptFooter: "Thank you for your business",
    defaultInterestRate: DEFAULT_INTEREST_RATE,
    defaultLtvPercent: DEFAULT_LTV,
    defaultGoldRatePerGram: DEFAULT_GOLD_RATE,
    penaltyRatePerDay: DEFAULT_PENALTY_RATE,
    updatedAt: new Date().toISOString(),
  };
}

export function subscribeFinanceSettings(
  retailerId: string,
  cb: (s: FinanceSettings) => void,
) {
  return onSnapshot(doc(db, "financeSettings", retailerId), (snap) => {
    if (snap.exists()) cb(snap.data() as FinanceSettings);
    else getFinanceSettings(retailerId).then(cb);
  });
}

export async function saveFinanceSettings(s: FinanceSettings) {
  await setDoc(doc(db, "financeSettings", s.retailerId), {
    ...s,
    updatedAt: new Date().toISOString(),
  });
}

export async function uploadSettingsAsset(
  retailerId: string,
  kind: "logo" | "ownerPhoto" | "signature",
  file: File,
): Promise<string> {
  const path = `finance/${retailerId}/settings/${kind}_${Date.now()}_${file.name}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

// ─── Customers ──────────────────────────────────────────────────────────────
export async function getNextCustomerCode(retailerId: string): Promise<string> {
  const q = query(collection(db, "financeCustomers"), where("retailerId", "==", retailerId));
  const snap = await getDocs(q);
  const num = snap.size + 1;
  return `CUST-${String(num).padStart(4, "0")}`;
}

export function subscribeCustomers(
  retailerId: string,
  cb: (list: FinanceCustomer[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(collection(db, "financeCustomers"), where("retailerId", "==", retailerId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceCustomer));
      list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      cb(list);
    },
    (err) => onError?.(err),
  );
}

export function subscribeCustomersAll(cb: (list: FinanceCustomer[]) => void) {
  const q = query(collection(db, "financeCustomers"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceCustomer));
    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    cb(list);
  });
}

export async function addCustomer(c: Omit<FinanceCustomer, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "financeCustomers"), c);
  return ref.id;
}

export async function updateCustomer(id: string, data: Partial<FinanceCustomer>) {
  await updateDoc(doc(db, "financeCustomers", id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCustomer(id: string) {
  await deleteDoc(doc(db, "financeCustomers", id));
}

/** Upload a base64 dataURL (from camera) to Firebase Storage. */
export async function uploadCustomerPhoto(
  retailerId: string,
  customerId: string,
  dataUrl: string,
): Promise<string> {
  const path = `finance/${retailerId}/customers/${customerId}/photo_${Date.now()}.jpg`;
  const r = ref(storage, path);
  await uploadString(r, dataUrl, "data_url");
  return getDownloadURL(r);
}

export async function uploadCustomerDoc(
  retailerId: string,
  customerId: string,
  kind: string,
  file: File,
): Promise<string> {
  const path = `finance/${retailerId}/customers/${customerId}/${kind}_${Date.now()}_${file.name}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

// ─── Loans ──────────────────────────────────────────────────────────────────
export async function getNextLoanNo(retailerId: string): Promise<string> {
  const q = query(collection(db, "financeLoans"), where("retailerId", "==", retailerId));
  const snap = await getDocs(q);
  return `LN-${String(snap.size + 1).padStart(4, "0")}`;
}

export function subscribeLoans(
  retailerId: string,
  cb: (list: FinanceLoan[]) => void,
) {
  const q = query(collection(db, "financeLoans"), where("retailerId", "==", retailerId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceLoan));
    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    cb(list);
  });
}

export function subscribeLoansAll(cb: (list: FinanceLoan[]) => void) {
  const q = query(collection(db, "financeLoans"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceLoan));
    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    cb(list);
  });
}

export function subscribeLoansByCustomer(
  customerId: string,
  cb: (list: FinanceLoan[]) => void,
) {
  const q = query(collection(db, "financeLoans"), where("customerId", "==", customerId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceLoan));
    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    cb(list);
  });
}

export async function addLoan(loan: Omit<FinanceLoan, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "financeLoans"), loan);
  return ref.id;
}

export async function updateLoan(id: string, data: Partial<FinanceLoan>) {
  await updateDoc(doc(db, "financeLoans", id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

// ─── Payments ───────────────────────────────────────────────────────────────
export async function getNextReceiptNo(retailerId: string): Promise<string> {
  const q = query(collection(db, "financePayments"), where("retailerId", "==", retailerId));
  const snap = await getDocs(q);
  return `RCP-${String(snap.size + 1).padStart(5, "0")}`;
}

/** Atomically add a payment AND update loan totals. */
export async function recordPayment(
  payment: Omit<LoanPayment, "id">,
): Promise<{ paymentId: string; newOutstanding: number; newStatus: string }> {
  const loanRef = doc(db, "financeLoans", payment.loanId);
  const result = await runTransaction(db, async (tx) => {
    const loanSnap = await tx.get(loanRef);
    if (!loanSnap.exists()) throw new Error("Loan not found");
    const loan = loanSnap.data() as FinanceLoan;
    const newPaid = (loan.totalPaid || 0) + payment.amount;
    const newOutstanding = Math.max(0, loan.outstandingPrincipal - payment.principalComponent);
    const newStatus =
      payment.type === "Settlement" || newOutstanding <= 0 ? "Closed" : loan.status;
    tx.update(loanRef, {
      totalPaid: newPaid,
      outstandingPrincipal: newOutstanding,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
    return { newOutstanding, newStatus };
  });
  const ref = await addDoc(collection(db, "financePayments"), payment);
  return { paymentId: ref.id, ...result };
}

export function subscribePayments(
  retailerId: string,
  cb: (list: LoanPayment[]) => void,
) {
  const q = query(collection(db, "financePayments"), where("retailerId", "==", retailerId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LoanPayment));
    list.sort((a, b) => (b.collectedAt || "").localeCompare(a.collectedAt || ""));
    cb(list);
  });
}

export function subscribePaymentsByLoan(
  loanId: string,
  cb: (list: LoanPayment[]) => void,
) {
  const q = query(collection(db, "financePayments"), where("loanId", "==", loanId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LoanPayment));
    list.sort((a, b) => (b.collectedAt || "").localeCompare(a.collectedAt || ""));
    cb(list);
  });
}

// ─── Closure (release gold) ─────────────────────────────────────────────────
export async function closeLoan(
  loanId: string,
  signatureDataUrl?: string,
  retailerId?: string,
) {
  let signatureUrl: string | undefined;
  if (signatureDataUrl && retailerId) {
    const path = `finance/${retailerId}/closures/${loanId}_${Date.now()}.png`;
    const r = ref(storage, path);
    await uploadString(r, signatureDataUrl, "data_url");
    signatureUrl = await getDownloadURL(r);
  }
  await updateDoc(doc(db, "financeLoans", loanId), {
    status: "Closed",
    releasedAt: new Date().toISOString(),
    releasedSignatureUrl: signatureUrl ?? null,
    outstandingPrincipal: 0,
    updatedAt: new Date().toISOString(),
  });
}

// ─── Cash book ──────────────────────────────────────────────────────────────
export async function addCashEntry(e: Omit<CashEntry, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "financeCashBook"), e);
  return ref.id;
}

export async function deleteCashEntry(id: string) {
  await deleteDoc(doc(db, "financeCashBook", id));
}

export function subscribeCashBook(
  retailerId: string,
  cb: (list: CashEntry[]) => void,
) {
  const q = query(collection(db, "financeCashBook"), where("retailerId", "==", retailerId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CashEntry));
    list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    cb(list);
  });
}

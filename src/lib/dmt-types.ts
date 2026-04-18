/**
 * Domestic Money Transfer (DMT) — types & constants.
 * Hybrid execution: staff manually transfers funds via own bank,
 * then marks success/failed. Built API-ready for future automation.
 */

export type DmtStatus = "pending" | "processing" | "success" | "failed" | "refunded";
export type DmtMode = "IMPS" | "NEFT";

export interface DmtCustomer {
  id: string; // doc id
  retailerId: string; // owning retailer
  mobile: string; // 10-digit
  name: string;
  kycStatus: "basic" | "verified"; // basic = mobile+name only (per spec)
  monthlyLimit: number; // ₹25,000 default
  monthlyUsed: number; // resets per calendar month
  monthKey: string; // e.g. "2026-04"
  createdAt: string;
}

export interface DmtBeneficiary {
  id: string;
  customerId: string;
  retailerId: string;
  name: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  mobile?: string;
  pennyDropStatus?: "pending" | "verified" | "skipped";
  createdAt: string;
}

export interface DmtTransfer {
  id?: string;
  retailerId: string;
  retailerEmail: string;
  customerId: string;
  customerMobile: string;
  customerName: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  beneficiaryIfsc: string;
  beneficiaryBank: string;
  beneficiaryMobile?: string;
  mode: DmtMode;
  amount: number; // principal sent to beneficiary
  charge: number; // base service charge
  gst: number; // GST on charge
  totalDebit: number; // amount + charge + gst
  purpose?: string;
  status: DmtStatus;
  utr?: string; // bank reference once executed
  failureReason?: string;
  refundedAt?: string;
  refundRef?: string;
  staffId?: string; // who processed
  staffName?: string;
  processedAt?: string;
  createdAt: string;
}

export interface DmtChargeSlab {
  upTo: number; // inclusive upper bound, e.g. 1000
  fee: number; // flat fee in ₹
}

export interface DmtConfig {
  enabled: boolean;
  minPerTxn: number;
  maxPerTxn: number;
  customerMonthlyLimit: number;
  gstPercent: number; // e.g. 18
  slabs: DmtChargeSlab[]; // sorted ascending
  modes: DmtMode[];
  apiReady?: boolean; // true when API integration plugged in
}

export const DEFAULT_DMT_CONFIG: DmtConfig = {
  enabled: true,
  minPerTxn: 100,
  maxPerTxn: 25000,
  customerMonthlyLimit: 25000,
  gstPercent: 18,
  modes: ["IMPS", "NEFT"],
  slabs: [
    { upTo: 1000, fee: 10 },
    { upTo: 5000, fee: 20 },
    { upTo: 10000, fee: 30 },
    { upTo: 25000, fee: 50 },
  ],
  apiReady: false,
};

export function calculateDmtCharges(amount: number, cfg: DmtConfig) {
  const slab = cfg.slabs.find((s) => amount <= s.upTo) ??
    cfg.slabs[cfg.slabs.length - 1] ?? { upTo: Infinity, fee: 0 };
  const charge = slab.fee;
  const gst = +(charge * (cfg.gstPercent / 100)).toFixed(2);
  const totalDebit = +(amount + charge + gst).toFixed(2);
  return { charge, gst, totalDebit };
}

export function currentMonthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Quick IFSC → bank name guess from prefix. Not authoritative. */
export function detectBankFromIfsc(ifsc: string): string {
  const prefix = ifsc.slice(0, 4).toUpperCase();
  const map: Record<string, string> = {
    SBIN: "State Bank of India",
    HDFC: "HDFC Bank",
    ICIC: "ICICI Bank",
    UTIB: "Axis Bank",
    PUNB: "Punjab National Bank",
    BARB: "Bank of Baroda",
    CNRB: "Canara Bank",
    UBIN: "Union Bank of India",
    IOBA: "Indian Overseas Bank",
    IDIB: "Indian Bank",
    KKBK: "Kotak Mahindra Bank",
    YESB: "Yes Bank",
    INDB: "IndusInd Bank",
    FDRL: "Federal Bank",
    SIBL: "South Indian Bank",
    MAHB: "Bank of Maharashtra",
    CBIN: "Central Bank of India",
    IBKL: "IDBI Bank",
    RATN: "RBL Bank",
    BKID: "Bank of India",
    IPOS: "India Post Payments Bank",
    AIRP: "Airtel Payments Bank",
    PYTM: "Paytm Payments Bank",
  };
  return map[prefix] || "Unknown Bank";
}

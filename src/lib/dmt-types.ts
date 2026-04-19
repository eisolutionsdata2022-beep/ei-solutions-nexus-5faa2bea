/**
 * Domestic Money Transfer (DMT) v2 — clean types, catalog & helpers.
 * Stored at:
 *   dmtCustomersV2  (per-retailer customer records)
 *   dmtBeneficiariesV2 (per-customer beneficiaries)
 *   dmtTransfersV2  (transfer requests routed to staff)
 */

export type DmtMode = "IMPS" | "NEFT" | "RTGS";
export type DmtStatus = "pending" | "processing" | "success" | "failed" | "refunded";

export interface DmtCustomer {
  id?: string;
  retailerId: string;
  retailerEmail: string;
  mobile: string;
  name: string;
  monthlyLimit: number;
  monthlyUsed: number;
  monthKey: string;
  createdAt: string;
}

export interface DmtBeneficiary {
  id?: string;
  retailerId: string;
  customerId: string;
  customerMobile: string;
  name: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  mobile?: string;
  createdAt: string;
}

export interface DmtTransfer {
  id?: string;
  retailerId: string;
  retailerEmail: string;
  retailerName: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  beneficiaryIfsc: string;
  beneficiaryBank: string;
  beneficiaryMobile: string;
  mode: DmtMode;
  amount: number;
  charge: number;
  gst: number;
  totalDebit: number;
  purpose: string;
  status: DmtStatus;
  utr: string;
  staffRemark: string;
  failureReason: string;
  staffId: string;
  staffName: string;
  processedAt: string;
  refundedAt: string;
  refundRef: string;
  walletDebited: boolean;
  retailerCommission: number;
  createdAt: string;
}

export interface DmtChargeSlab {
  upTo: number;
  fee: number;
}

export const DMT_DEFAULT_SLABS: DmtChargeSlab[] = [
  { upTo: 1000, fee: 10 },
  { upTo: 5000, fee: 20 },
  { upTo: 10000, fee: 30 },
  { upTo: 25000, fee: 50 },
];

export const DMT_MIN_TXN = 100;
export const DMT_MAX_TXN = 25000;
export const DMT_CUSTOMER_MONTHLY_LIMIT = 25000;
export const DMT_GST_PERCENT = 18;
export const DMT_RETAILER_COMMISSION_PERCENT = 40;

export const DMT_MODES: DmtMode[] = ["IMPS", "NEFT", "RTGS"];
export const DMT_STATUS_OPTIONS: DmtStatus[] = ["pending", "processing", "success", "failed", "refunded"];

export function calculateDmtCharges(amount: number) {
  const slab = DMT_DEFAULT_SLABS.find((s) => amount <= s.upTo) ?? DMT_DEFAULT_SLABS[DMT_DEFAULT_SLABS.length - 1];
  const charge = slab.fee;
  const gst = +(charge * (DMT_GST_PERCENT / 100)).toFixed(2);
  const totalDebit = +(amount + charge + gst).toFixed(2);
  return { charge, gst, totalDebit };
}

export function currentMonthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function detectBankFromIfsc(ifsc: string): string {
  const prefix = ifsc.slice(0, 4).toUpperCase();
  const map: Record<string, string> = {
    SBIN: "State Bank of India", HDFC: "HDFC Bank", ICIC: "ICICI Bank",
    UTIB: "Axis Bank", PUNB: "Punjab National Bank", BARB: "Bank of Baroda",
    CNRB: "Canara Bank", UBIN: "Union Bank of India", IOBA: "Indian Overseas Bank",
    IDIB: "Indian Bank", KKBK: "Kotak Mahindra Bank", YESB: "Yes Bank",
    INDB: "IndusInd Bank", FDRL: "Federal Bank", SIBL: "South Indian Bank",
    MAHB: "Bank of Maharashtra", CBIN: "Central Bank of India", IBKL: "IDBI Bank",
    RATN: "RBL Bank", BKID: "Bank of India", IPOS: "India Post Payments Bank",
    AIRP: "Airtel Payments Bank", PYTM: "Paytm Payments Bank",
  };
  return map[prefix] || "Unknown Bank";
}

export function formatDmtDate(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function getDmtStatusColor(status: DmtStatus): string {
  switch (status) {
    case "success": return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    case "processing": return "bg-blue-500/15 text-blue-700 border-blue-500/30";
    case "failed": return "bg-rose-500/15 text-rose-700 border-rose-500/30";
    case "refunded": return "bg-orange-500/15 text-orange-700 border-orange-500/30";
    default: return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  }
}

export function generateUtr(): string {
  return `UTR${Date.now().toString().slice(-10)}${Math.random().toString(36).toUpperCase().slice(2, 5)}`;
}

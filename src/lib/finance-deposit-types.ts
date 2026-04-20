/**
 * Finance Module — Deposits suite (SB / FD / RD / Pigmy)
 * Branch-tagged like loans (forward-only).
 */

export type DepositProduct = "SB" | "FD" | "RD" | "PIGMY";
export type DepositStatus = "Active" | "Matured" | "Closed" | "Withdrawn";

export type DepositInterestPayout = "Maturity" | "Monthly" | "Quarterly";

export interface FinanceDeposit {
  id: string;
  retailerId: string;
  branchId?: string | null;

  accountNo: string;                  // SB-0001 / FD-0001 / RD-0001 / PG-0001
  product: DepositProduct;

  customerId: string;
  customerName: string;
  customerMobile: string;

  // Common money fields
  /** SB / FD: opening principal. RD: monthly installment amount. PIGMY: daily collection amount. */
  amount: number;
  interestRate: number;               // % per annum
  /** Tenure in months (FD/RD). For SB/Pigmy this is the operational period (Pigmy default 365 days handled by tenureDays). */
  tenureMonths: number;
  /** Pigmy: number of collection days (typical 365 / 220). */
  tenureDays?: number;
  payout: DepositInterestPayout;      // applies to FD primarily

  openDate: string;                   // ISO
  maturityDate: string;               // ISO

  // Computed snapshot at creation (for display); recalculated as collections happen
  expectedMaturityAmount: number;     // FD: P*(1+r/n)^(n*t)  RD: series FV  Pigmy: sum of daily + interest  SB: principal + simple monthly interest accrual estimate
  expectedInterest: number;

  // Live state
  totalCollected: number;             // Σ of collection entries (RD/Pigmy/SB top-ups). For FD = amount (one-shot).
  totalCollections: number;           // count of collection entries
  lastCollectionDate?: string | null;
  /** Pigmy: number of missed days so far (computed at write time). */
  missedDays?: number;

  // Collector / agent (Pigmy primarily, but allowed on RD too)
  collectorId?: string | null;
  collectorName?: string | null;

  status: DepositStatus;
  remarks?: string;

  // Closure
  closedAt?: string;
  closedAmount?: number;              // amount paid out at closure/withdrawal
  closedSignatureUrl?: string;

  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface DepositCollection {
  id: string;
  retailerId: string;
  branchId?: string | null;

  depositId: string;
  accountNo: string;
  product: DepositProduct;

  customerId: string;
  customerName: string;

  /** RD installment number, Pigmy day index, SB top-up sequence. Optional for FD (no collections). */
  sequence?: number;
  amount: number;
  paymentMode: "Cash" | "UPI" | "Bank";
  reference?: string;
  notes?: string;

  collectedBy: string;
  collectorName?: string | null;
  collectedAt: string;                // ISO
  receiptNo: string;                  // DCR-0001
}

export const DEPOSIT_PRODUCT_LABELS: Record<DepositProduct, string> = {
  SB: "Savings (SB)",
  FD: "Fixed Deposit (FD)",
  RD: "Recurring Deposit (RD)",
  PIGMY: "Daily Deposit (Pigmy)",
};

export const DEPOSIT_PRODUCT_PREFIX: Record<DepositProduct, string> = {
  SB: "SB",
  FD: "FD",
  RD: "RD",
  PIGMY: "PG",
};

export const DEPOSIT_STATUS_COLORS: Record<DepositStatus, string> = {
  Active: "bg-blue-100 text-blue-800 border-blue-200",
  Matured: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Closed: "bg-slate-100 text-slate-700 border-slate-200",
  Withdrawn: "bg-amber-100 text-amber-800 border-amber-200",
};

export const DEFAULT_DEPOSIT_RATES: Record<DepositProduct, number> = {
  SB: 4,
  FD: 7.25,
  RD: 6.75,
  PIGMY: 5,
};

/**
 * Finance Module — Gold Loan Management
 * All shared TypeScript shapes for customers, loans, EMIs, cash book, settings.
 */

export type KycStatus = "Pending" | "Verified" | "Rejected";
export type LoanStatus = "Active" | "Closed" | "Overdue" | "Renewed";
export type PaymentType = "EMI" | "PartPayment" | "Settlement" | "Renewal";
export type CashEntryType = "Income" | "Expense" | "BankDeposit";

export interface FinanceCustomer {
  id: string;
  retailerId: string;
  branchId?: string | null;        // multi-branch tag (forward-only)
  customerCode: string;            // CUST-0001
  fullName: string;
  mobile: string;
  altMobile?: string;
  address: string;
  aadhaarNo: string;
  panNo?: string;
  photoUrl?: string;               // captured via camera
  signatureUrl?: string;
  aadhaarFrontUrl?: string;
  aadhaarBackUrl?: string;
  panUrl?: string;
  kycStatus: KycStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface GoldItem {
  id: string;
  itemName: string;                // Chain, Ring, Bangle...
  count: number;
  grossWeight: number;             // grams
  netWeight: number;               // grams
  stoneWeight: number;             // grams
  purity: number;                  // carat (e.g. 22)
}

export interface FinanceLoan {
  id: string;
  retailerId: string;
  branchId?: string | null;        // multi-branch tag (forward-only)
  loanNo: string;                  // LN-0001
  customerId: string;
  customerName: string;
  customerMobile: string;
  goldItems: GoldItem[];
  totalGrossWeight: number;
  totalNetWeight: number;
  averagePurity: number;
  marketRatePerGram: number;       // ₹ per gram (entered at loan time)
  goldValuation: number;           // auto-calculated total value
  ltvPercent: number;              // loan-to-value %
  loanAmount: number;
  interestRate: number;            // % per annum
  tenureMonths: number;
  loanDate: string;                // ISO
  dueDate: string;                 // ISO
  monthlyEmi: number;
  totalPayable: number;
  status: LoanStatus;
  totalPaid: number;               // sum of all payments
  outstandingPrincipal: number;
  remarks?: string;
  releasedAt?: string;             // when gold returned
  releasedSignatureUrl?: string;
  // Renewal lineage
  renewedFromLoanId?: string;      // points to the previous loan this one renewed
  renewedFromLoanNo?: string;
  renewedToLoanId?: string;        // set on the OLD loan when it gets renewed
  renewedToLoanNo?: string;
  renewedAt?: string;              // ISO timestamp on the old loan
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface LoanPayment {
  id: string;
  retailerId: string;
  branchId?: string | null;        // multi-branch tag (forward-only)
  loanId: string;
  loanNo: string;
  customerId: string;
  customerName: string;
  receiptNo: string;               // RCP-0001
  type: PaymentType;
  amount: number;
  principalComponent: number;
  interestComponent: number;
  penaltyComponent: number;
  paymentMode: "Cash" | "UPI" | "Bank";
  reference?: string;
  notes?: string;
  collectedBy: string;
  collectedAt: string;
}

export interface CashEntry {
  id: string;
  retailerId: string;
  branchId?: string | null;        // multi-branch tag (forward-only)
  type: CashEntryType;
  category: string;                // Salary, Rent, Office, etc.
  amount: number;
  description: string;
  date: string;                    // ISO date
  enteredBy: string;
  createdAt: string;
}

export interface FinanceSettings {
  retailerId: string;              // doc id
  companyName: string;
  branchName: string;
  ownerName?: string;
  phone: string;
  whatsapp: string;
  address: string;
  email?: string;
  logoUrl?: string;
  ownerPhotoUrl?: string;
  signatureUrl?: string;
  receiptFooter: string;           // "Thank you for your business"
  defaultInterestRate: number;     // %
  defaultLtvPercent: number;       // 75
  defaultGoldRatePerGram: number;  // ₹ — admin/staff updates daily
  penaltyRatePerDay: number;       // % per day after due
  updatedAt: string;
}

export const PAYMENT_MODES = ["Cash", "UPI", "Bank"] as const;
export const GOLD_PURITIES = [24, 22, 20, 18, 14] as const;
export const DEFAULT_LTV = 75;
export const DEFAULT_INTEREST_RATE = 12;
export const DEFAULT_GOLD_RATE = 6500; // ₹/g — 22k indicative
export const DEFAULT_PENALTY_RATE = 0.05; // % per day

export const LOAN_STATUS_COLORS: Record<LoanStatus, string> = {
  Active: "bg-blue-100 text-blue-800 border-blue-200",
  Closed: "bg-green-100 text-green-800 border-green-200",
  Overdue: "bg-red-100 text-red-800 border-red-200",
  Renewed: "bg-amber-100 text-amber-800 border-amber-200",
};

export const KYC_STATUS_COLORS: Record<KycStatus, string> = {
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Verified: "bg-green-100 text-green-800 border-green-200",
  Rejected: "bg-red-100 text-red-800 border-red-200",
};

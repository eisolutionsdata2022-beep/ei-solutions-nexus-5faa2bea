/**
 * Bharat Connect / AceNeoBank BBPS — shared types.
 * Provider: Radiant AceMoney (https://aceneobank.dev.acepe.co.in/apiService)
 */

/** A bill-pay category as returned by /billpay/bill-category. */
export interface BbpsCategory {
  id: number;
  name: string;
  /** Optional admin-set sort order (lower = earlier). */
  position?: number | null;
  /** Optional emoji or URL for UI. */
  icon?: string | null;
}

/** A biller as returned by /billpay/biller-info. */
export interface BbpsBiller {
  bill_id: number;
  /** AceNeoBank biller code (string, e.g. "KSEBL0000KER01"). */
  id: string;
  name: string;
  categoryName: string;
  mode?: number | null;
  acceptsAdhoc?: boolean | null;
  isParent?: boolean | null;
  parentBillerId?: string | null;
  fetchRequirement?: string | null;
  billerDescription?: string | null;
  blrSupportBillValidation?: boolean | null;
  supportDeemed?: boolean | null;
  supportPendingStatus?: boolean | null;
  billerTimeOut?: number | null;
  subBillers?: BbpsBiller[] | null;
}

/** Customer parameter spec returned by /billpay/customer-params. */
export interface BbpsCustomerParam {
  name: string;
  type: "NUMERIC" | "ALPHANUMERIC" | "ALPHA" | string;
  regex?: string | null;
  maxLength?: string | null;
  minLength?: string | null;
  visibility?: string | null;
  isMandatory: boolean;
  fetchRequirement?: "MANDATORY" | "OPTIONAL" | "NOT_SUPPORTED" | string | null;
}

/** Successful bill-fetch response. */
export interface BbpsBillFetchResult {
  insertid: number;
  amount: number;
  custname: string;
  dueDate: string;
  billDate: string;
  billNumber: string;
  message: string;
  requestId: string;
}

/** Successful bill-pay response. */
export interface BbpsBillPayResult {
  message: string;
  receipt: number | string;
}

/** Status lifecycle for a Bharat Connect transaction. */
export type BbpsTxStatus =
  | "draft"        // user has fetched bill but not paid
  | "processing"   // wallet debited, payment in flight
  | "success"      // provider returned success
  | "failed"       // provider rejected
  | "refunded";    // wallet refunded after failure

/** Firestore record — collection: bbps_transactions. */
export interface BbpsTransaction {
  id?: string;
  retailerId: string;
  retailerEmail: string;
  /** Provider category name (e.g. "Electricity"). */
  categoryName: string;
  /** Provider biller code (e.g. "KSEBL0000KER01"). */
  billerCode: string;
  billerName: string;
  /** Customer-entered params: { "Consumer Number": "1156024001316" } */
  params: Record<string, string>;
  /** ₹ — bill amount (the amount the customer is paying). */
  amount: number;
  /** ₹ — service charge (added on top, retained by us). */
  fee: number;
  /** ₹ — total debited from wallet (amount + fee). */
  totalDebited: number;
  status: BbpsTxStatus;
  /** AceNeoBank insertid (handle to fetched bill). */
  providerBillId?: number;
  /** AceNeoBank requestId (idempotency token). */
  providerRequestId?: string;
  /** AceNeoBank receipt number on success. */
  providerReceipt?: string | number;
  /** Provider biller mode (1/2/...) — determines validation strictness. */
  providerMode?: number | null;
  /** Bill metadata captured at fetch time. */
  billDate?: string;
  dueDate?: string;
  billNumber?: string;
  customerName?: string;
  /** Customer's mobile (for receipts/notifications). */
  mobileNo?: string;
  /** Last error from provider, if any. */
  errorMessage?: string;
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
}

/** Admin config — single doc at bbps_config/master. */
export interface BbpsMasterConfig {
  /** Provider base URL (defaults to UAT). */
  baseUrl: string;
  /** Provider agent ID (numeric, sent as `agent` field). */
  agentId: string;
  /** Default service fee (₹) added on top of every bill. */
  defaultFee: number;
  /** Per-category fee overrides. Key = category name. */
  feeByCategory: Record<string, number>;
  /** Disabled category names (hidden from UI). */
  disabledCategories: string[];
  /** Bharat Connect branding — show MOGO + sonic on success. */
  brandingEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_BBPS_CONFIG: BbpsMasterConfig = {
  baseUrl: "https://aceneobank.dev.acepe.co.in/apiService",
  agentId: "2183",
  defaultFee: 5,
  feeByCategory: {},
  disabledCategories: [],
  brandingEnabled: true,
  updatedAt: new Date(0).toISOString(),
  updatedBy: "system",
};

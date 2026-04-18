/**
 * Firestore document shapes for the PAN PORTAL subsystem.
 * Mirrors the CSC pattern (encrypted creds, per-service fees, txn ledger).
 */

export type PanTxStatus =
  | "pending"
  | "processing"
  | "success"
  | "failed"
  | "refunded";

/** Encrypted master PAN/PSA API config — single doc at pan_config/master. */
export interface PanMasterConfig {
  /** AES-GCM encrypted blob for the PAN API key (mallikacyberzone). */
  apiKeyCipher: string;
  /** UI hint of the stored API key (last 4 chars + dots). */
  apiKeyHint: string;
  /** Endpoint URLs (admin-editable). */
  urls: {
    psaCreate: string;
    couponBuy: string;
    couponStatus: string;
    passwordReset: string;
    nsdlAuth: string;
    nsdlTxnStatus: string;
    nsdlPanStatus: string;
    /** Generic "PAN status / track" URL — used for PAN Track / ePAN Download. */
    panStatus: string;
  };
  /** Disabled PAN service keys. */
  disabledServices: string[];
  /** Optional fee overrides per service key (₹). */
  feeOverrides: Record<string, number>;
  updatedAt: string;
  updatedBy: string;
}

/** Per-PAN-transaction record — Firestore collection: pan_transactions. */
export interface PanTransaction {
  id?: string;
  retailerId: string;
  retailerEmail: string;
  serviceKey: string;
  serviceName: string;
  /** User-supplied form fields. */
  fields: Record<string, string | number>;
  /** Bill / face value (e.g. coupon qty * price, or 0 for free lookups). */
  amount: number;
  /** Convenience fee debited from wallet on top of amount. */
  fee: number;
  /** Total debited = amount + fee. */
  totalDebited: number;
  status: PanTxStatus;
  /** Reference returned by upstream (order_id / vle_id / ack_no). */
  providerRef?: string;
  /** Full upstream response (sanitized JSON string). */
  providerResponse?: string;
  /** Failure reason. */
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

/** Default URLs — match the API doc the user supplied. */
export const PAN_DEFAULT_URLS: PanMasterConfig["urls"] = {
  psaCreate: "https://mallikacyberzone.com/api/psa_create",
  couponBuy: "https://mallikacyberzone.com/api/coupon_buy",
  couponStatus: "https://mallikacyberzone.com/api/coupon_status",
  passwordReset: "https://mallikacyberzone.com/api/psa_password",
  nsdlAuth: "https://mallikacyberzone.com/api/nsdl/get_authorization",
  nsdlTxnStatus: "https://mallikacyberzone.com/api/nsdl/txn_status",
  nsdlPanStatus: "https://mallikacyberzone.com/api/nsdl/pan_status",
  panStatus: "https://mallikacyberzone.com/api/nsdl/pan_status",
};

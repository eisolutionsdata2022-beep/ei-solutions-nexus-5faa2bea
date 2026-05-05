/**
 * Firestore document shapes for the CSC (EI SOLUTIONS PAY) subsystem.
 */

export type CscTxStatus =
  | "pending"
  | "processing"
  | "success"
  | "failed"
  | "refunded";

/** Encrypted master CSC credential — single doc at csc_config/master. */
export interface CscMasterConfig {
  /** AES-GCM encrypted blob: base64(iv | ciphertext | tag). */
  cipher: string;
  /** Plain text username hint (last 2 chars masked) for UI display. */
  usernameHint: string;
  /** Disabled service keys. */
  disabledServices: string[];
  /** Optional fee overrides per service key (₹). */
  feeOverrides: Record<string, number>;
  /** Optional mode overrides per service key (admin can switch bridge ↔ redirect). */
  modeOverrides?: Record<string, "bridge" | "redirect" | "paid-redirect">;
  updatedAt: string;
  updatedBy: string;
}

/** Per-transaction record — Firestore collection: csc_transactions. */
export interface CscTransaction {
  id?: string;
  retailerId: string;
  retailerEmail: string;
  serviceKey: string;
  serviceName: string;
  /** User-supplied form fields (sanitized). */
  fields: Record<string, string | number>;
  /** Transaction amount (the bill / recharge value). */
  amount: number;
  /** Convenience fee debited from wallet on top of amount. */
  fee: number;
  /** Total debited = amount + fee. */
  totalDebited: number;
  status: CscTxStatus;
  /** Reference returned by the bridge (CSC receipt no.). */
  bridgeRef?: string;
  /** Bridge response payload. */
  bridgeResponse?: Record<string, unknown>;
  /** Failure reason. */
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * PAN Portal — Legacy wallet balance migration.
 * Carries forward retailer balances from the old mallikarecharge portal.
 * One-time claim per legacy username; admin must approve every transfer.
 */

export type PanLegacyTransferStatus = "pending" | "approved" | "rejected";

/**
 * Master record imported from `Users_Lists_8.xlsx`.
 * Doc id = legacy `Username` (e.g. `RMPMCST-9447175704`).
 */
export interface PanLegacyBalance {
  username: string;          // RMPMCST-<mobile>
  mobile: string;            // 10-digit
  name: string;
  balance: number;           // ₹ — original balance
  remaining?: number;        // ₹ — balance still claimable (after partial approvals)
  claimed?: boolean;         // set true when fully claimed
  claimedBy?: string;        // retailer uid that claimed it
  claimedAt?: string;
  importedAt?: string;
}

/**
 * Per-retailer transfer request. Doc id auto.
 * After admin approval the amount is atomically credited to the retailer's
 * platform wallet via `atomicCredit`.
 */
export interface PanLegacyTransferRequest {
  id?: string;
  retailerId: string;
  retailerEmail: string;
  retailerName?: string;

  legacyUsername: string;    // RMPMCST-...
  legacyMobile: string;
  legacyName: string;
  amount: number;            // ₹ requested (= balance at time of request)

  status: PanLegacyTransferStatus;
  remarks?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

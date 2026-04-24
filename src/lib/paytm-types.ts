/**
 * Paytm v2 Payment Gateway — shared types.
 *
 * Two flows supported (mirroring legacy PHP portal):
 * 1. Checkout (redirect) — user is redirected to Paytm-hosted page,
 *    pays via card/UPI/wallet, returns to /api/public/paytm-callback.
 * 2. Dynamic QR — Paytm generates a per-transaction QR; user scans &
 *    pays from any UPI app; client polls status until success.
 */

export type PaytmEnv = "PROD" | "STAGE";
export type PaytmFlow = "checkout" | "qr";
export type PaytmTopupStatus = "pending" | "success" | "failed" | "expired";

/** Admin config — single doc at paytm_config/master. */
export interface PaytmMasterConfig {
  /** PROD or STAGE — toggles the API base URL. */
  environment: PaytmEnv;
  /** PG charges (%) deducted from credited amount. e.g. 2 means user pays ₹100 → ₹98 credit. */
  pgChargesPercent: number;
  /** Minimum top-up amount (₹). */
  minAmount: number;
  /** Master switch — disables both flows when false. */
  enabled: boolean;
  /** Show Paytm Checkout (redirect) flow on retailer wallet. */
  checkoutEnabled: boolean;
  /** Show Dynamic QR flow on retailer wallet. */
  qrEnabled: boolean;
  /** Status polling interval (seconds) for QR flow. */
  qrPollIntervalSec: number;
  /** QR expiry timeout (minutes). */
  qrExpiryMinutes: number;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_PAYTM_CONFIG: PaytmMasterConfig = {
  environment: "PROD",
  pgChargesPercent: 2,
  minAmount: 10,
  enabled: true,
  checkoutEnabled: true,
  qrEnabled: true,
  qrPollIntervalSec: 5,
  qrExpiryMinutes: 10,
  updatedAt: new Date(0).toISOString(),
  updatedBy: "system",
};

/** Firestore record — collection: wallet_topup_requests (Paytm gateway only). */
export interface PaytmTopupRequest {
  id?: string;
  /** Auto-generated order ID — `EI<flow><timestamp><userIdShort>` */
  orderId: string;
  retailerId: string;
  retailerEmail: string;
  retailerMobile?: string;
  /** Amount user is paying (gross). */
  amount: number;
  /** PG charges deducted (₹). */
  pgChargesAmount: number;
  /** Net amount credited to wallet on success (amount − pgCharges). */
  creditAmount: number;
  flow: PaytmFlow;
  status: PaytmTopupStatus;
  /** Paytm txnId on success. */
  paytmTxnId?: string;
  /** Paytm bank reference number (RRN). */
  bankTxnId?: string;
  /** Payment mode reported by Paytm (UPI / NETBANKING / CARD). */
  paymentMode?: string;
  /** Gateway name from Paytm response. */
  gatewayName?: string;
  /** QR data string (only for QR flow). */
  qrData?: string;
  /** Last error/message from Paytm. */
  message?: string;
  createdAt: string;
  paidAt?: string;
  expiresAt?: string;
}

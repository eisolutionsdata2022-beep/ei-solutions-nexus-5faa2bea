/**
 * PAN Portal — UTI PSA + Coupon types.
 * (NSDL eKYC removed — Apr 2026 rebuild.)
 */

export type PsaStatus = "pending" | "approved" | "failed";

/** Firestore: pan_psa_records/{retailerId} */
export interface PanPsaRecord {
  retailerId: string;
  vleId: string;          // RMPMCST-<mobile> (or legacy PSAxxxx for linked-existing)
  status: PsaStatus;
  /** True when retailer linked an EXISTING old-portal VLE (no upstream psa_create call). */
  linkedExisting: boolean;
  /** Legacy-migration metadata used to silently sync old VLE IDs upstream when possible. */
  linkedMobile?: string;
  vleRegCode?: string;

  ownerName: string;
  shopName: string;
  mobile: string;
  email: string;
  panNo?: string;
  uidNo?: string;
  address?: string;
  state?: string;
  pinCode?: string;

  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export type CouponStatus = "PENDING" | "SUCCESS" | "FAILED";

/** Firestore: pan_coupon_orders/{orderId} */
export interface PanCouponOrder {
  id?: string;
  retailerId: string;
  vleId: string;
  qty: number;
  /** Coupon "type" param sent to provider (default 1). */
  couponType: number;
  /** Per-coupon retailer charge at time of purchase. */
  unitFee: number;
  /** Per-coupon provider cost at time of purchase. */
  unitProviderCost: number;
  totalDebit: number;     // qty * unitFee
  providerOrderId?: string;
  providerDate?: string;
  status: CouponStatus;
  message?: string;
  refunded?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Firestore: pan_config/master */
export interface PanPortalConfig {
  /** Encrypted (AES-GCM) blob of { apiKey, secret }. */
  credCipher?: string;
  /** Display hint (last 4 chars of api key). */
  apiKeyHint?: string;

  /** Provider base URL — e.g. https://mallikacyberzone.com/api */
  providerBaseUrl: string;

  /** Per-coupon retailer charge (₹). */
  couponRetailerFee: number;
  /** Per-coupon provider cost (₹) — used for margin reporting. */
  couponProviderCost: number;

  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_PAN_CONFIG: PanPortalConfig = {
  providerBaseUrl: "https://mallikacyberzone.com/api",
  couponRetailerFee: 107,
  couponProviderCost: 100,
};

/**
 * PAN Portal — shared types for PSA Auto-ID and NSDL eKYC PAN.
 * Cloned from legacy mallikarecharge/utibot PHP portal.
 */

export interface PanMasterConfig {
  /** Encrypted credential blob (AES-GCM, base64). Decrypt server-side only. */
  cipher?: string;
  /** True once admin has saved credentials — drives "configured?" indicator. */
  hasCredentials?: boolean;

  /** Upstream URLs (admin-editable, defaults to legacy values). */
  nsdlAuthUrl?: string;          // e.g. https://mallikarecharge.in/portallogin/nsdlAuth
  nsdlGetAuthorizationUrl?: string; // e.g. https://utibot.in/api/nsdl/get_authorization
  psaCreateUrl?: string;         // {botapi_url}/api/psa_create
  psaPasswordUrl?: string;       // {botapi_url}/api/psa_password
  ssoRedirectUrl?: string;       // https://sso-nsdl-ekyc-app.pages.dev/sso_nsdl_ekyc_redirect
  digipayDashboardUrl?: string;  // https://digipaydashboard.religaredigital.in/Login/Authenticate

  /** UTI coupon endpoints (admin-editable). Same provider/api-key, different paths. */
  utiCouponPurchaseUrl?: string; // {botapi_url}/Api/PSACoupon  (provider-specific path)
  utiPanStatusUrl?: string;      // {botapi_url}/Api/PANStatus

  /** UTI service master switch — controls visibility of UTI tab. */
  utiEnabled?: boolean;

  /** Fees & margin (in ₹). */
  nsdlIdCharge?: number;         // one-time service activation charge
  panRetailerFee?: number;       // NSDL per-application retailer charge
  panProviderCost?: number;      // NSDL upstream cost — used for margin display
  psaRegistrationFee?: number;   // one-time PSA registration charge

  /** UTI per-coupon pricing (separate from NSDL). */
  utiPanRetailerFee?: number;    // per-coupon retailer charge
  utiPanProviderCost?: number;   // per-coupon upstream cost — for margin display

  /** HMAC secret for signing webhook callbacks (admin-rotatable). */
  webhookSecret?: string;

  /** Comma/newline-separated list of IPs whitelisted with the upstream provider. */
  allowedIps?: string;

  /** Service master switch. */
  enabled?: boolean;

  updatedAt?: string;
  updatedBy?: string;
}

export type PsaStatus = "none" | "pending" | "approved" | "failed";

export interface PanPsaRecord {
  retailerId: string;
  vleId: string;            // username used as UTI VLE ID
  vleRegCode?: string;      // returned by upstream on success
  status: PsaStatus;
  remark?: string;
  /** True when retailer self-linked an existing PSA ID instead of registering fresh. */
  linkedExisting?: boolean;
  /** Mobile that was registered with the existing PSA (for verification). */
  linkedMobile?: string;
  /** Snapshot of retailer info sent to upstream. */
  ownerName: string;
  shopName: string;
  mobile: string;
  email: string;
  panNo?: string;
  uidNo?: string;
  address?: string;
  state?: string;
  pinCode?: string;
  createdAt: string;
  updatedAt: string;
}

export type PanOrderStatus = "pending" | "success" | "failed" | "refunded";
export type PanApplicationType = "P" | "E"; // Physical / Electronic

export interface PanOrder {
  id?: string;             // Firestore doc id
  orderId: string;         // EKYC<timestamp>A<retailerId>
  retailerId: string;
  retailerUsername: string;

  applicationType: PanApplicationType;
  applicationMode: string;  // OTP / Biometric

  /** Applicant data. */
  name: string;
  dob: string;             // dd/MM/yyyy
  gender: "M" | "F";
  mobile: string;
  email: string;

  /** Wallet & money. */
  amount: number;          // retailer fee debited
  providerCost?: number;   // snapshot of upstream cost at time of order
  oldBalance: number;
  newBalance: number;

  /** Upstream + status. */
  refId?: string;          // upstream order_id
  ackNo?: string;          // NSDL acknowledgement no
  authorization?: string;  // SSO token
  remark?: string;
  status: PanOrderStatus;
  encryptedData?: string;  // raw encrypted callback payload

  createdAt: string;
  updatedAt: string;
}

export interface PanServiceActivation {
  retailerId: string;
  nsdlActive: boolean;
  activatedAt?: string;
  activationCharge?: number;
}

/** Default upstream URLs from legacy portal — admin can override. */
export const PAN_DEFAULT_URLS = {
  nsdlAuthUrl: "https://mallikacyberzone.com/portallogin/nsdlAuth",
  nsdlGetAuthorizationUrl: "https://utibot.in/api/nsdl/get_authorization",
  psaCreateUrl: "https://mallikacyberzone.com/api/psa_create",
  psaPasswordUrl: "https://mallikacyberzone.com/api/psa_password",
  ssoRedirectUrl: "https://sso-nsdl-ekyc-app.pages.dev/sso_nsdl_ekyc_redirect",
  digipayDashboardUrl: "https://digipaydashboard.religaredigital.in/Login/Authenticate",
  utiCouponPurchaseUrl: "https://mallikacyberzone.com/Api/PSACoupon",
  utiPanStatusUrl: "https://mallikacyberzone.com/Api/PANStatus",
} as const;

export const PAN_DEFAULT_FEES = {
  nsdlIdCharge: 100,        // service activation
  panRetailerFee: 107,      // per application
  panProviderCost: 95,      // upstream — margin = 12
  psaRegistrationFee: 0,    // free in this clone
  utiPanRetailerFee: 107,   // UTI per-coupon retailer
  utiPanProviderCost: 93,   // UTI per-coupon upstream — margin = 14
} as const;

/* ------------------------------ UTI Coupons ------------------------------ */

export type PanUtiCouponStatus =
  | "purchased"   // wallet debited, coupon issued by upstream
  | "consumed"    // customer PAN application completed
  | "failed"      // purchase failed at upstream
  | "refunded";   // wallet refunded after failure

export interface PanUtiCoupon {
  id?: string;
  couponId: string;          // upstream coupon/ack number — primary identifier
  orderId?: string;          // internal batch purchase id for wallet cross-reference
  retailerId: string;
  retailerUsername: string;
  vleId: string;             // PSA ID this coupon is tied to

  /** Money. */
  amount: number;            // retailer fee debited
  providerCost?: number;
  oldBalance: number;
  newBalance: number;

  /** Coupon lifecycle. */
  status: PanUtiCouponStatus;
  ackNo?: string;            // tracking number (often same as couponId)
  panNumber?: string;        // populated when consumed
  applicationStatus?: string; // human readable upstream status
  remark?: string;
  rawResponse?: string;      // last 2KB of upstream response

  /** Optional applicant snapshot (filled when retailer marks consumed). */
  applicantName?: string;
  applicantMobile?: string;

  createdAt: string;
  updatedAt: string;
}

export function newCouponOrderId(retailerId: string): string {
  return `UTIPAN${Date.now()}A${retailerId.slice(-6)}`;
}

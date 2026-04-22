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

  /** Fees & margin (in ₹). */
  nsdlIdCharge?: number;         // one-time service activation charge
  panRetailerFee?: number;       // per-application retailer charge
  panProviderCost?: number;      // upstream cost — used for margin display
  psaRegistrationFee?: number;   // one-time PSA registration charge

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
} as const;

export const PAN_DEFAULT_FEES = {
  nsdlIdCharge: 100,        // service activation
  panRetailerFee: 107,      // per application
  panProviderCost: 95,      // upstream — margin = 12
  psaRegistrationFee: 0,    // free in this clone
} as const;

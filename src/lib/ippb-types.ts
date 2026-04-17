/**
 * IPPB Account Opening — 19-step flow mirroring real IPPB BC App.
 * Strict turn-based: every step has a `turn` (retailer | staff) controlling
 * which side can act next. The other side sees a locked card.
 */

export type IPPBStep =
  | "basic_details"           // 1. Mobile + Product + PAN
  | "otp_verify"              // 2. OTP from customer
  | "aadhaar_auth"            // 3. Aadhaar number + consent
  | "biometric_1"             // 4. First fingerprint (Aadhaar auth)
  | "personal_info"           // 5a. Mother/Father/Husband/Wife/Email
  | "pan_address"             // 5b. PAN confirm + address + income
  | "nominee_details"         // 5c. Nominee name + DOB + relation
  | "additional_info"         // 5d. Marital + Occupation + Education + Income
  | "account_info"            // 5e. Initial Deposit + Scheme (staff)
  | "dbt_mapping"             // 6. DBT option + Verify (staff)
  | "biometric_2"             // 7. Biometric retry/data-match
  | "welcome_kit"             // 8. Welcome Kit ID
  | "final_consent"           // 9. Consent box tick
  | "biometric_final"         // 10. Final fingerprint
  | "account_created"         // 11. Account Number + Customer ID
  | "completed";              // terminal

export const STEP_ORDER: IPPBStep[] = [
  "basic_details",
  "otp_verify",
  "aadhaar_auth",
  "biometric_1",
  "personal_info",
  "pan_address",
  "nominee_details",
  "additional_info",
  "account_info",
  "dbt_mapping",
  "biometric_2",
  "welcome_kit",
  "final_consent",
  "biometric_final",
  "account_created",
  "completed",
];

export const STEP_LABELS: Record<IPPBStep, string> = {
  basic_details: "Basic Details",
  otp_verify: "OTP Verification",
  aadhaar_auth: "Aadhaar Authentication",
  biometric_1: "Biometric (Aadhaar Auth)",
  personal_info: "Personal Information",
  pan_address: "PAN & Communication Address",
  nominee_details: "Nominee Details",
  additional_info: "Additional Information",
  account_info: "Account Information",
  dbt_mapping: "DBT Mapping",
  biometric_2: "Biometric (Data Match)",
  welcome_kit: "Welcome Kit",
  final_consent: "Final Consent",
  biometric_final: "Final Biometric",
  account_created: "Account Created",
  completed: "Completed",
};

/** Who must act NEXT. Other side sees a "locked — waiting" card. */
export type Turn = "retailer" | "staff";

export const STEP_TURN: Record<IPPBStep, Turn> = {
  basic_details: "retailer",
  otp_verify: "retailer",        // retailer enters OTP
  aadhaar_auth: "retailer",
  biometric_1: "staff",          // staff triggers fingerprint
  personal_info: "retailer",
  pan_address: "retailer",
  nominee_details: "retailer",
  additional_info: "retailer",
  account_info: "staff",
  dbt_mapping: "staff",
  biometric_2: "staff",
  welcome_kit: "staff",
  final_consent: "retailer",
  biometric_final: "staff",
  account_created: "staff",
  completed: "staff",
};

/* ========== Sub-form data shapes ========== */

export interface BasicDetails {
  mobileNumber: string;        // 10-digit
  productName: string;         // "Regular Savings Account"
  panNumber: string;
}

export interface AadhaarData {
  aadhaarNumber: string;       // 12-digit
  consent: boolean;
}

export interface PersonalInfo {
  fullName: string;
  fatherOrHusbandName: string;
  motherName: string;
  email?: string;
}

export interface PanAddress {
  panNumber: string;           // re-confirm
  address: string;
  incomeType: "salaried" | "business" | "agriculture" | "other";
  annualIncome: number;
}

export interface NomineeDetails {
  nomineeName: string;
  dob: string;
  relationship: string;
}

export interface AdditionalInfo {
  maritalStatus: "single" | "married" | "divorced" | "widowed";
  occupation: string;
  education: string;
  monthlyIncome: number;
}

export interface AccountInfo {
  initialDeposit: number;      // typically 0
  scheme: string;              // "Regular Savings"
}

export interface DBTMapping {
  optIn: boolean;
  verified: boolean;
}

export interface WelcomeKit {
  kitId: string;               // scanned/typed
}

export interface BiometricCapture {
  mode: "L1_SIMULATION" | "L2_DEVICE";
  capturedAt: string;
  hash: string;
  deviceId?: string;
  staffConfirmed: boolean;
}

export interface AccountResult {
  accountNumber: string;
  customerId: string;
}

/* ========== Status (legacy compat — keep for transitions) ========== */

export type IPPBStatus =
  | "pending"
  | "in_progress"
  | "success"
  | "failed"
  | "cancelled";

export const IPPB_STATUS_LABELS: Record<IPPBStatus, string> = {
  pending: "Pending Pickup",
  in_progress: "In Progress",
  success: "Account Created",
  failed: "Failed",
  cancelled: "Cancelled",
};

/* ========== Main request doc ========== */

export interface IPPBHistoryEntry {
  step: IPPBStep;
  by: string;
  byRole: "retailer" | "staff";
  at: string;
  note?: string;
}

export interface IPPBRequest {
  id: string;
  requestNo: string;
  retailerId: string;
  retailerName: string;
  retailerEmail: string;
  staffId?: string;
  staffName?: string;

  status: IPPBStatus;
  currentStep: IPPBStep;
  turn: Turn;                  // who acts next

  // Per-step submitted data
  basicDetails?: BasicDetails;
  otp?: string;                // entered by retailer
  otpVerifiedAt?: string;
  aadhaar?: AadhaarData;
  biometric1?: BiometricCapture;
  personalInfo?: PersonalInfo;
  panAddress?: PanAddress;
  nomineeDetails?: NomineeDetails;
  additionalInfo?: AdditionalInfo;
  accountInfo?: AccountInfo;
  dbtMapping?: DBTMapping;
  biometric2?: BiometricCapture;
  welcomeKit?: WelcomeKit;
  finalConsent?: { accepted: boolean; at: string };
  biometricFinal?: BiometricCapture;
  accountResult?: AccountResult;

  failureReason?: string;
  retryCount: number;
  history: IPPBHistoryEntry[];

  createdAt: string;
  updatedAt: string;
}

export function generateRequestNo(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `IPPB-${ts}-${rand}`;
}

/** Compute progress percentage 0..100 based on current step. */
export function stepProgress(step: IPPBStep): number {
  const idx = STEP_ORDER.indexOf(step);
  if (idx < 0) return 0;
  return Math.round((idx / (STEP_ORDER.length - 1)) * 100);
}

/** Check if a step has been completed (passed) given current step. */
export function isStepDone(target: IPPBStep, current: IPPBStep): boolean {
  return STEP_ORDER.indexOf(current) > STEP_ORDER.indexOf(target);
}

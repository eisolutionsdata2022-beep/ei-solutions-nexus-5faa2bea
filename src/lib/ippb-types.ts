export type IPPBStatus =
  | "pending" // retailer created, waiting for staff to pick up
  | "mobile_entered" // staff entered mobile, OTP "sent"
  | "otp_relayed" // retailer entered OTP, staff can read it
  | "otp_verified" // staff confirmed OTP correct
  | "details_filled" // customer details captured
  | "biometric_captured" // L1 simulation or L2 device capture done
  | "submitted" // account submitted to IPPB
  | "success"
  | "failed"
  | "cancelled";

export interface IPPBCustomerDetails {
  fullName: string;
  dob: string;
  address: string;
  aadhaar: string;
  pan: string;
  occupation?: string;
  income?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  initialDeposit?: number;
  dbtMapping?: boolean;
}

export interface IPPBBiometric {
  mode: "L1_SIMULATION" | "L2_DEVICE";
  capturedAt: string;
  hash: string; // simulated hash, never raw biometric
  deviceId?: string;
  staffConfirmed: boolean;
}

export interface IPPBRequest {
  id: string;
  requestNo: string; // human-readable
  retailerId: string;
  retailerName: string;
  retailerEmail: string;
  staffId?: string;
  staffName?: string;
  status: IPPBStatus;
  mobileNumber?: string; // entered by staff
  otpRelayed?: string; // entered by retailer (read by staff)
  otpEnteredAt?: string;
  otpVerifiedAt?: string;
  customerDetails?: IPPBCustomerDetails;
  biometric?: IPPBBiometric;
  failureReason?: string;
  accountNumber?: string;
  retryCount: number;
  history: { status: IPPBStatus; at: string; by: string; note?: string }[];
  createdAt: string;
  updatedAt: string;
}

export const IPPB_STATUS_LABELS: Record<IPPBStatus, string> = {
  pending: "Pending Pickup",
  mobile_entered: "Mobile Entered – OTP Sent",
  otp_relayed: "OTP Received from Retailer",
  otp_verified: "OTP Verified",
  details_filled: "Details Filled",
  biometric_captured: "Biometric Captured",
  submitted: "Submitted to IPPB",
  success: "Account Created",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function generateRequestNo(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `IPPB-${ts}-${rand}`;
}

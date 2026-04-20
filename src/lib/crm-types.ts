export type LeadStatus = "New" | "Contacted" | "Not Interested" | "Follow-up" | "Converted";
export type CallStatus = "Answered" | "Not Answered" | "Busy" | "Switched Off";
export type PaymentStatus = "Paid" | "Pending";
export type ApplicationProgress = "Not Started" | "In Progress" | "Completed";

export const LEAD_STATUSES: LeadStatus[] = ["New", "Contacted", "Not Interested", "Follow-up", "Converted"];
export const CALL_STATUSES: CallStatus[] = ["Answered", "Not Answered", "Busy", "Switched Off"];
export const PAYMENT_STATUSES: PaymentStatus[] = ["Paid", "Pending"];
export const APP_PROGRESS: ApplicationProgress[] = ["Not Started", "In Progress", "Completed"];
export const LEAD_SOURCES = ["Facebook", "Website", "Reference", "Instagram", "Google Ads", "Walk-in", "WhatsApp", "Other"] as const;

export interface Lead {
  id: string;
  leadId: string; // auto-generated display ID like "LD-0001"
  name: string;
  phone: string;
  alternatePhone: string;
  location: string;
  courseInterested: string;
  leadSource: string;
  assignedStaffId: string;
  assignedStaffName: string;
  status: LeadStatus;
  followUpDate: string;
  followUpTime: string;
  remarks: string;
  paymentStatus: PaymentStatus;
  applicationStatus: ApplicationProgress;
  documents: LeadDocument[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** When true, lead is excluded from auto-drip enrollment + any active drip is stopped. */
  optOutDrip?: boolean;
}

export interface LeadDocument {
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface CallLog {
  id: string;
  leadId: string;
  staffId: string;
  staffName: string;
  callStatus: CallStatus;
  callDuration: string;
  callNotes: string;
  createdAt: string;
}

export interface LeadHistory {
  id: string;
  leadId: string;
  action: string;
  field: string;
  oldValue: string;
  newValue: string;
  updatedBy: string;
  updatedByName: string;
  createdAt: string;
}

export interface StaffMember {
  uid: string;
  name: string;
  email: string;
  role: string;
}

export const STATUS_COLORS: Record<LeadStatus, string> = {
  "New": "bg-blue-100 text-blue-800",
  "Contacted": "bg-yellow-100 text-yellow-800",
  "Not Interested": "bg-red-100 text-red-800",
  "Follow-up": "bg-orange-100 text-orange-800",
  "Converted": "bg-green-100 text-green-800",
};

export const CALL_STATUS_COLORS: Record<CallStatus, string> = {
  "Answered": "bg-green-100 text-green-800",
  "Not Answered": "bg-red-100 text-red-800",
  "Busy": "bg-yellow-100 text-yellow-800",
  "Switched Off": "bg-gray-100 text-gray-800",
};

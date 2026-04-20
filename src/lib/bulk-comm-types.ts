// ─── Types for Bulk Communication system ──────────────────────────────
export type ContactSource = "retailer" | "enquiry" | "uploaded" | "crmLead";

export interface UnifiedContact {
  id: string;            // composite: source:docId
  source: ContactSource;
  name: string;
  email: string;
  phone: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
}

export interface LandingEnquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  interestedIn?: string;
  status: "new" | "contacted" | "converted" | "closed";
  source: "landing-page";
  createdAt: string;
  ipAddress?: string;
}

export interface UploadedLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  tag?: string;          // e.g. "PAN-Mar-2026"
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
}

export type CampaignChannel = "email" | "whatsapp";
export type CampaignStatus = "draft" | "queued" | "sending" | "sent" | "failed" | "scheduled";

export interface BulkEmailCampaign {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;       // raw HTML from rich-text editor
  channel: CampaignChannel;
  status: CampaignStatus;
  audienceFilter: AudienceFilter;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  openedCount: number;
  scheduledFor?: string | null;
  createdBy: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  testRecipient?: string;
}

export interface AudienceFilter {
  sources: ContactSource[];
  retailerStatus?: "all" | "active" | "inactive";
  uploadedTag?: string;
  enquiryStatus?: LandingEnquiry["status"] | "all";
  customIds?: string[];        // explicit composite IDs
  excludeOptedOut: boolean;
}

export interface BulkEmailRecipient {
  id: string;
  campaignId: string;
  contactId: string;
  email: string;
  name: string;
  status: "pending" | "sent" | "delivered" | "opened" | "failed" | "skipped";
  resendId?: string;
  errorMessage?: string;
  sentAt?: string;
  openedAt?: string;
}

export interface OptOut {
  email: string;
  reason: "user-unsubscribe" | "bounce" | "complaint" | "admin";
  createdAt: string;
}

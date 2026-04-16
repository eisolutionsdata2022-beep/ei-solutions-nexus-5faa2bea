export const JOB_CATEGORIES = [
  "Typing Jobs",
  "GST Registration",
  "Accounting / Filing",
  "e-Tender Services",
  "Website Development",
  "Software Development",
  "Data Entry",
  "Digital Services",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export type JobStatus =
  | "open"          // accepting bids
  | "assigned"      // worker selected, in progress
  | "doc_requested" // worker asked for documents
  | "submitted"     // worker submitted work, awaiting review
  | "completed"     // payment released
  | "rejected"      // closed by uploader
  | "cancelled";

export interface JobDoc {
  id: string;
  uploaderId: string;
  uploaderName: string;
  title: string;
  description: string;
  category: JobCategory;
  pages?: number;
  budget: number;
  deadline: string; // ISO date
  requiredDocs: string;
  status: JobStatus;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  finalBidAmount?: number;
  workerSecurityFee?: number;
  adminCommission?: number;
  workerNet?: number;
  uploaderRefund?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BidDoc {
  id: string;
  jobId: string;
  jobTitle: string;
  workerId: string;
  workerName: string;
  amount: number;
  message?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface WorkBadgeApplicationDoc {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  skills: string;
  experience: string;
  portfolio?: string;
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface JobMessageDoc {
  id: string;
  jobId: string;
  type: "doc_request" | "doc_upload" | "submission" | "note";
  fromUserId: string;
  fromUserName: string;
  text: string;
  fileUrls?: string[];
  createdAt: string;
}

export interface JobNotificationDoc {
  id: string;
  userId: string;
  type:
    | "new_job"
    | "bid_received"
    | "bid_accepted"
    | "doc_requested"
    | "doc_uploaded"
    | "work_submitted"
    | "payment_completed";
  jobId: string;
  jobTitle: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface CategoryCommissionDoc {
  category: JobCategory;
  type: "percent" | "flat";
  value: number;
  workerSecurityFeePercent: number; // e.g. 5 = 5% of bid amount
  updatedAt: string;
}

export const DEFAULT_WORKER_SECURITY_PERCENT = 5;
export const DEFAULT_COMMISSION_PERCENT = 10;

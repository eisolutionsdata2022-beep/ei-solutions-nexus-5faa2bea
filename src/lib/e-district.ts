export type ApplicationStatus = "Pending" | "Approved" | "Rejected";

export type DocumentUploadStatus =
  | "pending"
  | "completed"
  | "failed"
  | "no_documents";

export interface UploadedServiceDocument {
  name: string;
  url: string;
  fileName: string;
}

export interface ServiceApplicationRecord {
  id: string;
  applicationNo: string;
  serviceType: string;
  fullName: string;
  dob: string;
  gender: string;
  mobile: string;
  email: string;
  aadhaar: string;
  address: string;
  district: string;
  purpose: string;
  fee: number;
  status: ApplicationStatus;
  staffRemark?: string;
  rejectionReason?: string;
  govApplicationNo?: string;
  userId: string;
  userEmail: string;
  createdAt: string;
  uploadedDocuments: UploadedServiceDocument[];
  documentUploadStatus: DocumentUploadStatus;
  reviewedBy?: string;
  reviewedAt?: string;
}

const STATUS_VALUES: ApplicationStatus[] = ["Pending", "Approved", "Rejected"];

const DOCUMENT_STATUS_VALUES: DocumentUploadStatus[] = [
  "pending",
  "completed",
  "failed",
  "no_documents",
];

export const APPLICATION_STATUS_OPTIONS = STATUS_VALUES;

export function normalizeUploadedDocuments(value: unknown): UploadedServiceDocument[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const candidate = item as Partial<UploadedServiceDocument>;
    if (
      typeof candidate.name !== "string" ||
      typeof candidate.url !== "string" ||
      typeof candidate.fileName !== "string"
    ) {
      return [];
    }

    return [candidate as UploadedServiceDocument];
  });
}

export function mapServiceApplication(
  id: string,
  data: Partial<ServiceApplicationRecord>,
): ServiceApplicationRecord {
  const status = STATUS_VALUES.includes(data.status as ApplicationStatus)
    ? (data.status as ApplicationStatus)
    : "Pending";

  const documentUploadStatus = DOCUMENT_STATUS_VALUES.includes(
    data.documentUploadStatus as DocumentUploadStatus,
  )
    ? (data.documentUploadStatus as DocumentUploadStatus)
    : "pending";

  return {
    id,
    applicationNo: data.applicationNo ?? "",
    serviceType: data.serviceType ?? "",
    fullName: data.fullName ?? data.userEmail ?? "",
    dob: data.dob ?? "",
    gender: data.gender ?? "",
    mobile: data.mobile ?? "",
    email: data.email ?? "",
    aadhaar: data.aadhaar ?? "",
    address: data.address ?? "",
    district: data.district ?? "",
    purpose: data.purpose ?? "",
    fee: typeof data.fee === "number" ? data.fee : 0,
    status,
    staffRemark: data.staffRemark ?? "",
    rejectionReason: data.rejectionReason ?? "",
    govApplicationNo: data.govApplicationNo ?? "",
    userId: data.userId ?? "",
    userEmail: data.userEmail ?? "",
    createdAt: data.createdAt ?? new Date(0).toISOString(),
    uploadedDocuments: normalizeUploadedDocuments(data.uploadedDocuments),
    documentUploadStatus,
    reviewedBy: data.reviewedBy ?? "",
    reviewedAt: data.reviewedAt ?? "",
  };
}

export function formatApplicationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export function getDocumentStatusLabel(status: DocumentUploadStatus) {
  switch (status) {
    case "completed":
      return "Files ready";
    case "failed":
      return "Upload failed";
    case "no_documents":
      return "No files";
    default:
      return "Uploading";
  }
}
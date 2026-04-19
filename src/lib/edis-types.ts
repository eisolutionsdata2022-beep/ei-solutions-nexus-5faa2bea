/**
 * E-dis (E-District / E-Governance) — clean v2 types & catalog.
 * Stored at Firestore collection: edisApplications
 */
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

export type EdisStatus = "pending" | "approved" | "rejected" | "completed";

export interface EdisServiceInfo {
  key: string;
  name: string;
  malayalam?: string;
  category: "certificate" | "other";
  fee: number;
  processingDays: string;
  validity: string;
  requiredDocuments: string[];
}

export interface EdisUploadedDoc {
  name: string;
  url: string;
  fileName: string;
}

export interface EdisApplication {
  id?: string;
  applicationNo: string;
  serviceKey: string;
  serviceName: string;
  fee: number;
  fullName: string;
  dob: string;
  gender: string;
  mobile: string;
  email: string;
  aadhaar: string;
  address: string;
  district: string;
  pincode: string;
  purpose: string;
  documents: EdisUploadedDoc[];
  status: EdisStatus;
  staffRemark: string;
  rejectionReason: string;
  govReceiptNo: string;
  reviewedBy: string;
  reviewedAt: string;
  retailerId: string;
  retailerEmail: string;
  retailerName: string;
  walletDebited: boolean;
  refundedAt: string;
  createdAt: string;
}

export const EDIS_SERVICES: EdisServiceInfo[] = [
  { key: "income", name: "Income Certificate", malayalam: "വരുമാന സർട്ടിഫിക്കറ്റ്", category: "certificate", fee: 75, processingDays: "6 days", validity: "1 year", requiredDocuments: ["Affidavit", "Salary Certificate", "IT Return", "Ration Card"] },
  { key: "community", name: "Community Certificate", malayalam: "സമുദായ സർട്ടിഫിക്കറ്റ്", category: "certificate", fee: 50, processingDays: "5 days", validity: "3 years", requiredDocuments: ["Affidavit", "Caste Proof", "Ration Card", "School Certificate"] },
  { key: "caste", name: "Caste Certificate", malayalam: "ജാതി സർട്ടിഫിക്കറ്റ്", category: "certificate", fee: 50, processingDays: "3 days", validity: "3 years", requiredDocuments: ["Affidavit", "Ration Card", "School Certificate"] },
  { key: "nativity", name: "Nativity Certificate", malayalam: "ജന്മദേശ സർട്ടിഫിക്കറ്റ്", category: "certificate", fee: 50, processingDays: "6 days", validity: "Lifetime", requiredDocuments: ["Birth Certificate", "Ration Card", "School Certificate"] },
  { key: "domicile", name: "Domicile Certificate", malayalam: "സ്ഥിര താമസ സർട്ടിഫിക്കറ്റ്", category: "certificate", fee: 50, processingDays: "3 days", validity: "Lifetime", requiredDocuments: ["Aadhaar", "Birth Certificate"] },
  { key: "identification", name: "Identification Certificate", category: "certificate", fee: 50, processingDays: "5 days", validity: "10 years", requiredDocuments: ["Aadhaar", "ID Proof", "Ration Card"] },
  { key: "possession", name: "Possession Certificate", category: "certificate", fee: 100, processingDays: "7 days", validity: "Special", requiredDocuments: ["Aadhaar", "Land Tax", "Sale Deed"] },
  { key: "solvency", name: "Solvency Certificate", category: "certificate", fee: 100, processingDays: "6 days", validity: "Special", requiredDocuments: ["Aadhaar", "Land Tax", "Encumbrance"] },
  { key: "relationship", name: "Relationship Certificate", category: "certificate", fee: 75, processingDays: "7 days", validity: "Special", requiredDocuments: ["Aadhaar", "Ration Card", "School Certificate"] },
  { key: "legal-heir", name: "Legal Heir Certificate", malayalam: "നിയമപരമായ അവകാശി", category: "certificate", fee: 150, processingDays: "45+ days", validity: "Lifetime", requiredDocuments: ["Death Certificate", "Aadhaar", "Ration Card"] },
  { key: "dependency", name: "Dependency Certificate", category: "certificate", fee: 75, processingDays: "7 days", validity: "Special", requiredDocuments: ["Death Certificate", "Affidavit"] },
  { key: "destitute", name: "Destitute Certificate", category: "certificate", fee: 50, processingDays: "5 days", validity: "3 years", requiredDocuments: ["Aadhaar", "Ration Card"] },
  { key: "family-membership", name: "Family Membership Certificate", category: "certificate", fee: 50, processingDays: "6 days", validity: "3 years", requiredDocuments: ["Aadhaar", "Ration Card", "School Certificate"] },
  { key: "inter-caste-marriage", name: "Inter-Caste Marriage Certificate", category: "certificate", fee: 100, processingDays: "7 days", validity: "Special", requiredDocuments: ["Marriage Certificate", "Aadhaar"] },
  { key: "non-remarriage", name: "Non-ReMarriage Certificate", category: "certificate", fee: 75, processingDays: "5 days", validity: "Special", requiredDocuments: ["Death Certificate", "Aadhaar"] },
  { key: "one-and-same", name: "One and Same Certificate", category: "certificate", fee: 50, processingDays: "5 days", validity: "Lifetime", requiredDocuments: ["Aadhaar", "School Certificate"] },
  { key: "non-attachment", name: "Possession & Non-Attachment Certificate", category: "certificate", fee: 100, processingDays: "7 days", validity: "Special", requiredDocuments: ["Land Tax", "Sale Deed"] },
  { key: "valuation", name: "Valuation Certificate", category: "certificate", fee: 200, processingDays: "15 days", validity: "Special", requiredDocuments: ["Tax Receipt", "Sale Deed"] },
  { key: "widow", name: "Widow/Widower Certificate", malayalam: "വിധവ സർട്ടിഫിക്കറ്റ്", category: "certificate", fee: 75, processingDays: "5 days", validity: "Special", requiredDocuments: ["Death Certificate", "Aadhaar"] },
  { key: "conversion", name: "Conversion Certificate", category: "certificate", fee: 100, processingDays: "7 days", validity: "Special", requiredDocuments: ["Gazette", "Conversion Proof"] },
  { key: "non-creamy", name: "Non-Creamy Layer Certificate", category: "certificate", fee: 75, processingDays: "5 days", validity: "1 year", requiredDocuments: ["Income Proof", "Salary Certificate"] },
  { key: "land", name: "Land Certificate", category: "certificate", fee: 100, processingDays: "6 days", validity: "Special", requiredDocuments: ["Land Tax", "Sale Deed"] },
  { key: "minority", name: "Minority Certificate", category: "certificate", fee: 50, processingDays: "3 days", validity: "3 years", requiredDocuments: ["Ration Card", "School Certificate"] },
  { key: "birth", name: "Birth Certificate", malayalam: "ജനന സർട്ടിഫിക്കറ്റ്", category: "certificate", fee: 50, processingDays: "5 days", validity: "Lifetime", requiredDocuments: ["Hospital Record", "Aadhaar of Parents"] },
  { key: "death", name: "Death Certificate", malayalam: "മരണ സർട്ടിഫിക്കറ്റ്", category: "certificate", fee: 50, processingDays: "5 days", validity: "Lifetime", requiredDocuments: ["Hospital Record", "Aadhaar"] },
  { key: "marriage", name: "Marriage Certificate", malayalam: "വിവാഹ സർട്ടിഫിക്കറ്റ്", category: "certificate", fee: 100, processingDays: "7 days", validity: "Lifetime", requiredDocuments: ["Marriage Photo", "Aadhaar of Bride/Groom", "Witness ID"] },
  { key: "nature-camp", name: "Nature Camp Permission", category: "other", fee: 150, processingDays: "Depends", validity: "Special", requiredDocuments: ["ID Proof", "Request Letter", "Participant List"] },
];

export const KERALA_DISTRICTS = [
  "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam",
  "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram",
  "Kozhikode", "Wayanad", "Kannur", "Kasaragod",
];

export const EDIS_STATUS_OPTIONS: EdisStatus[] = ["pending", "approved", "rejected", "completed"];

export function generateEdisAppNo(): string {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `EDIS-${ts}-${rand}`;
}

export function formatEdisDate(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function getEdisStatusColor(status: EdisStatus): string {
  switch (status) {
    case "approved": return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    case "completed": return "bg-blue-500/15 text-blue-700 border-blue-500/30";
    case "rejected": return "bg-rose-500/15 text-rose-700 border-rose-500/30";
    default: return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  }
}

function sanitize(value: string, fallback: string): string {
  const out = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return out || fallback;
}

export interface EdisDocInput {
  name: string;
  file: File;
}

export async function uploadEdisDocuments(opts: {
  appNo: string;
  retailerId: string;
  documents: EdisDocInput[];
}): Promise<EdisUploadedDoc[]> {
  const out: EdisUploadedDoc[] = [];
  for (let i = 0; i < opts.documents.length; i++) {
    const item = opts.documents[i];
    if (!item.file) continue;
    const path = [
      "edisDocuments",
      sanitize(opts.retailerId, "user"),
      sanitize(opts.appNo, "app"),
      `${i + 1}-${sanitize(item.name, "doc")}-${sanitize(item.file.name, "file")}`,
    ].join("/");
    const storageRef = ref(storage, path);
    const snap = await uploadBytes(storageRef, item.file, {
      contentType: item.file.type || "application/octet-stream",
      customMetadata: { originalFileName: item.file.name },
    });
    const url = await getDownloadURL(snap.ref);
    out.push({ name: item.name, url, fileName: item.file.name });
  }
  return out;
}

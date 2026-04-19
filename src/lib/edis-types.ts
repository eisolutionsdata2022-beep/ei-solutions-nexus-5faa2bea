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

  // Applicant
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

  // Files
  documents: EdisUploadedDoc[];

  // Workflow
  status: EdisStatus;
  staffRemark: string;
  rejectionReason: string;
  govReceiptNo: string;
  reviewedBy: string;
  reviewedAt: string;

  // Audit
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
  { key: "inter-caste-marriage", name: "Inter-Caste Marriage Certificate", category: "certificate", fee: 100, processingDays: "7 days", validity: "Special", requiredDocuments: ["Marriage Certificate", "Aadhaar"
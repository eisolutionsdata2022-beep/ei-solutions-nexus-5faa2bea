export interface ServiceInfo {
  name: string;
  processingDays: string;
  validity: string;
  requiredDocuments: string[];
  category: "certificate" | "other";
  fee: number;
}

export const SERVICE_CATALOG: ServiceInfo[] = [
  { name: "Community Certificate", processingDays: "5 days", validity: "3 years", requiredDocuments: ["Affidavit", "Caste Proof", "Ration Card", "School Certificate"], category: "certificate", fee: 50 },
  { name: "Caste Certificate", processingDays: "3 days", validity: "3 years", requiredDocuments: ["Affidavit", "Ration Card", "School Certificate"], category: "certificate", fee: 50 },
  { name: "Income Certificate", processingDays: "6 days", validity: "1 year", requiredDocuments: ["Affidavit", "Salary Certificate", "IT Return", "Ration Card"], category: "certificate", fee: 75 },
  { name: "Identification Certificate", processingDays: "5 days", validity: "10 years", requiredDocuments: ["Aadhaar", "ID Proof", "Ration Card"], category: "certificate", fee: 50 },
  { name: "Nativity Certificate", processingDays: "6 days", validity: "Lifetime", requiredDocuments: ["Birth Certificate", "Ration Card", "School Certificate"], category: "certificate", fee: 50 },
  { name: "Possession Certificate", processingDays: "7 days", validity: "Special", requiredDocuments: ["Aadhaar", "Land Tax", "Sale Deed"], category: "certificate", fee: 100 },
  { name: "Solvency Certificate", processingDays: "6 days", validity: "Special", requiredDocuments: ["Aadhaar", "Land Tax", "Encumbrance"], category: "certificate", fee: 100 },
  { name: "Relationship Certificate", processingDays: "7 days", validity: "Special", requiredDocuments: ["Aadhaar", "Ration Card", "School Certificate"], category: "certificate", fee: 75 },
  { name: "Legal Heir Certificate", processingDays: "45+ days", validity: "Lifetime", requiredDocuments: ["Death Certificate", "Aadhaar", "Ration Card"], category: "certificate", fee: 150 },
  { name: "Domicile Certificate", processingDays: "3 days", validity: "Lifetime", requiredDocuments: ["Aadhaar", "Birth Certificate"], category: "certificate", fee: 50 },
  { name: "Dependency Certificate", processingDays: "7 days", validity: "Special", requiredDocuments: ["Death Certificate", "Affidavit"], category: "certificate", fee: 75 },
  { name: "Destitute Certificate", processingDays: "5 days", validity: "3 years", requiredDocuments: ["Aadhaar", "Ration Card"], category: "certificate", fee: 50 },
  { name: "Family Membership Certificate", processingDays: "6 days", validity: "3 years", requiredDocuments: ["Aadhaar", "Ration Card", "School Certificate"], category: "certificate", fee: 50 },
  { name: "Inter-Caste Marriage Certificate", processingDays: "7 days", validity: "Special", requiredDocuments: ["Marriage Certificate", "Aadhaar"], category: "certificate", fee: 100 },
  { name: "Non-ReMarriage Certificate", processingDays: "5 days", validity: "Special", requiredDocuments: ["Death Certificate", "Aadhaar"], category: "certificate", fee: 75 },
  { name: "One and Same Certificate", processingDays: "5 days", validity: "Lifetime", requiredDocuments: ["Aadhaar", "School Certificate"], category: "certificate", fee: 50 },
  { name: "Possession & Non-Attachment Certificate", processingDays: "7 days", validity: "Special", requiredDocuments: ["Land Tax", "Sale Deed"], category: "certificate", fee: 100 },
  { name: "Valuation Certificate", processingDays: "15 days", validity: "Special", requiredDocuments: ["Tax Receipt", "Sale Deed"], category: "certificate", fee: 200 },
  { name: "Widow/Widower Certificate", processingDays: "5 days", validity: "Special", requiredDocuments: ["Death Certificate", "Aadhaar"], category: "certificate", fee: 75 },
  { name: "Conversion Certificate", processingDays: "7 days", validity: "Special", requiredDocuments: ["Gazette", "Conversion Proof"], category: "certificate", fee: 100 },
  { name: "Non-Creamy Layer Certificate", processingDays: "5 days", validity: "1 year", requiredDocuments: ["Income Proof", "Salary Certificate"], category: "certificate", fee: 75 },
  { name: "Land Certificate", processingDays: "6 days", validity: "Special", requiredDocuments: ["Land Tax", "Sale Deed"], category: "certificate", fee: 100 },
  { name: "Minority Certificate", processingDays: "3 days", validity: "3 years", requiredDocuments: ["Ration Card", "School Certificate"], category: "certificate", fee: 50 },
  { name: "Nature Camp Permission", processingDays: "Depends", validity: "Special", requiredDocuments: ["ID Proof", "Request Letter", "Participant List"], category: "other", fee: 150 },
  { name: "Wildlife Compensation (Death)", processingDays: "Case based", validity: "Special", requiredDocuments: ["Death Certificate", "FIR", "Bank Passbook"], category: "other", fee: 0 },
  { name: "Wildlife Compensation (Property)", processingDays: "Case based", validity: "Special", requiredDocuments: ["ID Proof", "Tax Receipt", "Photos"], category: "other", fee: 0 },
];

export const DISTRICTS = [
  "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam",
  "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram",
  "Kozhikode", "Wayanad", "Kannur", "Kasaragod",
];

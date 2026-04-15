export type FieldType = "text" | "number" | "phone" | "email" | "textarea" | "select" | "date" | "file";

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // for select type
  placeholder?: string;
}

export interface CustomForm {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  formTitle: string;
  userId: string;
  userEmail: string;
  userName: string;
  data: Record<string, string>;
  fileUrls: { fieldId: string; fileName: string; url: string }[];
  status: "Pending" | "Verified" | "Rejected";
  applicationNo: string;
  staffRemark: string;
  reviewedBy: string;
  reviewedAt: string;
  createdAt: string;
}

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "textarea", label: "Textarea" },
  { value: "select", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "file", label: "File Upload" },
];

export function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

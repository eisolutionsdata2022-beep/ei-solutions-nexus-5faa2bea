/**
 * EI SOLUTIONS PAY — CSC service catalog.
 * These services are executed via the VPS scraper bridge using a single
 * admin-managed master CSC account.
 */
import {
  Zap,
  Droplet,
  Flame,
  Car,
  Shield,
  Smartphone,
  Tv,
  Wifi,
  GraduationCap,
  CreditCard,
  Building2,
  Receipt,
  type LucideIcon,
} from "lucide-react";

export type CscServiceCategory =
  | "bill-payment"
  | "recharge"
  | "insurance"
  | "banking"
  | "education"
  | "other";

export interface CscService {
  /** Stable key used for routing/logging — never rename. */
  key: string;
  name: string;
  category: CscServiceCategory;
  description: string;
  /** Convenience fee charged to retailer wallet (₹). Admin can override. */
  defaultFee: number;
  /** Field schema rendered dynamically in the execution dialog. */
  fields: CscField[];
  icon: LucideIcon;
  /** Tailwind gradient classes for tile background. */
  gradient: string;
}

export interface CscField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** Optional helper hint shown beneath the field. */
  hint?: string;
}

export const CSC_SERVICES: CscService[] = [
  {
    key: "electricity",
    name: "Electricity Bill",
    category: "bill-payment",
    description: "Pay state electricity board bills (KSEB, TNEB, etc.)",
    defaultFee: 5,
    icon: Zap,
    gradient: "from-yellow-500 to-orange-500",
    fields: [
      { key: "board", label: "Electricity Board", type: "text", placeholder: "e.g. KSEB", required: true },
      { key: "consumerNumber", label: "Consumer Number", type: "text", required: true },
      { key: "amount", label: "Amount (₹)", type: "number", required: true },
    ],
  },
  {
    key: "water",
    name: "Water Bill",
    category: "bill-payment",
    description: "Pay municipal water bills",
    defaultFee: 5,
    icon: Droplet,
    gradient: "from-sky-500 to-blue-500",
    fields: [
      { key: "utility", label: "Water Utility", type: "text", placeholder: "e.g. KWA", required: true },
      { key: "consumerNumber", label: "Consumer Number", type: "text", required: true },
      { key: "amount", label: "Amount (₹)", type: "number", required: true },
    ],
  },
  {
    key: "lpg",
    name: "LPG / Gas Booking",
    category: "bill-payment",
    description: "Book LPG cylinder & pay PNG bill",
    defaultFee: 5,
    icon: Flame,
    gradient: "from-rose-500 to-red-600",
    fields: [
      { key: "provider", label: "Provider", type: "select", required: true, options: [
        { value: "indane", label: "Indane" }, { value: "hp", label: "HP Gas" }, { value: "bharat", label: "Bharat Gas" },
      ]},
      { key: "consumerNumber", label: "Consumer / LPG ID", type: "text", required: true },
      { key: "amount", label: "Amount (₹)", type: "number", required: true },
    ],
  },
  {
    key: "fastag",
    name: "FASTag Recharge",
    category: "recharge",
    description: "Recharge any bank FASTag",
    defaultFee: 5,
    icon: Car,
    gradient: "from-emerald-500 to-teal-600",
    fields: [
      { key: "vehicleNumber", label: "Vehicle Number", type: "text", placeholder: "KL01AA1234", required: true },
      { key: "amount", label: "Amount (₹)", type: "number", required: true },
    ],
  },
  {
    key: "insurance-life",
    name: "Life Insurance Premium",
    category: "insurance",
    description: "Pay LIC and other life insurance premiums",
    defaultFee: 10,
    icon: Shield,
    gradient: "from-indigo-500 to-violet-600",
    fields: [
      { key: "insurer", label: "Insurer", type: "text", placeholder: "e.g. LIC of India", required: true },
      { key: "policyNumber", label: "Policy Number", type: "text", required: true },
      { key: "amount", label: "Premium Amount (₹)", type: "number", required: true },
    ],
  },
  {
    key: "insurance-health",
    name: "Health Insurance",
    category: "insurance",
    description: "Pay health insurance premiums",
    defaultFee: 10,
    icon: Shield,
    gradient: "from-pink-500 to-rose-600",
    fields: [
      { key: "insurer", label: "Insurer", type: "text", required: true },
      { key: "policyNumber", label: "Policy Number", type: "text", required: true },
      { key: "amount", label: "Premium Amount (₹)", type: "number", required: true },
    ],
  },
  {
    key: "mobile-postpaid",
    name: "Mobile Postpaid",
    category: "bill-payment",
    description: "Pay postpaid mobile bills",
    defaultFee: 3,
    icon: Smartphone,
    gradient: "from-fuchsia-500 to-purple-600",
    fields: [
      { key: "operator", label: "Operator", type: "text", required: true },
      { key: "mobileNumber", label: "Mobile Number", type: "text", required: true },
      { key: "amount", label: "Amount (₹)", type: "number", required: true },
    ],
  },
  {
    key: "dth",
    name: "DTH Recharge",
    category: "recharge",
    description: "Recharge any DTH connection",
    defaultFee: 3,
    icon: Tv,
    gradient: "from-cyan-500 to-blue-600",
    fields: [
      { key: "operator", label: "DTH Operator", type: "select", required: true, options: [
        { value: "tata-play", label: "Tata Play" }, { value: "airtel", label: "Airtel" },
        { value: "dish", label: "Dish TV" }, { value: "d2h", label: "Videocon D2H" }, { value: "sun", label: "Sun Direct" },
      ]},
      { key: "subscriberId", label: "Subscriber ID", type: "text", required: true },
      { key: "amount", label: "Amount (₹)", type: "number", required: true },
    ],
  },
  {
    key: "broadband",
    name: "Broadband / Landline",
    category: "bill-payment",
    description: "Pay broadband and landline bills",
    defaultFee: 5,
    icon: Wifi,
    gradient: "from-blue-500 to-indigo-600",
    fields: [
      { key: "operator", label: "Operator", type: "text", required: true },
      { key: "accountNumber", label: "Account / CA Number", type: "text", required: true },
      { key: "amount", label: "Amount (₹)", type: "number", required: true },
    ],
  },
  {
    key: "education-fee",
    name: "Education Fee",
    category: "education",
    description: "Pay school / college fees",
    defaultFee: 10,
    icon: GraduationCap,
    gradient: "from-amber-500 to-orange-600",
    fields: [
      { key: "institute", label: "Institute Name", type: "text", required: true },
      { key: "studentId", label: "Student / Roll Number", type: "text", required: true },
      { key: "amount", label: "Amount (₹)", type: "number", required: true },
    ],
  },
  {
    key: "credit-card",
    name: "Credit Card Bill",
    category: "bill-payment",
    description: "Pay any bank credit card bill",
    defaultFee: 10,
    icon: CreditCard,
    gradient: "from-slate-600 to-zinc-800",
    fields: [
      { key: "bank", label: "Bank Name", type: "text", required: true },
      { key: "cardNumber", label: "Card Number (last 16)", type: "text", required: true },
      { key: "amount", label: "Amount (₹)", type: "number", required: true },
    ],
  },
  {
    key: "loan-emi",
    name: "Loan EMI",
    category: "banking",
    description: "Pay loan EMIs",
    defaultFee: 10,
    icon: Building2,
    gradient: "from-teal-600 to-emerald-700",
    fields: [
      { key: "lender", label: "Lender / Bank", type: "text", required: true },
      { key: "loanAccount", label: "Loan Account Number", type: "text", required: true },
      { key: "amount", label: "EMI Amount (₹)", type: "number", required: true },
    ],
  },
  {
    key: "municipal-tax",
    name: "Municipal / Property Tax",
    category: "bill-payment",
    description: "Pay property tax to local bodies",
    defaultFee: 10,
    icon: Receipt,
    gradient: "from-stone-500 to-stone-700",
    fields: [
      { key: "body", label: "Local Body", type: "text", placeholder: "e.g. Trivandrum Corp.", required: true },
      { key: "propertyId", label: "Property ID", type: "text", required: true },
      { key: "amount", label: "Amount (₹)", type: "number", required: true },
    ],
  },
];

export function getCscService(key: string): CscService | undefined {
  return CSC_SERVICES.find((s) => s.key === key);
}

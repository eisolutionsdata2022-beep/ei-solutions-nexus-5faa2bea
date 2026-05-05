/**
 * EI SOLUTIONS PAY — CSC service catalog.
 *
 * Two execution modes per service:
 *  - "bridge"   → Puppeteer VPS scraper auto-fills the CSC form using master
 *                 credentials. Wallet debited (amount + convenience fee).
 *  - "redirect" → Service requires CSC Wallet PIN or external redirect that
 *                 cannot be safely automated. Opens the official CSC URL in a
 *                 new tab. NO wallet debit (retailer pays from CSC wallet).
 *
 * Add a new service by appending to CSC_SERVICES with the correct mode.
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
  Banknote,
  Plane,
  TrainFront,
  Bus,
  HeartPulse,
  Landmark,
  FileText,
  Briefcase,
  ScrollText,
  IdCard,
  PiggyBank,
  Globe,
  type LucideIcon,
} from "lucide-react";

export type CscServiceCategory =
  | "bill-payment"
  | "recharge"
  | "insurance"
  | "banking"
  | "education"
  | "travel"
  | "government"
  | "other";

export type CscServiceMode = "bridge" | "redirect" | "paid-redirect";

export interface CscService {
  /** Stable key used for routing/logging — never rename. */
  key: string;
  name: string;
  category: CscServiceCategory;
  description: string;
  /** Convenience fee (₹) — only used when mode === "bridge". */
  defaultFee: number;
  /** Field schema rendered dynamically in the execution dialog (bridge mode). */
  fields: CscField[];
  icon: LucideIcon;
  /** Tailwind gradient classes for tile background. */
  gradient: string;
  /** Execution mode. Defaults to "bridge". */
  mode: CscServiceMode;
  /** Official CSC URL — required for "redirect" mode. */
  cscUrl?: string;
}

export interface CscField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  hint?: string;
}

export const CSC_SERVICES: CscService[] = [
  // ─────────────── BRIDGE-AUTOMATED (PIN-less) ───────────────
  {
    key: "electricity",
    name: "Electricity Bill",
    category: "bill-payment",
    description: "Pay state electricity board bills (KSEB, TNEB, etc.)",
    defaultFee: 5,
    icon: Zap,
    gradient: "from-yellow-500 to-orange-500",
    mode: "bridge",
    fields: [
      { key: "board", label: "Electricity Board", type: "text", placeholder: "e.g. KSEB", required: true },
      { key: "consumerNumber", label: "Consumer Number", type: "text", required: true },
      { key: "amount", label: "Amount (₹)", type: "number", required: true },
    ],
  },
  {
    key: "mobile-recharge",
    name: "Mobile Recharge",
    category: "recharge",
    description: "Prepaid mobile recharge — Jio, Airtel, Vi, BSNL",
    defaultFee: 2,
    icon: Smartphone,
    gradient: "from-violet-500 to-purple-600",
    mode: "bridge",
    fields: [
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { value: "jio", label: "Jio" }, { value: "airtel", label: "Airtel" },
        { value: "vi", label: "Vi" }, { value: "bsnl", label: "BSNL" },
      ]},
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
    mode: "bridge",
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
    key: "fastag",
    name: "FASTag Recharge",
    category: "recharge",
    description: "Recharge any bank FASTag",
    defaultFee: 5,
    icon: Car,
    gradient: "from-emerald-500 to-teal-600",
    mode: "bridge",
    fields: [
      { key: "vehicleNumber", label: "Vehicle Number", type: "text", placeholder: "KL01AA1234", required: true },
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
    mode: "bridge",
    fields: [
      { key: "provider", label: "Provider", type: "select", required: true, options: [
        { value: "indane", label: "Indane" }, { value: "hp", label: "HP Gas" }, { value: "bharat", label: "Bharat Gas" },
      ]},
      { key: "consumerNumber", label: "Consumer / LPG ID", type: "text", required: true },
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
    mode: "bridge",
    fields: [
      { key: "utility", label: "Water Utility", type: "text", placeholder: "e.g. KWA", required: true },
      { key: "consumerNumber", label: "Consumer Number", type: "text", required: true },
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
    mode: "bridge",
    fields: [
      { key: "operator", label: "Operator", type: "text", required: true },
      { key: "accountNumber", label: "Account / CA Number", type: "text", required: true },
      { key: "amount", label: "Amount (₹)", type: "number", required: true },
    ],
  },

  // ─────────────── REDIRECT (PIN required → CSC portal) ───────────────
  {
    key: "bbps-lite",
    name: "BBPS Lite",
    category: "bill-payment",
    description: "Bharat Connect — all bill payments. Opens CSC portal.",
    defaultFee: 0,
    icon: Receipt,
    gradient: "from-orange-500 to-red-500",
    mode: "redirect",
    cscUrl: "https://billpaymentlite.csccloud.in",
    fields: [],
  },
  {
    key: "insurance-life",
    name: "Life Insurance Premium",
    category: "insurance",
    description: "LIC and other life insurance premiums (CSC portal)",
    defaultFee: 0,
    icon: Shield,
    gradient: "from-indigo-500 to-violet-600",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "insurance-health",
    name: "Health Insurance",
    category: "insurance",
    description: "Health insurance premiums (CSC portal)",
    defaultFee: 0,
    icon: HeartPulse,
    gradient: "from-pink-500 to-rose-600",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "telecom",
    name: "Telecom Services",
    category: "bill-payment",
    description: "Postpaid bill, new connection (CSC portal)",
    defaultFee: 0,
    icon: Smartphone,
    gradient: "from-fuchsia-500 to-purple-600",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "tax-payment",
    name: "Tax Payment",
    category: "government",
    description: "Income Tax / GST payment (CSC portal)",
    defaultFee: 0,
    icon: ScrollText,
    gradient: "from-amber-600 to-yellow-700",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "tax-return",
    name: "Tax Return (ITR)",
    category: "government",
    description: "File income tax returns (CSC portal)",
    defaultFee: 0,
    icon: FileText,
    gradient: "from-orange-600 to-amber-700",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "pension",
    name: "Pension Services",
    category: "government",
    description: "APY, NPS, Maandhan schemes (CSC portal)",
    defaultFee: 0,
    icon: PiggyBank,
    gradient: "from-emerald-600 to-green-700",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "health",
    name: "Health Services",
    category: "other",
    description: "Telemedicine, ABHA, e-Hospital (CSC portal)",
    defaultFee: 0,
    icon: HeartPulse,
    gradient: "from-red-500 to-pink-600",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "credit-card",
    name: "Credit Card Bill",
    category: "bill-payment",
    description: "Pay credit card bills (CSC portal)",
    defaultFee: 0,
    icon: CreditCard,
    gradient: "from-slate-600 to-zinc-800",
    mode: "redirect",
    cscUrl: "https://billpaymentlite.csccloud.in",
    fields: [],
  },
  {
    key: "loan-emi",
    name: "Loan Repayment",
    category: "banking",
    description: "Pay loan EMIs (CSC portal)",
    defaultFee: 0,
    icon: Building2,
    gradient: "from-teal-600 to-emerald-700",
    mode: "redirect",
    cscUrl: "https://billpaymentlite.csccloud.in",
    fields: [],
  },
  {
    key: "municipal-tax",
    name: "Municipal / Property Tax",
    category: "government",
    description: "Property tax to local bodies (CSC portal)",
    defaultFee: 0,
    icon: Landmark,
    gradient: "from-stone-500 to-stone-700",
    mode: "redirect",
    cscUrl: "https://billpaymentlite.csccloud.in",
    fields: [],
  },
  {
    key: "education-fee",
    name: "Education Fee",
    category: "education",
    description: "School / college fees (CSC portal)",
    defaultFee: 0,
    icon: GraduationCap,
    gradient: "from-amber-500 to-orange-600",
    mode: "redirect",
    cscUrl: "https://billpaymentlite.csccloud.in",
    fields: [],
  },
  {
    key: "skills",
    name: "Skill Development",
    category: "education",
    description: "PMKVY, NDLM, CSC Academy (CSC portal)",
    defaultFee: 0,
    icon: Briefcase,
    gradient: "from-indigo-600 to-blue-700",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "demat",
    name: "Demat Account",
    category: "banking",
    description: "Open demat & trading account (CSC portal)",
    defaultFee: 0,
    icon: Banknote,
    gradient: "from-green-600 to-emerald-700",
    mode: "redirect",
    cscUrl: "https://demat.csccloud.in/",
    fields: [],
  },
  {
    key: "e-shram",
    name: "e-Shram Card",
    category: "government",
    description: "Unorganised worker registration (CSC portal)",
    defaultFee: 0,
    icon: IdCard,
    gradient: "from-amber-700 to-orange-800",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "pan-validate",
    name: "PAN Validation / UTI PAN",
    category: "government",
    description: "Apply / validate PAN (CSC portal)",
    defaultFee: 0,
    icon: IdCard,
    gradient: "from-blue-700 to-indigo-800",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "cibil",
    name: "CIBIL Score Check",
    category: "banking",
    description: "Credit score & report (CSC portal)",
    defaultFee: 0,
    icon: ScrollText,
    gradient: "from-purple-600 to-pink-700",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "travel",
    name: "Travel Booking",
    category: "travel",
    description: "Flight, train, bus (CSC Safar)",
    defaultFee: 0,
    icon: Plane,
    gradient: "from-sky-600 to-cyan-700",
    mode: "redirect",
    cscUrl: "https://cscsafar.in/",
    fields: [],
  },
  {
    key: "irctc",
    name: "Train Tickets (IRCTC)",
    category: "travel",
    description: "Book train tickets (CSC portal)",
    defaultFee: 0,
    icon: TrainFront,
    gradient: "from-blue-600 to-indigo-700",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "bus-booking",
    name: "Bus Booking",
    category: "travel",
    description: "Inter-state bus tickets (CSC portal)",
    defaultFee: 0,
    icon: Bus,
    gradient: "from-orange-500 to-red-600",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "gst-registration",
    name: "GST Registration",
    category: "government",
    description: "New GST registration & filing (CSC portal)",
    defaultFee: 0,
    icon: ScrollText,
    gradient: "from-emerald-700 to-teal-800",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "aadhaar-update",
    name: "Aadhaar Update (UCL)",
    category: "government",
    description: "Aadhaar demographic update via UCL portal",
    defaultFee: 0,
    icon: IdCard,
    gradient: "from-rose-600 to-pink-700",
    mode: "redirect",
    cscUrl: "https://ucl.csccloud.in/",
    fields: [],
  },
  {
    key: "voter-id",
    name: "Voter ID (NVSP)",
    category: "government",
    description: "New voter registration & corrections",
    defaultFee: 0,
    icon: IdCard,
    gradient: "from-blue-600 to-sky-700",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/",
    fields: [],
  },
  {
    key: "driving-license",
    name: "Driving License (Sarathi)",
    category: "government",
    description: "Apply / renew DL via Parivahan Sarathi",
    defaultFee: 0,
    icon: Car,
    gradient: "from-indigo-700 to-purple-800",
    mode: "redirect",
    cscUrl: "https://sarathi.parivahan.gov.in/",
    fields: [],
  },
  {
    key: "passport",
    name: "Passport Seva",
    category: "government",
    description: "Apply / renew passport via Passport Seva",
    defaultFee: 0,
    icon: FileText,
    gradient: "from-cyan-700 to-blue-800",
    mode: "redirect",
    cscUrl: "https://www.passportindia.gov.in/",
    fields: [],
  },
  {
    key: "csc-dashboard",
    name: "CSC Dashboard (All Services)",
    category: "other",
    description: "Full Digital Seva portal access",
    defaultFee: 0,
    icon: Globe,
    gradient: "from-slate-700 to-gray-900",
    mode: "redirect",
    cscUrl: "https://digitalseva.csc.gov.in/dashboard",
    fields: [],
  },
];

export function getCscService(key: string): CscService | undefined {
  return CSC_SERVICES.find((s) => s.key === key);
}

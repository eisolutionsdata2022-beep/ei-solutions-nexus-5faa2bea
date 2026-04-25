/**
 * Master list of all platform services available to retailers.
 * Admin can toggle each on/off via Firestore "platformServices" collection,
 * and per-user via "userPermissions" + "servicePlans".
 */

export interface PlatformService {
  key: string;          // Unique identifier, used as Firestore doc ID
  name: string;         // Display name
  category: string;     // Grouping
  route?: string;       // Retailer route path (if internal)
  description: string;
  /** Default flat fee (₹) deducted per use. Editable by admin via commissions page. */
  defaultFee?: number;
  /** Whether this service uses the operator-level commission table (Recharge/BBPS). */
  operatorBased?: boolean;
}

export const PLATFORM_SERVICES: PlatformService[] = [
  // Core Services
  { key: "recharge-bbps", name: "Recharge & BBPS", category: "Core Services", route: "/retailer/bill-payment", description: "Mobile, DTH recharge and bill payments (Bharat Connect)", operatorBased: true },
  { key: "e-dis", name: "E-dis (E-Governance)", category: "Core Services", route: "/retailer/services", description: "E-district certificate services" },
  { key: "money-transfer", name: "Money Transfer", category: "Core Services", route: "/retailer/money-transfer", description: "Fund transfer services", defaultFee: 10 },
  { key: "ippb", name: "IPPB Account Opening", category: "Core Services", route: "/retailer/ippb", description: "India Post Payments Bank account opening with biometric capture", defaultFee: 50 },
  { key: "ei-pay", name: "EI Solutions Pay (CSC)", category: "Core Services", route: "/retailer/ei-pay", description: "CSC services bridge", defaultFee: 20 },
  { key: "pan-portal", name: "PAN Portal (PSA + NSDL)", category: "Core Services", route: "/retailer/pan-portal", description: "PSA Auto-ID registration & NSDL eKYC PAN application (Form 49A)", defaultFee: 107 },
  // Professional Services
  { key: "horoscope", name: "Horoscope", category: "Professional Services", route: "/retailer/horoscope", description: "Horoscope generation service", defaultFee: 50 },
  { key: "matrimony", name: "Matrimony", category: "Professional Services", route: "/retailer/matrimony", description: "Matrimony profile management", defaultFee: 100 },
  { key: "cv-builder", name: "CV Builder", category: "Professional Services", route: "/retailer/cv-builder", description: "Professional CV/Resume builder", defaultFee: 10 },
  { key: "finance", name: "Finance (Gold Loan)", category: "Professional Services", route: "/retailer/finance", description: "Gold loan / NBFC branch management", defaultFee: 0 },

  // Training & Tools
  { key: "trainings", name: "Trainings", category: "Training & Tools", route: "/retailer/trainings", description: "Training sessions and courses" },
  { key: "virtual-trainer", name: "Virtual Trainer", category: "Training & Tools", route: "/retailer/virtual-trainer", description: "AI-powered virtual training assistant", defaultFee: 0 },
  { key: "page-tools", name: "Page Tools", category: "Training & Tools", route: "/retailer/page-tools", description: "PDF and document tools", defaultFee: 5 },
  { key: "forms", name: "Custom Forms", category: "Training & Tools", route: "/retailer/forms", description: "Custom form submissions" },
  { key: "jobs", name: "Job Marketplace", category: "Training & Tools", route: "/retailer/jobs", description: "Post & bid on freelance jobs" },
  { key: "work-badge", name: "Work Badge", category: "Training & Tools", route: "/retailer/work-badge", description: "Apply for verified worker badge" },

  // Account
  { key: "wallet", name: "Wallet & Recharge", category: "Account", route: "/retailer/wallet", description: "Wallet management and fund requests" },
  { key: "kyc", name: "KYC Verification", category: "Account", route: "/retailer/kyc", description: "Know Your Customer verification" },
  { key: "transactions", name: "Transactions", category: "Account", route: "/retailer/transactions", description: "Transaction history" },
];

export const PLATFORM_SERVICE_CATEGORIES = [
  "Core Services",
  "Professional Services",
  "Training & Tools",
  "Account",
];

/** Services that have an editable flat fee (excludes operator-based and pure account pages). */
export const FEE_EDITABLE_SERVICES = PLATFORM_SERVICES.filter(
  (s) => !s.operatorBased && s.defaultFee !== undefined,
);

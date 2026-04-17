/**
 * Master list of all platform services available to retailers.
 * Admin can toggle each on/off via Firestore "services" collection.
 */

export interface PlatformService {
  key: string;          // Unique identifier, used as Firestore doc ID
  name: string;         // Display name
  category: string;     // Grouping
  route?: string;       // Retailer route path (if internal)
  description: string;
}

export const PLATFORM_SERVICES: PlatformService[] = [
  // Core Services
  { key: "recharge-bbps", name: "Recharge & BBPS", category: "Core Services", route: "/retailer/recharge", description: "Mobile, DTH recharge and bill payments" },
  { key: "e-dis", name: "E-dis (E-Governance)", category: "Core Services", route: "/retailer/services", description: "E-district certificate services" },
  { key: "money-transfer", name: "Money Transfer", category: "Core Services", route: "/retailer/money-transfer", description: "Fund transfer services" },
  { key: "ippb", name: "IPPB Account Opening", category: "Core Services", route: "/retailer/ippb", description: "India Post Payments Bank account opening with biometric capture" },

  // Professional Services
  { key: "horoscope", name: "Horoscope", category: "Professional Services", route: "/retailer/horoscope", description: "Horoscope generation service" },
  { key: "matrimony", name: "Matrimony", category: "Professional Services", route: "/retailer/matrimony", description: "Matrimony profile management" },
  { key: "cv-builder", name: "CV Builder", category: "Professional Services", route: "/retailer/cv-builder", description: "Professional CV/Resume builder" },

  // Training & Tools
  { key: "trainings", name: "Trainings", category: "Training & Tools", route: "/retailer/trainings", description: "Training sessions and courses" },
  { key: "virtual-trainer", name: "Virtual Trainer", category: "Training & Tools", route: "/retailer/virtual-trainer", description: "AI-powered virtual training assistant" },
  { key: "page-tools", name: "Page Tools", category: "Training & Tools", route: "/retailer/page-tools", description: "PDF and document tools" },
  { key: "forms", name: "Custom Forms", category: "Training & Tools", route: "/retailer/forms", description: "Custom form submissions" },

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

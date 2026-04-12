/**
 * Commission configuration and split logic for recharge/BBPS platform.
 * Rates are stored in Firebase "commissionRates" collection.
 * This file provides default rates and split calculation helpers.
 */

export interface CommissionRate {
  id?: string;
  serviceType: string; // "mobile_recharge", "dth", "bbps", "lpg", "google_play"
  operator: string;    // "airtel", "jio", "vi", "bsnl", etc.
  totalPercent: number;
  retailerPercent: number;
  distributorPercent: number;
  adminPercent: number;
  serviceCharge: number; // fixed ₹ charge credited to admin
}

export interface CommissionSplit {
  retailerAmount: number;
  distributorAmount: number;
  adminAmount: number;
  serviceChargeAmount: number;
  totalCommission: number;
}

// Default commission rates matching the spec
export const DEFAULT_COMMISSION_RATES: Omit<CommissionRate, "id">[] = [
  // Mobile Recharge
  { serviceType: "mobile_recharge", operator: "bsnl", totalPercent: 4.5, retailerPercent: 3.5, distributorPercent: 0.5, adminPercent: 0.5, serviceCharge: 2 },
  { serviceType: "mobile_recharge", operator: "vi", totalPercent: 4, retailerPercent: 3, distributorPercent: 0.5, adminPercent: 0.5, serviceCharge: 2 },
  { serviceType: "mobile_recharge", operator: "airtel", totalPercent: 1.1, retailerPercent: 0.7, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 2 },
  { serviceType: "mobile_recharge", operator: "jio", totalPercent: 0.40, retailerPercent: 0.30, distributorPercent: 0.05, adminPercent: 0.05, serviceCharge: 2 },
  // DTH
  { serviceType: "dth", operator: "airtel_dth", totalPercent: 4.3, retailerPercent: 3.0, distributorPercent: 0.7, adminPercent: 0.6, serviceCharge: 5 },
  { serviceType: "dth", operator: "dish_tv", totalPercent: 3.7, retailerPercent: 2.5, distributorPercent: 0.6, adminPercent: 0.6, serviceCharge: 5 },
  { serviceType: "dth", operator: "tata_play", totalPercent: 3.6, retailerPercent: 2.4, distributorPercent: 0.6, adminPercent: 0.6, serviceCharge: 5 },
  { serviceType: "dth", operator: "sun_direct", totalPercent: 3.5, retailerPercent: 2.3, distributorPercent: 0.6, adminPercent: 0.6, serviceCharge: 5 },
  // BBPS
  { serviceType: "bbps", operator: "electricity", totalPercent: 1, retailerPercent: 0.6, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 10 },
  { serviceType: "bbps", operator: "water", totalPercent: 1, retailerPercent: 0.6, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 10 },
  { serviceType: "bbps", operator: "loan", totalPercent: 1, retailerPercent: 0.6, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 10 },
  // LPG
  { serviceType: "bbps", operator: "lpg", totalPercent: 1.2, retailerPercent: 0.8, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 5 },
  // Google Play
  { serviceType: "google_play", operator: "google_play", totalPercent: 2.2, retailerPercent: 1.5, distributorPercent: 0.4, adminPercent: 0.3, serviceCharge: 5 },
  // FASTag
  { serviceType: "fastag", operator: "fastag", totalPercent: 1.0, retailerPercent: 0.6, distributorPercent: 0.2, adminPercent: 0.2, serviceCharge: 5 },
];

/**
 * Calculate commission split for a given transaction amount and rate.
 */
export function calculateCommissionSplit(
  amount: number,
  rate: CommissionRate
): CommissionSplit {
  const retailerAmount = Math.round((amount * rate.retailerPercent) / 100 * 100) / 100;
  const distributorAmount = Math.round((amount * rate.distributorPercent) / 100 * 100) / 100;
  const adminAmount = Math.round((amount * rate.adminPercent) / 100 * 100) / 100;
  const totalCommission = retailerAmount + distributorAmount + adminAmount;

  return {
    retailerAmount,
    distributorAmount,
    adminAmount,
    serviceChargeAmount: rate.serviceCharge,
    totalCommission,
  };
}

// Service catalog for UI display
export const SERVICE_CATALOG = {
  mobile_recharge: {
    label: "Mobile Recharge",
    icon: "📱",
    operators: [
      { id: "airtel", name: "Airtel", logo: "🔴" },
      { id: "jio", name: "Jio", logo: "🔵" },
      { id: "vi", name: "VI / Vodafone", logo: "🔴" },
      { id: "bsnl", name: "BSNL", logo: "🟢" },
    ],
  },
  dth: {
    label: "DTH Services",
    icon: "📺",
    operators: [
      { id: "airtel_dth", name: "Airtel Digital TV", logo: "🔴" },
      { id: "dish_tv", name: "Dish TV", logo: "🟠" },
      { id: "tata_play", name: "Tata Play", logo: "🔵" },
      { id: "sun_direct", name: "Sun Direct", logo: "🟡" },
    ],
  },
  bbps: {
    label: "BBPS Services",
    icon: "⚡",
    operators: [
      { id: "electricity", name: "Electricity Bill", logo: "⚡" },
      { id: "water", name: "Water Bill", logo: "💧" },
      { id: "lpg", name: "LPG Gas", logo: "🔥" },
      { id: "loan", name: "Loan Repayment", logo: "💳" },
    ],
  },
  google_play: {
    label: "Google Play",
    icon: "🎮",
    operators: [
      { id: "google_play", name: "Google Play Recharge", logo: "▶️" },
    ],
  },
  fastag: {
    label: "FASTag",
    icon: "🚗",
    operators: [
      { id: "fastag", name: "FASTag Recharge", logo: "🏷️" },
    ],
  },
} as const;

export type ServiceType = keyof typeof SERVICE_CATALOG;

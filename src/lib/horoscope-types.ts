/**
 * Horoscope feature — minimal type definitions.
 * Rebuilt from scratch (Apr 2026) for reliable server-generated reports.
 */

export type HoroscopeStatus = "Pending" | "Generated" | "Delivered";
export type Gender = "Male" | "Female" | "Other";
export type HoroscopeProduct = "standard" | "premium";
export type Religion = "Hindu" | "Muslim" | "Christian";

export const HOROSCOPE_STATUSES: HoroscopeStatus[] = ["Pending", "Generated", "Delivered"];

export const RELIGION_LABELS: Record<Religion, { ml: string; en: string; emoji: string }> = {
  Hindu:     { ml: "ഹിന്ദു",     en: "Hindu",     emoji: "🕉️" },
  Muslim:    { ml: "മുസ്ലിം",   en: "Muslim",    emoji: "☪️" },
  Christian: { ml: "ക്രിസ്ത്യൻ", en: "Christian", emoji: "✝️" },
};

export const STATUS_COLORS: Record<HoroscopeStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Generated: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Delivered: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

export const PRODUCT_LABELS: Record<HoroscopeProduct, { ml: string; en: string; emoji: string }> = {
  standard: { ml: "ജാതകം (സാധാരണ)", en: "Standard Horoscope", emoji: "🪔" },
  premium: { ml: "സമ്പൂർണ ജാതകം (പ്രീമിയം)", en: "Premium Complete Horoscope", emoji: "🕉️" },
};

export interface HoroscopeReport {
  /** ഒറ്റവരി പൊതുപ്രവചനം */
  summary: string;
  /** വ്യക്തിത്വം */
  personality: string;
  /** കരിയർ */
  career: string;
  /** സാമ്പത്തികം */
  finance: string;
  /** വിവാഹം / പങ്കാളി */
  marriage: string;
  /** ആരോഗ്യം */
  health: string;
  /** വിദ്യാഭ്യാസം */
  education: string;
  /** ഭാഗ്യ കാലങ്ങൾ */
  luckyPeriods: string;
  /** പരിഹാരങ്ങൾ */
  remedies: string;
  /** ഭാവി പ്രവചനം (1-3-5 വർഷം) */
  futureOutlook: string;
  /** Premium only — Vimshottari Dasha */
  dasha?: string;
  /** Premium only — yearly outlook */
  yearlyForecast?: string;
}

export interface HoroscopeRequest {
  id?: string;
  userId: string;
  userName?: string;
  customerName: string;
  gender: Gender;
  religion: Religion;
  dateOfBirth: string;     // YYYY-MM-DD
  timeOfBirth: string;     // HH:MM
  placeOfBirth: string;
  nakshatram?: string;
  product: HoroscopeProduct;
  amount: number;
  status: HoroscopeStatus;
  report?: HoroscopeReport;
  createdAt: string;
  updatedAt?: string;
  generatedAt?: string;
}

export interface HoroscopeSettings {
  enabled: boolean;
  standardFee: number;
  premiumFee: number;
  notice?: string;
}

export const DEFAULT_SETTINGS: HoroscopeSettings = {
  enabled: true,
  standardFee: 5,
  premiumFee: 25,
  notice: "",
};

/** Re-exported for the form dropdown (matrimony-types is the source of truth now). */
export { NAKSHATRAS } from "./matrimony-types";
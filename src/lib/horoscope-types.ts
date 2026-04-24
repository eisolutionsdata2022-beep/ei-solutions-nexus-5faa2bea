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

/** A planet's position in the chart. */
export interface GrahaPosition {
  /** Planet name in Malayalam, e.g. "സൂര്യൻ (Sun)" */
  planet: string;
  /** House number 1-12 */
  house: number;
  /** Rashi (zodiac) in Malayalam, e.g. "ഇടവം" */
  rashi: string;
  /** Status text, e.g. "സാധാരണം", "ഉച്ചം", "നീചം" */
  condition: string;
  /** Optional 2-3 letter planet code for the chart cell, e.g. "SU", "MO" */
  code?: string;
}

/** A single 4x4 chart cell — one of the 12 houses. */
export interface ChakramCell {
  /** House number 1-12 */
  house: number;
  /** Rashi name in Malayalam */
  rashi: string;
  /** Short planet codes occupying this house, e.g. ["SU","JU","KE"] */
  planets: string[];
}

/** Vimshottari mahadasha row. */
export interface DashaPeriod {
  planet: string;   // "ബുധൻ (Mercury)"
  startYear: number;
  endYear: number;
  years: number;
}

/** Year-wise prediction. */
export interface YearForecast {
  year: number;
  prediction: string;
}

/** Life stage prediction (age range). */
export interface LifeStage {
  ageRange: string;     // "0–7 വയസ്സ്"
  prediction: string;
}

/** Section with bilingual heading + bullet/paragraph body. */
export interface AnalysisSection {
  /** Heading in Malayalam */
  titleMl: string;
  /** Optional English subtitle */
  titleEn?: string;
  /** Body — supports newlines */
  body: string;
}

export interface HoroscopeReport {
  /** ഒറ്റവരി പൊതുപ്രവചനം */
  summary: string;

  // ── Birth chart ────────────────────────────────────────────────
  /** ലഗ്നം — Ascendant rashi in Malayalam, e.g. "ഇടവം" */
  lagnam: string;
  /** രാശി — Moon sign in Malayalam */
  rashi: string;
  /** 12 cells of the South-Indian style chakram (must be exactly 12) */
  chakram: ChakramCell[];
  /** Planet positions table */
  grahaNilakal: GrahaPosition[];

  // ── Predictions ────────────────────────────────────────────────
  /** പൊതുവായ പ്രവചനങ്ങൾ — 4-8 themed micro-sections */
  generalPredictions: AnalysisSection[];
  /** ജീവിത ഘട്ടങ്ങൾ — age-band predictions */
  lifeStages: LifeStage[];
  /** വിവാഹ യോഗം */
  marriageYoga: string;
  /** സന്താന ഭാഗ്യം */
  childrenFortune: string;
  /** വിദ്യാഭ്യാസം */
  education: string;
  /** തൊഴിൽ / ബിസിനസ്സ് */
  career: string;
  /** വിദേശ യാത്ര */
  foreignTravel: string;
  /** സാമ്പത്തിക വളർച്ച കാലങ്ങൾ — multi-line, "YYYY-YYYY: ..." per line */
  financialGrowthPeriods: string;
  /** ആരോഗ്യ മുന്നറിയിപ്പുകൾ */
  health: string;
  /** ശത്രു / തടസ്സങ്ങൾ */
  obstacles: string;
  /** ജീവിതത്തിലെ Turning Points */
  turningPoints: string;

  // ── Remedies ───────────────────────────────────────────────────
  /** പൂജകൾ — list of pujas */
  poojas: string[];
  /** ക്ഷേത്രങ്ങൾ / Holy places */
  temples: string[];
  /** ശാന്തി കർമ്മങ്ങൾ */
  shantiKarmas: string[];
  /** ദാനം — donations */
  daanam: string[];
  /** മന്ത്രങ്ങൾ — chants/prayers */
  mantras: string[];
  /** വ്രതങ്ങൾ — fasts/observances */
  vratas: string[];
  /** നല്ല ദിവസങ്ങൾ */
  goodDays: string[];
  /** ജാഗ്രത വേണ്ട ദിവസങ്ങൾ */
  cautionDays: string[];

  // ── Premium only ───────────────────────────────────────────────
  /** Premium only — Vimshottari mahadasha rows */
  dashaBhukti?: DashaPeriod[];
  /** Premium only — next 5 years */
  yearlyForecasts?: YearForecast[];
  /** Premium only — current ഗോചര ഫലം */
  gocharaPhalam?: string;

  // ── Backward-compat (older saved reports may still reference these) ──
  /** @deprecated Use generalPredictions[] */
  personality?: string;
  /** @deprecated Use financialGrowthPeriods */
  finance?: string;
  /** @deprecated Use marriageYoga + childrenFortune */
  marriage?: string;
  /** @deprecated Use poojas/temples/mantras/etc. arrays */
  remedies?: string;
  /** @deprecated Use turningPoints + financialGrowthPeriods */
  futureOutlook?: string;
  /** @deprecated Use luckyPeriods text — kept for legacy display */
  luckyPeriods?: string;
  /** @deprecated Use dashaBhukti */
  dasha?: string;
  /** @deprecated Use yearlyForecasts */
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
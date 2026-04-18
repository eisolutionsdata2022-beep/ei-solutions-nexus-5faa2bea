export type HoroscopeStatus = "Pending" | "Processing" | "Generated" | "Delivered";
export type Gender = "Male" | "Female" | "Other";
export type HoroscopeProduct = "standard" | "premium" | "palmistry";
export type PdfTemplate = "classic" | "premium";
export type HoroscopeLanguage = "Malayalam" | "English" | "Hindi" | "Both";
export type Hand = "left" | "right";

export const HOROSCOPE_STATUSES: HoroscopeStatus[] = ["Pending", "Processing", "Generated", "Delivered"];

export const PRODUCT_LABELS: Record<HoroscopeProduct, { ml: string; en: string; emoji: string }> = {
  standard: { ml: "ജാതകം", en: "Standard Horoscope", emoji: "🪔" },
  premium: { ml: "സമ്പൂർണ ജാതകം", en: "Premium Complete Horoscope", emoji: "🕉️" },
  palmistry: { ml: "കൈരേഖ ശാസ്ത്രം", en: "Palmistry / Palm Reading", emoji: "🤲" },
};

export const STATUS_COLORS: Record<HoroscopeStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Processing: "bg-blue-100 text-blue-800",
  Generated: "bg-green-100 text-green-800",
  Delivered: "bg-indigo-100 text-indigo-800",
};

export const NAKSHATRAS = [
  { id: 1, en: "Ashwini", ml: "അശ്വതി" },
  { id: 2, en: "Bharani", ml: "ഭരണി" },
  { id: 3, en: "Krittika", ml: "കാർത്തിക" },
  { id: 4, en: "Rohini", ml: "രോഹിണി" },
  { id: 5, en: "Mrigashira", ml: "മകയിരം" },
  { id: 6, en: "Ardra", ml: "തിരുവാതിര" },
  { id: 7, en: "Punarvasu", ml: "പുണർതം" },
  { id: 8, en: "Pushya", ml: "പൂയം" },
  { id: 9, en: "Ashlesha", ml: "ആയില്യം" },
  { id: 10, en: "Magha", ml: "മകം" },
  { id: 11, en: "Purva Phalguni", ml: "പൂരം" },
  { id: 12, en: "Uttara Phalguni", ml: "ഉത്രം" },
  { id: 13, en: "Hasta", ml: "അത്തം" },
  { id: 14, en: "Chitra", ml: "ചിത്തിര" },
  { id: 15, en: "Swati", ml: "ചോതി" },
  { id: 16, en: "Vishakha", ml: "വിശാഖം" },
  { id: 17, en: "Anuradha", ml: "അനിഴം" },
  { id: 18, en: "Jyeshtha", ml: "തൃക്കേട്ട" },
  { id: 19, en: "Mula", ml: "മൂലം" },
  { id: 20, en: "Purva Ashadha", ml: "പൂരാടം" },
  { id: 21, en: "Uttara Ashadha", ml: "ഉത്രാടം" },
  { id: 22, en: "Shravana", ml: "തിരുവോണം" },
  { id: 23, en: "Dhanishta", ml: "അവിട്ടം" },
  { id: 24, en: "Shatabhisha", ml: "ചതയം" },
  { id: 25, en: "Purva Bhadrapada", ml: "പൂരുരുട്ടാതി" },
  { id: 26, en: "Uttara Bhadrapada", ml: "ഉത്രട്ടാതി" },
  { id: 27, en: "Revati", ml: "രേവതി" },
] as const;

export const RASHIS = [
  { id: 1, en: "Aries", ml: "മേടം" },
  { id: 2, en: "Taurus", ml: "ഇടവം" },
  { id: 3, en: "Gemini", ml: "മിഥുനം" },
  { id: 4, en: "Cancer", ml: "കർക്കടകം" },
  { id: 5, en: "Leo", ml: "ചിങ്ങം" },
  { id: 6, en: "Virgo", ml: "കന്നി" },
  { id: 7, en: "Libra", ml: "തുലാം" },
  { id: 8, en: "Scorpio", ml: "വൃശ്ചികം" },
  { id: 9, en: "Sagittarius", ml: "ധനു" },
  { id: 10, en: "Capricorn", ml: "മകരം" },
  { id: 11, en: "Aquarius", ml: "കുംഭം" },
  { id: 12, en: "Pisces", ml: "മീനം" },
] as const;

export const PLANETS = [
  { id: "sun", en: "Sun", ml: "സൂര്യൻ" },
  { id: "moon", en: "Moon", ml: "ചന്ദ്രൻ" },
  { id: "mars", en: "Mars", ml: "ചൊവ്വ" },
  { id: "mercury", en: "Mercury", ml: "ബുധൻ" },
  { id: "jupiter", en: "Jupiter", ml: "വ്യാഴം" },
  { id: "venus", en: "Venus", ml: "ശുക്രൻ" },
  { id: "saturn", en: "Saturn", ml: "ശനി" },
  { id: "rahu", en: "Rahu", ml: "രാഹു" },
  { id: "ketu", en: "Ketu", ml: "കേതു" },
] as const;

export interface PlanetPosition {
  planetId: string;
  house: number; // 1-12
  rashi: number; // 1-12
  isExalted?: boolean;
  isDebilitated?: boolean;
}

export interface HoroscopeChart {
  lagna: number; // 1-12 rashi id
  planets: PlanetPosition[];
}

export interface HoroscopePrediction {
  category: string;
  malayalam: string;
  english: string;
  severity?: "positive" | "neutral" | "negative";
}

export interface DashaPeriod {
  planet: string;        // e.g. "Jupiter"
  planetMl: string;
  startYear: number;
  endYear: number;
  years: number;
}

export interface PremiumExtras {
  lifeStages?: string[];
  marriagePeriod?: string;
  childrenLuck?: string;
  educationOutlook?: string;
  careerGrowth?: string;
  foreignTravel?: string;
  wealthPeriods?: string[];
  healthWarnings?: string[];
  enemyObstacles?: string[];
  turningPoints?: string[];
  yearlyOutlook?: string[];
  dashaTimeline?: DashaPeriod[];
  gocharaSummary?: string;
  remedies?: {
    poojas?: string[];
    temples?: string[];
    shanti?: string[];
    daanam?: string[];
    mantras?: string[];
    vrathas?: string[];
    goodDays?: string[];
    badDays?: string[];
  };
}

export interface PalmistryReading {
  lifeLine: string;
  headLine: string;
  heartLine: string;
  fateLine: string;
  marriageLine: string;
  wealthLine: string;
  careerOutlook: string;
  healthIndicators: string;
  personality: string;
  futureGrowth: string;
  marks?: string;
  comparison?: string; // when both hands provided
  language: HoroscopeLanguage;
}

export interface HoroscopeRequest {
  id: string;
  userId: string;
  userName: string;
  product: HoroscopeProduct;
  pdfTemplate?: PdfTemplate;
  customerName: string;
  gender: Gender;
  // birth details (not required for palmistry)
  dateOfBirth?: string;
  timeOfBirth?: string;
  placeOfBirth?: string;
  birthStar?: string;
  language: HoroscopeLanguage;
  status: HoroscopeStatus;
  chart?: HoroscopeChart;
  predictions?: HoroscopePrediction[];
  premiumExtras?: PremiumExtras;
  // palmistry
  palmImages?: { left?: string; right?: string }; // data URLs
  palmistry?: PalmistryReading;
  pdfUrl?: string;
  amount: number;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
  processedBy?: string;
  processedByName?: string;
  deliveredAt?: string;
  godImage?: string; // base64 data URL
}

export interface HoroscopeProductPricing {
  enabled: boolean;
  price: number;
  commissionPercentage: number;
}

export interface HoroscopeSettings {
  // ── Legacy (kept for backwards compatibility — mirror of standard) ──
  pricePerHoroscope: number;
  commissionPercentage: number;
  serviceEnabled: boolean;
  // ── New per-product pricing ──
  products?: Record<HoroscopeProduct, HoroscopeProductPricing>;
}

export const DEFAULT_PRODUCT_PRICING: Record<HoroscopeProduct, HoroscopeProductPricing> = {
  standard: { enabled: true, price: 99, commissionPercentage: 20 },
  premium: { enabled: true, price: 499, commissionPercentage: 25 },
  palmistry: { enabled: true, price: 199, commissionPercentage: 25 },
};

export const DEFAULT_SETTINGS: HoroscopeSettings = {
  pricePerHoroscope: 99,
  commissionPercentage: 20,
  serviceEnabled: true,
  products: DEFAULT_PRODUCT_PRICING,
};

/** Helper — read a product's effective pricing, falling back to defaults / legacy. */
export function getProductPricing(
  s: HoroscopeSettings | null | undefined,
  product: HoroscopeProduct
): HoroscopeProductPricing {
  const fromSettings = s?.products?.[product];
  if (fromSettings) return fromSettings;
  if (product === "standard" && s) {
    return {
      enabled: s.serviceEnabled,
      price: s.pricePerHoroscope,
      commissionPercentage: s.commissionPercentage,
    };
  }
  return DEFAULT_PRODUCT_PRICING[product];
}

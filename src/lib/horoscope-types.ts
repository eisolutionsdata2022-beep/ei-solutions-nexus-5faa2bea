export type HoroscopeStatus = "Pending" | "Processing" | "Generated" | "Delivered";
export type Gender = "Male" | "Female" | "Other";

export const HOROSCOPE_STATUSES: HoroscopeStatus[] = ["Pending", "Processing", "Generated", "Delivered"];

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

export interface HoroscopeRequest {
  id: string;
  userId: string;
  userName: string;
  customerName: string;
  gender: Gender;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  birthStar?: string; // Nakshatra name
  language: "Malayalam" | "English" | "Both";
  status: HoroscopeStatus;
  chart?: HoroscopeChart;
  predictions?: HoroscopePrediction[];
  pdfUrl?: string;
  amount: number;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
  processedBy?: string;
  processedByName?: string;
  deliveredAt?: string;
  godImage?: string; // base64 data URL of uploaded god image
}

export interface HoroscopeSettings {
  pricePerHoroscope: number;
  commissionPercentage: number;
  serviceEnabled: boolean;
}

export const DEFAULT_SETTINGS: HoroscopeSettings = {
  pricePerHoroscope: 299,
  commissionPercentage: 20,
  serviceEnabled: true,
};

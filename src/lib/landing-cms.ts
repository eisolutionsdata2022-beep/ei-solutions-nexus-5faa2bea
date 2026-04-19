// Landing + Booklet CMS — Firestore-backed editable content with static fallbacks.
// Doc: landingContent/main
// Storage: landing-cms/{logo|hero|...}-{ts}.{ext}

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import {
  COMPANY as DEFAULT_COMPANY,
  STATS as DEFAULT_STATS,
  SERVICES as DEFAULT_SERVICES,
  REVIEWS as DEFAULT_REVIEWS,
} from "@/lib/booklet-content";

/* ───────── Types ───────── */

export interface CmsHero {
  heading: string;        // big heading e.g. "Built in Kerala. Engineered for India."
  subHeading: string;     // descriptive paragraph
  tagline: string;        // short Malayalam/English tagline (booklet cover)
  taglineEn: string;      // English version
  ctaPrimary: string;     // "Apply Now" etc.
  ctaSecondary: string;   // "View Booklet"
}

export interface CmsStat { number: string; label: string; labelMl: string; }
export interface CmsService { icon: string; name: string; ml: string; }
export interface CmsReview { stars: number; name: string; place: string; text: string; }

export interface CmsContact {
  brand: string;
  legalName: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
}

export interface CmsImages {
  logoUrl?: string;
  heroImageUrl?: string;
  bookletCoverUrl?: string;
}

export interface LandingContent {
  hero: CmsHero;
  stats: CmsStat[];
  services: CmsService[];
  reviews: CmsReview[];
  contact: CmsContact;
  images: CmsImages;
  updatedAt?: string;
  updatedBy?: string;
}

/* ───────── Defaults (fallback when Firestore empty) ───────── */

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  hero: {
    heading: "Built in Kerala. Engineered for India.",
    subHeading:
      "EI SOLUTIONS is a premium digital service network — PAN, BBPS, DMT, e-Governance, training and franchise infrastructure used by 2500+ centers across India.",
    tagline: DEFAULT_COMPANY.tagline,
    taglineEn: DEFAULT_COMPANY.taglineEn,
    ctaPrimary: "Apply for Franchise",
    ctaSecondary: "View Digital Booklet",
  },
  stats: DEFAULT_STATS.map((s) => ({ number: s.number, label: s.label, labelMl: s.labelMl })),
  services: DEFAULT_SERVICES.map((s) => ({ icon: s.icon, name: s.name, ml: s.ml })),
  reviews: DEFAULT_REVIEWS.map((r) => ({ stars: r.stars, name: r.name, place: r.place, text: r.text })),
  contact: {
    brand: DEFAULT_COMPANY.brand,
    legalName: DEFAULT_COMPANY.legalName,
    phone: DEFAULT_COMPANY.phone,
    whatsapp: DEFAULT_COMPANY.whatsapp,
    email: DEFAULT_COMPANY.email,
    website: DEFAULT_COMPANY.website,
    address: DEFAULT_COMPANY.address,
  },
  images: {},
};

const DOC_PATH = "landingContent/main";

/* ───────── Firestore ───────── */

export async function getLandingContent(): Promise<LandingContent> {
  try {
    const snap = await getDoc(doc(db, DOC_PATH));
    if (!snap.exists()) return DEFAULT_LANDING_CONTENT;
    const data = snap.data() as Partial<LandingContent>;
    // Merge with defaults so missing fields fall back gracefully.
    return {
      hero: { ...DEFAULT_LANDING_CONTENT.hero, ...(data.hero || {}) },
      stats: data.stats?.length ? data.stats : DEFAULT_LANDING_CONTENT.stats,
      services: data.services?.length ? data.services : DEFAULT_LANDING_CONTENT.services,
      reviews: data.reviews?.length ? data.reviews : DEFAULT_LANDING_CONTENT.reviews,
      contact: { ...DEFAULT_LANDING_CONTENT.contact, ...(data.contact || {}) },
      images: { ...DEFAULT_LANDING_CONTENT.images, ...(data.images || {}) },
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy,
    };
  } catch (err) {
    console.error("[landing-cms] read failed, using defaults:", err);
    return DEFAULT_LANDING_CONTENT;
  }
}

export async function saveLandingContent(content: LandingContent, updatedBy: string): Promise<void> {
  await setDoc(
    doc(db, DOC_PATH),
    {
      ...content,
      updatedAt: new Date().toISOString(),
      updatedBy,
      _serverTs: serverTimestamp(),
    },
    { merge: true },
  );
}

/* ───────── Image uploads ───────── */

export async function uploadLandingImage(
  file: File,
  slot: "logo" | "hero" | "bookletCover",
): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const safeExt = ["png", "jpg", "jpeg", "webp", "svg"].includes(ext) ? ext : "png";
  const path = `landing-cms/${slot}-${Date.now()}.${safeExt}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || `image/${safeExt}` });
  return await getDownloadURL(r);
}

export async function removeLandingImage(url: string): Promise<void> {
  try {
    // Extract path from a Firebase download URL.
    const match = url.match(/\/o\/([^?]+)/);
    if (!match) return;
    const path = decodeURIComponent(match[1]);
    await deleteObject(ref(storage, path));
  } catch (err) {
    // Non-fatal — file may already be gone.
    console.warn("[landing-cms] removeLandingImage:", err);
  }
}

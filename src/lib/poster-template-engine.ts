/**
 * Poster Template Engine
 * Generates 80+ professional service-promotion posters from layouts × palettes × service categories.
 * Each template renders to a self-contained HTML/SVG block placed inside a fixed A4 portrait canvas.
 */

import bgBanking from "@/assets/poster-bg-banking.jpg";
import bgFestival from "@/assets/poster-bg-festival.jpg";
import bgDigital from "@/assets/poster-bg-digital.jpg";
import bgUrgent from "@/assets/poster-bg-urgent.jpg";
import bgGovt from "@/assets/poster-bg-govt.jpg";
import bgMatrimony from "@/assets/poster-bg-matrimony.jpg";
import bgHoroscope from "@/assets/poster-bg-horoscope.jpg";
import bgJanasevana from "@/assets/poster-bg-janasevana.jpg";

// ============================================================================
// TYPES
// ============================================================================

export type ServiceCategory =
  | "PAN Card" | "Money Transfer" | "AEPS" | "Recharge" | "Bill Payment"
  | "Insurance" | "Loan" | "Travel Booking" | "PVC Card" | "Aadhaar Services"
  | "GST" | "Banking" | "Education" | "Health Card" | "Job Services"
  | "Janasevana" | "Matrimony" | "Horoscope"
  | "All Services";

export type PosterStyle =
  | "modern"        // clean accent header + bullets
  | "trust"         // photo-band + checklist
  | "festive"       // ornamental, festival background
  | "urgent"        // burst rays, big offer text
  | "corporate"     // navy + gold premium
  | "minimal"       // lots of whitespace, single accent
  | "tricolor"      // saffron-white-green band
  | "circuit"       // digital/tech background
  | "elegantMatch"  // matrimony — soft mandala border + couple silhouette
  | "goldAuthority" // janasevana — emblem + gold seal + tricolor
  | "cosmicMystic"; // horoscope — celestial chart + zodiac wheel

export type PosterFormat = "a4" | "story" | "square";

export interface PosterPalette {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
  textOnPrimary: string;
}

export interface PosterData {
  cspId: string;
  heading: string;
  subHeading: string;
  tagline: string;        // e.g. "സർക്കാർ അംഗീകൃത സേവന കേന്ദ്രം"
  services: string[];
  contact: string;
  whatsapp: string;
  location: string;
  logoUrl?: string | null; // user uploaded logo (data URL or http url)
  brandName: string;       // small brand line at bottom
}

export interface PosterCustomization {
  accentColor?: string;   // overrides palette.accent
  format?: PosterFormat;  // a4 | story | square
}

export interface PosterTemplate {
  id: string;
  name: string;
  category: ServiceCategory;
  style: PosterStyle;
  tags: string[];
  palette: PosterPalette;
  /** Returns the poster as an absolute-positioned HTML string.
   *  Container size is fixed by `getCanvasSize(format)`. */
  render: (data: PosterData, custom?: PosterCustomization) => string;
  /** Small SVG thumbnail (200x280-ish) for gallery. */
  thumbnail: () => string;
}

// ============================================================================
// CANVAS / FORMAT
// ============================================================================

export function getCanvasSize(format: PosterFormat = "a4"): { w: number; h: number } {
  switch (format) {
    case "story":  return { w: 540, h: 960 };   // 9:16
    case "square": return { w: 720, h: 720 };   // 1:1
    case "a4":
    default:       return { w: 595, h: 842 };   // A4 portrait @ 72dpi
  }
}

// ============================================================================
// PALETTES (15 cohesive options)
// ============================================================================

const PALETTES: Record<string, PosterPalette> = {
  navyGold: {
    primary: "#0D2A5C", secondary: "#1A3F8B", accent: "#D4AF37",
    bg: "#F8F6EE", text: "#0D2A5C", textOnPrimary: "#FFFFFF",
  },
  saffronEmerald: {
    primary: "#FF6B35", secondary: "#138808", accent: "#FFFFFF",
    bg: "#FFF7E6", text: "#1B1B1B", textOnPrimary: "#FFFFFF",
  },
  royalPurple: {
    primary: "#4B0082", secondary: "#7B2CBF", accent: "#FFD700",
    bg: "#F5F0FA", text: "#2D0A4E", textOnPrimary: "#FFFFFF",
  },
  oceanTeal: {
    primary: "#006B7D", secondary: "#00A2B8", accent: "#FFB400",
    bg: "#EAF7F9", text: "#003844", textOnPrimary: "#FFFFFF",
  },
  rubyRed: {
    primary: "#B91C1C", secondary: "#DC2626", accent: "#FBBF24",
    bg: "#FEF2F2", text: "#7F1D1D", textOnPrimary: "#FFFFFF",
  },
  forestGold: {
    primary: "#14532D", secondary: "#166534", accent: "#EAB308",
    bg: "#F0FDF4", text: "#052E16", textOnPrimary: "#FFFFFF",
  },
  charcoalLime: {
    primary: "#1F2937", secondary: "#374151", accent: "#84CC16",
    bg: "#F9FAFB", text: "#111827", textOnPrimary: "#FFFFFF",
  },
  electricBlue: {
    primary: "#1E40AF", secondary: "#3B82F6", accent: "#22D3EE",
    bg: "#EFF6FF", text: "#1E3A8A", textOnPrimary: "#FFFFFF",
  },
  crimsonBlack: {
    primary: "#0A0A0A", secondary: "#1F1F1F", accent: "#EF4444",
    bg: "#FFFFFF", text: "#0A0A0A", textOnPrimary: "#FFFFFF",
  },
  marigold: {
    primary: "#C2410C", secondary: "#EA580C", accent: "#FACC15",
    bg: "#FFF7ED", text: "#7C2D12", textOnPrimary: "#FFFFFF",
  },
  mintCharcoal: {
    primary: "#064E3B", secondary: "#10B981", accent: "#F59E0B",
    bg: "#ECFDF5", text: "#022C22", textOnPrimary: "#FFFFFF",
  },
  burgundyCream: {
    primary: "#7C2D12", secondary: "#9A3412", accent: "#FED7AA",
    bg: "#FFFBEB", text: "#431407", textOnPrimary: "#FFFFFF",
  },
  midnightCyan: {
    primary: "#0F172A", secondary: "#1E293B", accent: "#06B6D4",
    bg: "#F0F9FF", text: "#0F172A", textOnPrimary: "#FFFFFF",
  },
  saffronWhiteGreen: {
    primary: "#FF9933", secondary: "#138808", accent: "#000080",
    bg: "#FFFFFF", text: "#1A1A1A", textOnPrimary: "#FFFFFF",
  },
  goldOnBlack: {
    primary: "#000000", secondary: "#1A1A1A", accent: "#D4AF37",
    bg: "#0A0A0A", text: "#F5F5F5", textOnPrimary: "#D4AF37",
  },
};

// ============================================================================
// CATEGORY DEFAULTS — services list + iconography (emoji-based for print safety)
// ============================================================================

const CATEGORY_DEFAULTS: Record<ServiceCategory, { services: string[]; icon: string; subHeading: string }> = {
  "PAN Card":          { icon: "🪪", subHeading: "PAN CARD SERVICES — INSTANT & RELIABLE",
    services: ["New PAN Card Application", "PAN Correction / Update", "Duplicate PAN Card", "e-PAN Download (Instant)", "PAN-Aadhaar Linking", "Minor PAN Card"] },
  "Money Transfer":    { icon: "💸", subHeading: "INSTANT MONEY TRANSFER SERVICE",
    services: ["IMPS Transfer (24x7)", "NEFT / RTGS Transfer", "DMT to Any Bank", "Beneficiary Management", "Transaction Receipt", "Refund Support"] },
  "AEPS":              { icon: "👆", subHeading: "AADHAAR ENABLED PAYMENT SYSTEM",
    services: ["Cash Withdrawal", "Balance Enquiry", "Mini Statement", "Aadhaar Pay", "All Bank Supported", "Instant Settlement"] },
  "Recharge":          { icon: "📱", subHeading: "MOBILE & DTH RECHARGE",
    services: ["All Operators Supported", "Postpaid Bill Payment", "DTH Recharge", "Data Card Recharge", "Best Cashback", "Instant Confirmation"] },
  "Bill Payment":      { icon: "🧾", subHeading: "ALL BILL PAYMENT SERVICES (BBPS)",
    services: ["Electricity Bill", "Water Bill", "Gas Bill (PNG)", "LPG Booking", "Insurance Premium", "Loan EMI Payment"] },
  "Insurance":         { icon: "🛡️", subHeading: "INSURANCE SOLUTIONS",
    services: ["Two-Wheeler Insurance", "Car Insurance", "Health Insurance", "Term Life Insurance", "Travel Insurance", "Claim Support"] },
  "Loan":              { icon: "🏦", subHeading: "LOAN ASSISTANCE — QUICK APPROVAL",
    services: ["Personal Loan", "Business Loan", "Home Loan", "Vehicle Loan", "Loan Against Property", "MSME / Mudra Loan"] },
  "Travel Booking":    { icon: "✈️", subHeading: "TRAIN, FLIGHT & BUS BOOKING",
    services: ["IRCTC Train Tickets", "Flight Booking", "Bus Tickets", "Hotel Booking", "Tatkal Booking", "Cancellation Support"] },
  "PVC Card":          { icon: "💳", subHeading: "PVC CARD PRINTING SERVICE",
    services: ["Aadhaar PVC Card", "PAN PVC Card", "Voter ID PVC", "Driving Licence PVC", "Health Card PVC", "ID Card Printing"] },
  "Aadhaar Services":  { icon: "🆔", subHeading: "AADHAAR ENROLLMENT & UPDATE",
    services: ["Aadhaar Update (Address)", "Mobile Number Update", "Biometric Update", "e-Aadhaar Download", "Aadhaar PVC Card", "DOB Correction"] },
  "GST":               { icon: "📊", subHeading: "GST REGISTRATION & RETURN FILING",
    services: ["GST Registration (New)", "GST Return Filing", "GST Cancellation", "GST Amendment", "E-Way Bill Generation", "Invoice Software"] },
  "Banking":           { icon: "🏛️", subHeading: "BANKING SERVICES — ALL IN ONE",
    services: ["Account Opening", "Cheque Book Request", "Mini Statement", "Cash Deposit / Withdrawal", "Fund Transfer", "Banking Doorstep Service"] },
  "Education":         { icon: "🎓", subHeading: "EDUCATION & SCHOLARSHIP SERVICES",
    services: ["Scholarship Application", "Admission Forms", "Online Exam Forms", "Certificate Verification", "Educational Loans", "Result Printing"] },
  "Health Card":       { icon: "🏥", subHeading: "HEALTH & MEDICAL CARD SERVICES",
    services: ["Ayushman Bharat Card", "ABHA Health ID", "ESIC Card", "Health Insurance", "Doctor Consultation", "Medicine Discount Card"] },
  "Job Services":      { icon: "💼", subHeading: "JOB & CAREER SERVICES",
    services: ["Resume Building", "Job Portal Registration", "Government Job Forms", "Skill Development", "Interview Preparation", "Career Counselling"] },
  "Janasevana":        { icon: "🏛️", subHeading: "ജനസേവന കേന്ദ്രം · GOVERNMENT SERVICES",
    services: ["Birth / Death Certificate", "Income / Caste Certificate", "Ration Card Service", "Voter ID & EPIC", "Pension Application", "Online Govt Forms", "Land Records / Pokkuvaravu", "Utility Bill Payment"] },
  "Matrimony":         { icon: "💍", subHeading: "വിവാഹ സേവനം · TRUSTED MATCHMAKING",
    services: ["Premium Profile Registration", "Verified Match Suggestions", "Photo & Bio-data Print", "Horoscope Matching (10 Porutham)", "Family Background Check", "Confidential Service", "Bride / Groom Search", "Dowry-Free Matches"] },
  "Horoscope":         { icon: "🔮", subHeading: "ജാതകം · ASTROLOGY SERVICES",
    services: ["Janma Kundali / Birth Chart", "Marriage Compatibility (10 Porutham)", "Career & Business Predictions", "Daily / Weekly Horoscope", "Vasthu Consultation", "Muhurtham (Auspicious Time)", "Numerology Reading", "Remedies & Pooja Guidance"] },
  "All Services":      { icon: "✨", subHeading: "EI SOLUTIONS — ALL DIGITAL SERVICES",
    services: ["Aadhaar / PAN Services", "Money Transfer & AEPS", "All Bill Payments", "Insurance & Loan", "Travel & Recharge", "Government Services"] },
};

// ============================================================================
// HELPERS
// ============================================================================

const safe = (s: string) => (s || "").replace(/[<>]/g, "");

function logoBlock(data: PosterData, color: string, size = 44): string {
  if (data.logoUrl) {
    return `<img src="${data.logoUrl}" crossorigin="anonymous"
      style="width:${size}px;height:${size}px;object-fit:contain;border-radius:6px;background:#fff;padding:3px;" />`;
  }
  // Fallback: text mark
  return `<div style="width:${size}px;height:${size}px;border-radius:8px;background:${color};
    color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;
    font-size:${size * 0.42}px;letter-spacing:-1px;">EI</div>`;
}

function contactStrip(data: PosterData, bg: string, fg: string, format: PosterFormat = "a4"): string {
  const fs = format === "story" ? 13 : 12;
  return `<div style="background:${bg};color:${fg};padding:10px 18px;display:flex;
    justify-content:space-around;align-items:center;font-size:${fs}px;font-weight:700;
    gap:8px;flex-wrap:wrap;font-family:'Inter',sans-serif;">
    ${data.contact ? `<span>📞 ${safe(data.contact)}</span>` : ""}
    ${data.whatsapp ? `<span>💬 ${safe(data.whatsapp)}</span>` : ""}
    ${data.location ? `<span>📍 ${safe(data.location)}</span>` : ""}
  </div>`;
}

function svgChecklist(items: string[], color: string, fontSize: number, lineHeight: number): string {
  return items.map(s => `
    <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:${lineHeight - fontSize}px;">
      <span style="color:${color};font-size:${fontSize + 2}px;line-height:1;flex-shrink:0;">✓</span>
      <span style="font-size:${fontSize}px;font-weight:700;color:#222;line-height:1.25;">${safe(s)}</span>
    </div>`).join("");
}

// ============================================================================
// LAYOUT RENDERERS — 8 distinct visual styles
// ============================================================================

type Renderer = (data: PosterData, palette: PosterPalette, accent: string, format: PosterFormat) => string;

const renderers: Record<PosterStyle, Renderer> = {

  // ─────────────────────────────────────── MODERN ────────────────────────────
  modern: (data, p, accent, format) => {
    const { w, h } = getCanvasSize(format);
    return `
    <div style="width:${w}px;height:${h}px;background:${p.bg};font-family:'Inter','Noto Sans Malayalam',sans-serif;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;height:${h * 0.18}px;background:${p.primary};
        clip-path:polygon(0 0,100% 0,100% 75%,0 100%);"></div>
      <div style="position:absolute;top:0;left:0;right:0;padding:18px 24px;display:flex;
        justify-content:space-between;align-items:center;color:${p.textOnPrimary};">
        ${logoBlock(data, accent, 46)}
        ${data.cspId ? `<div style="text-align:right;font-size:10px;opacity:0.85;">
          <div>CSP ID</div><div style="font-weight:800;font-size:13px;">${safe(data.cspId)}</div></div>` : ""}
      </div>
      <div style="position:absolute;top:${h * 0.21}px;left:0;right:0;text-align:center;padding:0 24px;">
        <div style="display:inline-block;background:${accent};color:${p.primary};padding:4px 14px;
          border-radius:999px;font-size:11px;font-weight:800;letter-spacing:1.5px;">
          ${safe(data.tagline || "AUTHORIZED SERVICE CENTER")}
        </div>
        <h1 style="font-size:${format === "story" ? 30 : 34}px;font-weight:900;color:${p.primary};
          margin:14px 0 6px;line-height:1.05;">${safe(data.heading)}</h1>
        <p style="font-size:13px;color:${p.secondary};font-weight:600;margin:0;">${safe(data.subHeading)}</p>
      </div>
      <div style="position:absolute;top:${h * 0.42}px;left:24px;right:24px;">
        ${svgChecklist(data.services.slice(0, 7), accent, 14, 26)}
      </div>
      <div style="position:absolute;bottom:50px;left:0;right:0;">
        ${contactStrip(data, p.primary, p.textOnPrimary, format)}
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;text-align:center;padding:8px;
        background:${accent};color:${p.primary};font-size:11px;font-weight:800;letter-spacing:1px;">
        ${safe(data.brandName || "EI SOLUTIONS")}
      </div>
    </div>`;
  },

  // ─────────────────────────────────────── TRUST ──────────────────────────────
  trust: (data, p, accent, format) => {
    const { w, h } = getCanvasSize(format);
    return `
    <div style="width:${w}px;height:${h}px;background:${p.bg};font-family:'Inter','Noto Sans Malayalam',sans-serif;position:relative;overflow:hidden;">
      <div style="background:${p.primary};color:${p.textOnPrimary};padding:18px 24px;
        display:flex;align-items:center;gap:14px;">
        ${logoBlock(data, accent, 52)}
        <div style="flex:1;">
          <div style="font-size:11px;opacity:0.8;letter-spacing:2px;font-weight:600;">
            ${safe(data.tagline || "GOVERNMENT AUTHORIZED")}
          </div>
          <div style="font-size:20px;font-weight:900;line-height:1.1;margin-top:2px;">${safe(data.brandName || "EI SOLUTIONS")}</div>
        </div>
        ${data.cspId ? `<div style="text-align:right;font-size:9px;opacity:0.85;">
          <div>CSP ID</div><div style="font-weight:800;font-size:12px;">${safe(data.cspId)}</div></div>` : ""}
      </div>
      <div style="padding:22px 28px 12px;text-align:center;">
        <h1 style="font-size:${format === "story" ? 28 : 32}px;font-weight:900;color:${p.primary};
          margin:0 0 8px;line-height:1.1;">${safe(data.heading)}</h1>
        <div style="height:3px;width:60px;background:${accent};margin:0 auto 10px;border-radius:2px;"></div>
        <p style="font-size:12px;color:#555;font-weight:600;margin:0;">${safe(data.subHeading)}</p>
      </div>
      <div style="padding:10px 32px;">
        <div style="background:#fff;border:2px solid ${accent};border-radius:14px;padding:18px 20px;
          box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          ${svgChecklist(data.services.slice(0, 8), p.primary, 13, 24)}
        </div>
      </div>
      <div style="position:absolute;bottom:48px;left:0;right:0;">
        ${contactStrip(data, accent, p.primary, format)}
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;text-align:center;padding:10px;
        background:${p.primary};color:${p.textOnPrimary};font-size:11px;font-weight:700;letter-spacing:1px;">
        ⭐ TRUSTED BY THOUSANDS · 100% RELIABLE SERVICE ⭐
      </div>
    </div>`;
  },

  // ─────────────────────────────────────── FESTIVE ────────────────────────────
  festive: (data, p, accent, format) => {
    const { w, h } = getCanvasSize(format);
    return `
    <div style="width:${w}px;height:${h}px;background:url(${bgFestival}) center/cover;
      font-family:'Inter','Noto Sans Malayalam',sans-serif;position:relative;overflow:hidden;">
      <div style="position:absolute;top:18px;left:18px;right:18px;display:flex;
        justify-content:space-between;align-items:center;">
        ${logoBlock(data, accent, 46)}
        ${data.cspId ? `<div style="background:rgba(0,0,0,0.4);color:#fff;padding:4px 10px;
          border-radius:6px;font-size:10px;font-weight:700;">CSP: ${safe(data.cspId)}</div>` : ""}
      </div>
      <div style="position:absolute;top:${h * 0.13}px;left:0;right:0;text-align:center;padding:0 28px;">
        <div style="display:inline-block;background:#7C2D12;color:#FACC15;padding:5px 16px;
          border-radius:999px;font-size:11px;font-weight:800;letter-spacing:2px;">
          ${safe(data.tagline || "ഫെസ്റ്റിവൽ സ്പെഷ്യൽ ഓഫർ")}
        </div>
        <h1 style="font-size:${format === "story" ? 32 : 38}px;font-weight:900;color:#7C2D12;
          margin:12px 0 4px;line-height:1.05;text-shadow:1px 2px 0 #FACC15;">${safe(data.heading)}</h1>
        <p style="font-size:13px;color:#7C2D12;font-weight:700;margin:0;">${safe(data.subHeading)}</p>
      </div>
      <div style="position:absolute;top:${h * 0.45}px;left:32px;right:32px;background:rgba(255,255,255,0.92);
        border-radius:14px;padding:18px;border:2px dashed #7C2D12;">
        ${svgChecklist(data.services.slice(0, 6), "#138808", 13, 24)}
      </div>
      <div style="position:absolute;bottom:45px;left:0;right:0;">
        ${contactStrip(data, "#7C2D12", "#FACC15", format)}
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;text-align:center;padding:9px;
        background:#FACC15;color:#7C2D12;font-size:11px;font-weight:900;letter-spacing:1px;">
        ✨ ${safe(data.brandName || "EI SOLUTIONS")} ✨
      </div>
    </div>`;
  },

  // ─────────────────────────────────────── URGENT ─────────────────────────────
  urgent: (data, p, accent, format) => {
    const { w, h } = getCanvasSize(format);
    return `
    <div style="width:${w}px;height:${h}px;background:url(${bgUrgent}) center/cover;
      font-family:'Inter','Noto Sans Malayalam',sans-serif;position:relative;overflow:hidden;">
      <div style="position:absolute;top:14px;left:14px;right:14px;display:flex;
        justify-content:space-between;align-items:center;">
        ${logoBlock(data, "#DC2626", 42)}
        ${data.cspId ? `<div style="background:#000;color:#FBBF24;padding:4px 10px;
          border-radius:4px;font-size:10px;font-weight:800;">CSP ${safe(data.cspId)}</div>` : ""}
      </div>
      <div style="position:absolute;top:${h * 0.18}px;left:0;right:0;text-align:center;padding:0 30px;">
        <div style="display:inline-block;background:#000;color:#FBBF24;padding:6px 18px;
          transform:rotate(-3deg);font-size:13px;font-weight:900;letter-spacing:2px;">
          ⚡ HURRY UP! ⚡
        </div>
        <h1 style="font-size:${format === "story" ? 36 : 42}px;font-weight:900;color:#B91C1C;
          margin:14px 0 4px;line-height:1;text-shadow:2px 2px 0 #FFF,4px 4px 0 #000;">
          ${safe(data.heading)}
        </h1>
        <p style="font-size:14px;color:#000;font-weight:800;margin:0;background:#FBBF24;
          display:inline-block;padding:3px 10px;">${safe(data.subHeading)}</p>
      </div>
      <div style="position:absolute;top:${h * 0.5}px;left:30px;right:30px;background:#fff;
        border:3px solid #000;padding:16px 18px;box-shadow:6px 6px 0 #000;">
        ${svgChecklist(data.services.slice(0, 6), "#B91C1C", 13, 24)}
      </div>
      <div style="position:absolute;bottom:45px;left:0;right:0;">
        ${contactStrip(data, "#000", "#FBBF24", format)}
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;text-align:center;padding:9px;
        background:#B91C1C;color:#FFF;font-size:12px;font-weight:900;letter-spacing:1px;">
        🔥 ${safe(data.brandName || "EI SOLUTIONS")} · LIMITED TIME OFFER 🔥
      </div>
    </div>`;
  },

  // ─────────────────────────────────────── CORPORATE ──────────────────────────
  corporate: (data, p, accent, format) => {
    const { w, h } = getCanvasSize(format);
    return `
    <div style="width:${w}px;height:${h}px;background:url(${bgBanking}) center/cover;
      font-family:'Inter','Noto Sans Malayalam',sans-serif;position:relative;overflow:hidden;color:#FFF;">
      <div style="position:absolute;top:24px;left:30px;right:30px;display:flex;
        justify-content:space-between;align-items:center;">
        ${logoBlock(data, accent, 50)}
        ${data.cspId ? `<div style="text-align:right;font-size:10px;color:${accent};">
          <div style="opacity:0.7;">PARTNER ID</div>
          <div style="font-weight:800;font-size:13px;">${safe(data.cspId)}</div></div>` : ""}
      </div>
      <div style="position:absolute;top:${h * 0.17}px;left:0;right:0;text-align:center;padding:0 36px;">
        <div style="display:inline-block;border:1px solid ${accent};color:${accent};padding:4px 16px;
          font-size:10px;font-weight:600;letter-spacing:3px;">
          ${safe(data.tagline || "PREMIUM AUTHORIZED PARTNER")}
        </div>
        <h1 style="font-size:${format === "story" ? 30 : 34}px;font-weight:900;color:${accent};
          margin:16px 0 6px;line-height:1.05;font-family:Georgia,serif;">${safe(data.heading)}</h1>
        <div style="height:2px;width:80px;background:${accent};margin:8px auto;"></div>
        <p style="font-size:12px;color:#FFF;font-weight:500;margin:0;letter-spacing:1px;">
          ${safe(data.subHeading)}</p>
      </div>
      <div style="position:absolute;top:${h * 0.46}px;left:36px;right:36px;background:rgba(255,255,255,0.06);
        backdrop-filter:blur(4px);border:1px solid ${accent}40;border-radius:8px;padding:18px 20px;">
        ${svgChecklist(data.services.slice(0, 7), accent, 13, 24)
          .replace(/color:#222/g, "color:#FFF")}
      </div>
      <div style="position:absolute;bottom:45px;left:0;right:0;">
        ${contactStrip(data, accent, "#0D2A5C", format)}
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;text-align:center;padding:10px;
        background:#000;color:${accent};font-size:11px;font-weight:700;letter-spacing:2px;">
        ${safe(data.brandName || "EI SOLUTIONS")} · EST. EXCELLENCE
      </div>
    </div>`;
  },

  // ─────────────────────────────────────── MINIMAL ────────────────────────────
  minimal: (data, p, accent, format) => {
    const { w, h } = getCanvasSize(format);
    return `
    <div style="width:${w}px;height:${h}px;background:${p.bg};font-family:'Inter','Noto Sans Malayalam',sans-serif;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;width:6px;height:100%;background:${accent};"></div>
      <div style="padding:34px 40px 20px 50px;display:flex;justify-content:space-between;align-items:flex-start;">
        ${logoBlock(data, accent, 48)}
        ${data.cspId ? `<div style="font-size:10px;color:#888;text-align:right;">
          <div style="letter-spacing:2px;">CSP ID</div>
          <div style="font-weight:800;font-size:14px;color:${p.primary};">${safe(data.cspId)}</div></div>` : ""}
      </div>
      <div style="padding:16px 50px 0;">
        <div style="font-size:11px;color:${accent};font-weight:700;letter-spacing:3px;text-transform:uppercase;">
          ${safe(data.tagline || "SERVICES OFFERED")}
        </div>
        <h1 style="font-size:${format === "story" ? 36 : 42}px;font-weight:900;color:${p.primary};
          margin:8px 0 4px;line-height:1;letter-spacing:-1px;">${safe(data.heading)}</h1>
        <p style="font-size:13px;color:#555;font-weight:500;margin:0 0 28px;">${safe(data.subHeading)}</p>
      </div>
      <div style="padding:0 50px;">
        ${svgChecklist(data.services.slice(0, 8), accent, 14, 30)}
      </div>
      <div style="position:absolute;bottom:55px;left:50px;right:40px;border-top:1px solid #ddd;
        padding-top:14px;font-size:11px;color:#666;line-height:1.7;">
        ${data.contact ? `📞 <strong style="color:${p.primary};">${safe(data.contact)}</strong>` : ""}
        ${data.whatsapp ? ` · 💬 ${safe(data.whatsapp)}` : ""}
        <br>${data.location ? `📍 ${safe(data.location)}` : ""}
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;text-align:center;padding:9px;
        background:${p.primary};color:#FFF;font-size:10px;font-weight:600;letter-spacing:3px;">
        ${safe(data.brandName || "EI SOLUTIONS")}
      </div>
    </div>`;
  },

  // ─────────────────────────────────────── TRICOLOR ───────────────────────────
  tricolor: (data, p, accent, format) => {
    const { w, h } = getCanvasSize(format);
    return `
    <div style="width:${w}px;height:${h}px;background:url(${bgGovt}) center/cover;
      font-family:'Inter','Noto Sans Malayalam',sans-serif;position:relative;overflow:hidden;">
      <div style="position:absolute;top:14px;left:18px;right:18px;display:flex;
        justify-content:space-between;align-items:center;">
        ${logoBlock(data, "#000080", 44)}
        ${data.cspId ? `<div style="background:#000080;color:#FFF;padding:4px 10px;
          border-radius:4px;font-size:10px;font-weight:700;">CSP ${safe(data.cspId)}</div>` : ""}
      </div>
      <div style="position:absolute;top:${h * 0.16}px;left:0;right:0;text-align:center;padding:0 30px;">
        <div style="display:inline-block;background:#000080;color:#FFF;padding:5px 16px;
          font-size:11px;font-weight:800;letter-spacing:2px;">
          ${safe(data.tagline || "DIGITAL INDIA · सरकार अधिकृत")}
        </div>
        <h1 style="font-size:${format === "story" ? 30 : 34}px;font-weight:900;color:#000080;
          margin:14px 0 4px;line-height:1.05;">${safe(data.heading)}</h1>
        <p style="font-size:12px;color:#1A1A1A;font-weight:700;margin:0;">${safe(data.subHeading)}</p>
      </div>
      <div style="position:absolute;top:${h * 0.46}px;left:32px;right:32px;background:rgba(255,255,255,0.95);
        border-radius:10px;padding:16px 18px;border-top:4px solid #FF9933;border-bottom:4px solid #138808;">
        ${svgChecklist(data.services.slice(0, 7), "#138808", 13, 24)}
      </div>
      <div style="position:absolute;bottom:45px;left:0;right:0;">
        ${contactStrip(data, "#000080", "#FFF", format)}
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;display:flex;height:9px;">
        <div style="flex:1;background:#FF9933;"></div>
        <div style="flex:1;background:#FFF;"></div>
        <div style="flex:1;background:#138808;"></div>
      </div>
    </div>`;
  },

  // ─────────────────────────────────────── CIRCUIT (DIGITAL) ──────────────────
  circuit: (data, p, accent, format) => {
    const { w, h } = getCanvasSize(format);
    return `
    <div style="width:${w}px;height:${h}px;background:url(${bgDigital}) center/cover;
      font-family:'Inter','Noto Sans Malayalam',sans-serif;position:relative;overflow:hidden;">
      <div style="position:absolute;top:18px;left:24px;right:24px;display:flex;
        justify-content:space-between;align-items:center;">
        ${logoBlock(data, p.primary, 44)}
        ${data.cspId ? `<div style="background:${p.primary};color:${accent};padding:4px 10px;
          border-radius:4px;font-size:10px;font-weight:700;">CSP ${safe(data.cspId)}</div>` : ""}
      </div>
      <div style="position:absolute;top:${h * 0.15}px;left:0;right:0;text-align:center;padding:0 36px;">
        <div style="display:inline-block;background:${p.primary};color:${accent};padding:5px 16px;
          border-radius:999px;font-size:11px;font-weight:800;letter-spacing:2px;">
          ${safe(data.tagline || "DIGITAL · INSTANT · SECURE")}
        </div>
        <h1 style="font-size:${format === "story" ? 30 : 34}px;font-weight:900;color:${p.primary};
          margin:14px 0 4px;line-height:1.05;">${safe(data.heading)}</h1>
        <p style="font-size:13px;color:${p.secondary};font-weight:700;margin:0;">${safe(data.subHeading)}</p>
      </div>
      <div style="position:absolute;top:${h * 0.45}px;left:36px;right:36px;background:#FFF;
        border-radius:12px;padding:18px 20px;box-shadow:0 8px 24px rgba(0,0,0,0.12);
        border-left:4px solid ${accent};">
        ${svgChecklist(data.services.slice(0, 7), p.primary, 13, 24)}
      </div>
      <div style="position:absolute;bottom:45px;left:0;right:0;">
        ${contactStrip(data, p.primary, "#FFF", format)}
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;text-align:center;padding:10px;
        background:${accent};color:${p.primary};font-size:11px;font-weight:800;letter-spacing:2px;">
        ${safe(data.brandName || "EI SOLUTIONS")} · DIGITAL SERVICES
      </div>
    </div>`;
  // ─────────────────────────────────────── ELEGANT MATCH (Matrimony) ──────────
  elegantMatch: (data, p, accent, format) => {
    const { w, h } = getCanvasSize(format);
    return `
    <div style="width:${w}px;height:${h}px;background:url(${bgMatrimony}) center/cover, ${p.bg};
      font-family:'Playfair Display','Georgia','Noto Sans Malayalam',serif;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;height:60px;background:linear-gradient(180deg,rgba(124,45,18,0.85),transparent);"></div>
      <div style="position:absolute;top:14px;left:20px;right:20px;display:flex;
        justify-content:space-between;align-items:center;color:#FFF7ED;">
        ${logoBlock(data, accent, 44)}
        <div style="text-align:center;flex:1;">
          <div style="font-size:11px;letter-spacing:4px;font-weight:600;opacity:0.95;">
            ${safe(data.tagline || "MATRIMONY · വിവാഹ സേവനം")}
          </div>
        </div>
        ${data.cspId ? `<div style="background:rgba(0,0,0,0.45);color:#FACC15;padding:3px 9px;
          border-radius:4px;font-size:10px;font-weight:700;font-family:Inter,sans-serif;">
          ID: ${safe(data.cspId)}</div>` : `<div style="width:44px;"></div>`}
      </div>

      <div style="position:absolute;top:${h * 0.16}px;left:0;right:0;text-align:center;padding:0 30px;">
        <div style="font-size:22px;color:#9A3412;letter-spacing:6px;margin-bottom:6px;">❀ ❀ ❀</div>
        <h1 style="font-size:${format === "story" ? 36 : 42}px;font-weight:700;color:#7C2D12;
          margin:6px 0;line-height:1.05;font-style:italic;">${safe(data.heading)}</h1>
        <div style="display:inline-flex;align-items:center;gap:12px;margin:8px 0;">
          <div style="height:1px;width:50px;background:#C2410C;"></div>
          <span style="font-size:18px;color:#C2410C;">💍</span>
          <div style="height:1px;width:50px;background:#C2410C;"></div>
        </div>
        <p style="font-size:13px;color:#9A3412;font-weight:600;margin:0;letter-spacing:1px;
          font-family:'Inter',sans-serif;">${safe(data.subHeading)}</p>
      </div>

      <div style="position:absolute;top:${h * 0.43}px;left:36px;right:36px;background:rgba(255,255,255,0.95);
        border:2px solid #C2410C;border-radius:6px;padding:20px 22px;
        box-shadow:0 6px 24px rgba(124,45,18,0.18);font-family:Inter,sans-serif;">
        <div style="text-align:center;font-size:10px;letter-spacing:3px;color:#9A3412;
          font-weight:800;margin-bottom:10px;">— OUR SERVICES —</div>
        ${svgChecklist(data.services.slice(0, 8), "#C2410C", 13, 23)}
      </div>

      <div style="position:absolute;bottom:48px;left:0;right:0;font-family:Inter,sans-serif;">
        ${contactStrip(data, "#7C2D12", "#FACC15", format)}
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;text-align:center;padding:9px;
        background:#FACC15;color:#7C2D12;font-size:11px;font-weight:800;letter-spacing:3px;
        font-family:Inter,sans-serif;">
        ❀ ${safe(data.brandName || "EI SOLUTIONS MATRIMONY")} · CONFIDENTIAL & TRUSTED ❀
      </div>
    </div>`;
  },

  // ─────────────────────────────────────── GOLD AUTHORITY (Janasevana) ────────
  goldAuthority: (data, p, accent, format) => {
    const { w, h } = getCanvasSize(format);
    return `
    <div style="width:${w}px;height:${h}px;background:url(${bgJanasevana}) center/cover, #FFFFFF;
      font-family:'Inter','Noto Sans Malayalam',sans-serif;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;display:flex;height:6px;">
        <div style="flex:1;background:#FF9933;"></div>
        <div style="flex:1;background:#FFFFFF;"></div>
        <div style="flex:1;background:#138808;"></div>
      </div>
      <div style="position:absolute;top:14px;left:20px;right:20px;display:flex;
        justify-content:space-between;align-items:center;">
        ${logoBlock(data, "#000080", 48)}
        <div style="text-align:right;">
          <div style="font-size:9px;color:#000080;letter-spacing:2px;font-weight:700;">GOVERNMENT AUTHORIZED</div>
          ${data.cspId ? `<div style="font-size:13px;font-weight:900;color:#000080;">CSP: ${safe(data.cspId)}</div>` : ""}
        </div>
      </div>

      <div style="position:absolute;top:${h * 0.13}px;left:0;right:0;text-align:center;padding:0 28px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#FACC15);
          color:#000080;padding:6px 18px;border-radius:3px;font-size:11px;font-weight:900;
          letter-spacing:3px;border:1px solid #000080;">
          ⚜️ ${safe(data.tagline || "ജനസേവന കേന്ദ്രം")} ⚜️
        </div>
        <h1 style="font-size:${format === "story" ? 32 : 38}px;font-weight:900;color:#000080;
          margin:14px 0 4px;line-height:1.05;">${safe(data.heading)}</h1>
        <div style="display:inline-flex;align-items:center;gap:10px;margin:6px 0;">
          <div style="height:2px;width:40px;background:#FF9933;"></div>
          <div style="height:2px;width:40px;background:#138808;"></div>
        </div>
        <p style="font-size:12px;color:#1A1A1A;font-weight:700;margin:0;letter-spacing:1px;">
          ${safe(data.subHeading)}</p>
      </div>

      <div style="position:absolute;top:${h * 0.42}px;left:30px;right:30px;background:#FFFFFF;
        border-top:5px solid #FF9933;border-bottom:5px solid #138808;padding:18px 22px;
        box-shadow:0 6px 24px rgba(0,0,0,0.15);">
        <div style="text-align:center;font-size:10px;letter-spacing:3px;color:#000080;
          font-weight:900;margin-bottom:12px;">★ AVAILABLE SERVICES ★</div>
        ${svgChecklist(data.services.slice(0, 8), "#000080", 13, 23)}
      </div>

      <div style="position:absolute;bottom:48px;left:0;right:0;">
        ${contactStrip(data, "#000080", "#FFFFFF", format)}
      </div>
      <div style="position:absolute;bottom:9px;left:0;right:0;text-align:center;padding:8px;
        background:#000080;color:#D4AF37;font-size:11px;font-weight:800;letter-spacing:2px;">
        ⚜️ ${safe(data.brandName || "EI SOLUTIONS")} · सत्यमेव जयते ⚜️
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;display:flex;height:9px;">
        <div style="flex:1;background:#FF9933;"></div>
        <div style="flex:1;background:#FFFFFF;"></div>
        <div style="flex:1;background:#138808;"></div>
      </div>
    </div>`;
  },

  // ─────────────────────────────────────── COSMIC MYSTIC (Horoscope) ──────────
  cosmicMystic: (data, p, accent, format) => {
    const { w, h } = getCanvasSize(format);
    return `
    <div style="width:${w}px;height:${h}px;background:url(${bgHoroscope}) center/cover, #0F172A;
      font-family:'Inter','Noto Sans Malayalam',sans-serif;position:relative;overflow:hidden;color:#F5E6B3;">
      <div style="position:absolute;top:14px;left:20px;right:20px;display:flex;
        justify-content:space-between;align-items:center;">
        ${logoBlock(data, "#D4AF37", 44)}
        ${data.cspId ? `<div style="background:rgba(212,175,55,0.15);border:1px solid #D4AF37;
          color:#D4AF37;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;">
          ID: ${safe(data.cspId)}</div>` : ""}
      </div>

      <div style="position:absolute;top:${h * 0.14}px;left:0;right:0;text-align:center;padding:0 32px;">
        <div style="display:inline-block;border:1px solid #D4AF37;color:#D4AF37;
          padding:5px 18px;font-size:11px;font-weight:700;letter-spacing:4px;border-radius:2px;">
          ✦ ${safe(data.tagline || "ജാതക സേവനം · VEDIC ASTROLOGY")} ✦
        </div>
        <h1 style="font-size:${format === "story" ? 32 : 38}px;font-weight:900;color:#F5E6B3;
          margin:14px 0 6px;line-height:1.05;font-family:'Cinzel',Georgia,serif;
          text-shadow:0 0 20px rgba(212,175,55,0.4);">${safe(data.heading)}</h1>
        <div style="font-size:18px;color:#D4AF37;letter-spacing:8px;margin:4px 0;">⭒ ☽ ⭒</div>
        <p style="font-size:12px;color:#E8D080;font-weight:600;margin:0;letter-spacing:2px;">
          ${safe(data.subHeading)}</p>
      </div>

      <div style="position:absolute;top:${h * 0.46}px;left:32px;right:32px;
        background:rgba(15,23,42,0.85);backdrop-filter:blur(6px);
        border:1px solid #D4AF37;border-radius:8px;padding:18px 22px;
        box-shadow:0 0 40px rgba(212,175,55,0.25);">
        <div style="text-align:center;font-size:10px;letter-spacing:4px;color:#D4AF37;
          font-weight:800;margin-bottom:10px;">— SERVICES —</div>
        ${svgChecklist(data.services.slice(0, 8), "#D4AF37", 13, 23)
          .replace(/color:#222/g, "color:#F5E6B3")}
      </div>

      <div style="position:absolute;bottom:48px;left:0;right:0;">
        ${contactStrip(data, "#D4AF37", "#0F172A", format)}
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;text-align:center;padding:10px;
        background:#0F172A;color:#D4AF37;font-size:11px;font-weight:700;letter-spacing:3px;
        border-top:1px solid #D4AF37;">
        ✦ ${safe(data.brandName || "EI SOLUTIONS")} · JYOTISHA SERVICES ✦
      </div>
    </div>`;
  },
};

// ============================================================================
// THUMBNAIL GENERATOR (small SVG preview for gallery)
// ============================================================================

function thumbnail(palette: PosterPalette, accent: string, style: PosterStyle, label: string): string {
  const headerColors: Record<PosterStyle, string> = {
    modern: palette.primary, trust: palette.primary, festive: "#7C2D12",
    urgent: "#B91C1C", corporate: "#0D2A5C", minimal: palette.primary,
    tricolor: "#000080", circuit: palette.primary,
  };
  const bgColors: Record<PosterStyle, string> = {
    modern: palette.bg, trust: palette.bg, festive: "#FFF7E6",
    urgent: "#FEF2F2", corporate: "#0D2A5C", minimal: palette.bg,
    tricolor: "#FFFFFF", circuit: "#EFF6FF",
  };
  const bg = bgColors[style];
  const header = headerColors[style];
  return `
  <svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
    <rect width="200" height="280" fill="${bg}"/>
    <rect width="200" height="55" fill="${header}"/>
    <circle cx="22" cy="27" r="11" fill="${accent}"/>
    <rect x="40" y="20" width="80" height="6" rx="2" fill="${accent}" opacity="0.9"/>
    <rect x="40" y="30" width="60" height="4" rx="2" fill="#FFF" opacity="0.7"/>
    <rect x="20" y="75" width="160" height="9" rx="2" fill="${header}"/>
    <rect x="35" y="92" width="130" height="5" rx="2" fill="#888"/>
    ${[0,1,2,3,4].map(i => `
      <circle cx="28" cy="${120 + i * 18}" r="3" fill="${accent}"/>
      <rect x="38" y="${117 + i * 18}" width="${110 - i * 8}" height="5" rx="2" fill="#444"/>
    `).join("")}
    <rect x="0" y="240" width="200" height="22" fill="${header}"/>
    <rect x="20" y="248" width="160" height="5" rx="2" fill="${accent}"/>
    <rect x="0" y="262" width="200" height="18" fill="${accent}"/>
    <text x="100" y="274" text-anchor="middle" font-family="Inter,sans-serif"
      font-size="9" font-weight="700" fill="${header}">${label}</text>
  </svg>`;
}

// ============================================================================
// TEMPLATE FACTORY
// ============================================================================

let _id = 0;
function make(
  category: ServiceCategory,
  style: PosterStyle,
  paletteKey: keyof typeof PALETTES,
  nameSuffix: string,
  extraTags: string[] = []
): PosterTemplate {
  _id++;
  const palette = PALETTES[paletteKey];
  const id = `pt-${String(_id).padStart(3, "0")}`;
  const name = `${category} · ${nameSuffix}`;
  return {
    id, name, category, style, palette,
    tags: [style, category.toLowerCase(), ...extraTags],
    render: (data, custom) => renderers[style](data, palette, custom?.accentColor || palette.accent, custom?.format || "a4"),
    thumbnail: () => thumbnail(palette, palette.accent, style, category.toUpperCase()),
  };
}

// ============================================================================
// TEMPLATE REGISTRY — 80 templates across 15 categories + All Services
// ============================================================================

const CATEGORIES: ServiceCategory[] = [
  "PAN Card", "Money Transfer", "AEPS", "Recharge", "Bill Payment",
  "Insurance", "Loan", "Travel Booking", "PVC Card", "Aadhaar Services",
  "GST", "Banking", "Education", "Health Card", "Job Services",
];

// Per category we ship 5 variants (modern, trust, festive, urgent, corporate/minimal/tricolor/circuit rotated)
// Different palette per variant for visual diversity.
const VARIANTS: Array<{ style: PosterStyle; suffix: string; tags: string[]; paletteRotation: (keyof typeof PALETTES)[] }> = [
  { style: "modern",    suffix: "Modern Clean",   tags: ["office", "premium"],
    paletteRotation: ["navyGold", "electricBlue", "oceanTeal", "midnightCyan", "charcoalLime"] },
  { style: "trust",     suffix: "Trust & Verified", tags: ["trust", "office"],
    paletteRotation: ["forestGold", "rubyRed", "burgundyCream", "navyGold", "mintCharcoal"] },
  { style: "festive",   suffix: "Festival Special", tags: ["festival", "premium"],
    paletteRotation: ["marigold", "saffronEmerald", "rubyRed", "marigold", "saffronEmerald"] },
  { style: "urgent",    suffix: "Limited Offer",   tags: ["urgent", "offer"],
    paletteRotation: ["crimsonBlack", "rubyRed", "marigold", "crimsonBlack", "rubyRed"] },
  { style: "corporate", suffix: "Premium Corporate", tags: ["premium", "corporate"],
    paletteRotation: ["goldOnBlack", "navyGold", "royalPurple", "midnightCyan", "goldOnBlack"] },
];

// Build base 75 (15 cat × 5 variants)
const BUILT: PosterTemplate[] = [];
CATEGORIES.forEach((cat, ci) => {
  VARIANTS.forEach((v, vi) => {
    const palette = v.paletteRotation[ci % v.paletteRotation.length];
    BUILT.push(make(cat, v.style, palette, v.suffix, v.tags));
  });
});

// Add 5 "All Services" hero variants to round to 80
[
  make("All Services", "minimal",  "charcoalLime",     "All-In-One Minimal",  ["minimal", "premium"]),
  make("All Services", "tricolor", "saffronWhiteGreen","Digital India Tricolor", ["govt", "premium"]),
  make("All Services", "circuit",  "midnightCyan",     "Digital All Services", ["digital", "premium"]),
  make("All Services", "corporate","goldOnBlack",      "Premium Black Gold",  ["premium", "corporate"]),
  make("All Services", "festive",  "marigold",         "Mega Festival",       ["festival", "premium"]),
].forEach(t => BUILT.push(t));

export const ALL_POSTER_TEMPLATES: PosterTemplate[] = BUILT;

export const POSTER_CATEGORIES = ["All", ...CATEGORIES, "All Services"] as const;
export const POSTER_QUICK_FILTERS: Array<{ label: string; value: string }> = [
  { label: "🏢 Office", value: "office" },
  { label: "🎉 Festival", value: "festival" },
  { label: "🔥 Urgent / Offer", value: "urgent" },
  { label: "👑 Premium", value: "premium" },
  { label: "🛡️ Trust", value: "trust" },
  { label: "🇮🇳 Govt Style", value: "govt" },
  { label: "💻 Digital", value: "digital" },
  { label: "🎨 Minimal", value: "minimal" },
];

// Default category services for a chosen template
export function defaultDataForCategory(cat: ServiceCategory): Pick<PosterData, "subHeading" | "services"> {
  const def = CATEGORY_DEFAULTS[cat];
  return { subHeading: def.subHeading, services: def.services };
}

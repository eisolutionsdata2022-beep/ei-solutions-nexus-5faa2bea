/**
 * CV Template Engine
 * Generates 50+ professional CV templates from layouts × color schemes × typography.
 * Each template is uniquely identified, categorized, and produces print-ready HTML.
 */

export interface LanguageSkill {
  language: string;
  listening: string;
  reading: string;
  writing: string;
  speaking: string;
}

export interface WorkEntry {
  title: string;
  company: string;
  location: string;
  from: string;
  to: string;
  responsibilities: string;
}

export interface EducationEntry {
  course: string;
  institution: string;
  location: string;
  year: string;
  subjects: string;
}

export interface CVData {
  name: string;
  address: string;
  phone: string;
  email: string;
  dob: string;
  nationality: string;
  photo: string | null;
  jobAppliedFor: string;
  careerObjective?: string;
  workExperience: WorkEntry[];
  education: EducationEntry[];
  languages: LanguageSkill[];
  digitalSkills: string;
  communicationSkills: string;
  organisationalSkills: string;
  certifications?: string;
  additionalInfo: string;
  annexes: string;
  declarationPlace: string;
  declarationDate: string;
  signature?: string | null;
}

export interface TemplateCustomization {
  fontScale: number;       // 0.9 – 1.15
  accentColor?: string;    // override accent
}

export interface CVTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  tags: string[];
  layout: LayoutKind;
  palette: Palette;
  font: FontPair;
  generateHTML: (data: CVData, custom?: TemplateCustomization) => string;
  generatePreviewSVG: () => string; // small thumbnail
}

export type TemplateCategory =
  | "Modern" | "Corporate" | "Creative" | "Fresher" | "Executive"
  | "IT" | "Healthcare" | "Gulf Job" | "Driver" | "Teacher"
  | "Accountant" | "Sales" | "Minimal" | "Colorful" | "ATS" | "International";

export type LayoutKind =
  | "classic"        // single column, header + sections
  | "sidebar-left"   // dark left sidebar
  | "sidebar-right"  // dark right sidebar
  | "header-band"    // colored header band, body below
  | "split-top"      // photo + name top, two-col body
  | "minimal-line"   // ultra-minimal, ruled lines
  | "card-stack";    // section cards

interface Palette {
  primary: string;
  primarySoft: string;
  primaryDark: string;
  text: string;
  muted: string;
  border: string;
  bg: string;
  sidebarBg: string;
  sidebarText: string;
}

interface FontPair {
  heading: string;
  body: string;
  google: string; // google fonts URL fragment
}

const FONTS: Record<string, FontPair> = {
  inter: { heading: "Inter", body: "Inter", google: "Inter:wght@300;400;500;600;700;800" },
  source: { heading: "Source Sans 3", body: "Source Sans 3", google: "Source+Sans+3:wght@300;400;600;700" },
  dmSans: { heading: "DM Sans", body: "DM Sans", google: "DM+Sans:wght@400;500;600;700" },
  nunito: { heading: "Nunito Sans", body: "Nunito Sans", google: "Nunito+Sans:wght@300;400;600;700;800" },
  poppins: { heading: "Poppins", body: "Poppins", google: "Poppins:wght@300;400;500;600;700" },
  playfair: { heading: "Playfair Display", body: "Lato", google: "Playfair+Display:wght@500;700&family=Lato:wght@300;400;700" },
  manrope: { heading: "Manrope", body: "Manrope", google: "Manrope:wght@300;400;500;600;700;800" },
  raleway: { heading: "Raleway", body: "Open Sans", google: "Raleway:wght@500;700&family=Open+Sans:wght@300;400;600" },
  roboto: { heading: "Roboto", body: "Roboto", google: "Roboto:wght@300;400;500;700" },
  spaceGrotesk: { heading: "Space Grotesk", body: "Inter", google: "Space+Grotesk:wght@500;600;700&family=Inter:wght@300;400;500;600" },
};

function makePalette(primary: string, sidebarBg: string, sidebarText = "#f8fafc"): Palette {
  return {
    primary,
    primarySoft: primary + "1a",
    primaryDark: primary,
    text: "#1f2937",
    muted: "#6b7280",
    border: "#e5e7eb",
    bg: "#ffffff",
    sidebarBg,
    sidebarText,
  };
}

const PALETTES: Record<string, Palette> = {
  navy: makePalette("#1e3a8a", "#0f172a"),
  ocean: makePalette("#0369a1", "#0c4a6e"),
  emerald: makePalette("#047857", "#064e3b"),
  forest: makePalette("#166534", "#14532d"),
  ruby: makePalette("#be123c", "#881337"),
  burgundy: makePalette("#9f1239", "#4c0519"),
  amber: makePalette("#b45309", "#78350f"),
  sunrise: makePalette("#ea580c", "#7c2d12"),
  violet: makePalette("#6d28d9", "#4c1d95"),
  indigo: makePalette("#4338ca", "#312e81"),
  teal: makePalette("#0f766e", "#134e4a"),
  cyan: makePalette("#0e7490", "#164e63"),
  graphite: makePalette("#374151", "#111827"),
  charcoal: makePalette("#1f2937", "#0a0e1a"),
  gold: makePalette("#a16207", "#713f12"),
  rose: makePalette("#e11d48", "#881337"),
  steel: makePalette("#475569", "#1e293b"),
  bronze: makePalette("#92400e", "#451a03"),
  mint: makePalette("#059669", "#064e3b"),
  azure: makePalette("#2563eb", "#1e3a8a"),
};

function esc(str: string) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fontStack(font: FontPair) {
  return `'${font.body}', system-ui, -apple-system, sans-serif`;
}

function googleFontsLink(font: FontPair) {
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=${font.google}&display=swap" rel="stylesheet">`;
}

function workBlock(entries: WorkEntry[], textColor: string, mutedColor: string) {
  return entries.filter(e => e.title || e.company).map(e => `
    <div style="margin-bottom:12px;page-break-inside:avoid;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;">
        <div style="font-weight:700;font-size:13px;color:${textColor};">${esc(e.title)}</div>
        <div style="font-size:11px;color:${mutedColor};white-space:nowrap;">${esc(e.from)}${e.to ? ` – ${esc(e.to)}` : ""}</div>
      </div>
      <div style="font-size:12px;color:${mutedColor};margin-top:1px;">${esc(e.company)}${e.location ? ` · ${esc(e.location)}` : ""}</div>
      ${e.responsibilities ? `<div style="font-size:11.5px;line-height:1.55;color:${textColor};margin-top:4px;white-space:pre-line;">${esc(e.responsibilities)}</div>` : ""}
    </div>`).join("");
}

function eduBlock(entries: EducationEntry[], textColor: string, mutedColor: string) {
  return entries.filter(e => e.course || e.institution).map(e => `
    <div style="margin-bottom:10px;page-break-inside:avoid;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;">
        <div style="font-weight:700;font-size:13px;color:${textColor};">${esc(e.course)}</div>
        <div style="font-size:11px;color:${mutedColor};white-space:nowrap;">${esc(e.year)}</div>
      </div>
      <div style="font-size:12px;color:${mutedColor};margin-top:1px;">${esc(e.institution)}${e.location ? ` · ${esc(e.location)}` : ""}</div>
      ${e.subjects ? `<div style="font-size:11.5px;line-height:1.55;color:${textColor};margin-top:3px;white-space:pre-line;">${esc(e.subjects)}</div>` : ""}
    </div>`).join("");
}

function langTable(langs: LanguageSkill[], headerBg: string, headerColor: string, borderColor: string) {
  if (!langs.filter(l => l.language).length) return "";
  return `<table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-top:4px;">
    <tr style="background:${headerBg};color:${headerColor};">
      <th style="border:1px solid ${borderColor};padding:5px 8px;text-align:left;">Language</th>
      <th style="border:1px solid ${borderColor};padding:5px 8px;">Listen</th>
      <th style="border:1px solid ${borderColor};padding:5px 8px;">Read</th>
      <th style="border:1px solid ${borderColor};padding:5px 8px;">Write</th>
      <th style="border:1px solid ${borderColor};padding:5px 8px;">Speak</th>
    </tr>
    ${langs.filter(l => l.language).map(l => `<tr>
      <td style="border:1px solid ${borderColor};padding:4px 8px;font-weight:600;">${esc(l.language)}</td>
      <td style="border:1px solid ${borderColor};padding:4px 8px;text-align:center;">${esc(l.listening)}</td>
      <td style="border:1px solid ${borderColor};padding:4px 8px;text-align:center;">${esc(l.reading)}</td>
      <td style="border:1px solid ${borderColor};padding:4px 8px;text-align:center;">${esc(l.writing)}</td>
      <td style="border:1px solid ${borderColor};padding:4px 8px;text-align:center;">${esc(l.speaking)}</td>
    </tr>`).join("")}
  </table>`;
}

function chipList(csv: string, bg: string, color: string, border: string) {
  if (!csv) return "";
  return `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;">${csv.split(",").map(s => s.trim()).filter(Boolean).map(s => `<span style="background:${bg};color:${color};border:1px solid ${border};padding:3px 10px;border-radius:14px;font-size:11px;font-weight:500;">${esc(s)}</span>`).join("")}</div>`;
}

function declaration(data: CVData, accent: string) {
  return `<div style="margin-top:18px;padding-top:14px;border-top:1px solid #e5e7eb;">
    <div style="font-size:11.5px;line-height:1.6;color:#475569;">I hereby declare that the above information is true and correct to the best of my knowledge.</div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:14px;font-size:11.5px;">
      <div>
        <div style="color:#6b7280;">Place: <span style="color:${accent};font-weight:600;">${esc(data.declarationPlace)}</span></div>
        <div style="color:#6b7280;margin-top:3px;">Date: <span style="color:${accent};font-weight:600;">${esc(data.declarationDate)}</span></div>
      </div>
      <div style="text-align:right;">
        ${data.signature ? `<img src="${data.signature}" style="height:36px;object-fit:contain;margin-bottom:2px;" />` : `<div style="width:160px;height:36px;border-bottom:1px solid #cbd5e1;"></div>`}
        <div style="font-size:10px;color:#94a3b8;">Signature</div>
      </div>
    </div>
  </div>`;
}

function photoOrPlaceholder(photo: string | null, size: number, radius: number, border: string, bg = "#e2e8f0") {
  if (photo) return `<img src="${photo}" style="width:${size}px;height:${size}px;border-radius:${radius}px;object-fit:cover;border:${border};" />`;
  return `<div style="width:${size}px;height:${size}px;border-radius:${radius}px;background:${bg};border:${border};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.42)}px;color:#94a3b8;">👤</div>`;
}

// ─────────── Layout renderers ───────────

function renderClassic(data: CVData, p: Palette, font: FontPair, accent: string, scale: number): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CV - ${esc(data.name)}</title>
  ${googleFontsLink(font)}
  <style>
    @page { size: A4; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:${fontStack(font)}; color:${p.text}; background:#fff; max-width:794px; margin:0 auto; padding:36px 44px; font-size:${12 * scale}px; }
    h1,h2,h3 { font-family:'${font.heading}',sans-serif; }
    .header { display:flex; gap:20px; align-items:center; padding-bottom:16px; border-bottom:3px solid ${accent}; margin-bottom:18px; }
    .header h1 { font-size:${26 * scale}px; font-weight:700; color:${accent}; letter-spacing:-0.5px; }
    .role { font-size:${12 * scale}px; color:${p.muted}; margin-top:2px; }
    .meta { display:grid; grid-template-columns:1fr 1fr; gap:3px 18px; font-size:${11 * scale}px; color:${p.muted}; margin-top:6px; }
    .meta strong { color:${p.text}; font-weight:600; }
    .sec { margin-bottom:14px; }
    .sec-title { font-size:${12 * scale}px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:${accent}; padding-bottom:4px; border-bottom:1px solid ${p.border}; margin-bottom:8px; }
    .body-text { font-size:${11.5 * scale}px; line-height:1.6; color:${p.text}; white-space:pre-line; }
  </style></head><body>
  <div class="header">
    ${photoOrPlaceholder(data.photo, 80, 4, `2px solid ${accent}`)}
    <div style="flex:1;">
      <h1>${esc(data.name) || "Your Name"}</h1>
      ${data.jobAppliedFor ? `<div class="role">${esc(data.jobAppliedFor)}</div>` : ""}
      <div class="meta">
        ${data.phone ? `<div>📞 <strong>${esc(data.phone)}</strong></div>` : ""}
        ${data.email ? `<div>✉ <strong>${esc(data.email)}</strong></div>` : ""}
        ${data.address ? `<div>📍 <strong>${esc(data.address)}</strong></div>` : ""}
        ${data.dob ? `<div>📅 <strong>${esc(data.dob)}</strong></div>` : ""}
        ${data.nationality ? `<div>🏳 <strong>${esc(data.nationality)}</strong></div>` : ""}
      </div>
    </div>
  </div>
  ${data.careerObjective ? `<div class="sec"><div class="sec-title">Career Objective</div><div class="body-text">${esc(data.careerObjective)}</div></div>` : ""}
  ${data.workExperience.some(w => w.title) ? `<div class="sec"><div class="sec-title">Work Experience</div>${workBlock(data.workExperience, p.text, p.muted)}</div>` : ""}
  ${data.education.some(e => e.course) ? `<div class="sec"><div class="sec-title">Education</div>${eduBlock(data.education, p.text, p.muted)}</div>` : ""}
  ${data.digitalSkills ? `<div class="sec"><div class="sec-title">Digital Skills</div>${chipList(data.digitalSkills, p.primarySoft, accent, p.border)}</div>` : ""}
  ${data.languages.some(l => l.language) ? `<div class="sec"><div class="sec-title">Languages</div>${langTable(data.languages, p.primarySoft, accent, p.border)}</div>` : ""}
  ${data.communicationSkills ? `<div class="sec"><div class="sec-title">Communication</div><div class="body-text">${esc(data.communicationSkills)}</div></div>` : ""}
  ${data.organisationalSkills ? `<div class="sec"><div class="sec-title">Organisation</div><div class="body-text">${esc(data.organisationalSkills)}</div></div>` : ""}
  ${data.certifications ? `<div class="sec"><div class="sec-title">Certifications</div><div class="body-text">${esc(data.certifications)}</div></div>` : ""}
  ${data.additionalInfo ? `<div class="sec"><div class="sec-title">Additional Info</div><div class="body-text">${esc(data.additionalInfo)}</div></div>` : ""}
  ${declaration(data, accent)}
  </body></html>`;
}

function renderSidebar(data: CVData, p: Palette, font: FontPair, accent: string, scale: number, side: "left" | "right"): string {
  const sidebar = `<div class="side">
    <div style="text-align:center;margin-bottom:18px;">
      ${photoOrPlaceholder(data.photo, 100, 50, `3px solid ${accent}`, "rgba(255,255,255,0.1)")}
    </div>
    <div style="text-align:center;font-size:${17 * scale}px;font-weight:800;color:#fff;line-height:1.2;">${esc(data.name) || "Your Name"}</div>
    ${data.jobAppliedFor ? `<div style="text-align:center;font-size:${10.5 * scale}px;color:${accent};text-transform:uppercase;letter-spacing:2px;margin-top:4px;font-weight:600;">${esc(data.jobAppliedFor)}</div>` : ""}
    <div style="margin-top:18px;">
      <div class="ssec-title">Contact</div>
      ${data.phone ? `<div class="sitem">📞 ${esc(data.phone)}</div>` : ""}
      ${data.email ? `<div class="sitem" style="word-break:break-all;">✉ ${esc(data.email)}</div>` : ""}
      ${data.address ? `<div class="sitem">📍 ${esc(data.address)}</div>` : ""}
      ${data.dob ? `<div class="sitem">📅 ${esc(data.dob)}</div>` : ""}
      ${data.nationality ? `<div class="sitem">🏳 ${esc(data.nationality)}</div>` : ""}
    </div>
    ${data.languages.some(l => l.language) ? `<div style="margin-top:16px;">
      <div class="ssec-title">Languages</div>
      ${data.languages.filter(l => l.language).map(l => `<div class="sitem">${esc(l.language)} <span style="float:right;background:${accent};color:#fff;padding:0 6px;border-radius:3px;font-size:9.5px;font-weight:700;">${esc(l.speaking)}</span></div>`).join("")}
    </div>` : ""}
    ${data.digitalSkills ? `<div style="margin-top:16px;">
      <div class="ssec-title">Digital Skills</div>
      ${data.digitalSkills.split(",").map(s => s.trim()).filter(Boolean).map(s => `<div class="sitem">▸ ${esc(s)}</div>`).join("")}
    </div>` : ""}
    ${data.communicationSkills ? `<div style="margin-top:16px;"><div class="ssec-title">Communication</div><div class="sitem" style="line-height:1.55;">${esc(data.communicationSkills)}</div></div>` : ""}
    ${data.organisationalSkills ? `<div style="margin-top:16px;"><div class="ssec-title">Organisation</div><div class="sitem" style="line-height:1.55;">${esc(data.organisationalSkills)}</div></div>` : ""}
  </div>`;

  const main = `<div class="main">
    ${data.careerObjective ? `<div class="msec"><div class="msec-title">Profile</div><div class="body-text">${esc(data.careerObjective)}</div></div>` : ""}
    ${data.workExperience.some(w => w.title) ? `<div class="msec"><div class="msec-title">Work Experience</div>${workBlock(data.workExperience, p.text, p.muted)}</div>` : ""}
    ${data.education.some(e => e.course) ? `<div class="msec"><div class="msec-title">Education</div>${eduBlock(data.education, p.text, p.muted)}</div>` : ""}
    ${data.certifications ? `<div class="msec"><div class="msec-title">Certifications</div><div class="body-text">${esc(data.certifications)}</div></div>` : ""}
    ${data.additionalInfo ? `<div class="msec"><div class="msec-title">Additional</div><div class="body-text">${esc(data.additionalInfo)}</div></div>` : ""}
    ${declaration(data, accent)}
  </div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CV - ${esc(data.name)}</title>
  ${googleFontsLink(font)}
  <style>
    @page { size: A4; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:${fontStack(font)}; color:${p.text}; font-size:${12 * scale}px; }
    .cv { display:flex; flex-direction:${side === "left" ? "row" : "row-reverse"}; min-height:100vh; max-width:794px; margin:0 auto; background:#fff; }
    .side { width:240px; background:linear-gradient(180deg,${p.sidebarBg},${p.primaryDark}); color:${p.sidebarText}; padding:30px 20px; flex-shrink:0; }
    .main { flex:1; padding:30px 32px; }
    .ssec-title { font-size:${10.5 * scale}px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:${accent}; padding-bottom:5px; border-bottom:1px solid rgba(255,255,255,0.2); margin-bottom:8px; }
    .sitem { font-size:${11 * scale}px; color:#cbd5e1; margin-bottom:5px; line-height:1.5; }
    .msec { margin-bottom:14px; }
    .msec-title { font-size:${13 * scale}px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:${accent}; margin-bottom:8px; padding-bottom:4px; border-bottom:2px solid ${p.border}; position:relative; }
    .msec-title::after { content:''; position:absolute; bottom:-2px; left:0; width:36px; height:2px; background:${accent}; }
    .body-text { font-size:${11.5 * scale}px; line-height:1.6; color:${p.text}; white-space:pre-line; }
  </style></head><body>
  <div class="cv">${side === "left" ? sidebar + main : main + sidebar}</div>
  </body></html>`;
}

function renderHeaderBand(data: CVData, p: Palette, font: FontPair, accent: string, scale: number): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CV - ${esc(data.name)}</title>
  ${googleFontsLink(font)}
  <style>
    @page { size: A4; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:${fontStack(font)}; color:${p.text}; background:#fff; max-width:794px; margin:0 auto; font-size:${12 * scale}px; }
    h1 { font-family:'${font.heading}',sans-serif; }
    .band { background:linear-gradient(135deg,${p.primaryDark},${accent}); color:#fff; padding:32px 44px; display:flex; align-items:center; gap:22px; }
    .band h1 { font-size:${28 * scale}px; font-weight:800; letter-spacing:-0.5px; }
    .role { font-size:${12 * scale}px; opacity:0.9; text-transform:uppercase; letter-spacing:3px; margin-top:4px; }
    .contact { display:flex; flex-wrap:wrap; gap:6px 16px; font-size:${11 * scale}px; margin-top:10px; opacity:0.95; }
    .body { padding:28px 44px 32px; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
    .sec { margin-bottom:14px; }
    .sec-title { font-size:${12 * scale}px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:${accent}; padding-bottom:4px; border-bottom:2px solid ${p.primarySoft}; margin-bottom:8px; }
    .body-text { font-size:${11.5 * scale}px; line-height:1.6; color:${p.text}; white-space:pre-line; }
  </style></head><body>
  <div class="band">
    ${photoOrPlaceholder(data.photo, 92, 46, "3px solid rgba(255,255,255,0.4)", "rgba(255,255,255,0.15)")}
    <div style="flex:1;">
      <h1>${esc(data.name) || "Your Name"}</h1>
      ${data.jobAppliedFor ? `<div class="role">${esc(data.jobAppliedFor)}</div>` : ""}
      <div class="contact">
        ${data.phone ? `<span>📞 ${esc(data.phone)}</span>` : ""}
        ${data.email ? `<span>✉ ${esc(data.email)}</span>` : ""}
        ${data.address ? `<span>📍 ${esc(data.address)}</span>` : ""}
        ${data.dob ? `<span>📅 ${esc(data.dob)}</span>` : ""}
        ${data.nationality ? `<span>🏳 ${esc(data.nationality)}</span>` : ""}
      </div>
    </div>
  </div>
  <div class="body">
    ${data.careerObjective ? `<div class="sec"><div class="sec-title">Profile</div><div class="body-text">${esc(data.careerObjective)}</div></div>` : ""}
    <div class="grid">
      <div>
        ${data.workExperience.some(w => w.title) ? `<div class="sec"><div class="sec-title">Experience</div>${workBlock(data.workExperience, p.text, p.muted)}</div>` : ""}
        ${data.certifications ? `<div class="sec"><div class="sec-title">Certifications</div><div class="body-text">${esc(data.certifications)}</div></div>` : ""}
      </div>
      <div>
        ${data.education.some(e => e.course) ? `<div class="sec"><div class="sec-title">Education</div>${eduBlock(data.education, p.text, p.muted)}</div>` : ""}
        ${data.digitalSkills ? `<div class="sec"><div class="sec-title">Skills</div>${chipList(data.digitalSkills, p.primarySoft, accent, p.border)}</div>` : ""}
        ${data.languages.some(l => l.language) ? `<div class="sec"><div class="sec-title">Languages</div>${langTable(data.languages, p.primarySoft, accent, p.border)}</div>` : ""}
      </div>
    </div>
    ${data.communicationSkills ? `<div class="sec"><div class="sec-title">Communication</div><div class="body-text">${esc(data.communicationSkills)}</div></div>` : ""}
    ${data.additionalInfo ? `<div class="sec"><div class="sec-title">Additional</div><div class="body-text">${esc(data.additionalInfo)}</div></div>` : ""}
    ${declaration(data, accent)}
  </div>
  </body></html>`;
}

function renderSplitTop(data: CVData, p: Palette, font: FontPair, accent: string, scale: number): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CV - ${esc(data.name)}</title>
  ${googleFontsLink(font)}
  <style>
    @page { size: A4; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:${fontStack(font)}; color:${p.text}; background:#fff; max-width:794px; margin:0 auto; padding:36px 44px; font-size:${12 * scale}px; }
    h1 { font-family:'${font.heading}',sans-serif; }
    .top { text-align:center; padding-bottom:18px; border-bottom:1px solid ${p.border}; margin-bottom:18px; }
    .top h1 { font-size:${30 * scale}px; font-weight:700; color:${accent}; letter-spacing:1px; }
    .role { font-size:${13 * scale}px; color:${p.muted}; margin-top:4px; letter-spacing:3px; text-transform:uppercase; }
    .contact { display:flex; justify-content:center; flex-wrap:wrap; gap:6px 18px; font-size:${11 * scale}px; color:${p.muted}; margin-top:10px; }
    .grid { display:grid; grid-template-columns:1fr 2fr; gap:28px; }
    .sec { margin-bottom:14px; }
    .sec-title { font-size:${12 * scale}px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:${accent}; padding-bottom:4px; border-bottom:1px solid ${p.border}; margin-bottom:8px; }
    .body-text { font-size:${11.5 * scale}px; line-height:1.6; color:${p.text}; white-space:pre-line; }
  </style></head><body>
  <div class="top">
    ${data.photo ? `<div style="margin-bottom:10px;">${photoOrPlaceholder(data.photo, 96, 48, `3px solid ${accent}`)}</div>` : ""}
    <h1>${esc(data.name) || "Your Name"}</h1>
    ${data.jobAppliedFor ? `<div class="role">${esc(data.jobAppliedFor)}</div>` : ""}
    <div class="contact">
      ${data.phone ? `<span>📞 ${esc(data.phone)}</span>` : ""}
      ${data.email ? `<span>✉ ${esc(data.email)}</span>` : ""}
      ${data.address ? `<span>📍 ${esc(data.address)}</span>` : ""}
    </div>
  </div>
  <div class="grid">
    <div>
      ${data.dob || data.nationality ? `<div class="sec"><div class="sec-title">Personal</div>
        ${data.dob ? `<div style="font-size:11.5px;margin-bottom:4px;"><strong>DOB:</strong> ${esc(data.dob)}</div>` : ""}
        ${data.nationality ? `<div style="font-size:11.5px;"><strong>Nationality:</strong> ${esc(data.nationality)}</div>` : ""}
      </div>` : ""}
      ${data.digitalSkills ? `<div class="sec"><div class="sec-title">Skills</div>${chipList(data.digitalSkills, p.primarySoft, accent, p.border)}</div>` : ""}
      ${data.languages.some(l => l.language) ? `<div class="sec"><div class="sec-title">Languages</div>${data.languages.filter(l => l.language).map(l => `<div style="font-size:11.5px;margin-bottom:3px;"><strong>${esc(l.language)}</strong> · <span style="color:${accent};">${esc(l.speaking)}</span></div>`).join("")}</div>` : ""}
      ${data.certifications ? `<div class="sec"><div class="sec-title">Certifications</div><div class="body-text">${esc(data.certifications)}</div></div>` : ""}
    </div>
    <div>
      ${data.careerObjective ? `<div class="sec"><div class="sec-title">Profile</div><div class="body-text">${esc(data.careerObjective)}</div></div>` : ""}
      ${data.workExperience.some(w => w.title) ? `<div class="sec"><div class="sec-title">Experience</div>${workBlock(data.workExperience, p.text, p.muted)}</div>` : ""}
      ${data.education.some(e => e.course) ? `<div class="sec"><div class="sec-title">Education</div>${eduBlock(data.education, p.text, p.muted)}</div>` : ""}
      ${data.communicationSkills ? `<div class="sec"><div class="sec-title">Communication</div><div class="body-text">${esc(data.communicationSkills)}</div></div>` : ""}
      ${data.organisationalSkills ? `<div class="sec"><div class="sec-title">Organisation</div><div class="body-text">${esc(data.organisationalSkills)}</div></div>` : ""}
      ${data.additionalInfo ? `<div class="sec"><div class="sec-title">Additional</div><div class="body-text">${esc(data.additionalInfo)}</div></div>` : ""}
    </div>
  </div>
  ${declaration(data, accent)}
  </body></html>`;
}

function renderMinimalLine(data: CVData, p: Palette, font: FontPair, accent: string, scale: number): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CV - ${esc(data.name)}</title>
  ${googleFontsLink(font)}
  <style>
    @page { size: A4; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:${fontStack(font)}; color:#111827; background:#fff; max-width:794px; margin:0 auto; padding:44px 50px; font-size:${12 * scale}px; }
    h1 { font-family:'${font.heading}',sans-serif; font-size:${32 * scale}px; font-weight:300; letter-spacing:8px; text-transform:uppercase; color:#111827; }
    .role { font-size:${11 * scale}px; color:${p.muted}; margin-top:2px; letter-spacing:4px; text-transform:uppercase; }
    .rule { height:1px; background:${accent}; margin:14px 0; }
    .contact { display:flex; flex-wrap:wrap; gap:4px 18px; font-size:${10.5 * scale}px; color:${p.muted}; }
    .sec { margin-bottom:16px; }
    .sec-title { font-size:${11 * scale}px; font-weight:600; text-transform:uppercase; letter-spacing:4px; color:${accent}; margin-bottom:8px; }
    .body-text { font-size:${11.5 * scale}px; line-height:1.7; color:#1f2937; white-space:pre-line; }
  </style></head><body>
  <h1>${esc(data.name) || "Your Name"}</h1>
  ${data.jobAppliedFor ? `<div class="role">${esc(data.jobAppliedFor)}</div>` : ""}
  <div class="rule"></div>
  <div class="contact">
    ${data.phone ? `<span>${esc(data.phone)}</span>` : ""}
    ${data.email ? `<span>${esc(data.email)}</span>` : ""}
    ${data.address ? `<span>${esc(data.address)}</span>` : ""}
    ${data.dob ? `<span>${esc(data.dob)}</span>` : ""}
    ${data.nationality ? `<span>${esc(data.nationality)}</span>` : ""}
  </div>
  <div class="rule"></div>
  ${data.careerObjective ? `<div class="sec"><div class="sec-title">Profile</div><div class="body-text">${esc(data.careerObjective)}</div></div>` : ""}
  ${data.workExperience.some(w => w.title) ? `<div class="sec"><div class="sec-title">Experience</div>${workBlock(data.workExperience, "#1f2937", p.muted)}</div>` : ""}
  ${data.education.some(e => e.course) ? `<div class="sec"><div class="sec-title">Education</div>${eduBlock(data.education, "#1f2937", p.muted)}</div>` : ""}
  ${data.digitalSkills ? `<div class="sec"><div class="sec-title">Skills</div><div class="body-text">${esc(data.digitalSkills)}</div></div>` : ""}
  ${data.languages.some(l => l.language) ? `<div class="sec"><div class="sec-title">Languages</div>${data.languages.filter(l => l.language).map(l => `<div style="font-size:11.5px;margin-bottom:2px;"><strong>${esc(l.language)}</strong> — ${esc(l.speaking)}</div>`).join("")}</div>` : ""}
  ${data.certifications ? `<div class="sec"><div class="sec-title">Certifications</div><div class="body-text">${esc(data.certifications)}</div></div>` : ""}
  ${data.additionalInfo ? `<div class="sec"><div class="sec-title">Additional</div><div class="body-text">${esc(data.additionalInfo)}</div></div>` : ""}
  ${declaration(data, accent)}
  </body></html>`;
}

function renderCardStack(data: CVData, p: Palette, font: FontPair, accent: string, scale: number): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CV - ${esc(data.name)}</title>
  ${googleFontsLink(font)}
  <style>
    @page { size: A4; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:${fontStack(font)}; color:${p.text}; background:#f8fafc; max-width:794px; margin:0 auto; padding:24px 28px; font-size:${12 * scale}px; }
    h1 { font-family:'${font.heading}',sans-serif; }
    .header-card { background:#fff; border-radius:12px; padding:22px 26px; display:flex; gap:18px; align-items:center; box-shadow:0 2px 6px rgba(15,23,42,0.06); margin-bottom:14px; border-top:4px solid ${accent}; }
    .header-card h1 { font-size:${24 * scale}px; font-weight:700; color:${p.text}; }
    .role { font-size:${12 * scale}px; color:${accent}; font-weight:600; margin-top:2px; }
    .contact { display:flex; flex-wrap:wrap; gap:4px 16px; font-size:${11 * scale}px; color:${p.muted}; margin-top:6px; }
    .card { background:#fff; border-radius:10px; padding:16px 20px; margin-bottom:12px; box-shadow:0 1px 3px rgba(15,23,42,0.05); }
    .sec-title { font-size:${12 * scale}px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:${accent}; margin-bottom:8px; display:flex; align-items:center; gap:6px; }
    .sec-title::before { content:''; width:4px; height:14px; background:${accent}; border-radius:2px; }
    .body-text { font-size:${11.5 * scale}px; line-height:1.6; color:${p.text}; white-space:pre-line; }
  </style></head><body>
  <div class="header-card">
    ${photoOrPlaceholder(data.photo, 76, 38, `3px solid ${accent}`)}
    <div style="flex:1;">
      <h1>${esc(data.name) || "Your Name"}</h1>
      ${data.jobAppliedFor ? `<div class="role">${esc(data.jobAppliedFor)}</div>` : ""}
      <div class="contact">
        ${data.phone ? `<span>📞 ${esc(data.phone)}</span>` : ""}
        ${data.email ? `<span>✉ ${esc(data.email)}</span>` : ""}
        ${data.address ? `<span>📍 ${esc(data.address)}</span>` : ""}
        ${data.dob ? `<span>📅 ${esc(data.dob)}</span>` : ""}
      </div>
    </div>
  </div>
  ${data.careerObjective ? `<div class="card"><div class="sec-title">Profile</div><div class="body-text">${esc(data.careerObjective)}</div></div>` : ""}
  ${data.workExperience.some(w => w.title) ? `<div class="card"><div class="sec-title">Work Experience</div>${workBlock(data.workExperience, p.text, p.muted)}</div>` : ""}
  ${data.education.some(e => e.course) ? `<div class="card"><div class="sec-title">Education</div>${eduBlock(data.education, p.text, p.muted)}</div>` : ""}
  ${data.digitalSkills ? `<div class="card"><div class="sec-title">Skills</div>${chipList(data.digitalSkills, p.primarySoft, accent, p.border)}</div>` : ""}
  ${data.languages.some(l => l.language) ? `<div class="card"><div class="sec-title">Languages</div>${langTable(data.languages, p.primarySoft, accent, p.border)}</div>` : ""}
  ${data.communicationSkills ? `<div class="card"><div class="sec-title">Communication</div><div class="body-text">${esc(data.communicationSkills)}</div></div>` : ""}
  ${data.organisationalSkills ? `<div class="card"><div class="sec-title">Organisation</div><div class="body-text">${esc(data.organisationalSkills)}</div></div>` : ""}
  ${data.certifications ? `<div class="card"><div class="sec-title">Certifications</div><div class="body-text">${esc(data.certifications)}</div></div>` : ""}
  ${data.additionalInfo ? `<div class="card"><div class="sec-title">Additional</div><div class="body-text">${esc(data.additionalInfo)}</div></div>` : ""}
  <div class="card">${declaration(data, accent)}</div>
  </body></html>`;
}

// ─────────── Thumbnail SVG ───────────

function previewSVG(p: Palette, accent: string, layout: LayoutKind): string {
  const W = 200, H = 280;
  switch (layout) {
    case "sidebar-left":
      return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#fff"/><rect x="0" y="0" width="70" height="${H}" fill="${p.sidebarBg}"/><circle cx="35" cy="35" r="18" fill="${accent}" opacity="0.4"/><rect x="10" y="65" width="50" height="3" fill="${accent}" rx="1"/><rect x="10" y="74" width="44" height="2" fill="#cbd5e1" opacity="0.5"/><rect x="10" y="90" width="50" height="2" fill="${accent}" opacity="0.6"/><rect x="10" y="96" width="44" height="2" fill="#cbd5e1" opacity="0.5"/><rect x="10" y="102" width="48" height="2" fill="#cbd5e1" opacity="0.5"/><rect x="85" y="20" width="100" height="6" fill="${accent}" rx="1"/><rect x="85" y="32" width="80" height="2" fill="#9ca3af"/><rect x="85" y="50" width="40" height="3" fill="${accent}"/><rect x="85" y="58" width="100" height="2" fill="#cbd5e1"/><rect x="85" y="64" width="100" height="2" fill="#cbd5e1"/><rect x="85" y="70" width="80" height="2" fill="#cbd5e1"/><rect x="85" y="90" width="40" height="3" fill="${accent}"/><rect x="85" y="98" width="100" height="2" fill="#cbd5e1"/><rect x="85" y="104" width="100" height="2" fill="#cbd5e1"/><rect x="85" y="110" width="70" height="2" fill="#cbd5e1"/><rect x="85" y="130" width="40" height="3" fill="${accent}"/><rect x="85" y="138" width="100" height="2" fill="#cbd5e1"/><rect x="85" y="144" width="90" height="2" fill="#cbd5e1"/></svg>`;
    case "sidebar-right":
      return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#fff"/><rect x="130" y="0" width="70" height="${H}" fill="${p.sidebarBg}"/><circle cx="165" cy="35" r="18" fill="${accent}" opacity="0.4"/><rect x="140" y="65" width="50" height="3" fill="${accent}"/><rect x="140" y="74" width="44" height="2" fill="#cbd5e1" opacity="0.5"/><rect x="15" y="20" width="100" height="6" fill="${accent}" rx="1"/><rect x="15" y="32" width="80" height="2" fill="#9ca3af"/><rect x="15" y="50" width="40" height="3" fill="${accent}"/><rect x="15" y="58" width="100" height="2" fill="#cbd5e1"/><rect x="15" y="64" width="100" height="2" fill="#cbd5e1"/><rect x="15" y="90" width="40" height="3" fill="${accent}"/><rect x="15" y="98" width="100" height="2" fill="#cbd5e1"/><rect x="15" y="104" width="80" height="2" fill="#cbd5e1"/></svg>`;
    case "header-band":
      return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#fff"/><rect x="0" y="0" width="${W}" height="60" fill="${accent}"/><circle cx="35" cy="30" r="16" fill="#fff" opacity="0.3"/><rect x="60" y="20" width="100" height="6" fill="#fff"/><rect x="60" y="32" width="70" height="3" fill="#fff" opacity="0.7"/><rect x="60" y="40" width="120" height="2" fill="#fff" opacity="0.6"/><rect x="15" y="80" width="40" height="3" fill="${accent}"/><rect x="15" y="88" width="170" height="2" fill="#cbd5e1"/><rect x="15" y="94" width="170" height="2" fill="#cbd5e1"/><rect x="15" y="115" width="80" height="3" fill="${accent}"/><rect x="105" y="115" width="80" height="3" fill="${accent}"/><rect x="15" y="123" width="80" height="2" fill="#cbd5e1"/><rect x="105" y="123" width="80" height="2" fill="#cbd5e1"/><rect x="15" y="129" width="80" height="2" fill="#cbd5e1"/><rect x="105" y="129" width="80" height="2" fill="#cbd5e1"/><rect x="15" y="155" width="40" height="3" fill="${accent}"/><rect x="15" y="163" width="170" height="2" fill="#cbd5e1"/></svg>`;
    case "split-top":
      return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="100" cy="30" r="16" fill="${accent}" opacity="0.4"/><rect x="60" y="55" width="80" height="6" fill="${accent}"/><rect x="70" y="65" width="60" height="2" fill="#9ca3af"/><line x1="15" y1="80" x2="185" y2="80" stroke="#e5e7eb"/><rect x="15" y="90" width="50" height="3" fill="${accent}"/><rect x="15" y="98" width="50" height="2" fill="#cbd5e1"/><rect x="15" y="104" width="50" height="2" fill="#cbd5e1"/><rect x="15" y="120" width="50" height="3" fill="${accent}"/><rect x="15" y="128" width="50" height="2" fill="#cbd5e1"/><rect x="80" y="90" width="40" height="3" fill="${accent}"/><rect x="80" y="98" width="105" height="2" fill="#cbd5e1"/><rect x="80" y="104" width="105" height="2" fill="#cbd5e1"/><rect x="80" y="110" width="90" height="2" fill="#cbd5e1"/><rect x="80" y="130" width="40" height="3" fill="${accent}"/><rect x="80" y="138" width="105" height="2" fill="#cbd5e1"/><rect x="80" y="144" width="100" height="2" fill="#cbd5e1"/></svg>`;
    case "minimal-line":
      return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#fff"/><rect x="20" y="25" width="120" height="4" fill="#1f2937"/><rect x="20" y="34" width="80" height="2" fill="#9ca3af"/><line x1="20" y1="48" x2="180" y2="48" stroke="${accent}" stroke-width="1"/><rect x="20" y="55" width="40" height="2" fill="#9ca3af"/><rect x="70" y="55" width="50" height="2" fill="#9ca3af"/><rect x="130" y="55" width="50" height="2" fill="#9ca3af"/><line x1="20" y1="65" x2="180" y2="65" stroke="${accent}" stroke-width="1"/><rect x="20" y="80" width="50" height="3" fill="${accent}"/><rect x="20" y="90" width="160" height="2" fill="#cbd5e1"/><rect x="20" y="96" width="150" height="2" fill="#cbd5e1"/><rect x="20" y="102" width="160" height="2" fill="#cbd5e1"/><rect x="20" y="120" width="50" height="3" fill="${accent}"/><rect x="20" y="130" width="160" height="2" fill="#cbd5e1"/><rect x="20" y="136" width="140" height="2" fill="#cbd5e1"/></svg>`;
    case "card-stack":
      return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#f8fafc"/><rect x="10" y="15" width="180" height="50" rx="6" fill="#fff" stroke="#e5e7eb"/><rect x="10" y="15" width="180" height="3" fill="${accent}"/><circle cx="32" cy="40" r="14" fill="${accent}" opacity="0.4"/><rect x="55" y="28" width="80" height="5" fill="#1f2937"/><rect x="55" y="40" width="60" height="2" fill="${accent}"/><rect x="10" y="72" width="180" height="40" rx="6" fill="#fff" stroke="#e5e7eb"/><rect x="20" y="80" width="50" height="3" fill="${accent}"/><rect x="20" y="90" width="160" height="2" fill="#cbd5e1"/><rect x="20" y="96" width="150" height="2" fill="#cbd5e1"/><rect x="10" y="118" width="180" height="40" rx="6" fill="#fff" stroke="#e5e7eb"/><rect x="20" y="126" width="50" height="3" fill="${accent}"/><rect x="20" y="136" width="160" height="2" fill="#cbd5e1"/><rect x="20" y="142" width="140" height="2" fill="#cbd5e1"/></svg>`;
    default: // classic
      return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="35" cy="30" r="16" fill="${accent}" opacity="0.4"/><rect x="60" y="20" width="100" height="6" fill="${accent}"/><rect x="60" y="32" width="80" height="2" fill="#9ca3af"/><rect x="60" y="40" width="120" height="2" fill="#cbd5e1"/><line x1="15" y1="55" x2="185" y2="55" stroke="${accent}" stroke-width="2"/><rect x="15" y="65" width="50" height="3" fill="${accent}"/><rect x="15" y="73" width="170" height="2" fill="#cbd5e1"/><rect x="15" y="79" width="160" height="2" fill="#cbd5e1"/><rect x="15" y="85" width="170" height="2" fill="#cbd5e1"/><rect x="15" y="100" width="50" height="3" fill="${accent}"/><rect x="15" y="108" width="170" height="2" fill="#cbd5e1"/><rect x="15" y="114" width="150" height="2" fill="#cbd5e1"/><rect x="15" y="130" width="50" height="3" fill="${accent}"/><rect x="15" y="138" width="170" height="2" fill="#cbd5e1"/><rect x="15" y="144" width="140" height="2" fill="#cbd5e1"/></svg>`;
  }
}

// ─────────── Build templates ───────────

function buildTemplate(
  id: string,
  name: string,
  category: TemplateCategory,
  layout: LayoutKind,
  paletteKey: keyof typeof PALETTES,
  fontKey: keyof typeof FONTS,
  tags: string[] = []
): CVTemplate {
  const palette = PALETTES[paletteKey];
  const font = FONTS[fontKey];
  return {
    id,
    name,
    category,
    tags: [category.toLowerCase(), ...tags],
    layout,
    palette,
    font,
    generateHTML: (data, custom) => {
      const accent = custom?.accentColor || palette.primary;
      const scale = custom?.fontScale || 1;
      switch (layout) {
        case "sidebar-left": return renderSidebar(data, palette, font, accent, scale, "left");
        case "sidebar-right": return renderSidebar(data, palette, font, accent, scale, "right");
        case "header-band": return renderHeaderBand(data, palette, font, accent, scale);
        case "split-top": return renderSplitTop(data, palette, font, accent, scale);
        case "minimal-line": return renderMinimalLine(data, palette, font, accent, scale);
        case "card-stack": return renderCardStack(data, palette, font, accent, scale);
        default: return renderClassic(data, palette, font, accent, scale);
      }
    },
    generatePreviewSVG: () => previewSVG(palette, palette.primary, layout),
  };
}

// ─────────── Template registry (50+ templates) ───────────

export const ALL_TEMPLATES: CVTemplate[] = [
  // Modern (5)
  buildTemplate("modern-azure", "Azure Modern", "Modern", "header-band", "azure", "inter", ["clean"]),
  buildTemplate("modern-violet", "Violet Edge", "Modern", "card-stack", "violet", "manrope", ["premium"]),
  buildTemplate("modern-teal", "Teal Wave", "Modern", "split-top", "teal", "dmSans"),
  buildTemplate("modern-graphite", "Graphite Pro", "Modern", "sidebar-left", "graphite", "inter"),
  buildTemplate("modern-rose", "Rose Modern", "Modern", "header-band", "rose", "poppins"),

  // Corporate (5)
  buildTemplate("corp-navy", "Navy Corporate", "Corporate", "classic", "navy", "source", ["office"]),
  buildTemplate("corp-graphite", "Executive Graphite", "Corporate", "sidebar-left", "charcoal", "source"),
  buildTemplate("corp-burgundy", "Burgundy Suite", "Corporate", "header-band", "burgundy", "playfair"),
  buildTemplate("corp-steel", "Steel Office", "Corporate", "split-top", "steel", "roboto"),
  buildTemplate("corp-ocean", "Ocean Business", "Corporate", "classic", "ocean", "nunito"),

  // Creative (5)
  buildTemplate("creative-violet", "Violet Vision", "Creative", "sidebar-right", "violet", "spaceGrotesk", ["designer"]),
  buildTemplate("creative-sunrise", "Sunrise Studio", "Creative", "card-stack", "sunrise", "poppins", ["designer"]),
  buildTemplate("creative-emerald", "Emerald Atelier", "Creative", "header-band", "emerald", "raleway"),
  buildTemplate("creative-rose", "Rose Quartz", "Creative", "split-top", "rose", "playfair"),
  buildTemplate("creative-cyan", "Cyan Spark", "Creative", "card-stack", "cyan", "manrope"),

  // Fresher (5)
  buildTemplate("fresher-azure", "Fresh Start Blue", "Fresher", "classic", "azure", "inter", ["fresher", "simple"]),
  buildTemplate("fresher-mint", "Mint Graduate", "Fresher", "header-band", "mint", "dmSans", ["fresher"]),
  buildTemplate("fresher-violet", "Violet Beginner", "Fresher", "split-top", "violet", "nunito", ["fresher"]),
  buildTemplate("fresher-amber", "Amber Entry", "Fresher", "card-stack", "amber", "poppins", ["fresher"]),
  buildTemplate("fresher-teal", "Teal First Job", "Fresher", "classic", "teal", "source", ["fresher", "simple"]),

  // Executive (4)
  buildTemplate("exec-charcoal", "Charcoal Executive", "Executive", "sidebar-left", "charcoal", "playfair", ["premium"]),
  buildTemplate("exec-burgundy", "Burgundy Director", "Executive", "header-band", "burgundy", "playfair", ["premium"]),
  buildTemplate("exec-gold", "Gold Standard", "Executive", "split-top", "gold", "playfair", ["premium"]),
  buildTemplate("exec-navy", "Navy Boardroom", "Executive", "sidebar-left", "navy", "source", ["premium", "office"]),

  // IT Professional (4)
  buildTemplate("it-cyan", "Cyan Developer", "IT", "sidebar-left", "cyan", "spaceGrotesk", ["tech"]),
  buildTemplate("it-graphite", "Graphite Engineer", "IT", "card-stack", "graphite", "spaceGrotesk", ["tech"]),
  buildTemplate("it-violet", "Violet Stack", "IT", "header-band", "violet", "manrope", ["tech"]),
  buildTemplate("it-emerald", "Emerald Coder", "IT", "split-top", "emerald", "spaceGrotesk", ["tech"]),

  // Healthcare (3)
  buildTemplate("nurse-azure", "Azure Care", "Healthcare", "classic", "azure", "source", ["healthcare", "nurse"]),
  buildTemplate("nurse-mint", "Mint Wellness", "Healthcare", "header-band", "mint", "nunito", ["healthcare"]),
  buildTemplate("nurse-rose", "Rose Pediatric", "Healthcare", "split-top", "rose", "poppins", ["healthcare"]),

  // Gulf Job (4)
  buildTemplate("gulf-navy", "Gulf Navy Pro", "Gulf Job", "sidebar-left", "navy", "source", ["gulf"]),
  buildTemplate("gulf-emerald", "Gulf Emerald", "Gulf Job", "header-band", "emerald", "inter", ["gulf"]),
  buildTemplate("gulf-bronze", "Gulf Bronze", "Gulf Job", "classic", "bronze", "playfair", ["gulf", "premium"]),
  buildTemplate("gulf-charcoal", "Gulf Executive", "Gulf Job", "split-top", "charcoal", "source", ["gulf"]),

  // Driver (2)
  buildTemplate("driver-amber", "Driver Pro", "Driver", "classic", "amber", "roboto", ["simple"]),
  buildTemplate("driver-steel", "Driver Steel", "Driver", "header-band", "steel", "roboto"),

  // Teacher (3)
  buildTemplate("teacher-emerald", "Teacher Emerald", "Teacher", "classic", "emerald", "source"),
  buildTemplate("teacher-violet", "Educator Violet", "Teacher", "split-top", "violet", "nunito"),
  buildTemplate("teacher-amber", "Teacher Amber", "Teacher", "header-band", "amber", "poppins"),

  // Accountant (3)
  buildTemplate("acc-navy", "Accountant Navy", "Accountant", "classic", "navy", "source", ["office"]),
  buildTemplate("acc-graphite", "Finance Graphite", "Accountant", "sidebar-left", "graphite", "roboto", ["office"]),
  buildTemplate("acc-burgundy", "CA Burgundy", "Accountant", "split-top", "burgundy", "playfair", ["premium"]),

  // Sales (3)
  buildTemplate("sales-ruby", "Sales Ruby", "Sales", "header-band", "ruby", "poppins"),
  buildTemplate("sales-sunrise", "Sales Sunrise", "Sales", "card-stack", "sunrise", "manrope"),
  buildTemplate("sales-emerald", "BD Emerald", "Sales", "split-top", "emerald", "dmSans"),

  // Minimal (4)
  buildTemplate("min-mono", "Mono Minimal", "Minimal", "minimal-line", "graphite", "inter", ["simple"]),
  buildTemplate("min-rose", "Rose Whisper", "Minimal", "minimal-line", "rose", "playfair", ["simple"]),
  buildTemplate("min-emerald", "Emerald Whisper", "Minimal", "minimal-line", "emerald", "raleway", ["simple"]),
  buildTemplate("min-cyan", "Cyan Whisper", "Minimal", "minimal-line", "cyan", "manrope", ["simple"]),

  // Colorful (4)
  buildTemplate("color-violet", "Violet Burst", "Colorful", "sidebar-right", "violet", "poppins"),
  buildTemplate("color-sunrise", "Sunrise Burst", "Colorful", "card-stack", "sunrise", "dmSans"),
  buildTemplate("color-teal", "Teal Burst", "Colorful", "header-band", "teal", "manrope"),
  buildTemplate("color-rose", "Rose Burst", "Colorful", "card-stack", "rose", "poppins"),

  // ATS Friendly (3) — single column, conservative
  buildTemplate("ats-graphite", "ATS Graphite", "ATS", "classic", "graphite", "roboto", ["ats", "simple"]),
  buildTemplate("ats-navy", "ATS Navy", "ATS", "classic", "navy", "source", ["ats", "simple"]),
  buildTemplate("ats-mono", "ATS Mono", "ATS", "minimal-line", "charcoal", "inter", ["ats", "simple"]),

  // International (3)
  buildTemplate("intl-azure", "Europass Blue", "International", "split-top", "azure", "source", ["europass"]),
  buildTemplate("intl-emerald", "Europass Green", "International", "header-band", "emerald", "inter", ["europass"]),
  buildTemplate("intl-graphite", "Europass Mono", "International", "classic", "graphite", "source", ["europass"]),
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Modern", "Corporate", "Creative", "Fresher", "Executive",
  "IT", "Healthcare", "Gulf Job", "Driver", "Teacher",
  "Accountant", "Sales", "Minimal", "Colorful", "ATS", "International",
];

export const QUICK_FILTERS = [
  { label: "All", value: "" },
  { label: "Fresher", value: "fresher" },
  { label: "Gulf", value: "gulf" },
  { label: "Office", value: "office" },
  { label: "Designer", value: "designer" },
  { label: "Healthcare", value: "healthcare" },
  { label: "Simple", value: "simple" },
  { label: "Premium", value: "premium" },
  { label: "ATS", value: "ats" },
  { label: "Tech", value: "tech" },
];

export const DEFAULT_CV_FEE = 10;

export const ACCENT_PRESETS = [
  "#1e3a8a", "#0369a1", "#047857", "#166534", "#be123c",
  "#9f1239", "#b45309", "#ea580c", "#6d28d9", "#4338ca",
  "#0f766e", "#0e7490", "#374151", "#1f2937", "#a16207", "#e11d48",
];

export function findTemplate(id: string): CVTemplate | undefined {
  return ALL_TEMPLATES.find(t => t.id === id);
}

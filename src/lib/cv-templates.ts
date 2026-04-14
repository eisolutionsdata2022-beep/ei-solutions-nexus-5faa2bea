/**
 * Europass-style CV Templates
 * 4 professional templates following official Europass CV structure
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
  // Personal
  name: string;
  address: string;
  phone: string;
  email: string;
  dob: string;
  nationality: string;
  photo: string | null;
  // Position
  jobAppliedFor: string;
  // Experience
  workExperience: WorkEntry[];
  // Education
  education: EducationEntry[];
  // Skills
  languages: LanguageSkill[];
  digitalSkills: string;
  communicationSkills: string;
  organisationalSkills: string;
  // Additional
  additionalInfo: string;
  annexes: string;
  // Declaration
  declarationPlace: string;
  declarationDate: string;
}

export interface CVTemplate {
  id: string;
  name: string;
  description: string;
  previewColors: { sidebar: string; accent: string; bg: string };
  generateHTML: (data: CVData) => string;
}

function esc(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function langTable(languages: LanguageSkill[], headerBg: string, headerColor: string, borderColor: string) {
  if (!languages.length) return "";
  return `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px;">
    <tr style="background:${headerBg};color:${headerColor};">
      <th style="border:1px solid ${borderColor};padding:6px 8px;text-align:left;">Language</th>
      <th style="border:1px solid ${borderColor};padding:6px 8px;">Listening</th>
      <th style="border:1px solid ${borderColor};padding:6px 8px;">Reading</th>
      <th style="border:1px solid ${borderColor};padding:6px 8px;">Writing</th>
      <th style="border:1px solid ${borderColor};padding:6px 8px;">Speaking</th>
    </tr>
    ${languages.map(l => `<tr>
      <td style="border:1px solid ${borderColor};padding:5px 8px;font-weight:600;">${esc(l.language)}</td>
      <td style="border:1px solid ${borderColor};padding:5px 8px;text-align:center;">${esc(l.listening)}</td>
      <td style="border:1px solid ${borderColor};padding:5px 8px;text-align:center;">${esc(l.reading)}</td>
      <td style="border:1px solid ${borderColor};padding:5px 8px;text-align:center;">${esc(l.writing)}</td>
      <td style="border:1px solid ${borderColor};padding:5px 8px;text-align:center;">${esc(l.speaking)}</td>
    </tr>`).join("")}
  </table>`;
}

function workHTML(entries: WorkEntry[]) {
  return entries.filter(e => e.title).map(e => `
    <div style="margin-bottom:12px;">
      <div style="font-weight:600;font-size:13px;">${esc(e.title)}</div>
      <div style="font-size:12px;color:#555;">${esc(e.company)}${e.location ? ` — ${esc(e.location)}` : ""}</div>
      <div style="font-size:11px;color:#888;margin:2px 0 4px;">📅 ${esc(e.from)} – ${esc(e.to)}</div>
      ${e.responsibilities ? `<div style="font-size:12px;line-height:1.6;white-space:pre-line;">${esc(e.responsibilities)}</div>` : ""}
    </div>
  `).join("");
}

function eduHTML(entries: EducationEntry[]) {
  return entries.filter(e => e.course).map(e => `
    <div style="margin-bottom:12px;">
      <div style="font-weight:600;font-size:13px;">${esc(e.course)}</div>
      <div style="font-size:12px;color:#555;">${esc(e.institution)}${e.location ? ` — ${esc(e.location)}` : ""}</div>
      <div style="font-size:11px;color:#888;margin:2px 0 4px;">📅 ${esc(e.year)}</div>
      ${e.subjects ? `<div style="font-size:12px;line-height:1.6;white-space:pre-line;">${esc(e.subjects)}</div>` : ""}
    </div>
  `).join("");
}

function declarationHTML(data: CVData, color: string) {
  return `
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #ddd;">
      <div style="font-size:12px;line-height:1.7;color:#444;">
        I hereby declare that the above information is true and correct to the best of my knowledge.
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:12px;">
        <div>
          <div style="color:#888;">Place: <span style="color:#222;">${esc(data.declarationPlace)}</span></div>
          <div style="color:#888;margin-top:4px;">Date: <span style="color:#222;">${esc(data.declarationDate)}</span></div>
        </div>
        <div style="text-align:right;">
          <div style="width:180px;border-bottom:1px solid #999;margin-bottom:4px;height:40px;"></div>
          <div style="font-size:11px;color:#888;">Signature</div>
        </div>
      </div>
    </div>`;
}

// ─── Template 1: Minimal Professional ───
const minimalProfessional: CVTemplate = {
  id: "minimal-professional",
  name: "Minimal Professional",
  description: "Black & white clean layout — corporate look",
  previewColors: { sidebar: "#111827", accent: "#374151", bg: "#ffffff" },
  generateHTML: (data) => `<html><head><title>CV - ${esc(data.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700&display=swap');
  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Source Sans 3',sans-serif; color:#1f2937; max-width:794px; margin:0 auto; padding:40px 48px; background:#fff; }
  .header { display:flex; align-items:center; gap:24px; padding-bottom:20px; border-bottom:2px solid #111827; margin-bottom:24px; }
  .photo { width:90px; height:90px; border-radius:4px; object-fit:cover; border:2px solid #d1d5db; }
  .ph-placeholder { width:90px; height:90px; border-radius:4px; background:#f3f4f6; display:flex; align-items:center; justify-content:center; font-size:32px; border:2px solid #d1d5db; }
  .header-info h1 { font-size:26px; font-weight:700; letter-spacing:-0.3px; }
  .header-info p { font-size:12px; color:#6b7280; margin-top:4px; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 24px; font-size:12px; margin-top:8px; }
  .info-grid span { color:#6b7280; }
  .info-grid strong { color:#111827; }
  .section { margin-bottom:20px; }
  .sec-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:2.5px; color:#111827; padding-bottom:6px; border-bottom:1.5px solid #e5e7eb; margin-bottom:10px; }
  .sec-content { font-size:12px; line-height:1.7; color:#374151; white-space:pre-line; }
</style></head><body>
<div class="header">
  ${data.photo ? `<img class="photo" src="${data.photo}" />` : `<div class="ph-placeholder">👤</div>`}
  <div class="header-info">
    <h1>${esc(data.name) || "Full Name"}</h1>
    <p>EUROPASS CURRICULUM VITAE</p>
    <div class="info-grid">
      ${data.phone ? `<div><span>Phone:</span> <strong>${esc(data.phone)}</strong></div>` : ""}
      ${data.email ? `<div><span>Email:</span> <strong>${esc(data.email)}</strong></div>` : ""}
      ${data.dob ? `<div><span>DOB:</span> <strong>${esc(data.dob)}</strong></div>` : ""}
      ${data.nationality ? `<div><span>Nationality:</span> <strong>${esc(data.nationality)}</strong></div>` : ""}
      ${data.address ? `<div><span>Address:</span> <strong>${esc(data.address)}</strong></div>` : ""}
    </div>
  </div>
</div>
${data.jobAppliedFor ? `<div class="section"><div class="sec-title">Job Applied For</div><div class="sec-content">${esc(data.jobAppliedFor)}</div></div>` : ""}
${data.workExperience.length ? `<div class="section"><div class="sec-title">Work Experience</div>${workHTML(data.workExperience)}</div>` : ""}
${data.education.length ? `<div class="section"><div class="sec-title">Education and Training</div>${eduHTML(data.education)}</div>` : ""}
${data.languages.length ? `<div class="section"><div class="sec-title">Language Skills</div>${langTable(data.languages, "#f3f4f6", "#111827", "#d1d5db")}</div>` : ""}
${data.digitalSkills ? `<div class="section"><div class="sec-title">Digital Skills</div><div class="sec-content">${esc(data.digitalSkills)}</div></div>` : ""}
${data.communicationSkills ? `<div class="section"><div class="sec-title">Communication Skills</div><div class="sec-content">${esc(data.communicationSkills)}</div></div>` : ""}
${data.organisationalSkills ? `<div class="section"><div class="sec-title">Organisational Skills</div><div class="sec-content">${esc(data.organisationalSkills)}</div></div>` : ""}
${data.additionalInfo ? `<div class="section"><div class="sec-title">Additional Information</div><div class="sec-content">${esc(data.additionalInfo)}</div></div>` : ""}
${data.annexes ? `<div class="section"><div class="sec-title">Annexes</div><div class="sec-content">${esc(data.annexes)}</div></div>` : ""}
${declarationHTML(data, "#111827")}
</body></html>`,
};

// ─── Template 2: Modern Blue Europass ───
const modernBlue: CVTemplate = {
  id: "modern-blue",
  name: "Modern Blue",
  description: "Light blue accents — clean government-style UI",
  previewColors: { sidebar: "#1e40af", accent: "#3b82f6", bg: "#f0f7ff" },
  generateHTML: (data) => `<html><head><title>CV - ${esc(data.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; color:#1e293b; max-width:794px; margin:0 auto; background:#fff; }
  .topbar { height:6px; background:linear-gradient(90deg,#1e40af,#3b82f6,#93c5fd); }
  .header { padding:28px 44px 24px; background:linear-gradient(135deg,#eff6ff,#dbeafe); display:flex; align-items:center; gap:24px; border-bottom:2px solid #bfdbfe; }
  .photo { width:88px; height:88px; border-radius:50%; object-fit:cover; border:3px solid #93c5fd; }
  .ph-placeholder { width:88px; height:88px; border-radius:50%; background:#dbeafe; display:flex; align-items:center; justify-content:center; font-size:32px; border:3px solid #93c5fd; }
  .header-info h1 { font-size:24px; font-weight:700; color:#1e3a5f; }
  .header-info .subtitle { font-size:11px; color:#1e40af; font-weight:600; text-transform:uppercase; letter-spacing:2px; margin-top:2px; }
  .header-info p { font-size:11px; color:#64748b; margin-top:6px; }
  .info-row { display:flex; flex-wrap:wrap; gap:12px; margin-top:6px; font-size:11px; }
  .info-row div { background:#fff; border:1px solid #bfdbfe; padding:3px 10px; border-radius:4px; color:#1e40af; }
  .body { padding:24px 44px 32px; }
  .card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px 18px; margin-bottom:16px; }
  .sec-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:#1e40af; margin-bottom:10px; display:flex; align-items:center; gap:6px; }
  .sec-title::before { content:''; width:4px; height:16px; background:#3b82f6; border-radius:2px; display:inline-block; }
  .sec-content { font-size:12px; line-height:1.7; color:#334155; white-space:pre-line; }
</style></head><body>
<div class="topbar"></div>
<div class="header">
  ${data.photo ? `<img class="photo" src="${data.photo}" />` : `<div class="ph-placeholder">👤</div>`}
  <div class="header-info">
    <h1>${esc(data.name) || "Full Name"}</h1>
    <div class="subtitle">Europass Curriculum Vitae</div>
    <p>${[data.email, data.phone, data.address].filter(Boolean).map(v => esc(v)).join(" · ")}</p>
    <div class="info-row">
      ${data.dob ? `<div>📅 ${esc(data.dob)}</div>` : ""}
      ${data.nationality ? `<div>🏳 ${esc(data.nationality)}</div>` : ""}
    </div>
  </div>
</div>
<div class="body">
${data.jobAppliedFor ? `<div class="card"><div class="sec-title">Job Applied For</div><div class="sec-content">${esc(data.jobAppliedFor)}</div></div>` : ""}
${data.workExperience.length ? `<div class="card"><div class="sec-title">Work Experience</div>${workHTML(data.workExperience)}</div>` : ""}
${data.education.length ? `<div class="card"><div class="sec-title">Education and Training</div>${eduHTML(data.education)}</div>` : ""}
${data.languages.length ? `<div class="card"><div class="sec-title">Language Skills</div>${langTable(data.languages, "#dbeafe", "#1e3a5f", "#bfdbfe")}</div>` : ""}
${data.digitalSkills ? `<div class="card"><div class="sec-title">Digital Skills</div><div class="sec-content">${esc(data.digitalSkills)}</div></div>` : ""}
${data.communicationSkills ? `<div class="card"><div class="sec-title">Communication Skills</div><div class="sec-content">${esc(data.communicationSkills)}</div></div>` : ""}
${data.organisationalSkills ? `<div class="card"><div class="sec-title">Organisational Skills</div><div class="sec-content">${esc(data.organisationalSkills)}</div></div>` : ""}
${data.additionalInfo ? `<div class="card"><div class="sec-title">Additional Information</div><div class="sec-content">${esc(data.additionalInfo)}</div></div>` : ""}
${data.annexes ? `<div class="card"><div class="sec-title">Annexes</div><div class="sec-content">${esc(data.annexes)}</div></div>` : ""}
${declarationHTML(data, "#1e40af")}
</div>
</body></html>`,
};

// ─── Template 3: Creative Europass ───
const creativeEuropass: CVTemplate = {
  id: "creative",
  name: "Creative",
  description: "Icons, color variations — stylish yet professional",
  previewColors: { sidebar: "#065f46", accent: "#10b981", bg: "#ecfdf5" },
  generateHTML: (data) => `<html><head><title>CV - ${esc(data.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'DM Sans',sans-serif; color:#1f2937; max-width:794px; margin:0 auto; padding:0; background:#fff; }
  .header { background:linear-gradient(135deg,#065f46,#047857); color:#fff; padding:32px 44px; display:flex; align-items:center; gap:24px; }
  .photo { width:90px; height:90px; border-radius:16px; object-fit:cover; border:3px solid rgba(255,255,255,0.3); }
  .ph-placeholder { width:90px; height:90px; border-radius:16px; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; font-size:32px; border:3px solid rgba(255,255,255,0.3); }
  .header h1 { font-size:26px; font-weight:700; }
  .header .sub { font-size:11px; opacity:0.8; text-transform:uppercase; letter-spacing:2px; margin-top:2px; }
  .header .contact { font-size:11px; opacity:0.9; margin-top:8px; line-height:1.6; }
  .body { padding:24px 44px 32px; }
  .section { margin-bottom:18px; }
  .sec-title { font-size:13px; font-weight:700; color:#065f46; display:flex; align-items:center; gap:8px; margin-bottom:8px; padding-bottom:6px; border-bottom:2px solid #d1fae5; }
  .sec-icon { width:24px; height:24px; background:#ecfdf5; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:12px; }
  .sec-content { font-size:12px; line-height:1.7; color:#374151; white-space:pre-line; }
  .skill-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
  .skill-chip { background:#ecfdf5; color:#065f46; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:500; border:1px solid #a7f3d0; }
</style></head><body>
<div class="header">
  ${data.photo ? `<img class="photo" src="${data.photo}" />` : `<div class="ph-placeholder">👤</div>`}
  <div>
    <h1>${esc(data.name) || "Full Name"}</h1>
    <div class="sub">Europass Curriculum Vitae</div>
    <div class="contact">
      ${data.email ? `✉ ${esc(data.email)}` : ""} ${data.phone ? ` · ☎ ${esc(data.phone)}` : ""}
      ${data.address ? `<br>📍 ${esc(data.address)}` : ""}
      ${data.dob ? ` · 📅 ${esc(data.dob)}` : ""} ${data.nationality ? ` · 🏳 ${esc(data.nationality)}` : ""}
    </div>
  </div>
</div>
<div class="body">
${data.jobAppliedFor ? `<div class="section"><div class="sec-title"><span class="sec-icon">🎯</span> Job Applied For</div><div class="sec-content">${esc(data.jobAppliedFor)}</div></div>` : ""}
${data.workExperience.length ? `<div class="section"><div class="sec-title"><span class="sec-icon">💼</span> Work Experience</div>${workHTML(data.workExperience)}</div>` : ""}
${data.education.length ? `<div class="section"><div class="sec-title"><span class="sec-icon">🎓</span> Education and Training</div>${eduHTML(data.education)}</div>` : ""}
${data.languages.length ? `<div class="section"><div class="sec-title"><span class="sec-icon">🗣</span> Language Skills</div>${langTable(data.languages, "#ecfdf5", "#065f46", "#a7f3d0")}</div>` : ""}
${data.digitalSkills ? `<div class="section"><div class="sec-title"><span class="sec-icon">💻</span> Digital Skills</div><div class="skill-chips">${data.digitalSkills.split(",").map(s => `<span class="skill-chip">${esc(s.trim())}</span>`).join("")}</div></div>` : ""}
${data.communicationSkills ? `<div class="section"><div class="sec-title"><span class="sec-icon">🤝</span> Communication Skills</div><div class="sec-content">${esc(data.communicationSkills)}</div></div>` : ""}
${data.organisationalSkills ? `<div class="section"><div class="sec-title"><span class="sec-icon">🧩</span> Organisational Skills</div><div class="sec-content">${esc(data.organisationalSkills)}</div></div>` : ""}
${data.additionalInfo ? `<div class="section"><div class="sec-title"><span class="sec-icon">📄</span> Additional Information</div><div class="sec-content">${esc(data.additionalInfo)}</div></div>` : ""}
${data.annexes ? `<div class="section"><div class="sec-title"><span class="sec-icon">📎</span> Annexes</div><div class="sec-content">${esc(data.annexes)}</div></div>` : ""}
${declarationHTML(data, "#065f46")}
</div>
</body></html>`,
};

// ─── Template 4: Two-Column Advanced ───
const twoColumn: CVTemplate = {
  id: "two-column",
  name: "Two-Column",
  description: "Left sidebar personal info — modern European style",
  previewColors: { sidebar: "#1e293b", accent: "#f59e0b", bg: "#ffffff" },
  generateHTML: (data) => `<html><head><title>CV - ${esc(data.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700;800&display=swap');
  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Nunito Sans',sans-serif; color:#1e293b; }
  .cv { display:flex; min-height:100vh; max-width:794px; margin:0 auto; }
  .side { width:260px; background:linear-gradient(180deg,#0f172a,#1e293b); color:#e2e8f0; padding:32px 22px; }
  .main { flex:1; background:#fff; padding:32px 36px; }
  .photo { width:110px; height:110px; border-radius:50%; object-fit:cover; border:3px solid #f59e0b; margin:0 auto 16px; display:block; }
  .ph-placeholder { width:110px; height:110px; border-radius:50%; background:#334155; display:flex; align-items:center; justify-content:center; font-size:36px; border:3px solid #f59e0b; margin:0 auto 16px; }
  .sname { font-size:18px; font-weight:800; text-align:center; margin-bottom:2px; color:#f8fafc; }
  .stag { font-size:10px; text-align:center; text-transform:uppercase; letter-spacing:2px; color:#f59e0b; margin-bottom:24px; }
  .ssec { margin-bottom:22px; }
  .ssec-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:#f59e0b; padding-bottom:6px; border-bottom:1px solid #334155; margin-bottom:10px; }
  .sitem { font-size:11px; margin-bottom:6px; line-height:1.5; color:#cbd5e1; }
  .sitem strong { color:#f8fafc; }
  .lang-mini { font-size:10px; margin-bottom:4px; }
  .lang-mini span { display:inline-block; background:#334155; padding:1px 6px; border-radius:3px; margin-left:4px; color:#f59e0b; font-weight:600; }
  .msec { margin-bottom:22px; }
  .msec-title { font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:#1e293b; padding-bottom:6px; border-bottom:2px solid #e2e8f0; margin-bottom:10px; position:relative; }
  .msec-title::after { content:''; position:absolute; bottom:-2px; left:0; width:36px; height:2px; background:#f59e0b; }
  .sec-content { font-size:12px; line-height:1.7; color:#475569; white-space:pre-line; }
</style></head><body>
<div class="cv">
  <div class="side">
    ${data.photo ? `<img class="photo" src="${data.photo}" />` : `<div class="ph-placeholder">👤</div>`}
    <div class="sname">${esc(data.name) || "Full Name"}</div>
    <div class="stag">Europass CV</div>
    <div class="ssec">
      <div class="ssec-title">Personal Info</div>
      ${data.phone ? `<div class="sitem">☎ ${esc(data.phone)}</div>` : ""}
      ${data.email ? `<div class="sitem">✉ ${esc(data.email)}</div>` : ""}
      ${data.address ? `<div class="sitem">📍 ${esc(data.address)}</div>` : ""}
      ${data.dob ? `<div class="sitem">📅 ${esc(data.dob)}</div>` : ""}
      ${data.nationality ? `<div class="sitem">🏳 ${esc(data.nationality)}</div>` : ""}
    </div>
    ${data.languages.length ? `<div class="ssec">
      <div class="ssec-title">Languages</div>
      ${data.languages.map(l => `<div class="lang-mini">${esc(l.language)} <span>${esc(l.speaking)}</span></div>`).join("")}
    </div>` : ""}
    ${data.digitalSkills ? `<div class="ssec">
      <div class="ssec-title">Digital Skills</div>
      ${data.digitalSkills.split(",").map(s => `<div class="sitem">• ${esc(s.trim())}</div>`).join("")}
    </div>` : ""}
    ${data.communicationSkills ? `<div class="ssec">
      <div class="ssec-title">Communication</div>
      <div class="sitem">${esc(data.communicationSkills)}</div>
    </div>` : ""}
    ${data.organisationalSkills ? `<div class="ssec">
      <div class="ssec-title">Organisation</div>
      <div class="sitem">${esc(data.organisationalSkills)}</div>
    </div>` : ""}
  </div>
  <div class="main">
    ${data.jobAppliedFor ? `<div class="msec"><div class="msec-title">Job Applied For</div><div class="sec-content">${esc(data.jobAppliedFor)}</div></div>` : ""}
    ${data.workExperience.length ? `<div class="msec"><div class="msec-title">Work Experience</div>${workHTML(data.workExperience)}</div>` : ""}
    ${data.education.length ? `<div class="msec"><div class="msec-title">Education & Training</div>${eduHTML(data.education)}</div>` : ""}
    ${data.languages.length ? `<div class="msec"><div class="msec-title">Language Skills</div>${langTable(data.languages, "#f8fafc", "#1e293b", "#e2e8f0")}</div>` : ""}
    ${data.additionalInfo ? `<div class="msec"><div class="msec-title">Additional Info</div><div class="sec-content">${esc(data.additionalInfo)}</div></div>` : ""}
    ${data.annexes ? `<div class="msec"><div class="msec-title">Annexes</div><div class="sec-content">${esc(data.annexes)}</div></div>` : ""}
    ${declarationHTML(data, "#1e293b")}
  </div>
</div>
</body></html>`,
};

export const CV_TEMPLATES: CVTemplate[] = [
  minimalProfessional,
  modernBlue,
  creativeEuropass,
  twoColumn,
];

export const DEFAULT_CV_FEE = 10;

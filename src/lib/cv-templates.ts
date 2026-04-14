/**
 * CV Template definitions inspired by rendercv themes.
 * Each template provides CSS + HTML generation for print output.
 */

export interface CVTemplate {
  id: string;
  name: string;
  description: string;
  previewColors: { sidebar: string; accent: string; bg: string };
  generateHTML: (data: CVData) => string;
}

export interface CVData {
  name: string;
  email: string;
  phone: string;
  address: string;
  objective: string;
  education: string;
  experience: string;
  skills: string;
  photo: string | null;
}

function escapeHTML(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function skillsList(skills: string) {
  return skills.split(",").filter(s => s.trim()).map(s => s.trim());
}

// ─── Template 1: Classic (current default - two column with sidebar) ───
const classicTemplate: CVTemplate = {
  id: "classic",
  name: "Classic",
  description: "Professional two-column layout with colored sidebar",
  previewColors: { sidebar: "#1a365d", accent: "#3182ce", bg: "#ffffff" },
  generateHTML: (data) => `
    <html><head><title>CV - ${escapeHTML(data.name)}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Open+Sans:wght@400;500;600&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Open Sans', sans-serif; color: #2d3748; }
      .cv { display: flex; min-height: 100vh; }
      .side { width: 260px; background: linear-gradient(180deg, #1a365d 0%, #2b4c7e 100%); color: #fff; padding: 40px 24px; }
      .main { flex: 1; padding: 40px 32px; background: #fff; }
      .photo { width: 120px; height: 120px; border-radius: 50%; overflow: hidden; border: 4px solid rgba(255,255,255,0.3); margin: 0 auto 20px; }
      .photo img { width: 100%; height: 100%; object-fit: cover; }
      .ph-placeholder { width: 120px; height: 120px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.3); margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); font-size: 40px; }
      .sname { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 4px; }
      .stitle { font-size: 12px; text-align: center; color: rgba(255,255,255,0.7); margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }
      .ssec { margin-bottom: 24px; }
      .ssec-title { font-family: 'Poppins', sans-serif; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid rgba(255,255,255,0.2); }
      .sitem { font-size: 13px; margin-bottom: 8px; line-height: 1.5; color: rgba(255,255,255,0.9); }
      .msec { margin-bottom: 28px; }
      .msec-title { font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #1a365d; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; position: relative; }
      .msec-title::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 40px; height: 2px; background: #3182ce; }
      .mcontent { font-size: 14px; line-height: 1.8; color: #4a5568; white-space: pre-line; }
    </style></head><body>
    <div class="cv">
      <div class="side">
        ${data.photo ? `<div class="photo"><img src="${data.photo}" /></div>` : `<div class="ph-placeholder">👤</div>`}
        <div class="sname">${escapeHTML(data.name) || "Your Name"}</div>
        <div class="stitle">Professional</div>
        <div class="ssec"><div class="ssec-title">Contact</div>
          ${data.email ? `<div class="sitem">✉ ${escapeHTML(data.email)}</div>` : ""}
          ${data.phone ? `<div class="sitem">☎ ${escapeHTML(data.phone)}</div>` : ""}
          ${data.address ? `<div class="sitem">📍 ${escapeHTML(data.address)}</div>` : ""}
        </div>
        ${data.skills ? `<div class="ssec"><div class="ssec-title">Skills</div>${skillsList(data.skills).map(s => `<div class="sitem">• ${escapeHTML(s)}</div>`).join("")}</div>` : ""}
      </div>
      <div class="main">
        ${data.objective ? `<div class="msec"><div class="msec-title">Career Objective</div><div class="mcontent">${escapeHTML(data.objective)}</div></div>` : ""}
        ${data.education ? `<div class="msec"><div class="msec-title">Education</div><div class="mcontent">${escapeHTML(data.education)}</div></div>` : ""}
        ${data.experience ? `<div class="msec"><div class="msec-title">Work Experience</div><div class="mcontent">${escapeHTML(data.experience)}</div></div>` : ""}
      </div>
    </div></body></html>`,
};

// ─── Template 2: Modern (sb2nov style - clean single column) ───
const modernTemplate: CVTemplate = {
  id: "modern",
  name: "Modern",
  description: "Clean single-column layout with bold header",
  previewColors: { sidebar: "#0f172a", accent: "#6366f1", bg: "#f8fafc" },
  generateHTML: (data) => `
    <html><head><title>CV - ${escapeHTML(data.name)}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 40px; background: #fff; }
      .header { text-align: center; padding-bottom: 24px; border-bottom: 3px solid #0f172a; margin-bottom: 28px; }
      .header-name { font-size: 36px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; }
      .header-contact { font-size: 13px; color: #64748b; margin-top: 8px; display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
      .header-contact span { display: flex; align-items: center; gap: 4px; }
      .section { margin-bottom: 24px; }
      .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: #6366f1; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1.5px solid #e2e8f0; }
      .section-content { font-size: 14px; line-height: 1.7; color: #334155; white-space: pre-line; }
      .skills-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .skill-chip { background: #eef2ff; color: #4338ca; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; }
      .photo-row { display: flex; justify-content: center; margin-bottom: 16px; }
      .photo-row img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #e2e8f0; }
    </style></head><body>
    ${data.photo ? `<div class="photo-row"><img src="${data.photo}" /></div>` : ""}
    <div class="header">
      <div class="header-name">${escapeHTML(data.name) || "Your Name"}</div>
      <div class="header-contact">
        ${data.email ? `<span>✉ ${escapeHTML(data.email)}</span>` : ""}
        ${data.phone ? `<span>☎ ${escapeHTML(data.phone)}</span>` : ""}
        ${data.address ? `<span>📍 ${escapeHTML(data.address)}</span>` : ""}
      </div>
    </div>
    ${data.objective ? `<div class="section"><div class="section-title">Objective</div><div class="section-content">${escapeHTML(data.objective)}</div></div>` : ""}
    ${data.education ? `<div class="section"><div class="section-title">Education</div><div class="section-content">${escapeHTML(data.education)}</div></div>` : ""}
    ${data.experience ? `<div class="section"><div class="section-title">Experience</div><div class="section-content">${escapeHTML(data.experience)}</div></div>` : ""}
    ${data.skills ? `<div class="section"><div class="section-title">Skills</div><div class="skills-row">${skillsList(data.skills).map(s => `<span class="skill-chip">${escapeHTML(s)}</span>`).join("")}</div></div>` : ""}
    </body></html>`,
};

// ─── Template 3: Minimal (engineeringresumes style) ───
const minimalTemplate: CVTemplate = {
  id: "minimal",
  name: "Minimal",
  description: "No-frills ATS-friendly format with clean lines",
  previewColors: { sidebar: "#111827", accent: "#111827", bg: "#ffffff" },
  generateHTML: (data) => `
    <html><head><title>CV - ${escapeHTML(data.name)}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Source Sans 3', sans-serif; color: #111827; max-width: 780px; margin: 0 auto; padding: 36px 40px; background: #fff; }
      .header { text-align: center; margin-bottom: 20px; }
      .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
      .header p { font-size: 12px; color: #6b7280; }
      hr { border: none; border-top: 1.5px solid #111827; margin: 16px 0 12px; }
      .section { margin-bottom: 16px; }
      .section h2 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
      .section p { font-size: 13px; line-height: 1.6; color: #374151; white-space: pre-line; }
      .skills-list { font-size: 13px; color: #374151; }
    </style></head><body>
    <div class="header">
      <h1>${escapeHTML(data.name) || "Your Name"}</h1>
      <p>${[data.email, data.phone, data.address].filter(Boolean).map(v => escapeHTML(v)).join(" | ")}</p>
    </div>
    <hr />
    ${data.objective ? `<div class="section"><h2>Objective</h2><p>${escapeHTML(data.objective)}</p></div>` : ""}
    ${data.education ? `<div class="section"><h2>Education</h2><p>${escapeHTML(data.education)}</p></div>` : ""}
    ${data.experience ? `<div class="section"><h2>Experience</h2><p>${escapeHTML(data.experience)}</p></div>` : ""}
    ${data.skills ? `<div class="section"><h2>Skills</h2><p class="skills-list">${skillsList(data.skills).join(" • ")}</p></div>` : ""}
    </body></html>`,
};

// ─── Template 4: Elegant (moderncv style - colored header bar) ───
const elegantTemplate: CVTemplate = {
  id: "elegant",
  name: "Elegant",
  description: "Sophisticated header with accent bar and refined typography",
  previewColors: { sidebar: "#7c3aed", accent: "#a78bfa", bg: "#faf5ff" },
  generateHTML: (data) => `
    <html><head><title>CV - ${escapeHTML(data.name)}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Lato', sans-serif; color: #1f2937; max-width: 800px; margin: 0 auto; background: #fff; }
      .topbar { height: 8px; background: linear-gradient(90deg, #7c3aed, #a78bfa); }
      .header { padding: 36px 40px 28px; display: flex; align-items: center; gap: 24px; }
      .header img { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid #e9d5ff; }
      .header-ph { width: 90px; height: 90px; border-radius: 50%; background: #f3e8ff; display: flex; align-items: center; justify-content: center; font-size: 32px; border: 3px solid #e9d5ff; }
      .header-info h1 { font-family: 'Playfair Display', serif; font-size: 30px; color: #5b21b6; }
      .header-info p { font-size: 12px; color: #6b7280; margin-top: 4px; }
      .body { padding: 0 40px 40px; }
      .section { margin-bottom: 24px; }
      .section-title { font-family: 'Playfair Display', serif; font-size: 16px; color: #7c3aed; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1.5px solid #ede9fe; }
      .section-content { font-size: 14px; line-height: 1.7; color: #4b5563; white-space: pre-line; }
      .skill-tags { display: flex; flex-wrap: wrap; gap: 8px; }
      .skill-tag { background: #f3e8ff; color: #6d28d9; padding: 5px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    </style></head><body>
    <div class="topbar"></div>
    <div class="header">
      ${data.photo ? `<img src="${data.photo}" />` : `<div class="header-ph">👤</div>`}
      <div class="header-info">
        <h1>${escapeHTML(data.name) || "Your Name"}</h1>
        <p>${[data.email, data.phone, data.address].filter(Boolean).map(v => escapeHTML(v)).join(" · ")}</p>
      </div>
    </div>
    <div class="body">
      ${data.objective ? `<div class="section"><div class="section-title">Career Objective</div><div class="section-content">${escapeHTML(data.objective)}</div></div>` : ""}
      ${data.education ? `<div class="section"><div class="section-title">Education</div><div class="section-content">${escapeHTML(data.education)}</div></div>` : ""}
      ${data.experience ? `<div class="section"><div class="section-title">Work Experience</div><div class="section-content">${escapeHTML(data.experience)}</div></div>` : ""}
      ${data.skills ? `<div class="section"><div class="section-title">Skills</div><div class="skill-tags">${skillsList(data.skills).map(s => `<span class="skill-tag">${escapeHTML(s)}</span>`).join("")}</div></div>` : ""}
    </div>
    </body></html>`,
};

// ─── Template 5: Bold (dark theme, modern tech) ───
const boldTemplate: CVTemplate = {
  id: "bold",
  name: "Bold",
  description: "Dark header with modern tech-inspired design",
  previewColors: { sidebar: "#0f172a", accent: "#f59e0b", bg: "#0f172a" },
  generateHTML: (data) => `
    <html><head><title>CV - ${escapeHTML(data.name)}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'DM Sans', sans-serif; color: #e2e8f0; max-width: 800px; margin: 0 auto; background: #0f172a; }
      .header { background: linear-gradient(135deg, #1e293b, #0f172a); padding: 40px; display: flex; align-items: center; gap: 24px; border-bottom: 3px solid #f59e0b; }
      .header img { width: 100px; height: 100px; border-radius: 16px; object-fit: cover; border: 2px solid #f59e0b; }
      .header-ph { width: 100px; height: 100px; border-radius: 16px; background: #1e293b; display: flex; align-items: center; justify-content: center; font-size: 36px; border: 2px solid #f59e0b; }
      .header h1 { font-family: 'Space Grotesk', sans-serif; font-size: 32px; font-weight: 700; color: #f8fafc; }
      .header p { font-size: 13px; color: #94a3b8; margin-top: 4px; }
      .body { padding: 32px 40px; }
      .section { margin-bottom: 28px; }
      .section-title { font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; color: #f59e0b; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #334155; }
      .section-content { font-size: 14px; line-height: 1.7; color: #cbd5e1; white-space: pre-line; }
      .skill-tags { display: flex; flex-wrap: wrap; gap: 8px; }
      .skill-tag { background: #1e293b; color: #fbbf24; padding: 5px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; border: 1px solid #334155; }
    </style></head><body>
    <div class="header">
      ${data.photo ? `<img src="${data.photo}" />` : `<div class="header-ph">👤</div>`}
      <div>
        <h1>${escapeHTML(data.name) || "Your Name"}</h1>
        <p>${[data.email, data.phone, data.address].filter(Boolean).map(v => escapeHTML(v)).join(" · ")}</p>
      </div>
    </div>
    <div class="body">
      ${data.objective ? `<div class="section"><div class="section-title">Objective</div><div class="section-content">${escapeHTML(data.objective)}</div></div>` : ""}
      ${data.education ? `<div class="section"><div class="section-title">Education</div><div class="section-content">${escapeHTML(data.education)}</div></div>` : ""}
      ${data.experience ? `<div class="section"><div class="section-title">Experience</div><div class="section-content">${escapeHTML(data.experience)}</div></div>` : ""}
      ${data.skills ? `<div class="section"><div class="section-title">Skills</div><div class="skill-tags">${skillsList(data.skills).map(s => `<span class="skill-tag">${escapeHTML(s)}</span>`).join("")}</div></div>` : ""}
    </div>
    </body></html>`,
};

export const CV_TEMPLATES: CVTemplate[] = [
  classicTemplate,
  modernTemplate,
  minimalTemplate,
  elegantTemplate,
  boldTemplate,
];

export const DEFAULT_CV_FEE = 10; // ₹10 default

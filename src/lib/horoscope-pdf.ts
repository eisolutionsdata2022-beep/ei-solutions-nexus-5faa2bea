/**
 * Premium Vedic horoscope PDF — modeled after the customer-supplied reference
 * (സമ്പൂർണ ജാതകം) layout: cover → ജാതക ചക്രം + ഗ്രഹനിലകൾ → പൊതുവായ പ്രവചനങ്ങൾ
 * → ജീവിത ഘട്ടങ്ങൾ → വിദ്യാഭ്യാസ/തൊഴിൽ/സാമ്പത്തിക → ആരോഗ്യ/ശത്രു/turning points
 * → വാർഷിക ഫലങ്ങൾ + ദശാ ഭുക്തി → പരിഹാരങ്ങൾ → closing prayer.
 *
 * Strategy: build an HTML report off-screen, capture with html2canvas,
 * slice into A4 pages, force download via Blob. Religion-aware theme
 * + deity image + appropriate remedy framing.
 */
import type { HoroscopeRequest, HoroscopeReport, Religion, ChakramCell } from "./horoscope-types";
import { PRODUCT_LABELS, RELIGION_LABELS } from "./horoscope-types";

import deityHindu from "@/assets/horoscope-deity-hindu.png";
import deityMuslim from "@/assets/horoscope-deity-muslim.png";
import deityChristian from "@/assets/horoscope-deity-christian.png";

const A4_W = 210;
const A4_H = 297;

const DEITY_IMAGES: Record<Religion, string> = {
  Hindu: deityHindu,
  Muslim: deityMuslim,
  Christian: deityChristian,
};

const RELIGION_THEMES: Record<Religion, {
  primary: string; secondary: string; accent: string;
  bgGrad: string; cornerDeco: string; openingBlessing: string;
  closingMl: string; closingEn: string;
}> = {
  Hindu: {
    primary: "#7c2d12", secondary: "#b45309", accent: "#fef3c7",
    bgGrad: "linear-gradient(135deg,#fff7ed,#fef3c7)",
    cornerDeco: "❋", openingBlessing: "ഓം ഗണേശായ നമഃ",
    closingMl: "സർവേ ഭവന്തു സുഖിനഃ",
    closingEn: "May all be happy. May all be free from illness.",
  },
  Muslim: {
    primary: "#065f46", secondary: "#047857", accent: "#d1fae5",
    bgGrad: "linear-gradient(135deg,#ecfdf5,#d1fae5)",
    cornerDeco: "✦", openingBlessing: "ബിസ്മില്ലാഹി റഹ്മാനി റഹീം",
    closingMl: "അല്ലാഹു ഹാഫിസ്",
    closingEn: "May Allah protect and bless you with peace and prosperity.",
  },
  Christian: {
    primary: "#1e3a8a", secondary: "#1d4ed8", accent: "#dbeafe",
    bgGrad: "linear-gradient(135deg,#eff6ff,#dbeafe)",
    cornerDeco: "✚", openingBlessing: "പിതാവിന്റെയും പുത്രന്റെയും പരിശുദ്ധാത്മാവിന്റെയും നാമത്തിൽ",
    closingMl: "ദൈവം നിങ്ങളെ അനുഗ്രഹിക്കട്ടെ",
    closingEn: "May God bless you with peace, joy and abundance.",
  },
};

/* ───────── helpers ───────── */

function escapeHtml(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDate(d?: string) {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return d; }
}

function fmtTime(t?: string) {
  if (!t) return "—";
  try {
    const [h, m] = t.split(":").map(Number);
    if (isNaN(h)) return t;
    const period = h >= 12 ? "PM" : "AM";
    const hh = h % 12 || 12;
    return `${hh}:${String(m || 0).padStart(2, "0")} ${period}`;
  } catch { return t; }
}

/* ───────── 4×4 South-Indian style chakram ─────────
   Layout:
     [ 12 ][ 1  ][ 2 ][ 3 ]
     [ 11 ][         ][ 4 ]
     [ 10 ][   center ][ 5 ]
     [  9 ][ 8  ][ 7 ][ 6 ]
   The 4 inner cells form the centre title block.
*/
const CHAKRAM_LAYOUT: (number | "C")[] = [
  12, 1, 2, 3,
  11, "C", "C", 4,
  10, "C", "C", 5,
  9, 8, 7, 6,
];

function chakramHtml(chakram: ChakramCell[] | undefined, lagnam: string): string {
  const map = new Map<number, ChakramCell>();
  (chakram || []).forEach((c) => map.set(c.house, c));

  let centreEmitted = false;
  const cells = CHAKRAM_LAYOUT.map((slot, idx) => {
    if (slot === "C") {
      if (centreEmitted) return "";
      centreEmitted = true;
      return `
        <div class="ch-cell ch-center" style="grid-column: 2 / span 2; grid-row: 2 / span 2;">
          <div class="ch-center-title">ജാതക ചക്രം</div>
          <div class="ch-center-sub">ലഗ്നം: ${escapeHtml(lagnam || "—")}</div>
          <div class="ch-center-deco">✦</div>
        </div>`;
    }
    const c = map.get(slot);
    const planets = c?.planets?.length ? c.planets.join(" ") : "";
    const isLagnam = c?.house === 1;
    // grid coordinates so cells render correctly when the centre spans 2x2
    const row = Math.floor(idx / 4) + 1;
    const col = (idx % 4) + 1;
    return `
      <div class="ch-cell ${isLagnam ? "ch-lagnam" : ""}" style="grid-column:${col};grid-row:${row};">
        <div class="ch-h">House ${slot}</div>
        <div class="ch-r">${escapeHtml(c?.rashi || "—")}</div>
        ${planets ? `<div class="ch-p">${escapeHtml(planets)}</div>` : ""}
        ${isLagnam ? `<div class="ch-lag-tag">ലഗ്നം</div>` : ""}
      </div>`;
  }).filter(Boolean).join("");

  return `<div class="chakram">${cells}</div>`;
}

function grahaTableHtml(rows: HoroscopeReport["grahaNilakal"] | undefined): string {
  if (!rows || rows.length === 0) return "";
  return `
    <table class="g-table">
      <thead>
        <tr><th>ഗ്രഹം</th><th>ഭാവം</th><th>രാശി</th><th>അവസ്ഥ</th></tr>
      </thead>
      <tbody>
        ${rows.map((r) => `
          <tr>
            <td><b>${escapeHtml(r.planet)}</b></td>
            <td class="num">${r.house}</td>
            <td>${escapeHtml(r.rashi)}</td>
            <td>${escapeHtml(r.condition)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

function bulletList(items: string[] | undefined): string {
  if (!items || items.length === 0) return `<div class="muted">—</div>`;
  return `<ul class="bullets">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
}

function multilineList(text: string | undefined): string {
  if (!text) return `<div class="muted">—</div>`;
  return `<ul class="bullets">${text.split(/\n+/).filter(Boolean).map((line) => `<li>${escapeHtml(line.replace(/^[-*•]\s*/, ""))}</li>`).join("")}</ul>`;
}

/* ───────── HTML report ───────── */

export function buildReportHtml(req: HoroscopeRequest): string {
  const r = req.report;
  const product = PRODUCT_LABELS[req.product];
  const religion = req.religion || "Hindu";
  const theme = RELIGION_THEMES[religion];
  const deityImg = DEITY_IMAGES[religion];
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const reportNo = `EI-${(req.id || "").slice(0, 8).toUpperCase() || Date.now().toString(36).toUpperCase()}`;

  /* Sections to render — only render if data exists. */
  const generalPredictions = r?.generalPredictions || [];
  const lifeStages = r?.lifeStages || [];

  return `
    <div class="report" data-religion="${religion}">
      <div class="ornate-frame">
        <span class="corner tl">${theme.cornerDeco}</span>
        <span class="corner tr">${theme.cornerDeco}</span>
        <span class="corner bl">${theme.cornerDeco}</span>
        <span class="corner br">${theme.cornerDeco}</span>

        <!-- ═══ Page 1 — Cover ═══ -->
        <section class="page page-cover">
          <div class="blessing">${escapeHtml(theme.openingBlessing)}</div>
          <img class="deity" src="${deityImg}" alt="${religion}" crossorigin="anonymous"/>
          <h1 class="cover-title">സമ്പൂർണ്ണ ജാതകം</h1>
          <div class="cover-sub">${escapeHtml(product?.en || "Premium Complete Vedic Horoscope")}</div>
          <div class="hero-divider"><span>✦</span></div>

          <table class="cover-table">
            <tr><td class="lbl">പേര് / Name</td><td class="val">${escapeHtml(req.customerName)}</td></tr>
            <tr><td class="lbl">ലിംഗം / Gender</td><td class="val">${escapeHtml(req.gender)}</td></tr>
            <tr><td class="lbl">ജനന തീയതി / DOB</td><td class="val">${escapeHtml(fmtDate(req.dateOfBirth))}</td></tr>
            <tr><td class="lbl">ജനന സമയം / Time</td><td class="val">${escapeHtml(fmtTime(req.timeOfBirth))}</td></tr>
            <tr><td class="lbl">ജനന സ്ഥലം / Place</td><td class="val">${escapeHtml(req.placeOfBirth)}</td></tr>
            <tr><td class="lbl">ജന്മ നക്ഷത്രം</td><td class="val">${escapeHtml(req.nakshatram || "—")}</td></tr>
            <tr><td class="lbl">മതം / Religion</td><td class="val">${escapeHtml(RELIGION_LABELS[religion].ml)}</td></tr>
            <tr><td class="lbl">റിപ്പോർട്ട് തീയതി</td><td class="val">${escapeHtml(today)}</td></tr>
            <tr><td class="lbl">റിപ്പോർട്ട് നം.</td><td class="val">${escapeHtml(reportNo)}</td></tr>
          </table>

          <div class="cover-foot">
            <b>EI SOLUTIONS</b> · Premium Astrology Services
          </div>

          ${r?.summary ? `
            <div class="summary-card">
              <div class="summary-ribbon">സംക്ഷിപ്ത പ്രവചനം</div>
              <div class="summary-body">"${escapeHtml(r.summary)}"</div>
            </div>` : ``}
        </section>

        ${r ? `
          <!-- ═══ Page 2 — ജാതക ചക്രം ═══ -->
          <section class="page">
            <div class="page-head">
              <span class="ph-icon">${theme.cornerDeco}</span>
              <h2>ജാതക ചക്രം</h2>
              <span class="ph-en">Birth Chart</span>
            </div>
            ${chakramHtml(r.chakram, r.lagnam)}

            <div class="chart-meta">
              <span><b>രാശി:</b> ${escapeHtml(r.rashi || "—")}</span>
              <span><b>ലഗ്നം:</b> ${escapeHtml(r.lagnam || "—")}</span>
            </div>

            <div class="page-head" style="margin-top:18px;">
              <span class="ph-icon">${theme.cornerDeco}</span>
              <h2>ഗ്രഹനിലകൾ</h2>
              <span class="ph-en">Planet Positions</span>
            </div>
            ${grahaTableHtml(r.grahaNilakal)}
          </section>

          <!-- ═══ Page 3 — പൊതുവായ പ്രവചനങ്ങൾ ═══ -->
          <section class="page">
            <div class="page-head">
              <span class="ph-icon">${theme.cornerDeco}</span>
              <h2>പൊതുവായ പ്രവചനങ്ങൾ</h2>
              <span class="ph-en">General Predictions</span>
            </div>
            <div class="pred-grid">
              ${generalPredictions.map((s, i) => `
                <div class="pred-card">
                  <div class="pred-num">${i + 1}</div>
                  <div class="pred-titles">
                    <div class="pred-title-ml">${escapeHtml(s.titleMl)}</div>
                    ${s.titleEn ? `<div class="pred-title-en">${escapeHtml(s.titleEn)}</div>` : ""}
                  </div>
                  <div class="pred-body">${escapeHtml(s.body)}</div>
                </div>
              `).join("")}
            </div>
          </section>

          <!-- ═══ Page 4 — ജീവിത ഘട്ടങ്ങൾ ═══ -->
          <section class="page">
            <div class="page-head">
              <span class="ph-icon">${theme.cornerDeco}</span>
              <h2>ജീവിത ഘട്ടങ്ങൾ</h2>
              <span class="ph-en">Life Stages</span>
            </div>
            <table class="stage-table">
              <thead><tr><th style="width:30%">വയസ്സ്</th><th>പ്രവചനം</th></tr></thead>
              <tbody>
                ${lifeStages.map((s) => `
                  <tr>
                    <td><b>${escapeHtml(s.ageRange)}</b></td>
                    <td>${escapeHtml(s.prediction)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>

            <div class="two-col">
              <div class="col-card">
                <div class="cc-title">വിവാഹ യോഗം</div>
                <div class="cc-body">${escapeHtml(r.marriageYoga || "—")}</div>
              </div>
              <div class="col-card">
                <div class="cc-title">സന്താന ഭാഗ്യം</div>
                <div class="cc-body">${escapeHtml(r.childrenFortune || "—")}</div>
              </div>
            </div>
          </section>

          <!-- ═══ Page 5 — വിദ്യാഭ്യാസം / തൊഴിൽ / സാമ്പത്തികം ═══ -->
          <section class="page">
            <div class="page-head">
              <span class="ph-icon">${theme.cornerDeco}</span>
              <h2>വിദ്യാഭ്യാസം · തൊഴിൽ · സാമ്പത്തികം</h2>
              <span class="ph-en">Education · Career · Finance</span>
            </div>

            <div class="block">
              <div class="block-title">വിദ്യാഭ്യാസം · Education</div>
              <div class="block-body">${escapeHtml(r.education || "—")}</div>
            </div>
            <div class="block">
              <div class="block-title">തൊഴിൽ / ബിസിനസ്സ് · Career & Business</div>
              <div class="block-body">${escapeHtml(r.career || "—")}</div>
            </div>
            <div class="block">
              <div class="block-title">വിദേശ യാത്ര · Foreign Travel</div>
              <div class="block-body">${escapeHtml(r.foreignTravel || "—")}</div>
            </div>
            <div class="block">
              <div class="block-title">സാമ്പത്തിക വളർച്ച കാലങ്ങൾ · Financial Growth Periods</div>
              ${multilineList(r.financialGrowthPeriods)}
            </div>
          </section>

          <!-- ═══ Page 6 — ആരോഗ്യം · തടസ്സങ്ങൾ · Turning Points ═══ -->
          <section class="page">
            <div class="page-head">
              <span class="ph-icon">${theme.cornerDeco}</span>
              <h2>ആരോഗ്യം · തടസ്സങ്ങൾ · Turning Points</h2>
              <span class="ph-en">Health · Obstacles · Life Milestones</span>
            </div>

            <div class="block">
              <div class="block-title">ആരോഗ്യ മുന്നറിയിപ്പുകൾ</div>
              <div class="block-body">${escapeHtml(r.health || "—")}</div>
            </div>
            <div class="block">
              <div class="block-title">ശത്രു / തടസ്സങ്ങൾ</div>
              <div class="block-body">${escapeHtml(r.obstacles || "—")}</div>
            </div>
            <div class="block">
              <div class="block-title">ജീവിതത്തിലെ Turning Points</div>
              ${multilineList(r.turningPoints)}
            </div>
          </section>

          ${(r.yearlyForecasts && r.yearlyForecasts.length > 0) || (r.dashaBhukti && r.dashaBhukti.length > 0) ? `
          <!-- ═══ Page 7 — വാർഷിക / ദശാ / ഗോചര (Premium) ═══ -->
          <section class="page">
            <div class="page-head">
              <span class="ph-icon">${theme.cornerDeco}</span>
              <h2>📅 വാർഷിക ഫലങ്ങൾ · ദശാ ഭുക്തി</h2>
              <span class="ph-en">Annual & Vimshottari Periods</span>
            </div>

            ${r.yearlyForecasts && r.yearlyForecasts.length > 0 ? `
              <div class="block">
                <div class="block-title">വാർഷിക ഫലങ്ങൾ (അടുത്ത 5 വർഷം)</div>
                <ul class="bullets">
                  ${r.yearlyForecasts.map((y) => `<li><b>${y.year}:</b> ${escapeHtml(y.prediction)}</li>`).join("")}
                </ul>
              </div>` : ""}

            ${r.dashaBhukti && r.dashaBhukti.length > 0 ? `
              <div class="block">
                <div class="block-title">🪐 ദശാ ഭുക്തി (Vimshottari)</div>
                <table class="dasha-table">
                  <thead><tr><th>ദശ</th><th>തുടക്കം</th><th>അവസാനം</th><th>വർഷം</th></tr></thead>
                  <tbody>
                    ${r.dashaBhukti.map((d) => `
                      <tr>
                        <td><b>${escapeHtml(d.planet)}</b></td>
                        <td class="num">${d.startYear}</td>
                        <td class="num">${d.endYear}</td>
                        <td class="num">${d.years}</td>
                      </tr>`).join("")}
                  </tbody>
                </table>
              </div>` : ""}

            ${r.gocharaPhalam ? `
              <div class="block">
                <div class="block-title">🌌 ഗോചര ഫലം · Current Transit</div>
                <div class="block-body">${escapeHtml(r.gocharaPhalam)}</div>
              </div>` : ""}
          </section>` : ""}

          <!-- ═══ Page 8 — പരിഹാരങ്ങൾ ═══ -->
          <section class="page">
            <div class="page-head">
              <span class="ph-icon">${theme.cornerDeco}</span>
              <h2>പരിഹാരങ്ങൾ</h2>
              <span class="ph-en">Remedies & Practices</span>
            </div>

            <div class="rem-grid">
              <div class="rem-card"><div class="rem-title">${religion === "Hindu" ? "പൂജകൾ" : religion === "Muslim" ? "ഇബാദത്തുകൾ" : "പ്രാർത്ഥനകൾ"}</div>${bulletList(r.poojas)}</div>
              <div class="rem-card"><div class="rem-title">${religion === "Hindu" ? "ക്ഷേത്രങ്ങൾ" : religion === "Muslim" ? "പള്ളികൾ / ദർഗ" : "പള്ളികൾ / തീർത്ഥസ്ഥലങ്ങൾ"}</div>${bulletList(r.temples)}</div>
              <div class="rem-card"><div class="rem-title">${religion === "Hindu" ? "ശാന്തി കർമ്മങ്ങൾ" : "ആത്മീയ കർമ്മങ്ങൾ"}</div>${bulletList(r.shantiKarmas)}</div>
              <div class="rem-card"><div class="rem-title">${religion === "Hindu" ? "ദാനം" : religion === "Muslim" ? "സദഖ" : "ദാനധർമ്മങ്ങൾ"}</div>${bulletList(r.daanam)}</div>
              <div class="rem-card"><div class="rem-title">${religion === "Hindu" ? "മന്ത്രങ്ങൾ" : religion === "Muslim" ? "ദുആ / ദിക്‌ർ" : "സങ്കീർത്തനങ്ങൾ"}</div>${bulletList(r.mantras)}</div>
              <div class="rem-card"><div class="rem-title">${religion === "Hindu" ? "വ്രതങ്ങൾ" : religion === "Muslim" ? "നോമ്പുകൾ" : "നോമ്പുകൾ / ഉപവാസം"}</div>${bulletList(r.vratas)}</div>
              <div class="rem-card good"><div class="rem-title">നല്ല ദിവസങ്ങൾ</div>${bulletList(r.goodDays)}</div>
              <div class="rem-card caution"><div class="rem-title">ജാഗ്രത വേണ്ട ദിവസങ്ങൾ</div>${bulletList(r.cautionDays)}</div>
            </div>
          </section>

          <!-- ═══ Page 9 — Closing ═══ -->
          <section class="page page-closing">
            <div class="closing-deity">${theme.cornerDeco}</div>
            <h2 class="closing-ml">${escapeHtml(theme.closingMl)}</h2>
            <p class="closing-en">${escapeHtml(theme.closingEn)}</p>

            <div class="seal">
              <div class="seal-stamp">
                <div class="seal-inner">
                  <div class="seal-deity">${theme.cornerDeco}</div>
                  <div class="seal-text">VERIFIED<br/>REPORT</div>
                </div>
              </div>
              <div class="seal-note">
                <p>ഈ ജാതകം AI സഹായത്തോടെ പരമ്പരാഗത ജ്യോതിഷ തത്വങ്ങൾ അടിസ്ഥാനപ്പെടുത്തി തയ്യാറാക്കിയത്.</p>
                <p class="small">© ${new Date().getFullYear()} EI SOLUTIONS · Premium Astrology Services. Generated by E I SOLUTIONS JANASEVANA KENDRAM (OPC) PRIVATE LIMITED on ${today}.</p>
              </div>
            </div>
          </section>
        ` : `<p class="empty">പ്രവചനം ലഭ്യമല്ല.</p>`}

        <!-- Footer -->
        <div class="footer">
          <div class="foot-brand"><b>EI SOLUTIONS</b> · Premium Astrology Services</div>
          <div class="foot-meta">${reportNo} · ${today}</div>
        </div>
      </div>
    </div>`;
}

/* ───────── styles ───────── */

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@500;700&family=Playfair+Display:wght@700;900&display=swap');

  .report {
    width: 794px;
    font-family: 'Noto Sans Malayalam', system-ui, sans-serif;
    color: #1a1a2e;
    background: #fff;
    line-height: 1.6;
    box-sizing: border-box;
  }
  .report * { box-sizing: border-box; }

  .report[data-religion="Hindu"]     { --c1:#7c2d12; --c2:#b45309; --acc:#fef3c7; --bg:linear-gradient(135deg,#fff7ed,#fef3c7); }
  .report[data-religion="Muslim"]    { --c1:#065f46; --c2:#047857; --acc:#d1fae5; --bg:linear-gradient(135deg,#ecfdf5,#d1fae5); }
  .report[data-religion="Christian"] { --c1:#1e3a8a; --c2:#1d4ed8; --acc:#dbeafe; --bg:linear-gradient(135deg,#eff6ff,#dbeafe); }

  .ornate-frame {
    position: relative;
    padding: 36px 40px 28px;
    border: 3px double var(--c1);
    background: var(--bg);
  }
  .ornate-frame::before {
    content: ""; position: absolute; inset: 8px;
    border: 1px solid var(--c2); pointer-events: none;
  }
  .corner { position: absolute; color: var(--c1); font-size: 28px; line-height: 1; z-index: 2; }
  .corner.tl { top: 14px; left: 16px; }
  .corner.tr { top: 14px; right: 16px; }
  .corner.bl { bottom: 14px; left: 16px; }
  .corner.br { bottom: 14px; right: 16px; }

  /* Pages */
  .page {
    padding: 4px 0 22px;
    margin-bottom: 14px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .page + .page { border-top: 1px dashed color-mix(in oklab, var(--c2) 35%, white); padding-top: 18px; }

  /* Cover */
  .page-cover { text-align: center; padding-bottom: 8px; }
  .blessing { font-size: 13px; color: var(--c1); font-weight: 600; letter-spacing: 0.04em; margin-bottom: 8px; }
  .deity {
    width: 150px; height: 150px; object-fit: contain;
    margin: 4px auto 8px; display: block;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
  }
  .cover-title {
    font-family: 'Playfair Display', 'Noto Sans Malayalam', serif;
    font-size: 38px; font-weight: 900; color: var(--c1);
    margin: 6px 0 4px; letter-spacing: 0.02em;
  }
  .cover-sub { font-size: 14px; color: var(--c2); font-weight: 600; margin-bottom: 8px; }
  .hero-divider { display: flex; align-items: center; gap: 10px; justify-content: center; margin: 8px 0 14px; }
  .hero-divider::before, .hero-divider::after { content: ""; flex: 0 0 70px; height: 1px; background: var(--c2); opacity: 0.6; }
  .hero-divider span { color: var(--c1); font-size: 14px; }

  .cover-table {
    width: 100%; max-width: 520px; margin: 8px auto 16px;
    border-collapse: collapse;
    background: #fff;
    border: 2px solid var(--c2);
    border-radius: 6px; overflow: hidden;
  }
  .cover-table td { padding: 8px 14px; border: 1px solid var(--acc); font-size: 12.5px; text-align: left; }
  .cover-table .lbl {
    background: color-mix(in oklab, var(--acc) 70%, white);
    font-size: 11px; color: var(--c1); font-weight: 700; width: 40%;
  }
  .cover-table .val { font-weight: 600; color: #1c1917; }

  .cover-foot { margin-top: 12px; font-size: 11px; color: var(--c1); font-weight: 700; letter-spacing: 0.06em; }

  .summary-card {
    margin: 18px auto 0; max-width: 620px;
    background: linear-gradient(135deg, color-mix(in oklab, var(--acc) 80%, white), white);
    border: 2px solid var(--c2); border-radius: 8px;
    padding: 14px 18px 16px; text-align: left;
  }
  .summary-ribbon {
    display: inline-block; background: var(--c1); color: #fff;
    padding: 4px 12px; border-radius: 4px;
    font-size: 10.5px; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 8px;
  }
  .summary-body { font-size: 13.5px; color: #1c1917; font-weight: 500; font-style: italic; line-height: 1.7; }

  /* Page head */
  .page-head {
    display: flex; align-items: center; gap: 12px;
    background: linear-gradient(90deg, color-mix(in oklab, var(--acc) 70%, white), white);
    border-left: 4px solid var(--c1);
    padding: 10px 14px; margin: 0 0 14px;
    border-radius: 0 6px 6px 0;
  }
  .ph-icon { font-size: 20px; color: var(--c1); }
  .page-head h2 {
    flex: 1; margin: 0;
    font-size: 18px; font-weight: 800;
    color: var(--c1);
  }
  .ph-en {
    font-family: 'Playfair Display', serif;
    font-size: 11px; color: var(--c2);
    letter-spacing: 0.1em; text-transform: uppercase;
  }

  /* ── ജാതക ചക്രം 4×4 ── */
  .chakram {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 110px);
    gap: 0;
    width: 100%; max-width: 560px; margin: 0 auto;
    border: 3px double var(--c1);
    background: #fff;
  }
  .ch-cell {
    border: 1px solid var(--c2);
    padding: 6px 8px;
    position: relative;
    background: #fff;
    display: flex; flex-direction: column;
  }
  .ch-h {
    font-family: 'Playfair Display', serif;
    font-size: 9.5px; color: var(--c2);
    letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700;
  }
  .ch-r {
    font-size: 13px; font-weight: 800; color: var(--c1);
    margin-top: 2px;
  }
  .ch-p {
    margin-top: auto;
    font-family: 'Playfair Display', serif;
    font-size: 13px; font-weight: 800;
    color: #b91c1c;
    letter-spacing: 0.04em;
    background: color-mix(in oklab, var(--acc) 60%, white);
    padding: 2px 4px; border-radius: 3px;
    align-self: flex-start;
  }
  .ch-lagnam { background: color-mix(in oklab, var(--acc) 50%, white); }
  .ch-lag-tag {
    position: absolute; top: 4px; right: 4px;
    font-size: 8.5px; font-weight: 800;
    color: #fff; background: var(--c1);
    padding: 1px 5px; border-radius: 3px;
    letter-spacing: 0.08em;
  }
  .ch-center {
    background: color-mix(in oklab, var(--acc) 30%, white);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center; padding: 14px;
    border: 2px solid var(--c1);
  }
  .ch-center-title {
    font-family: 'Playfair Display', 'Noto Sans Malayalam', serif;
    font-size: 22px; font-weight: 900; color: var(--c1);
    line-height: 1.1;
  }
  .ch-center-sub {
    font-size: 12.5px; color: var(--c2); font-weight: 700; margin-top: 8px;
  }
  .ch-center-deco { color: var(--c1); font-size: 18px; margin-top: 10px; opacity: 0.7; }

  .chart-meta {
    display: flex; justify-content: center; gap: 30px;
    margin: 12px 0 6px; font-size: 12px; color: #44403c;
  }
  .chart-meta b { color: var(--c1); }

  /* ── Graha table ── */
  .g-table {
    width: 100%; border-collapse: collapse;
    background: #fff;
    border: 2px solid var(--c2);
    border-radius: 6px; overflow: hidden;
    font-size: 12px;
  }
  .g-table th {
    background: var(--c1); color: #fff;
    padding: 8px 10px; text-align: left;
    font-size: 11.5px; letter-spacing: 0.04em;
  }
  .g-table td {
    padding: 7px 10px;
    border-top: 1px solid var(--acc);
  }
  .g-table tr:nth-child(even) td { background: color-mix(in oklab, var(--acc) 30%, white); }
  .g-table .num { text-align: center; font-family: 'Playfair Display', serif; font-weight: 800; color: var(--c1); }

  /* ── Predictions grid ── */
  .pred-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
  .pred-card {
    display: grid;
    grid-template-columns: 36px 1fr;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid color-mix(in oklab, var(--c2) 35%, white);
    border-left: 4px solid var(--c1);
    border-radius: 6px; background: #fff;
  }
  .pred-num {
    width: 28px; height: 28px;
    background: var(--c1); color: #fff;
    border-radius: 50%; display: flex;
    align-items: center; justify-content: center;
    font-family: 'Playfair Display', serif;
    font-weight: 800; font-size: 13px;
    grid-row: 1 / span 2;
    align-self: start;
  }
  .pred-titles { display: flex; align-items: baseline; gap: 10px; }
  .pred-title-ml { font-size: 14px; font-weight: 700; color: var(--c1); }
  .pred-title-en {
    font-family: 'Playfair Display', serif; font-size: 10.5px;
    color: var(--c2); letter-spacing: 0.08em; text-transform: uppercase;
  }
  .pred-body {
    font-size: 12.5px; color: #292524; line-height: 1.7;
    grid-column: 2;
  }

  /* ── Stage table ── */
  .stage-table {
    width: 100%; border-collapse: collapse;
    background: #fff; border: 2px solid var(--c2);
    border-radius: 6px; overflow: hidden;
    font-size: 12px; margin-bottom: 16px;
  }
  .stage-table th {
    background: var(--c1); color: #fff;
    padding: 8px 10px; text-align: left;
    font-size: 11.5px;
  }
  .stage-table td {
    padding: 8px 12px; border-top: 1px solid var(--acc);
    line-height: 1.6;
  }
  .stage-table tr:nth-child(even) td { background: color-mix(in oklab, var(--acc) 30%, white); }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .col-card {
    border: 1px solid color-mix(in oklab, var(--c2) 35%, white);
    border-top: 3px solid var(--c1);
    border-radius: 6px; padding: 10px 12px;
    background: #fff;
  }
  .cc-title { font-size: 12.5px; font-weight: 700; color: var(--c1); margin-bottom: 4px; }
  .cc-body { font-size: 12px; color: #292524; line-height: 1.7; }

  /* ── Generic block ── */
  .block {
    border: 1px solid color-mix(in oklab, var(--c2) 35%, white);
    border-left: 4px solid var(--c1);
    border-radius: 6px;
    padding: 10px 14px 12px;
    background: #fff;
    margin-bottom: 10px;
  }
  .block-title {
    font-size: 13px; font-weight: 700;
    color: var(--c1);
    margin-bottom: 4px;
    border-bottom: 1px dashed color-mix(in oklab, var(--c2) 30%, white);
    padding-bottom: 4px;
  }
  .block-body { font-size: 12.5px; color: #292524; line-height: 1.7; white-space: pre-wrap; }

  .bullets { margin: 4px 0 0; padding-left: 18px; }
  .bullets li { font-size: 12px; color: #292524; line-height: 1.7; margin-bottom: 2px; }
  .muted { color: #9ca3af; font-style: italic; font-size: 12px; }

  /* ── Dasha table ── */
  .dasha-table {
    width: 100%; border-collapse: collapse;
    background: #fff; border: 2px solid var(--c2);
    border-radius: 6px; overflow: hidden; font-size: 12px;
  }
  .dasha-table th {
    background: var(--c1); color: #fff;
    padding: 8px 10px; text-align: left; font-size: 11.5px;
  }
  .dasha-table td { padding: 7px 10px; border-top: 1px solid var(--acc); }
  .dasha-table tr:nth-child(even) td { background: color-mix(in oklab, var(--acc) 30%, white); }
  .dasha-table .num { text-align: center; font-family: 'Playfair Display', serif; font-weight: 700; color: var(--c1); }

  /* ── Remedies grid ── */
  .rem-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .rem-card {
    border: 1px solid color-mix(in oklab, var(--c2) 35%, white);
    border-top: 3px solid var(--c1);
    border-radius: 6px; padding: 10px 12px;
    background: #fff;
  }
  .rem-title {
    font-size: 12.5px; font-weight: 700;
    color: var(--c1);
    margin-bottom: 4px;
    border-bottom: 1px dashed color-mix(in oklab, var(--c2) 30%, white);
    padding-bottom: 4px;
  }
  .rem-card.good { border-top-color: #16a34a; }
  .rem-card.good .rem-title { color: #15803d; }
  .rem-card.caution { border-top-color: #dc2626; }
  .rem-card.caution .rem-title { color: #b91c1c; }

  /* ── Closing ── */
  .page-closing { text-align: center; padding-top: 30px; }
  .closing-deity { font-size: 60px; color: var(--c1); margin-bottom: 14px; opacity: 0.9; }
  .closing-ml {
    font-family: 'Playfair Display', 'Noto Sans Malayalam', serif;
    font-size: 30px; color: var(--c1); margin: 4px 0 8px;
    letter-spacing: 0.08em; font-weight: 800;
  }
  .closing-en { font-size: 13px; color: #57534e; max-width: 480px; margin: 0 auto 22px; }

  .seal {
    margin: 22px auto 0; max-width: 600px;
    padding: 16px;
    background: #fff;
    border: 2px dashed var(--c2);
    border-radius: 8px;
    display: flex; align-items: center; gap: 18px;
    text-align: left;
  }
  .seal-stamp {
    flex: 0 0 88px; width: 88px; height: 88px;
    border: 3px double var(--c1); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in oklab, var(--acc) 60%, white);
    transform: rotate(-8deg);
  }
  .seal-inner { text-align: center; color: var(--c1); }
  .seal-deity { font-size: 22px; line-height: 1; margin-bottom: 2px; }
  .seal-text {
    font-family: 'Playfair Display', serif;
    font-size: 9px; font-weight: 800;
    letter-spacing: 0.12em; line-height: 1.2;
  }
  .seal-note { flex: 1; font-size: 11.5px; color: #44403c; }
  .seal-note p { margin: 0 0 4px; }
  .seal-note .small { font-size: 10px; color: #78716c; font-style: italic; }

  /* Footer */
  .footer {
    margin-top: 18px; padding-top: 10px;
    border-top: 2px solid var(--c2);
    display: flex; justify-content: space-between; align-items: center;
    font-size: 10.5px; color: #57534e;
  }
  .foot-brand b { color: var(--c1); font-size: 12px; letter-spacing: 0.04em; }
  .foot-meta { font-family: 'Playfair Display', serif; }

  .empty { text-align: center; color: #9ca3af; padding: 30px; font-style: italic; }
`;

/* ───────── PDF generation ───────── */

function waitForImages(root: HTMLElement, timeoutMs = 6000): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  if (imgs.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let pending = imgs.length;
    const done = () => { if (--pending <= 0) resolve(); };
    const timer = setTimeout(resolve, timeoutMs);
    imgs.forEach((img) => {
      if (img.complete && img.naturalHeight !== 0) { done(); return; }
      img.addEventListener("load",  () => { clearTimeout(timer); done(); }, { once: true });
      img.addEventListener("error", () => { clearTimeout(timer); done(); }, { once: true });
    });
  });
}

function trimCanvasHorizontalWhitespace(source: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = source.getContext("2d");
  if (!ctx) return source;

  const { width, height } = source;
  const { data } = ctx.getImageData(0, 0, width, height);

  const columnHasContent = (x: number) => {
    for (let y = 0; y < height; y += 3) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha <= 8) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r < 248 || g < 248 || b < 248) return true;
    }
    return false;
  };

  let left = 0;
  while (left < width - 1 && !columnHasContent(left)) left += 1;

  let right = width - 1;
  while (right > left && !columnHasContent(right)) right -= 1;

  if (left === 0 && right === width - 1) return source;

  const trimmed = document.createElement("canvas");
  trimmed.width = right - left + 1;
  trimmed.height = height;
  const trimmedCtx = trimmed.getContext("2d");
  if (!trimmedCtx) return source;

  trimmedCtx.drawImage(source, left, 0, trimmed.width, height, 0, 0, trimmed.width, height);
  return trimmed;
}

export async function downloadHoroscopePdf(req: HoroscopeRequest): Promise<void> {
  if (typeof window === "undefined") throw new Error("PDF download only works in the browser.");

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  if (!document.getElementById("horoscope-pdf-style")) {
    const style = document.createElement("style");
    style.id = "horoscope-pdf-style";
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  const wrap = document.createElement("div");
  wrap.setAttribute("aria-hidden", "true");
  // Render fully off-screen so it never visually covers the live UI
  // (sidebar / header) while html2canvas takes its snapshot.
  wrap.style.cssText = [
    "position:absolute",
    "left:-100000px",
    "top:0",
    "width:794px",
    "background:#fff",
    "pointer-events:none",
    "opacity:1",
    "overflow:hidden",
    "contain:layout paint",
  ].join(";") + ";";
  wrap.innerHTML = buildReportHtml(req);
  document.body.appendChild(wrap);

  try {
    if ((document as any).fonts?.ready) {
      try { await (document as any).fonts.ready; } catch { /* ignore */ }
    }
    await waitForImages(wrap);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 120));

    const node = wrap.firstElementChild as HTMLElement;
    const canvas = await html2canvas(node, {
      scale: Math.min(Math.max(window.devicePixelRatio || 1, 1.35), 1.6),
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      width: Math.ceil(node.scrollWidth),
      height: Math.ceil(node.scrollHeight),
      windowWidth: 794,
      imageTimeout: 8000,
    });

    const trimmedCanvas = trimCanvasHorizontalWhitespace(canvas);

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const imgWidth = A4_W;
    const pageHeight = A4_H;
    const imgHeight = (trimmedCanvas.height * imgWidth) / trimmedCanvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(trimmedCanvas, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(trimmedCanvas, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    const safeName = (req.customerName || "Horoscope").replace(/[^a-zA-Z0-9_\-]+/g, "_");
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `സമ്പൂർണ_ജാതകം_${safeName}_${(req.id || "").slice(0, 6)}.pdf`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  } finally {
    wrap.remove();
  }
}

export function openPrintableReport(req: HoroscopeRequest): void {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank");
  if (!w) {
    alert("Pop-up blocked. Please allow pop-ups and try again.");
    return;
  }
  w.document.write(`<!doctype html><html lang="ml"><head>
    <meta charset="utf-8"/>
    <title>സമ്പൂർണ ജാതകം — ${escapeHtml(req.customerName)}</title>
    <style>${STYLES}
      body{margin:0;background:#f5f5f5;padding:20px}
      @media print { body{background:#fff;padding:0} .actions{display:none!important} }
      .actions{position:sticky;top:0;background:#fff;padding:10px;border-bottom:1px solid #ddd;text-align:center;z-index:10;margin:-20px -20px 20px}
      .actions button{background:#7c2d12;color:#fff;border:0;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600}
    </style>
  </head><body>
    <div class="actions">
      <button onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>
    ${buildReportHtml(req)}
  </body></html>`);
  w.document.close();
}

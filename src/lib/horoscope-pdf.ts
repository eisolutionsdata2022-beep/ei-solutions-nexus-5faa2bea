/**
 * Premium horoscope PDF — designed to feel like a real, hand-crafted product.
 *
 * Strategy:
 *  1. Build an ornate HTML report with religion-specific deity header,
 *     decorated boxes, gradient sections, and a proper Vedic-style layout.
 *  2. Render off-screen so Malayalam fonts + deity images load reliably.
 *  3. Capture with html2canvas, slice into A4 pages, build PDF, force download.
 */
import type { HoroscopeRequest, Religion } from "./horoscope-types";
import { PRODUCT_LABELS, RELIGION_LABELS } from "./horoscope-types";

import deityHindu from "@/assets/horoscope-deity-hindu.png";
import deityMuslim from "@/assets/horoscope-deity-muslim.png";
import deityChristian from "@/assets/horoscope-deity-christian.png";

const A4_W = 210; // mm
const A4_H = 297; // mm

const DEITY_IMAGES: Record<Religion, string> = {
  Hindu: deityHindu,
  Muslim: deityMuslim,
  Christian: deityChristian,
};

const RELIGION_THEMES: Record<Religion, {
  primary: string; secondary: string; accent: string;
  bgGrad: string; cornerDeco: string; openingBlessing: string;
}> = {
  Hindu: {
    primary: "#7c2d12",
    secondary: "#b45309",
    accent: "#fef3c7",
    bgGrad: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
    cornerDeco: "❋",
    openingBlessing: "ഓം ഗണേശായ നമഃ",
  },
  Muslim: {
    primary: "#065f46",
    secondary: "#047857",
    accent: "#d1fae5",
    bgGrad: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
    cornerDeco: "✦",
    openingBlessing: "ബിസ്മില്ലാഹി റഹ്മാനി റഹീം",
  },
  Christian: {
    primary: "#1e3a8a",
    secondary: "#1d4ed8",
    accent: "#dbeafe",
    bgGrad: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    cornerDeco: "✚",
    openingBlessing: "പിതാവിന്റെയും പുത്രന്റെയും പരിശുദ്ധാത്മാവിന്റെയും നാമത്തിൽ",
  },
};

function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

/** A single decorative section with ornate header. */
function section(num: number, titleMl: string, titleEn: string, body: string | undefined, theme: typeof RELIGION_THEMES["Hindu"]) {
  if (!body) return "";
  return `
    <div class="sec">
      <div class="sec-head">
        <div class="sec-num">${num}</div>
        <div class="sec-titles">
          <div class="sec-title-ml">${escapeHtml(titleMl)}</div>
          <div class="sec-title-en">${escapeHtml(titleEn)}</div>
        </div>
        <div class="sec-deco">${theme.cornerDeco}</div>
      </div>
      <div class="sec-body">${escapeHtml(body)}</div>
    </div>`;
}

export function buildReportHtml(req: HoroscopeRequest): string {
  const r = req.report;
  const product = PRODUCT_LABELS[req.product];
  const religion = req.religion || "Hindu";
  const theme = RELIGION_THEMES[religion];
  const deityImg = DEITY_IMAGES[religion];
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const reportNo = `EI-${(req.id || "").slice(0, 8).toUpperCase() || Date.now().toString(36).toUpperCase()}`;

  return `
    <div class="report" data-religion="${religion}">
      <!-- Outer ornate frame -->
      <div class="ornate-frame">
        <span class="corner tl">${theme.cornerDeco}</span>
        <span class="corner tr">${theme.cornerDeco}</span>
        <span class="corner bl">${theme.cornerDeco}</span>
        <span class="corner br">${theme.cornerDeco}</span>

        <!-- Hero -->
        <div class="hero">
          <div class="blessing">${escapeHtml(theme.openingBlessing)}</div>
          <img class="deity" src="${deityImg}" alt="${religion}" crossorigin="anonymous"/>
          <h1 class="hero-title">ജാതക പ്രവചനം</h1>
          <div class="hero-sub">${escapeHtml(product?.ml || "Horoscope Report")}</div>
          <div class="hero-divider"><span>✦</span></div>
          <div class="hero-meta">
            <div><b>Report No:</b> ${reportNo}</div>
            <div><b>Date:</b> ${today}</div>
          </div>
        </div>

        <!-- Customer particulars box -->
        <div class="particulars">
          <div class="part-head">
            <span>വ്യക്തി വിശദാംശങ്ങൾ</span>
            <span class="part-en">PERSONAL DETAILS</span>
          </div>
          <table class="part-table">
            <tr><td class="lbl">പേര് (Name)</td><td class="val">${escapeHtml(req.customerName)}</td>
                <td class="lbl">ലിംഗം (Gender)</td><td class="val">${escapeHtml(req.gender)}</td></tr>
            <tr><td class="lbl">ജനന തീയതി (DOB)</td><td class="val">${escapeHtml(fmtDate(req.dateOfBirth))}</td>
                <td class="lbl">ജനന സമയം (Time)</td><td class="val">${escapeHtml(fmtTime(req.timeOfBirth))}</td></tr>
            <tr><td class="lbl">ജനന സ്ഥലം (Place)</td><td class="val" colspan="3">${escapeHtml(req.placeOfBirth)}</td></tr>
            <tr><td class="lbl">നക്ഷത്രം (Nakshatra)</td><td class="val">${escapeHtml(req.nakshatram || "—")}</td>
                <td class="lbl">മതം (Religion)</td><td class="val">${escapeHtml(RELIGION_LABELS[religion].ml)}</td></tr>
          </table>
        </div>

        ${r ? `
          <!-- Summary callout -->
          <div class="summary-card">
            <div class="summary-ribbon">സംക്ഷിപ്ത പ്രവചനം · SUMMARY</div>
            <div class="summary-body">"${escapeHtml(r.summary)}"</div>
          </div>

          <!-- Sections -->
          <div class="sections">
            ${section(1, "വ്യക്തിത്വ വിശകലനം",       "Personality Analysis",  r.personality,    theme)}
            ${section(2, "കരിയർ / ജോലി",            "Career & Profession",   r.career,         theme)}
            ${section(3, "സാമ്പത്തിക സ്ഥിതി",        "Financial Outlook",     r.finance,        theme)}
            ${section(4, "വിവാഹം / പങ്കാളി ജീവിതം", "Marriage & Relationships", r.marriage,    theme)}
            ${section(5, "ആരോഗ്യം",                "Health Indications",    r.health,         theme)}
            ${section(6, "വിദ്യാഭ്യാസം",           "Education",             r.education,      theme)}
            ${section(7, "ഭാഗ്യ കാലങ്ങൾ",          "Lucky Periods",         r.luckyPeriods,   theme)}
            ${section(8, "പരിഹാരങ്ങൾ",             "Remedies & Practices",  r.remedies,       theme)}
            ${section(9, "ഭാവി പ്രവചനം",           "Future Outlook",        r.futureOutlook,  theme)}
            ${section(10, "ദശാ കാലങ്ങൾ",            "Dasha Periods (Premium)", r.dasha,        theme)}
            ${section(11, "അടുത്ത 5 വർഷ പ്രവചനം",   "5-Year Forecast (Premium)", r.yearlyForecast, theme)}
          </div>

          <!-- Closing seal -->
          <div class="seal">
            <div class="seal-stamp">
              <div class="seal-inner">
                <div class="seal-deity">${theme.cornerDeco}</div>
                <div class="seal-text">VERIFIED<br/>REPORT</div>
              </div>
            </div>
            <div class="seal-note">
              <p>ഈ പ്രവചനം AI സഹായത്തോടെ പരമ്പരാഗത ജ്യോതിഷ തത്വങ്ങളെ അടിസ്ഥാനമാക്കി തയ്യാറാക്കിയത്.</p>
              <p class="small">This report is AI-assisted, prepared based on traditional astrological principles. For decisions involving major life events, please consult a qualified astrologer.</p>
            </div>
          </div>
        ` : `<p class="empty">പ്രവചനം ലഭ്യമല്ല.</p>`}

        <!-- Footer -->
        <div class="footer">
          <div class="foot-brand">
            <b>EI SOLUTIONS</b> · Janasevana Horoscope Service
          </div>
          <div class="foot-meta">
            ${reportNo} · ${today}
          </div>
        </div>
      </div>
    </div>
  `;
}

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

  /* Religion-specific theme via attribute selectors */
  .report[data-religion="Hindu"]     { --c1:#7c2d12; --c2:#b45309; --acc:#fef3c7; --bg:linear-gradient(135deg,#fff7ed,#fef3c7); }
  .report[data-religion="Muslim"]    { --c1:#065f46; --c2:#047857; --acc:#d1fae5; --bg:linear-gradient(135deg,#ecfdf5,#d1fae5); }
  .report[data-religion="Christian"] { --c1:#1e3a8a; --c2:#1d4ed8; --acc:#dbeafe; --bg:linear-gradient(135deg,#eff6ff,#dbeafe); }

  /* ── Outer frame ── */
  .ornate-frame {
    position: relative;
    margin: 0;
    padding: 36px 40px 28px;
    border: 3px double var(--c1);
    background: var(--bg);
    background-clip: padding-box;
  }
  .ornate-frame::before {
    content: "";
    position: absolute;
    inset: 8px;
    border: 1px solid var(--c2);
    pointer-events: none;
  }
  .corner {
    position: absolute;
    color: var(--c1);
    font-size: 28px;
    line-height: 1;
    z-index: 2;
  }
  .corner.tl { top: 14px; left: 16px; }
  .corner.tr { top: 14px; right: 16px; }
  .corner.bl { bottom: 14px; left: 16px; }
  .corner.br { bottom: 14px; right: 16px; }

  /* ── Hero ── */
  .hero {
    text-align: center;
    padding: 8px 0 18px;
    border-bottom: 2px solid var(--c2);
    margin-bottom: 18px;
  }
  .blessing {
    font-size: 13px;
    color: var(--c1);
    font-weight: 600;
    letter-spacing: 0.04em;
    margin-bottom: 8px;
  }
  .deity {
    width: 130px;
    height: 130px;
    object-fit: contain;
    margin: 4px auto 8px;
    display: block;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
  }
  .hero-title {
    font-family: 'Playfair Display', 'Noto Sans Malayalam', serif;
    font-size: 34px;
    font-weight: 900;
    color: var(--c1);
    margin: 6px 0 4px;
    letter-spacing: 0.02em;
  }
  .hero-sub {
    font-size: 14px;
    color: var(--c2);
    font-weight: 600;
    margin-bottom: 8px;
  }
  .hero-divider {
    display: flex; align-items: center; gap: 10px;
    justify-content: center; margin: 8px 0;
  }
  .hero-divider::before, .hero-divider::after {
    content: "";
    flex: 0 0 70px;
    height: 1px;
    background: var(--c2);
    opacity: 0.6;
  }
  .hero-divider span { color: var(--c1); font-size: 14px; }
  .hero-meta {
    display: flex; justify-content: center; gap: 24px;
    font-size: 11px; color: #57534e; margin-top: 6px;
  }
  .hero-meta b { color: var(--c1); }

  /* ── Particulars ── */
  .particulars {
    background: #fff;
    border: 2px solid var(--c2);
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 18px;
  }
  .part-head {
    background: var(--c1);
    color: #fff;
    padding: 8px 14px;
    display: flex; justify-content: space-between; align-items: center;
    font-weight: 700;
    font-size: 13px;
  }
  .part-head .part-en {
    font-family: 'Playfair Display', serif;
    font-size: 11px; opacity: 0.9; letter-spacing: 0.1em;
  }
  .part-table {
    width: 100%;
    border-collapse: collapse;
  }
  .part-table td {
    padding: 8px 12px;
    border: 1px solid var(--acc);
    font-size: 12px;
    vertical-align: middle;
  }
  .part-table .lbl {
    background: color-mix(in oklab, var(--acc) 70%, white);
    font-size: 10.5px;
    color: var(--c1);
    font-weight: 600;
    width: 22%;
    white-space: nowrap;
  }
  .part-table .val { color: #1c1917; font-weight: 600; }

  /* ── Summary card ── */
  .summary-card {
    background: linear-gradient(135deg, color-mix(in oklab, var(--acc) 80%, white), white);
    border: 2px solid var(--c2);
    border-radius: 8px;
    padding: 14px 18px 16px;
    margin-bottom: 22px;
    position: relative;
  }
  .summary-ribbon {
    display: inline-block;
    background: var(--c1);
    color: #fff;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 10.5px;
    letter-spacing: 0.08em;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .summary-body {
    font-size: 14px;
    color: #1c1917;
    font-weight: 500;
    font-style: italic;
    line-height: 1.7;
  }

  /* ── Sections grid ── */
  .sections { display: flex; flex-direction: column; gap: 14px; }
  .sec {
    background: #fff;
    border: 1px solid color-mix(in oklab, var(--c2) 40%, white);
    border-left: 4px solid var(--c1);
    border-radius: 6px;
    padding: 0;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .sec-head {
    display: flex; align-items: center; gap: 12px;
    background: linear-gradient(90deg, color-mix(in oklab, var(--acc) 70%, white), white);
    padding: 10px 14px;
    border-bottom: 1px dashed color-mix(in oklab, var(--c2) 40%, white);
  }
  .sec-num {
    flex: 0 0 28px;
    width: 28px; height: 28px;
    background: var(--c1);
    color: #fff;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800;
    font-size: 13px;
    font-family: 'Playfair Display', serif;
  }
  .sec-titles { flex: 1; }
  .sec-title-ml {
    font-size: 14px;
    font-weight: 700;
    color: var(--c1);
    line-height: 1.2;
  }
  .sec-title-en {
    font-family: 'Playfair Display', serif;
    font-size: 10px;
    color: var(--c2);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .sec-deco {
    color: var(--c2);
    font-size: 18px;
    opacity: 0.6;
  }
  .sec-body {
    padding: 12px 16px 14px;
    font-size: 12.5px;
    color: #292524;
    white-space: pre-wrap;
    line-height: 1.7;
  }

  /* ── Closing seal ── */
  .seal {
    margin-top: 22px;
    padding: 16px;
    background: #fff;
    border: 2px dashed var(--c2);
    border-radius: 8px;
    display: flex; align-items: center; gap: 18px;
  }
  .seal-stamp {
    flex: 0 0 88px;
    width: 88px; height: 88px;
    border: 3px double var(--c1);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in oklab, var(--acc) 60%, white);
    transform: rotate(-8deg);
  }
  .seal-inner { text-align: center; color: var(--c1); }
  .seal-deity { font-size: 22px; line-height: 1; margin-bottom: 2px; }
  .seal-text {
    font-family: 'Playfair Display', serif;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.12em;
    line-height: 1.2;
  }
  .seal-note { flex: 1; font-size: 11.5px; color: #44403c; }
  .seal-note p { margin: 0 0 4px; }
  .seal-note .small { font-size: 10px; color: #78716c; font-style: italic; }

  /* ── Footer ── */
  .footer {
    margin-top: 16px;
    padding-top: 10px;
    border-top: 2px solid var(--c2);
    display: flex; justify-content: space-between; align-items: center;
    font-size: 10.5px; color: #57534e;
  }
  .foot-brand b { color: var(--c1); font-size: 12px; letter-spacing: 0.04em; }
  .foot-meta { font-family: 'Playfair Display', serif; }

  .empty { text-align: center; color: #9ca3af; padding: 30px; font-style: italic; }
`;

/** Wait for all images inside a node to finish loading. */
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

/** Render the report HTML into a hidden DOM node, capture, then PDF. */
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
  wrap.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1;";
  wrap.innerHTML = buildReportHtml(req);
  document.body.appendChild(wrap);

  try {
    if ((document as any).fonts?.ready) {
      try { await (document as any).fonts.ready; } catch { /* ignore */ }
    }
    await waitForImages(wrap);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 400));

    const node = wrap.firstElementChild as HTMLElement;
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 794,
      imageTimeout: 8000,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const imgWidth = A4_W;
    const pageHeight = A4_H;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.94);

    pdf.addImage(dataUrl, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    const safeName = (req.customerName || "Horoscope").replace(/[^a-zA-Z0-9_\-]+/g, "_");
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Horoscope_${safeName}_${(req.id || "").slice(0, 6)}.pdf`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1000);
  } finally {
    wrap.remove();
  }
}

/** Open the report in a new tab as a printable HTML page (fallback). */
export function openPrintableReport(req: HoroscopeRequest): void {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank");
  if (!w) {
    alert("Pop-up blocked. Please allow pop-ups and try again.");
    return;
  }
  w.document.write(`<!doctype html><html lang="ml"><head>
    <meta charset="utf-8"/>
    <title>Horoscope — ${escapeHtml(req.customerName)}</title>
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

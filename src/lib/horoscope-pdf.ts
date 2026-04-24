/**
 * Bulletproof horoscope PDF download.
 *
 * Strategy:
 *  1. Build a real DOM node with the report HTML and append it to <body>
 *     (off-screen but actually rendered — Malayalam fonts load reliably).
 *  2. Wait for one paint + fonts to be ready.
 *  3. Capture with html2canvas at 2x scale.
 *  4. Slice the canvas into A4-sized pages and add to a jsPDF document.
 *  5. Force download via Blob + anchor click (works on every browser & mobile).
 */
import type { HoroscopeRequest } from "./horoscope-types";
import { PRODUCT_LABELS } from "./horoscope-types";

const A4_W = 210; // mm
const A4_H = 297; // mm

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
  } catch {
    return d;
  }
}

/** Build the printable HTML body. */
export function buildReportHtml(req: HoroscopeRequest): string {
  const r = req.report;
  const product = PRODUCT_LABELS[req.product];
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  const section = (title: string, body: string | undefined) => {
    if (!body) return "";
    return `
      <div class="sec">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
      </div>`;
  };

  return `
    <div class="report">
      <div class="hdr">
        <div class="om">🕉️</div>
        <div>
          <h1>ജാതക പ്രവചനം</h1>
          <div class="subtitle">${escapeHtml(product?.ml || "Horoscope")} &nbsp;·&nbsp; ${today}</div>
        </div>
      </div>

      <div class="info">
        <div><span>പേര്</span><b>${escapeHtml(req.customerName)}</b></div>
        <div><span>ലിംഗം</span><b>${escapeHtml(req.gender)}</b></div>
        <div><span>ജനന തീയതി</span><b>${escapeHtml(fmtDate(req.dateOfBirth))}</b></div>
        <div><span>ജനന സമയം</span><b>${escapeHtml(req.timeOfBirth || "—")}</b></div>
        <div><span>ജനന സ്ഥലം</span><b>${escapeHtml(req.placeOfBirth || "—")}</b></div>
        <div><span>നക്ഷത്രം</span><b>${escapeHtml(req.nakshatram || "—")}</b></div>
      </div>

      ${r ? `
        <div class="summary">
          <div class="lbl">സംക്ഷിപ്ത പ്രവചനം</div>
          <div class="val">${escapeHtml(r.summary)}</div>
        </div>

        ${section("വ്യക്തിത്വ വിശകലനം", r.personality)}
        ${section("കരിയർ / ജോലി", r.career)}
        ${section("സാമ്പത്തിക സ്ഥിതി", r.finance)}
        ${section("വിവാഹം / പങ്കാളി ജീവിതം", r.marriage)}
        ${section("ആരോഗ്യം", r.health)}
        ${section("വിദ്യാഭ്യാസം", r.education)}
        ${section("ഭാഗ്യ കാലങ്ങൾ", r.luckyPeriods)}
        ${section("പരിഹാരങ്ങൾ", r.remedies)}
        ${section("ഭാവി പ്രവചനം", r.futureOutlook)}
        ${section("വിംശോത്തരി ദശ", r.dasha)}
        ${section("അടുത്ത 5 വർഷം", r.yearlyForecast)}
      ` : `<p class="empty">പ്രവചനം ലഭ്യമല്ല.</p>`}

      <div class="footer">
        <div>EI Solutions Janasevana Platform</div>
        <div>Generated: ${today}</div>
      </div>
    </div>
  `;
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;500;700&display=swap');
  .report {
    width: 794px; padding: 48px 56px;
    font-family: 'Noto Sans Malayalam', system-ui, sans-serif;
    color: #1a1a2e; background: #fff; line-height: 1.55;
  }
  .hdr { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 3px double #b45309; }
  .om { font-size: 44px; line-height: 1; }
  .hdr h1 { font-size: 28px; font-weight: 700; color: #7c2d12; margin: 0; }
  .hdr .subtitle { font-size: 13px; color: #57534e; margin-top: 4px; }
  .info {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px;
    background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px;
    padding: 14px 18px; margin: 18px 0 24px;
    font-size: 13px;
  }
  .info > div { display: flex; gap: 8px; }
  .info span { color: #78716c; min-width: 92px; }
  .info b { color: #1c1917; font-weight: 600; }
  .summary {
    background: linear-gradient(135deg, #fef3c7, #fed7aa);
    border-left: 4px solid #b45309;
    padding: 14px 18px; border-radius: 8px; margin-bottom: 18px;
  }
  .summary .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #92400e; font-weight: 700; }
  .summary .val { font-size: 14px; color: #1c1917; margin-top: 4px; font-weight: 500; }
  .sec { margin-bottom: 14px; page-break-inside: avoid; }
  .sec h3 {
    font-size: 14px; font-weight: 700; color: #7c2d12;
    margin: 0 0 4px; padding-bottom: 3px; border-bottom: 1px solid #fde68a;
  }
  .sec p { font-size: 12.5px; margin: 0; color: #292524; white-space: pre-wrap; }
  .empty { text-align: center; color: #9ca3af; padding: 30px; font-style: italic; }
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e7eb;
    display: flex; justify-content: space-between; font-size: 10px; color: #6b7280; }
`;

/** Render the report HTML into a hidden (but real) DOM node, capture, then PDF. */
export async function downloadHoroscopePdf(req: HoroscopeRequest): Promise<void> {
  if (typeof window === "undefined") throw new Error("PDF download only works in the browser.");

  // Lazy load heavy libs
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // 1. Style sheet (idempotent)
  if (!document.getElementById("horoscope-pdf-style")) {
    const style = document.createElement("style");
    style.id = "horoscope-pdf-style";
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  // 2. Off-screen container — real DOM (not iframe) so fonts apply.
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1;";
  wrap.innerHTML = buildReportHtml(req);
  document.body.appendChild(wrap);

  try {
    // 3. Wait for fonts + a paint
    if ((document as any).fonts?.ready) {
      try { await (document as any).fonts.ready; } catch { /* ignore */ }
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    // small delay for Google Fonts to actually swap
    await new Promise((r) => setTimeout(r, 350));

    // 4. Capture
    const node = wrap.firstElementChild as HTMLElement;
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 794,
    });

    // 5. Slice into A4 pages
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const imgWidth = A4_W;
    const pageHeight = A4_H;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    pdf.addImage(dataUrl, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight; // negative offset to scroll
      pdf.addPage();
      pdf.addImage(dataUrl, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    // 6. Force download via Blob + anchor — works on every browser, mobile too.
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

/**
 * Open the report in a new tab as a printable HTML page.
 * This is the ultimate fallback — the user can just press Ctrl/Cmd-P
 * and "Save as PDF" if download somehow fails.
 */
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
      body{margin:0;background:#f5f5f5}
      @media print { body{background:#fff} .actions{display:none!important} }
      .actions{position:sticky;top:0;background:#fff;padding:10px;border-bottom:1px solid #ddd;text-align:center;z-index:10}
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
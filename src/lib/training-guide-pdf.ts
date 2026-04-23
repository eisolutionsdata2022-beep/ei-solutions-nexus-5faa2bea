/**
 * Generate a downloadable PDF of the EI SOLUTIONS Training Guide.
 *
 * Uses jsPDF (text-based, fast, small file). Renders all chapters,
 * steps, tips, notes, and reference cards in a clean bilingual layout
 * matching the on-screen flipbook's branding.
 */
import { jsPDF } from "jspdf";
import { GUIDE_CHAPTERS } from "./training-guide-content";

const NAVY: [number, number, number] = [11, 35, 84];
const SAFFRON: [number, number, number] = [255, 153, 51];
const GREEN: [number, number, number] = [19, 136, 8];
const GOLD: [number, number, number] = [217, 164, 65];
const MUTED: [number, number, number] = [107, 114, 128];
const BORDER: [number, number, number] = [229, 231, 235];
const INK: [number, number, number] = [30, 30, 30];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

export function generateTrainingGuidePdf(): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });

  // ── Front cover
  drawFrontCover(pdf);

  // ── TOC
  pdf.addPage();
  drawTOC(pdf);

  // ── Each chapter
  for (const ch of GUIDE_CHAPTERS) {
    pdf.addPage();
    drawChapterCover(pdf, ch);

    for (let i = 0; i < ch.steps.length; i++) {
      pdf.addPage();
      drawStep(pdf, ch, ch.steps[i], i);
    }

    if (ch.documents || ch.charges || ch.approvalTime || (ch.errors && ch.errors.length)) {
      pdf.addPage();
      drawChapterExtras(pdf, ch);
    }
  }

  // ── Back cover
  pdf.addPage();
  drawBackCover(pdf);

  // ── Page numbers (skip front + back cover)
  const total = pdf.getNumberOfPages();
  for (let p = 2; p < total; p++) {
    pdf.setPage(p);
    drawPageFooter(pdf, p, total);
  }

  return pdf;
}

export function downloadTrainingGuidePdf() {
  const pdf = generateTrainingGuidePdf();
  pdf.save("EI-Solutions-Training-Guide.pdf");
}

// ─────────── Drawers ───────────

function drawTricolorTop(pdf: jsPDF, y = 0) {
  pdf.setFillColor(...SAFFRON);
  pdf.rect(0, y, PAGE_W, 1.5, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, y + 1.5, PAGE_W, 1.5, "F");
  pdf.setFillColor(...GREEN);
  pdf.rect(0, y + 3, PAGE_W, 1.5, "F");
}

function drawFrontCover(pdf: jsPDF) {
  // Navy gradient background (simulated with bands)
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Decorative circles
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.06 }));
  pdf.circle(PAGE_W - 30, 60, 50, "F");
  pdf.circle(40, PAGE_H - 80, 70, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));

  // Tricolor bands
  drawTricolorTop(pdf, 0);
  drawTricolorTop(pdf, PAGE_H - 4.5);

  // Logo box
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.15 }));
  pdf.roundedRect(PAGE_W / 2 - 15, 90, 30, 30, 4, 4, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(48);
  pdf.text("EI", PAGE_W / 2, 110, { align: "center" });

  // Eyebrow
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(255, 255, 255);
  pdf.text("E M P O W E R I N G   B H A R A T", PAGE_W / 2, 138, { align: "center" });

  // Brand title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(36);
  pdf.text("EI SOLUTIONS", PAGE_W / 2, 158, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(13);
  pdf.text("Digital India Franchise Portal", PAGE_W / 2, 168, { align: "center" });

  // Gold ribbon
  pdf.setFillColor(...GOLD);
  pdf.roundedRect(PAGE_W / 2 - 55, 188, 110, 22, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("V O L U M E   I", PAGE_W / 2, 197, { align: "center" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Training Session Guide", PAGE_W / 2, 205, { align: "center" });

  // Subtitle
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Complete Bilingual Manual for Retailers", PAGE_W / 2, 224, { align: "center" });
  pdf.setFontSize(9);
  pdf.text("Malayalam + English | All Services | Step-by-Step", PAGE_W / 2, 230, { align: "center" });

  // Bottom info
  pdf.setFontSize(8);
  pdf.text("www.eisoluions.xyz", PAGE_W / 2, PAGE_H - 14, { align: "center" });
  pdf.text("support@eisoluions.xyz", PAGE_W / 2, PAGE_H - 9, { align: "center" });
}

function drawTOC(pdf: jsPDF) {
  drawHeaderBand(pdf, "Table of Contents", "ഉള്ളടക്കം");

  let y = 50;
  pdf.setFontSize(9);
  for (const ch of GUIDE_CHAPTERS) {
    if (y > PAGE_H - 25) {
      pdf.addPage();
      y = 30;
    }
    // Chip
    const themeRgb = themeColorRgb(ch.themeColor);
    pdf.setFillColor(...themeRgb);
    pdf.roundedRect(MARGIN, y - 4, 16, 6, 1.5, 1.5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text(`CH ${ch.number}`, MARGIN + 8, y, { align: "center" });

    // Title
    pdf.setTextColor(...INK);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(ch.titleEn, MARGIN + 22, y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...MUTED);
    pdf.setFontSize(8);
    pdf.text(`· ${ch.titleMl}`, MARGIN + 22 + pdf.getTextWidth(ch.titleEn) + 2, y);

    // Dotted leader + page count chip
    const stepCount = ch.steps.length;
    pdf.setTextColor(...MUTED);
    pdf.setFontSize(7);
    pdf.text(`${stepCount} step${stepCount > 1 ? "s" : ""}`, PAGE_W - MARGIN, y, { align: "right" });

    y += 8;
  }
}

function drawChapterCover(pdf: jsPDF, ch: typeof GUIDE_CHAPTERS[number]) {
  const themeRgb = themeColorRgb(ch.themeColor);

  // Full background gradient (simulated)
  pdf.setFillColor(...themeRgb);
  pdf.rect(0, 0, PAGE_W, PAGE_H, "F");
  pdf.setFillColor(...NAVY);
  pdf.setGState(pdf.GState({ opacity: 0.4 }));
  pdf.rect(0, PAGE_H / 2, PAGE_W, PAGE_H / 2, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));

  // Decorative circles
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.08 }));
  pdf.circle(PAGE_W - 20, 40, 40, "F");
  pdf.circle(20, PAGE_H - 50, 50, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));

  // Chapter eyebrow
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`C H A P T E R   ${ch.number}`, MARGIN, 100);

  // Big chapter number badge
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.18 }));
  pdf.roundedRect(MARGIN, 110, 28, 28, 4, 4, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.text(String(ch.number).padStart(2, "0"), MARGIN + 14, 130, { align: "center" });

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.text(ch.titleEn, MARGIN, 158, { maxWidth: CONTENT_W });
  pdf.setFontSize(20);
  pdf.text(ch.titleMl, MARGIN, 172, { maxWidth: CONTENT_W });

  // Divider line
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, 182, MARGIN + 30, 182);

  // Subtitle
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(ch.subtitleEn, MARGIN, 192, { maxWidth: CONTENT_W });
  pdf.setFontSize(10);
  pdf.text(ch.subtitleMl, MARGIN, 200, { maxWidth: CONTENT_W });

  if (ch.comingSoon) {
    pdf.setFillColor(255, 220, 100);
    pdf.roundedRect(MARGIN, 210, 36, 8, 2, 2, "F");
    pdf.setTextColor(80, 50, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("COMING SOON", MARGIN + 18, 215.5, { align: "center" });
  }
}

function drawStep(
  pdf: jsPDF,
  ch: typeof GUIDE_CHAPTERS[number],
  step: typeof GUIDE_CHAPTERS[number]["steps"][number],
  stepIndex: number,
) {
  const themeRgb = themeColorRgb(ch.themeColor);

  // Header band
  pdf.setFillColor(...themeRgb);
  pdf.rect(0, 0, PAGE_W, 22, "F");
  drawTricolorTop(pdf, 22);

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`CHAPTER ${ch.number} · STEP ${stepIndex + 1} OF ${ch.steps.length}`, MARGIN, 10);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(`${ch.titleEn} · ${ch.titleMl}`, MARGIN, 17, { maxWidth: CONTENT_W });

  let y = 38;

  // Step number circle
  pdf.setFillColor(...themeRgb);
  pdf.circle(MARGIN + 9, y + 9, 9, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(String(stepIndex + 1), MARGIN + 9, y + 12, { align: "center" });

  // Step heading text bilingual side-by-side
  const colW = (CONTENT_W - 24) / 2;
  const leftX = MARGIN + 22;
  const rightX = leftX + colW + 4;

  // Malayalam panel
  pdf.setFillColor(254, 247, 233);
  pdf.roundedRect(leftX, y, colW, 30, 2, 2, "F");
  pdf.setDrawColor(...SAFFRON);
  pdf.setLineWidth(1.5);
  pdf.line(leftX, y, leftX, y + 30);
  pdf.setTextColor(...SAFFRON);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text("മലയാളം · MALAYALAM", leftX + 3, y + 5);
  pdf.setTextColor(...INK);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const mlLines = pdf.splitTextToSize(step.ml, colW - 6);
  pdf.text(mlLines, leftX + 3, y + 11);

  // English panel
  pdf.setFillColor(238, 244, 255);
  pdf.roundedRect(rightX, y, colW, 30, 2, 2, "F");
  pdf.setDrawColor(...NAVY);
  pdf.setLineWidth(1.5);
  pdf.line(rightX, y, rightX, y + 30);
  pdf.setTextColor(...NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text("ENGLISH", rightX + 3, y + 5);
  pdf.setTextColor(...INK);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const enLines = pdf.splitTextToSize(step.en, colW - 6);
  pdf.text(enLines, rightX + 3, y + 11);

  y += 40;

  // Tip
  if (step.tip) {
    pdf.setFillColor(220, 252, 231);
    const tipLines = pdf.splitTextToSize(step.tip, CONTENT_W - 16);
    const boxH = Math.max(14, tipLines.length * 4.5 + 8);
    pdf.roundedRect(MARGIN, y, CONTENT_W, boxH, 2, 2, "F");
    pdf.setDrawColor(34, 139, 84);
    pdf.setLineWidth(1.2);
    pdf.line(MARGIN, y, MARGIN, y + boxH);
    pdf.setTextColor(34, 139, 84);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("💡  TIP · നുറുങ്ങ്", MARGIN + 4, y + 5);
    pdf.setTextColor(...INK);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(tipLines, MARGIN + 4, y + 11);
    y += boxH + 4;
  }

  // Note
  if (step.note) {
    pdf.setFillColor(254, 243, 199);
    const noteLines = pdf.splitTextToSize(step.note, CONTENT_W - 16);
    const boxH = Math.max(14, noteLines.length * 4.5 + 8);
    pdf.roundedRect(MARGIN, y, CONTENT_W, boxH, 2, 2, "F");
    pdf.setDrawColor(180, 100, 0);
    pdf.setLineWidth(1.2);
    pdf.line(MARGIN, y, MARGIN, y + boxH);
    pdf.setTextColor(180, 100, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("⚠  IMPORTANT · പ്രധാനം", MARGIN + 4, y + 5);
    pdf.setTextColor(...INK);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(noteLines, MARGIN + 4, y + 11);
  }
}

function drawChapterExtras(pdf: jsPDF, ch: typeof GUIDE_CHAPTERS[number]) {
  const themeRgb = themeColorRgb(ch.themeColor);

  // Header
  pdf.setFillColor(...themeRgb);
  pdf.rect(0, 0, PAGE_W, 22, "F");
  drawTricolorTop(pdf, 22);

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`CHAPTER ${ch.number} · QUICK REFERENCE`, MARGIN, 10);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("Reference · റഫറൻസ്", MARGIN, 17);

  let y = 38;

  if (ch.documents && ch.documents.length) {
    y = drawRefCard(pdf, y, "REQUIRED DOCUMENTS · ആവശ്യ രേഖകൾ", ch.documents.map((d) => `• ${d}`), [...NAVY]);
  }
  if (ch.charges) {
    y = drawRefCard(pdf, y, "CHARGES · ഫീസ്", [ch.charges], [...GREEN]);
  }
  if (ch.approvalTime) {
    y = drawRefCard(pdf, y, "APPROVAL TIME · സമയം", [ch.approvalTime], [...SAFFRON]);
  }
  if (ch.errors && ch.errors.length) {
    const lines: string[] = [];
    for (const e of ch.errors) {
      lines.push(`✗ ${e.problem}`);
      lines.push(`   ✓ ${e.solution}`);
      lines.push("");
    }
    drawRefCard(pdf, y, "COMMON ERRORS · പ്രശ്നങ്ങൾ", lines, [200, 50, 50]);
  }
}

function drawRefCard(
  pdf: jsPDF,
  y: number,
  title: string,
  lines: string[],
  borderRgb: [number, number, number],
): number {
  const allText: string[] = [];
  for (const l of lines) {
    allText.push(...pdf.splitTextToSize(l, CONTENT_W - 16));
  }
  const boxH = 12 + allText.length * 5;

  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(MARGIN, y, CONTENT_W, boxH, 2, 2, "F");
  pdf.setDrawColor(...borderRgb);
  pdf.setLineWidth(1.5);
  pdf.line(MARGIN, y, MARGIN, y + boxH);

  pdf.setTextColor(...borderRgb);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text(title, MARGIN + 4, y + 6);

  pdf.setTextColor(...INK);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  let curY = y + 12;
  for (const t of allText) {
    pdf.text(t, MARGIN + 4, curY);
    curY += 5;
  }

  return y + boxH + 6;
}

function drawBackCover(pdf: jsPDF) {
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, PAGE_W, PAGE_H, "F");
  drawTricolorTop(pdf, 0);
  drawTricolorTop(pdf, PAGE_H - 4.5);

  pdf.setFillColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.06 }));
  pdf.circle(PAGE_W / 2, 100, 60, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(36);
  pdf.text("നന്ദി", PAGE_W / 2, 110, { align: "center" });
  pdf.setFontSize(28);
  pdf.text("Thank You", PAGE_W / 2, 125, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const msg =
    "ഈ guide complete ചെയ്തതിൽ വളരെ നന്ദി. എല്ലാ services-ഉം നിങ്ങൾക്ക് confidence-ഓടെ deliver ചെയ്യാം.";
  const wrapped = pdf.splitTextToSize(msg, 140);
  pdf.text(wrapped, PAGE_W / 2, 150, { align: "center" });

  pdf.setFontSize(10);
  pdf.text(
    "Thank you for completing this guide. You can now deliver every service confidently.",
    PAGE_W / 2,
    175,
    { align: "center", maxWidth: 150 },
  );

  // Contact band
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.1 }));
  pdf.roundedRect(MARGIN + 20, 210, CONTENT_W - 40, 50, 4, 4, "F");
  pdf.setGState(pdf.GState({ opacity: 1 }));

  pdf.setTextColor(...GOLD);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("E I   S O L U T I O N S", PAGE_W / 2, 222, { align: "center" });
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("Web: www.eisoluions.xyz", PAGE_W / 2, 234, { align: "center" });
  pdf.text("Support: support@eisoluions.xyz", PAGE_W / 2, 242, { align: "center" });
  pdf.text("Empowering Bharat — Digital India Franchise", PAGE_W / 2, 252, { align: "center" });

  pdf.setFontSize(7);
  pdf.setTextColor(180, 200, 230);
  pdf.text(
    `© ${new Date().getFullYear()} EI SOLUTIONS · All rights reserved`,
    PAGE_W / 2,
    PAGE_H - 12,
    { align: "center" },
  );
}

function drawHeaderBand(pdf: jsPDF, titleEn: string, titleMl: string) {
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, PAGE_W, 28, "F");
  drawTricolorTop(pdf, 28);

  pdf.setTextColor(...GOLD);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("EI SOLUTIONS · TRAINING GUIDE", MARGIN, 11);

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(titleEn, MARGIN, 22);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(titleMl, PAGE_W - MARGIN, 22, { align: "right" });
}

function drawPageFooter(pdf: jsPDF, page: number, total: number) {
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);

  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text("EI SOLUTIONS · Training Guide", MARGIN, PAGE_H - 7);
  pdf.text(`Page ${page} / ${total}`, PAGE_W - MARGIN, PAGE_H - 7, { align: "right" });
}

function themeColorRgb(token: string): [number, number, number] {
  switch (token) {
    case "gov-saffron":
      return [255, 153, 51];
    case "gov-green":
      return [19, 136, 8];
    case "gov-blue":
      return [11, 35, 84];
    case "gov-blue-dark":
      return [8, 25, 60];
    case "gov-gold":
      return [217, 164, 65];
    case "primary":
    default:
      return [37, 99, 235];
  }
}

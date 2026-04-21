/**
 * Generate an EI Solutions branded Kerala Lottery Result PDF.
 * Uses jsPDF (already a project dependency via other PDF utilities) with a
 * Digital India themed header (Saffron / White / Green strip + Navy heading).
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LotteryDraw } from "./updates.functions";

export function generateLotteryPDF(draw: LotteryDraw): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // ── Tricolor strip ──
  doc.setFillColor(255, 153, 51); // saffron
  doc.rect(0, 0, W, 4, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 4, W, 4, "F");
  doc.setFillColor(19, 136, 8); // green
  doc.rect(0, 8, W, 4, "F");

  // ── Navy header ──
  doc.setFillColor(10, 28, 74);
  doc.rect(0, 12, W, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("EI SOLUTIONS", 12, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Kerala Lottery — Official Result", 12, 28);
  doc.setFontSize(8);
  doc.text("Generated via EI Solutions Retailer Portal", 12, 32.5);

  // ── Draw card ──
  doc.setFillColor(245, 247, 252);
  doc.roundedRect(10, 40, W - 20, 28, 3, 3, "F");
  doc.setTextColor(10, 28, 74);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(draw.name, 14, 50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Draw No: ${draw.number || "—"}`, 14, 57);
  doc.text(`Draw Date: ${draw.date || "—"}`, 14, 63);

  // ── Prize table ──
  let y = 76;
  doc.setTextColor(10, 28, 74);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Prize Winners", 12, y);
  y += 3;

  if (draw.prizes.length) {
    autoTable(doc, {
      startY: y,
      head: [["Rank", "Amount (₹)", "Winning Tickets"]],
      body: draw.prizes.map((p) => [
        p.rank,
        p.amount ? Number(p.amount).toLocaleString("en-IN") : "—",
        p.tickets.join(", ") || "—",
      ]),
      headStyles: { fillColor: [10, 28, 74], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: "bold" },
        1: { cellWidth: 32 },
        2: { cellWidth: "auto" },
      },
      theme: "grid",
    });
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "Prize details could not be extracted automatically.",
      12,
      y + 8,
    );
    doc.text(
      `Please verify on the official website: ${draw.officialUrl}`,
      12,
      y + 14,
    );
  }

  // ── Footer ──
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220);
  doc.line(10, pageHeight - 18, W - 10, pageHeight - 18);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Disclaimer: Verify all results on the official Directorate of State Lotteries website before claiming any prize.",
    10,
    pageHeight - 12,
    { maxWidth: W - 20 },
  );
  doc.text(
    `Source: ${draw.officialUrl}  •  Generated: ${new Date().toLocaleString("en-IN")}`,
    10,
    pageHeight - 6,
  );

  return doc;
}

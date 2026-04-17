/**
 * EI SOLUTIONS PAY — Branded receipt PDF for successful CSC transactions.
 * Generated client-side with jsPDF; downloaded directly by the retailer.
 */
import { jsPDF } from "jspdf";
import type { CscTransaction } from "./csc-types";

const NAVY: [number, number, number] = [11, 35, 84]; // Digital India navy
const SAFFRON: [number, number, number] = [255, 153, 51];
const GREEN: [number, number, number] = [19, 136, 8];
const MUTED: [number, number, number] = [107, 114, 128];
const BORDER: [number, number, number] = [229, 231, 235];

export function generateCscReceiptPdf(tx: CscTransaction): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  let y = 0;

  // ── Header band (navy) ───────────────────────────────────────────────
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageW, 32, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("EI SOLUTIONS PAY", 14, 14);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Common Service Center · Digital Bharat Portal", 14, 20);
  pdf.setFontSize(8);
  pdf.text("www.eisoluions.xyz", 14, 26);

  // Right side: receipt label
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("PAYMENT RECEIPT", pageW - 14, 14, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Ref: ${tx.bridgeRef ?? tx.id ?? "—"}`, pageW - 14, 20, { align: "right" });
  pdf.text(new Date(tx.createdAt).toLocaleString(), pageW - 14, 26, { align: "right" });

  // Tricolor strip
  const stripY = 32;
  pdf.setFillColor(...SAFFRON);
  pdf.rect(0, stripY, pageW, 1.2, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, stripY + 1.2, pageW, 1.2, "F");
  pdf.setFillColor(...GREEN);
  pdf.rect(0, stripY + 2.4, pageW, 1.2, "F");

  y = 45;

  // ── Status pill ─────────────────────────────────────────────────────
  pdf.setFillColor(220, 252, 231);
  pdf.roundedRect(14, y, 38, 8, 2, 2, "F");
  pdf.setTextColor(...GREEN);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("✓  TRANSACTION SUCCESS", 16, y + 5.5);

  y += 16;

  // ── Service block ───────────────────────────────────────────────────
  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("SERVICE", 14, y);
  pdf.setTextColor(...NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(tx.serviceName, 14, y + 6);

  y += 14;

  // ── Field table ─────────────────────────────────────────────────────
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.2);
  pdf.line(14, y, pageW - 14, y);
  y += 5;

  const fieldRows: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(tx.fields ?? {})) {
    fieldRows.push([prettyLabel(k), String(v)]);
  }
  fieldRows.push(["Retailer", tx.retailerEmail]);
  if (tx.bridgeRef) fieldRows.push(["Provider Ref", tx.bridgeRef]);

  pdf.setFontSize(9);
  for (const [label, value] of fieldRows) {
    pdf.setTextColor(...MUTED);
    pdf.setFont("helvetica", "normal");
    pdf.text(label, 14, y);
    pdf.setTextColor(30, 30, 30);
    pdf.setFont("helvetica", "bold");
    const wrapped = pdf.splitTextToSize(value, 100);
    pdf.text(wrapped, pageW - 14, y, { align: "right" });
    y += Math.max(6, wrapped.length * 5);
  }

  y += 4;
  pdf.setDrawColor(...BORDER);
  pdf.line(14, y, pageW - 14, y);
  y += 8;

  // ── Amount summary box ──────────────────────────────────────────────
  const boxX = 14;
  const boxW = pageW - 28;
  const boxH = 32;
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(boxX, y, boxW, boxH, 2, 2, "F");

  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Bill Amount", boxX + 4, y + 7);
  pdf.text("Convenience Fee", boxX + 4, y + 14);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(30, 30, 30);
  pdf.text(`₹ ${tx.amount.toFixed(2)}`, boxX + boxW - 4, y + 7, { align: "right" });
  pdf.text(`₹ ${tx.fee.toFixed(2)}`, boxX + boxW - 4, y + 14, { align: "right" });

  pdf.setDrawColor(...BORDER);
  pdf.line(boxX + 4, y + 18, boxX + boxW - 4, y + 18);

  pdf.setTextColor(...NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("TOTAL PAID", boxX + 4, y + 26);
  pdf.setFontSize(14);
  pdf.text(`₹ ${tx.totalDebited.toFixed(2)}`, boxX + boxW - 4, y + 26, { align: "right" });

  y += boxH + 12;

  // ── Footer ──────────────────────────────────────────────────────────
  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(
    "This is a system-generated receipt. No signature required. Please retain for your records.",
    pageW / 2,
    y,
    { align: "center" },
  );
  y += 5;
  pdf.text(
    "For support: support@eisoluions.xyz · EI SOLUTIONS — Empowering Bharat",
    pageW / 2,
    y,
    { align: "center" },
  );

  // Bottom tricolor strip
  const footerY = pdf.internal.pageSize.getHeight() - 4;
  pdf.setFillColor(...SAFFRON);
  pdf.rect(0, footerY - 3.6, pageW, 1.2, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, footerY - 2.4, pageW, 1.2, "F");
  pdf.setFillColor(...GREEN);
  pdf.rect(0, footerY - 1.2, pageW, 1.2, "F");

  return pdf;
}

export function downloadCscReceipt(tx: CscTransaction) {
  const pdf = generateCscReceiptPdf(tx);
  const safeRef = (tx.bridgeRef ?? tx.id ?? Date.now().toString()).replace(/[^a-z0-9-]/gi, "_");
  pdf.save(`EISolutionsPay_${safeRef}.pdf`);
}

function prettyLabel(key: string): string {
  return key
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

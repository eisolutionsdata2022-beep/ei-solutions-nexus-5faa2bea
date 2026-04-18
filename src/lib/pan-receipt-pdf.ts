/**
 * EI SOLUTIONS — Branded receipt PDF for successful PAN PORTAL transactions.
 * Mirrors the CSC receipt look & feel; generated client-side with jsPDF.
 */
import { jsPDF } from "jspdf";
import type { PanTransaction } from "./pan-types";

const NAVY: [number, number, number] = [11, 35, 84];
const SAFFRON: [number, number, number] = [255, 153, 51];
const GREEN: [number, number, number] = [19, 136, 8];
const MUTED: [number, number, number] = [107, 114, 128];
const BORDER: [number, number, number] = [229, 231, 235];

export function generatePanReceiptPdf(tx: PanTransaction): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  let y = 0;

  // ── Header band (navy) ───────────────────────────────────────────────
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageW, 32, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("EI SOLUTIONS", 14, 14);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("PAN PORTAL · NSDL · UTI · PSA · Coupons", 14, 20);
  pdf.setFontSize(8);
  pdf.text("www.eisoluions.xyz", 14, 26);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("PAN TRANSACTION RECEIPT", pageW - 14, 14, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Ref: ${tx.providerRef ?? tx.id ?? "—"}`, pageW - 14, 20, { align: "right" });
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
  const isSuccess = tx.status === "success";
  const pillBg: [number, number, number] = isSuccess ? [220, 252, 231] : [254, 243, 199];
  const pillFg: [number, number, number] = isSuccess ? GREEN : [161, 98, 7];
  const pillLabel = isSuccess
    ? "✓  TRANSACTION SUCCESS"
    : `●  STATUS: ${tx.status.toUpperCase()}`;
  pdf.setFillColor(...pillBg);
  pdf.roundedRect(14, y, 50, 8, 2, 2, "F");
  pdf.setTextColor(...pillFg);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(pillLabel, 16, y + 5.5);

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
  if (tx.providerRef) fieldRows.push(["Provider Ref", tx.providerRef]);
  if (tx.completedAt) fieldRows.push(["Completed", new Date(tx.completedAt).toLocaleString()]);

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
  pdf.text("Service Amount", boxX + 4, y + 7);
  pdf.text("Convenience Fee", boxX + 4, y + 14);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(30, 30, 30);
  pdf.text(`₹ ${(tx.amount ?? 0).toFixed(2)}`, boxX + boxW - 4, y + 7, { align: "right" });
  pdf.text(`₹ ${tx.fee.toFixed(2)}`, boxX + boxW - 4, y + 14, { align: "right" });

  pdf.setDrawColor(...BORDER);
  pdf.line(boxX + 4, y + 18, boxX + boxW - 4, y + 18);

  pdf.setTextColor(...NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("TOTAL DEBITED", boxX + 4, y + 26);
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

export function downloadPanReceipt(tx: PanTransaction) {
  const pdf = generatePanReceiptPdf(tx);
  const safeRef = (tx.providerRef ?? tx.id ?? Date.now().toString()).replace(
    /[^a-z0-9-]/gi,
    "_",
  );
  pdf.save(`EISolutions_PAN_${safeRef}.pdf`);
}

function prettyLabel(key: string): string {
  return key
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

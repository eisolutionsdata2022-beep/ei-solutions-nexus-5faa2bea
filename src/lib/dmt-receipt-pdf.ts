/**
 * DMT branded receipt — generated client-side via jsPDF.
 */
import { jsPDF } from "jspdf";
import type { DmtTransfer } from "./dmt-types";

const NAVY: [number, number, number] = [11, 35, 84];
const SAFFRON: [number, number, number] = [255, 153, 51];
const GREEN: [number, number, number] = [19, 136, 8];
const RED: [number, number, number] = [200, 35, 35];
const MUTED: [number, number, number] = [107, 114, 128];
const BORDER: [number, number, number] = [229, 231, 235];

export function generateDmtReceiptPdf(tx: DmtTransfer): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  let y = 0;

  // Header band
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageW, 32, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("EI SOLUTIONS · DMT", 14, 14);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Domestic Money Transfer Receipt", 14, 20);
  pdf.setFontSize(8);
  pdf.text("www.eisoluions.xyz", 14, 26);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("MONEY TRANSFER", pageW - 14, 14, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Txn ID: ${tx.id ?? "—"}`, pageW - 14, 20, { align: "right" });
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

  // Status pill
  const statusColor = tx.status === "success" ? GREEN : tx.status === "refunded" || tx.status === "failed" ? RED : NAVY;
  const statusBg: [number, number, number] = tx.status === "success" ? [220, 252, 231] : tx.status === "failed" || tx.status === "refunded" ? [254, 226, 226] : [219, 234, 254];
  pdf.setFillColor(...statusBg);
  pdf.roundedRect(14, y, 60, 8, 2, 2, "F");
  pdf.setTextColor(...statusColor);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(`STATUS: ${tx.status.toUpperCase()}`, 16, y + 5.5);

  // UTR pill (right)
  if (tx.utr) {
    pdf.setFillColor(243, 244, 246);
    pdf.roundedRect(pageW - 80, y, 66, 8, 2, 2, "F");
    pdf.setTextColor(...NAVY);
    pdf.setFontSize(9);
    pdf.text(`UTR: ${tx.utr}`, pageW - 77, y + 5.5);
  }
  y += 14;

  // Sections
  const drawSection = (title: string, rows: [string, string][]) => {
    pdf.setTextColor(...NAVY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(title, 14, y);
    y += 2;
    pdf.setDrawColor(...BORDER);
    pdf.line(14, y, pageW - 14, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    rows.forEach(([k, v]) => {
      pdf.setTextColor(...MUTED);
      pdf.text(k, 14, y);
      pdf.setTextColor(20, 20, 20);
      pdf.text(v, pageW - 14, y, { align: "right" });
      y += 6;
    });
    y += 4;
  };

  drawSection("CUSTOMER", [
    ["Name", tx.customerName],
    ["Mobile", tx.customerMobile],
  ]);

  drawSection("BENEFICIARY", [
    ["Name", tx.beneficiaryName],
    ["Account", tx.beneficiaryAccount],
    ["IFSC", tx.beneficiaryIfsc],
    ["Bank", tx.beneficiaryBank],
    ...(tx.beneficiaryMobile ? [["Mobile", tx.beneficiaryMobile] as [string, string]] : []),
  ]);

  drawSection("TRANSFER", [
    ["Mode", tx.mode],
    ["Amount", `Rs ${tx.amount.toFixed(2)}`],
    ["Service Charge", `Rs ${tx.charge.toFixed(2)}`],
    ["GST", `Rs ${tx.gst.toFixed(2)}`],
    ["Total Debited", `Rs ${tx.totalDebit.toFixed(2)}`],
    ...(tx.purpose ? [["Purpose", tx.purpose] as [string, string]] : []),
    ...(tx.refundRef ? [["Refund Ref", tx.refundRef] as [string, string]] : []),
  ]);

  // Footer
  const footerY = 280;
  pdf.setDrawColor(...BORDER);
  pdf.line(14, footerY - 6, pageW - 14, footerY - 6);
  pdf.setFontSize(7);
  pdf.setTextColor(...MUTED);
  pdf.text("This is a computer-generated receipt. For support contact your retailer.", 14, footerY);
  pdf.text("EI SOLUTIONS · Authorised CSP", pageW - 14, footerY, { align: "right" });

  return pdf;
}

export function downloadDmtReceipt(tx: DmtTransfer) {
  const pdf = generateDmtReceiptPdf(tx);
  pdf.save(`DMT-${tx.id ?? Date.now()}.pdf`);
}

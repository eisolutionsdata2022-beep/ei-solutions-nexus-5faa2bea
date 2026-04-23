/**
 * Bharat Connect — Branded receipt PDF for successful BBPS bill payments.
 * Generated client-side with jsPDF; downloaded directly by the retailer.
 */
import { jsPDF } from "jspdf";

export interface BbpsReceiptData {
  /** Internal Firestore txn id. */
  transactionId: string;
  /** Provider receipt number. */
  receipt: string | number;
  retailerEmail: string;
  categoryName: string;
  billerName: string;
  customerName?: string;
  billNumber?: string;
  billDate?: string;
  dueDate?: string;
  mobileNo?: string;
  /** Customer-entered consumer no. etc. */
  params: Record<string, string>;
  amount: number;
  fee: number;
  totalDebited: number;
  paidAt: string; // ISO
}

const NAVY: [number, number, number] = [11, 35, 84];
const SAFFRON: [number, number, number] = [255, 153, 51];
const GREEN: [number, number, number] = [19, 136, 8];
const ACCENT: [number, number, number] = [17, 94, 196]; // Bharat Connect blue
const MUTED: [number, number, number] = [107, 114, 128];
const BORDER: [number, number, number] = [229, 231, 235];

export function generateBbpsReceiptPdf(d: BbpsReceiptData): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  let y = 0;

  // Header (navy)
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageW, 32, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("EI SOLUTIONS", 14, 14);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Bill Payment Receipt · Powered by Bharat Connect", 14, 20);
  pdf.setFontSize(8);
  pdf.text("www.eisoluions.xyz", 14, 26);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("PAYMENT RECEIPT", pageW - 14, 14, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Receipt: ${String(d.receipt)}`, pageW - 14, 20, { align: "right" });
  pdf.text(new Date(d.paidAt).toLocaleString(), pageW - 14, 26, { align: "right" });

  // Tricolor strip
  pdf.setFillColor(...SAFFRON);
  pdf.rect(0, 32, pageW, 1.2, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 33.2, pageW, 1.2, "F");
  pdf.setFillColor(...GREEN);
  pdf.rect(0, 34.4, pageW, 1.2, "F");

  y = 46;

  // Status pill
  pdf.setFillColor(220, 252, 231);
  pdf.roundedRect(14, y, 44, 8, 2, 2, "F");
  pdf.setTextColor(...GREEN);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("✓  PAYMENT SUCCESSFUL", 16, y + 5.5);

  // Bharat Connect badge on the right
  pdf.setFillColor(...ACCENT);
  pdf.roundedRect(pageW - 58, y, 44, 8, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("BHARAT CONNECT · B ASSURED", pageW - 56, y + 5.5);

  y += 18;

  // Biller block
  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("BILLER", 14, y);
  pdf.setTextColor(...NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(d.billerName, 14, y + 6);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(d.categoryName, 14, y + 11);

  y += 18;

  // Divider
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.2);
  pdf.line(14, y, pageW - 14, y);
  y += 6;

  // Detail rows
  const rows: Array<[string, string]> = [];
  if (d.customerName) rows.push(["Customer Name", d.customerName]);
  if (d.billNumber) rows.push(["Bill Number", d.billNumber]);
  if (d.billDate) rows.push(["Bill Date", d.billDate]);
  if (d.dueDate) rows.push(["Due Date", d.dueDate]);
  if (d.mobileNo) rows.push(["Mobile", d.mobileNo]);
  Object.entries(d.params).forEach(([k, v]) => {
    if (v) rows.push([k, String(v)]);
  });
  rows.push(["Retailer", d.retailerEmail]);
  rows.push(["Transaction ID", d.transactionId]);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  rows.forEach(([k, v]) => {
    pdf.setTextColor(...MUTED);
    pdf.text(k, 14, y);
    pdf.setTextColor(...NAVY);
    const lines = pdf.splitTextToSize(v, pageW - 80);
    pdf.text(lines, pageW - 14, y, { align: "right" });
    y += 6 * Math.max(1, lines.length);
  });

  y += 4;
  pdf.line(14, y, pageW - 14, y);
  y += 8;

  // Amount summary
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...MUTED);
  pdf.text("Bill Amount", 14, y);
  pdf.setTextColor(...NAVY);
  pdf.text(`Rs. ${d.amount.toFixed(2)}`, pageW - 14, y, { align: "right" });
  y += 6;
  pdf.setTextColor(...MUTED);
  pdf.text("Service Charge", 14, y);
  pdf.setTextColor(...NAVY);
  pdf.text(`Rs. ${d.fee.toFixed(2)}`, pageW - 14, y, { align: "right" });
  y += 8;

  // Total band
  pdf.setFillColor(...NAVY);
  pdf.rect(14, y - 6, pageW - 28, 14, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("TOTAL DEBITED", 18, y + 3);
  pdf.text(`Rs. ${d.totalDebited.toFixed(2)}`, pageW - 18, y + 3, { align: "right" });
  y += 18;

  // Footer
  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.text(
    "This is a computer-generated receipt and does not require a signature.",
    pageW / 2,
    280,
    { align: "center" },
  );
  pdf.setFont("helvetica", "normal");
  pdf.text(
    "EI SOLUTIONS · Authorised Bharat Connect Channel Partner · Support: support@eisoluions.xyz",
    pageW / 2,
    285,
    { align: "center" },
  );

  return pdf;
}

export function downloadBbpsReceipt(d: BbpsReceiptData): void {
  const pdf = generateBbpsReceiptPdf(d);
  const safeBiller = d.billerName.replace(/[^a-z0-9]+/gi, "_").slice(0, 30);
  pdf.save(`EI-Solutions-Receipt-${safeBiller}-${String(d.receipt)}.pdf`);
}

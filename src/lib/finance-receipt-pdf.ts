/**
 * Branded receipt PDFs for the Finance / Gold Loan module.
 * Three layouts: pledge receipt (new loan), payment receipt, closure certificate.
 * All take per-retailer FinanceSettings for company branding.
 */
import { jsPDF } from "jspdf";
import type { FinanceLoan, LoanPayment, FinanceSettings, FinanceCustomer } from "./finance-types";
import { formatINR } from "./finance-calculations";

const NAVY: [number, number, number] = [11, 35, 84];
const SAFFRON: [number, number, number] = [255, 153, 51];
const GREEN: [number, number, number] = [19, 136, 8];
const MUTED: [number, number, number] = [107, 114, 128];
const BORDER: [number, number, number] = [229, 231, 235];
const TEXT: [number, number, number] = [31, 41, 55];

function drawHeader(pdf: jsPDF, settings: FinanceSettings, title: string, refLabel: string) {
  const pageW = pdf.internal.pageSize.getWidth();

  // Navy band
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageW, 32, "F");

  // Logo (if any)
  if (settings.logoUrl) {
    try {
      pdf.addImage(settings.logoUrl, "PNG", 10, 6, 20, 20);
    } catch {
      // ignore CORS / format issues
    }
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(settings.companyName || "Gold Loan", settings.logoUrl ? 33 : 14, 13);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`${settings.branchName} · ${settings.phone}`, settings.logoUrl ? 33 : 14, 19);
  if (settings.address) {
    const addr = pdf.splitTextToSize(settings.address, 110);
    pdf.text(addr.slice(0, 1), settings.logoUrl ? 33 : 14, 24);
  }

  // Right title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(title, pageW - 14, 13, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(refLabel, pageW - 14, 19, { align: "right" });
  pdf.text(new Date().toLocaleString("en-IN"), pageW - 14, 24, { align: "right" });

  // Tricolor strip
  const sy = 32;
  pdf.setFillColor(...SAFFRON);
  pdf.rect(0, sy, pageW, 1.2, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, sy + 1.2, pageW, 1.2, "F");
  pdf.setFillColor(...GREEN);
  pdf.rect(0, sy + 2.4, pageW, 1.2, "F");
}

function drawFooter(pdf: jsPDF, settings: FinanceSettings) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Signature
  if (settings.signatureUrl) {
    try {
      pdf.addImage(settings.signatureUrl, "PNG", pageW - 60, pageH - 40, 40, 18);
    } catch {
      // ignore
    }
  }
  pdf.setDrawColor(...BORDER);
  pdf.line(pageW - 60, pageH - 22, pageW - 14, pageH - 22);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text("Authorized Signatory", pageW - 37, pageH - 18, { align: "center" });

  pdf.setFontSize(7);
  pdf.text(settings.receiptFooter || "", 14, pageH - 10);
  pdf.text(`${settings.companyName} · ${settings.whatsapp || settings.phone}`, 14, pageH - 6);
}

function row(pdf: jsPDF, y: number, label: string, value: string, x = 14) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(label, x, y);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...TEXT);
  pdf.text(value, x, y + 5);
  return y + 12;
}

// ── PLEDGE RECEIPT (new loan) ─────────────────────────────────────────────
export function generatePledgeReceiptPdf(
  loan: FinanceLoan,
  customer: FinanceCustomer,
  settings: FinanceSettings,
): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(pdf, settings, "PLEDGE RECEIPT", `Loan No: ${loan.loanNo}`);

  let y = 45;

  // Customer block
  pdf.setFillColor(248, 250, 252);
  pdf.rect(10, y, pdf.internal.pageSize.getWidth() - 20, 26, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...NAVY);
  pdf.text("CUSTOMER", 14, y + 6);
  pdf.setFontSize(13);
  pdf.text(customer.fullName, 14, y + 13);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...TEXT);
  pdf.text(`${customer.customerCode} · ${customer.mobile}`, 14, y + 19);
  pdf.text(customer.address.slice(0, 80), 14, y + 24);

  y += 34;

  // Gold items table
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...NAVY);
  pdf.text("GOLD ITEMS PLEDGED", 14, y);
  y += 5;

  pdf.setDrawColor(...BORDER);
  pdf.line(14, y, pdf.internal.pageSize.getWidth() - 14, y);
  y += 5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text("ITEM", 14, y);
  pdf.text("CT", 90, y);
  pdf.text("QTY", 105, y);
  pdf.text("GROSS(g)", 125, y);
  pdf.text("NET(g)", 155, y);
  y += 4;
  pdf.line(14, y, pdf.internal.pageSize.getWidth() - 14, y);
  y += 5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...TEXT);
  loan.goldItems.forEach((g) => {
    pdf.text(g.itemName, 14, y);
    pdf.text(`${g.purity}k`, 90, y);
    pdf.text(String(g.count), 105, y);
    pdf.text(g.grossWeight.toFixed(2), 125, y);
    pdf.text(g.netWeight.toFixed(2), 155, y);
    y += 6;
  });
  pdf.line(14, y, pdf.internal.pageSize.getWidth() - 14, y);
  y += 8;

  // Loan summary box
  const pageW = pdf.internal.pageSize.getWidth();
  const colW = (pageW - 28) / 2;
  let yL = y;
  yL = row(pdf, yL, "Gold Valuation", formatINR(loan.goldValuation));
  yL = row(pdf, yL, "LTV", `${loan.ltvPercent}%`);
  yL = row(pdf, yL, "Interest Rate", `${loan.interestRate}% p.a.`);
  yL = row(pdf, yL, "Tenure", `${loan.tenureMonths} months`);

  let yR = y;
  yR = row(pdf, yR, "Loan Amount", formatINR(loan.loanAmount), 14 + colW);
  yR = row(pdf, yR, "Monthly EMI", formatINR(loan.monthlyEmi), 14 + colW);
  yR = row(pdf, yR, "Total Payable", formatINR(loan.totalPayable), 14 + colW);
  yR = row(pdf, yR, "Due Date", new Date(loan.dueDate).toLocaleDateString("en-IN"), 14 + colW);

  drawFooter(pdf, settings);
  return pdf;
}

export function downloadPledgeReceipt(
  loan: FinanceLoan,
  customer: FinanceCustomer,
  settings: FinanceSettings,
) {
  const pdf = generatePledgeReceiptPdf(loan, customer, settings);
  pdf.save(`Pledge_${loan.loanNo}_${customer.fullName.replace(/\s+/g, "_")}.pdf`);
}

// ── PAYMENT RECEIPT (EMI / part / settlement) ────────────────────────────
export function generatePaymentReceiptPdf(
  payment: LoanPayment,
  loan: FinanceLoan,
  settings: FinanceSettings,
): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(pdf, settings, "PAYMENT RECEIPT", `Receipt: ${payment.receiptNo}`);

  let y = 45;

  // Status pill
  pdf.setFillColor(220, 252, 231);
  pdf.roundedRect(14, y, 50, 8, 2, 2, "F");
  pdf.setTextColor(...GREEN);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(`✓  ${payment.type.toUpperCase()} RECEIVED`, 16, y + 5.5);
  y += 16;

  pdf.setTextColor(...NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(`Loan ${loan.loanNo} · ${payment.customerName}`, 14, y);
  y += 8;

  y = row(pdf, y, "Amount Paid", formatINR(payment.amount));
  y = row(pdf, y, "Principal Component", formatINR(payment.principalComponent));
  y = row(pdf, y, "Interest Component", formatINR(payment.interestComponent));
  if (payment.penaltyComponent > 0) {
    y = row(pdf, y, "Penalty", formatINR(payment.penaltyComponent));
  }
  y = row(pdf, y, "Payment Mode", payment.paymentMode);
  y = row(pdf, y, "Outstanding Now", formatINR(loan.outstandingPrincipal));
  y = row(pdf, y, "Date & Time", new Date(payment.collectedAt).toLocaleString("en-IN"));

  drawFooter(pdf, settings);
  return pdf;
}

export function downloadPaymentReceipt(
  payment: LoanPayment,
  loan: FinanceLoan,
  settings: FinanceSettings,
) {
  const pdf = generatePaymentReceiptPdf(payment, loan, settings);
  pdf.save(`Receipt_${payment.receiptNo}.pdf`);
}

// ── CLOSURE CERTIFICATE ──────────────────────────────────────────────────
export function generateClosurePdf(
  loan: FinanceLoan,
  customer: FinanceCustomer,
  settings: FinanceSettings,
): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(pdf, settings, "GOLD RELEASE CERTIFICATE", `Loan No: ${loan.loanNo}`);

  let y = 50;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...NAVY);
  pdf.text("This is to certify that", 14, y);
  y += 10;

  pdf.setFontSize(16);
  pdf.text(customer.fullName.toUpperCase(), 14, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(...TEXT);
  const text =
    `has fully repaid the gold loan ${loan.loanNo} originally disbursed on ` +
    `${new Date(loan.loanDate).toLocaleDateString("en-IN")} for an amount of ` +
    `${formatINR(loan.loanAmount)}. All pledged gold ornaments listed below have been ` +
    `returned to the customer in original condition.`;
  const wrapped = pdf.splitTextToSize(text, pdf.internal.pageSize.getWidth() - 28);
  pdf.text(wrapped, 14, y);
  y += wrapped.length * 5 + 8;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...NAVY);
  pdf.text("RELEASED ITEMS", 14, y);
  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...TEXT);
  loan.goldItems.forEach((g) => {
    pdf.text(`• ${g.itemName} — ${g.count} pc(s), ${g.grossWeight.toFixed(2)}g (${g.purity}k)`, 18, y);
    y += 6;
  });

  y += 4;
  y = row(pdf, y, "Total Repaid", formatINR(loan.totalPaid));
  y = row(pdf, y, "Closed On", new Date(loan.releasedAt || new Date()).toLocaleString("en-IN"));

  // Customer signature
  if (loan.releasedSignatureUrl) {
    try {
      pdf.addImage(loan.releasedSignatureUrl, "PNG", 14, y, 50, 22);
    } catch {
      // ignore
    }
  }
  pdf.setDrawColor(...BORDER);
  pdf.line(14, y + 24, 64, y + 24);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text("Customer Signature", 39, y + 28, { align: "center" });

  drawFooter(pdf, settings);
  return pdf;
}

export function downloadClosureCertificate(
  loan: FinanceLoan,
  customer: FinanceCustomer,
  settings: FinanceSettings,
) {
  const pdf = generateClosurePdf(loan, customer, settings);
  pdf.save(`Closure_${loan.loanNo}.pdf`);
}

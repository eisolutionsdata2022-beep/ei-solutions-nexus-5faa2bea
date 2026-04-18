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

// ── RENEWAL HISTORY STATEMENT ─────────────────────────────────────────────
/**
 * Render a customer's full loan & renewal history as a branded PDF statement.
 * Each renewal chain (or standalone loan) gets its own page.
 *
 * `chains` is an ordered list of chains, each chain ordered oldest → newest
 * (e.g. [[LN-0001, LN-0007, LN-0014], [LN-0023]]).
 */
export function generateRenewalHistoryPdf(
  customer: FinanceCustomer,
  chains: FinanceLoan[][],
  settings: FinanceSettings,
): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  if (chains.length === 0) {
    drawHeader(pdf, settings, "LOAN & RENEWAL HISTORY", customer.customerCode);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(...MUTED);
    pdf.text("No loan history available for this customer.", 14, 60);
    drawFooter(pdf, settings);
    return pdf;
  }

  chains.forEach((chain, idx) => {
    if (idx > 0) pdf.addPage();
    drawHeader(pdf, settings, "LOAN & RENEWAL HISTORY", customer.customerCode);

    let y = 42;

    // Customer summary band
    pdf.setFillColor(248, 250, 252);
    pdf.rect(10, y, pageW - 20, 22, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...NAVY);
    pdf.text("CUSTOMER", 14, y + 6);
    pdf.setFontSize(13);
    pdf.text(customer.fullName, 14, y + 13);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT);
    pdf.text(
      `${customer.customerCode} · ${customer.mobile}${customer.aadhaarNo ? " · Aadhaar: " + customer.aadhaarNo : ""}`,
      14,
      y + 19,
    );
    y += 30;

    // Chain title
    const isChain = chain.length > 1;
    const first = chain[0];
    const last = chain[chain.length - 1];
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...NAVY);
    pdf.text(
      isChain
        ? `Renewal Chain ${idx + 1} — ${chain.length} loans`
        : `Loan ${idx + 1}`,
      14,
      y,
    );
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    pdf.text(
      `${first.loanNo} (${new Date(first.loanDate).toLocaleDateString("en-IN")})` +
        (isChain
          ? `  →  ${last.loanNo} (${new Date(last.loanDate).toLocaleDateString("en-IN")})`
          : ""),
      14,
      y + 5,
    );
    y += 12;

    // Chain summary stats
    const totalInterestPaid = chain.reduce(
      (s, l) => s + Math.max(0, (l.totalPaid || 0) - (l.loanAmount || 0)),
      0,
    );
    const tenureSpanDays = Math.floor(
      (new Date(last.releasedAt || last.dueDate || last.loanDate).getTime() -
        new Date(first.loanDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    pdf.setFillColor(...NAVY);
    pdf.rect(10, y, pageW - 20, 16, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const cellW = (pageW - 20) / 4;
    const cells: Array<[string, string]> = [
      ["Original Loan", formatINR(first.loanAmount)],
      ["Latest Loan", formatINR(last.loanAmount)],
      ["Total Interest Paid", formatINR(totalInterestPaid)],
      ["Span", `${tenureSpanDays} days`],
    ];
    cells.forEach((c, i) => {
      pdf.text(c[0], 14 + i * cellW, y + 5.5);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(c[1], 14 + i * cellW, y + 12);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
    });
    y += 22;

    // Timeline table header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.setDrawColor(...BORDER);
    pdf.line(14, y, pageW - 14, y);
    y += 5;
    pdf.text("#", 14, y);
    pdf.text("LOAN NO", 22, y);
    pdf.text("DATE", 50, y);
    pdf.text("AMOUNT", 75, y);
    pdf.text("RATE", 105, y);
    pdf.text("TENURE", 122, y);
    pdf.text("STATUS", 145, y);
    pdf.text("CLOSED/RENEWED", 168, y);
    y += 3;
    pdf.line(14, y, pageW - 14, y);
    y += 5;

    // Timeline rows
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT);
    chain.forEach((loan, i) => {
      // Page-break safety
      if (y > pageH - 50) {
        pdf.addPage();
        drawHeader(pdf, settings, "LOAN & RENEWAL HISTORY (cont.)", customer.customerCode);
        y = 50;
      }
      const closedAt =
        loan.status === "Closed" && loan.releasedAt
          ? new Date(loan.releasedAt).toLocaleDateString("en-IN")
          : loan.status === "Renewed" && loan.renewedAt
            ? `→ ${loan.renewedToLoanNo || ""}`
            : loan.status === "Active"
              ? `Outstanding ${formatINR(loan.outstandingPrincipal)}`
              : "—";

      pdf.text(String(i + 1), 14, y);
      pdf.setFont("helvetica", "bold");
      pdf.text(loan.loanNo, 22, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(new Date(loan.loanDate).toLocaleDateString("en-IN"), 50, y);
      pdf.text(formatINR(loan.loanAmount), 75, y);
      pdf.text(`${loan.interestRate}%`, 105, y);
      pdf.text(`${loan.tenureMonths}m`, 122, y);
      pdf.text(loan.status, 145, y);
      pdf.text(closedAt.slice(0, 24), 168, y);
      y += 6;

      // Connector arrow between loans
      if (i < chain.length - 1) {
        pdf.setTextColor(...MUTED);
        pdf.setFontSize(7);
        pdf.text("↓ renewed", 26, y);
        pdf.setFontSize(9);
        pdf.setTextColor(...TEXT);
        y += 5;
      }
    });

    y += 4;
    pdf.line(14, y, pageW - 14, y);
    y += 8;

    // Latest loan gold pledge summary
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...NAVY);
    pdf.text(`Gold Pledged (as of ${last.loanNo})`, 14, y);
    y += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT);
    last.goldItems.forEach((g) => {
      if (y > pageH - 40) return;
      pdf.text(
        `• ${g.itemName} — ${g.count} pc(s), ${g.grossWeight.toFixed(2)}g gross / ${g.netWeight.toFixed(2)}g net (${g.purity}k)`,
        18,
        y,
      );
      y += 5;
    });

    drawFooter(pdf, settings);
  });

  return pdf;
}

export function downloadRenewalHistoryPdf(
  customer: FinanceCustomer,
  chains: FinanceLoan[][],
  settings: FinanceSettings,
) {
  const pdf = generateRenewalHistoryPdf(customer, chains, settings);
  pdf.save(`History_${customer.customerCode}_${customer.fullName.replace(/\s+/g, "_")}.pdf`);
}

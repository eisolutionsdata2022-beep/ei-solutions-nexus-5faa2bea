/**
 * EI SOLUTIONS — Branded VLE ID Card (PDF, credit-card style)
 * Front: name, VLE ID, QR code, brand strip
 * Back: terms + support contact
 */
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

const NAVY: [number, number, number] = [11, 35, 84];
const SAFFRON: [number, number, number] = [255, 153, 51];
const GREEN: [number, number, number] = [19, 136, 8];
const GOLD: [number, number, number] = [197, 160, 63];
const MUTED: [number, number, number] = [107, 114, 128];

export interface VleCardData {
  name: string;
  vleId: string;
  email?: string;
  phone?: string;
  joinDate?: string;
  kycStatus?: string;
}

async function makeQrDataUrl(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    margin: 1,
    width: 256,
    color: { dark: "#0b2354", light: "#ffffff" },
  });
}

export async function generateVleIdCardPdf(data: VleCardData): Promise<jsPDF> {
  // A4 portrait — card mounted top center, instructions below
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();

  // ── Page header band ───────────────────────────────────────────
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageW, 22, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("EI SOLUTIONS — Authorized Franchise Partner", pageW / 2, 10, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Official VLE Identity Card · www.eisoluions.xyz", pageW / 2, 17, { align: "center" });

  // Tricolor strip
  pdf.setFillColor(...SAFFRON);
  pdf.rect(0, 22, pageW, 1, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 23, pageW, 1, "F");
  pdf.setFillColor(...GREEN);
  pdf.rect(0, 24, pageW, 1, "F");

  // ── ID Card (credit-card style) ─────────────────────────────────
  const cardW = 150;
  const cardH = 90;
  const cardX = (pageW - cardW) / 2;
  const cardY = 36;

  // Card background gradient simulation (navy → deep navy)
  pdf.setFillColor(...NAVY);
  pdf.roundedRect(cardX, cardY, cardW, cardH, 4, 4, "F");

  // Gold accent stripe top
  pdf.setFillColor(...GOLD);
  pdf.rect(cardX, cardY, cardW, 4, "F");

  // Brand text
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("EI SOLUTIONS", cardX + 6, cardY + 13);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(220, 220, 220);
  pdf.text("Empowering Bharat · Digital India Initiative", cardX + 6, cardY + 18);

  // VLE ID block (large, monospace style)
  pdf.setTextColor(...GOLD);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("VLE ID", cardX + 6, cardY + 32);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont("courier", "bold");
  pdf.text(data.vleId, cardX + 6, cardY + 42);

  // Name
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...GOLD);
  pdf.setFontSize(7);
  pdf.text("CARDHOLDER", cardX + 6, cardY + 54);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(truncate(data.name?.toUpperCase() || "—", 26), cardX + 6, cardY + 61);

  // Phone & email (small)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(220, 220, 220);
  if (data.phone) pdf.text(`Mobile: ${data.phone}`, cardX + 6, cardY + 70);
  if (data.email) pdf.text(`Email: ${truncate(data.email, 38)}`, cardX + 6, cardY + 76);
  if (data.joinDate) pdf.text(`Member since: ${formatDate(data.joinDate)}`, cardX + 6, cardY + 82);

  // QR code on right side
  const qrPayload = JSON.stringify({
    brand: "EI SOLUTIONS",
    vleId: data.vleId,
    name: data.name,
    url: "https://www.eisoluions.xyz",
  });
  const qrUrl = await makeQrDataUrl(qrPayload);
  const qrSize = 36;
  const qrX = cardX + cardW - qrSize - 6;
  const qrY = cardY + 28;
  // White backing for QR
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, "F");
  pdf.addImage(qrUrl, "PNG", qrX, qrY, qrSize, qrSize);
  pdf.setTextColor(220, 220, 220);
  pdf.setFontSize(6);
  pdf.text("Scan to verify", qrX + qrSize / 2, qrY + qrSize + 5, { align: "center" });

  // KYC badge bottom-right
  if (data.kycStatus) {
    const isApproved = data.kycStatus.toLowerCase() === "approved";
    pdf.setFillColor(...(isApproved ? GREEN : SAFFRON));
    pdf.roundedRect(cardX + cardW - 36, cardY + cardH - 12, 30, 7, 2, 2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text(
      isApproved ? "KYC VERIFIED" : `KYC ${data.kycStatus.toUpperCase()}`,
      cardX + cardW - 21,
      cardY + cardH - 7,
      { align: "center" },
    );
  }

  // ── Below card: instructions ────────────────────────────────────
  let y = cardY + cardH + 12;
  pdf.setTextColor(...NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("How to use your VLE ID", 20, y);
  y += 6;
  pdf.setTextColor(60, 60, 60);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const lines = [
    "• Use this VLE ID for PAN Portal services (PSA Create, Password Reset, Coupon Buy).",
    "• It is auto-assigned and unique to your EI SOLUTIONS account — never share it.",
    "• Keep this card for retail counter display and customer trust.",
    "• To verify authenticity, customers can scan the QR with any QR reader.",
    "• For support contact support@eisoluions.xyz or call your distributor.",
  ];
  for (const l of lines) {
    pdf.text(l, 20, y);
    y += 5;
  }

  // Footer tricolor
  const footY = pdf.internal.pageSize.getHeight() - 4;
  pdf.setFillColor(...SAFFRON);
  pdf.rect(0, footY - 3, pageW, 1, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, footY - 2, pageW, 1, "F");
  pdf.setFillColor(...GREEN);
  pdf.rect(0, footY - 1, pageW, 1, "F");

  pdf.setTextColor(...MUTED);
  pdf.setFontSize(7);
  pdf.text(
    `Generated ${new Date().toLocaleString()} · EI SOLUTIONS — Empowering Bharat`,
    pageW / 2,
    footY - 5,
    { align: "center" },
  );

  return pdf;
}

export async function downloadVleIdCard(data: VleCardData) {
  const pdf = await generateVleIdCardPdf(data);
  pdf.save(`EISolutions_VLE_${data.vleId}.pdf`);
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

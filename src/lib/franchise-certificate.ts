/**
 * Franchise Certificate Generator
 * Generates a professional certificate with EI Solutions & Digital India branding
 */

import { EI_SOLUTIONS_LOGO, DIGITAL_INDIA_LOGO } from "./certificate-logos";

export interface CertificateData {
  name: string;
  franchiseeId: string;
  centerName: string;
  agreementDate: string;
}

export function generateCertificateHTML(data: CertificateData): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Franchise Certificate - ${esc(data.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Open+Sans:wght@400;600;700&family=Great+Vibes&display=swap');
  @page { size: A4 landscape; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Open Sans', sans-serif; 
    background: #e8e8e8; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    min-height: 100vh; 
  }
  .certificate {
    width: 1122px; height: 793px;
    background: #ffffff;
    position: relative;
    overflow: hidden;
  }
  /* Outer blue border */
  .border-outer {
    position: absolute; inset: 8px;
    border: 4px solid #1a3a6b;
  }
  /* Inner gold border */
  .border-inner {
    position: absolute; inset: 16px;
    border: 2px solid #c5a03f;
  }
  /* Content area */
  .content {
    position: absolute; inset: 28px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 30px 60px;
  }
  /* Logos row */
  .logos {
    display: flex; justify-content: space-between;
    align-items: center; width: 100%;
    margin-bottom: 20px;
  }
  .logo-box {
    display: flex; align-items: center; gap: 10px;
  }
  .logo-icon {
    width: 52px; height: 52px;
    background: linear-gradient(135deg, #1a3a6b, #2563eb);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 24px; font-weight: 700;
  }
  .logo-text {
    font-size: 18px; font-weight: 700; color: #1a3a6b;
    line-height: 1.2;
  }
  .logo-text small {
    display: block; font-size: 10px; font-weight: 400; color: #555;
  }
  .logo-right .logo-icon {
    background: linear-gradient(135deg, #065f46, #10b981);
    border-radius: 50%;
  }
  .logo-right .logo-text {
    color: #065f46;
  }
  /* Title */
  .title {
    font-family: 'Playfair Display', serif;
    font-size: 36px; font-weight: 900;
    color: #1a3a6b; letter-spacing: 3px;
    margin: 10px 0 6px; text-transform: uppercase;
  }
  /* Decorative line */
  .line-decor {
    display: flex; align-items: center; gap: 12px; margin: 8px 0 18px;
  }
  .line-decor .line { width: 80px; height: 1px; background: #c5a03f; }
  .line-decor .dot { width: 6px; height: 6px; border-radius: 50%; background: #c5a03f; }
  /* Subtitle */
  .subtitle {
    font-size: 15px; color: #555; margin-bottom: 16px;
    font-style: italic;
  }
  /* Name */
  .cert-name {
    font-family: 'Playfair Display', serif;
    font-size: 32px; font-weight: 700;
    color: #1a1a1a; margin: 4px 0 14px;
    border-bottom: 2px solid #c5a03f;
    padding-bottom: 6px; min-width: 300px;
    text-align: center;
  }
  /* Body text */
  .body-text {
    font-size: 14px; color: #333;
    text-align: center; line-height: 1.8;
    max-width: 650px; margin-bottom: 24px;
  }
  .body-text strong { color: #1a1a1a; }
  /* Details grid */
  .details {
    display: flex; flex-direction: column; gap: 6px;
    align-self: flex-start; margin-left: 80px;
    margin-bottom: 20px;
  }
  .detail-row {
    font-size: 13px; color: #333;
  }
  .detail-row strong {
    display: inline-block; width: 160px; color: #1a3a6b; font-weight: 700;
  }
  /* Signature */
  .signature-area {
    align-self: flex-end; margin-right: 80px;
    text-align: center;
  }
  .sig-name {
    font-family: 'Great Vibes', cursive;
    font-size: 28px; color: #1a3a6b;
    border-bottom: 1px solid #333;
    padding-bottom: 4px; margin-bottom: 4px;
  }
  .sig-title {
    font-size: 12px; color: #555; font-weight: 600;
  }
  /* Tricolor bottom bar */
  .tricolor {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 6px; display: flex;
  }
  .tricolor .orange { flex: 1; background: #FF9933; }
  .tricolor .white { flex: 1; background: #FFFFFF; }
  .tricolor .green { flex: 1; background: #138808; }
</style>
</head><body>
<div class="certificate">
  <div class="border-outer"></div>
  <div class="border-inner"></div>
  <div class="content">
    <div class="logos">
      <div class="logo-box">
        <div class="logo-icon">SI</div>
        <div class="logo-text">Sk<span style="color:#e67e22;">i</span>ll India<small>कौशल भारत - कुशल भारत</small></div>
      </div>
      <div class="logo-box logo-right">
        <div class="logo-icon">DI</div>
        <div class="logo-text">Digital India<small>Power To Empower</small></div>
      </div>
    </div>
    <div class="title">Franchise Certificate</div>
    <div class="line-decor"><div class="line"></div><div class="dot"></div><div class="line"></div></div>
    <div class="subtitle">This is to certify that</div>
    <div class="cert-name">${esc(data.name)}</div>
    <div class="body-text">
      is an authorized <strong>franchisee of Skill India</strong> and
      has been granted the license to operate a training center under Skill India program.
    </div>
    <div class="details">
      <div class="detail-row"><strong>Franchisee ID :</strong> ${esc(data.franchiseeId)}</div>
      <div class="detail-row"><strong>Center Name :</strong> ${esc(data.centerName)}</div>
      <div class="detail-row"><strong>Agreement Date :</strong> ${esc(data.agreementDate)}</div>
    </div>
    <div class="signature-area">
      <div class="sig-name">Sujith Thulasidharan</div>
      <div class="sig-title">CEO</div>
    </div>
  </div>
  <div class="tricolor">
    <div class="orange"></div>
    <div class="white"></div>
    <div class="green"></div>
  </div>
</div>
</body></html>`;
}

export function downloadCertificate(data: CertificateData) {
  const html = generateCertificateHTML(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 800);
}

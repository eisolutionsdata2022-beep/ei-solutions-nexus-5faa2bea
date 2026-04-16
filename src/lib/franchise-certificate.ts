/**
 * Premium Franchise Certificate Generator
 * Government-style certificate with EI Solutions & Digital India branding
 */

import { KSUM_LOGO, DIGITAL_INDIA_LOGO } from "./certificate-logos";

export interface CertificateData {
  name: string;
  franchiseeId: string;
  centerName: string;
  agreementDate: string;
  location?: string;
}

export function generateCertificateHTML(data: CertificateData): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const certNo = data.franchiseeId || `#EI${new Date().getFullYear()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Franchise Certificate - ${esc(data.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Open+Sans:wght@400;600;700&family=Great+Vibes&family=Cinzel:wght@400;700;900&display=swap');
  @page { size: A4 portrait; margin: 0; }
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
    width: 793px; height: 1122px;
    background: #fffdf5;
    position: relative;
    overflow: hidden;
  }
  /* Subtle watermark pattern */
  .certificate::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle at 20% 30%, rgba(197, 160, 63, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(26, 58, 107, 0.03) 0%, transparent 50%),
      repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(197, 160, 63, 0.015) 40px, rgba(197, 160, 63, 0.015) 41px);
    pointer-events: none;
    z-index: 0;
  }
  /* Golden outer border */
  .border-outer {
    position: absolute; inset: 12px;
    border: 3px solid #c5a03f;
    z-index: 1;
  }
  /* Inner blue border */
  .border-inner {
    position: absolute; inset: 20px;
    border: 1.5px solid #1a3a6b;
    z-index: 1;
  }
  /* Corner ornaments */
  .corner {
    position: absolute;
    width: 40px; height: 40px;
    z-index: 2;
  }
  .corner::before, .corner::after {
    content: '';
    position: absolute;
    background: #c5a03f;
  }
  .corner-tl { top: 24px; left: 24px; }
  .corner-tl::before { top: 0; left: 0; width: 20px; height: 2px; }
  .corner-tl::after { top: 0; left: 0; width: 2px; height: 20px; }
  .corner-tr { top: 24px; right: 24px; }
  .corner-tr::before { top: 0; right: 0; width: 20px; height: 2px; }
  .corner-tr::after { top: 0; right: 0; width: 2px; height: 20px; }
  .corner-bl { bottom: 24px; left: 24px; }
  .corner-bl::before { bottom: 0; left: 0; width: 20px; height: 2px; }
  .corner-bl::after { bottom: 0; left: 0; width: 2px; height: 20px; }
  .corner-br { bottom: 24px; right: 24px; }
  .corner-br::before { bottom: 0; right: 0; width: 20px; height: 2px; }
  .corner-br::after { bottom: 0; right: 0; width: 2px; height: 20px; }
  /* Content */
  .content {
    position: absolute; inset: 30px;
    display: flex; flex-direction: column;
    align-items: center;
    padding: 20px 40px;
    z-index: 3;
  }
  /* Top row: cert no left, hashtag right */
  .top-row {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 10px;
    font-size: 10px;
    color: #1a3a6b;
    font-weight: 600;
  }
  /* Ashoka-style emblem */
  .emblem {
    width: 70px; height: 70px;
    margin: 5px auto 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .emblem svg {
    width: 60px; height: 60px;
  }
  /* Logos row */
  .logos {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 30px;
    width: 100%;
    margin: 8px 0 6px;
  }
  .logo-img {
    height: 52px;
    object-fit: contain;
  }
  /* Company name */
  .company-name {
    font-family: 'Cinzel', serif;
    font-size: 14px;
    font-weight: 900;
    color: #1a3a6b;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: center;
    margin: 6px 0 2px;
  }
  .company-sub {
    font-size: 11px;
    color: #555;
    font-style: italic;
    margin-bottom: 12px;
  }
  /* Decorative divider */
  .divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 8px 0;
  }
  .divider .line { width: 100px; height: 1px; background: linear-gradient(to right, transparent, #c5a03f, transparent); }
  .divider .diamond {
    width: 8px; height: 8px;
    background: #c5a03f;
    transform: rotate(45deg);
  }
  /* Main title */
  .main-title {
    font-family: 'Cinzel', serif;
    font-size: 22px;
    font-weight: 900;
    color: #1a3a6b;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin: 10px 0 4px;
    text-align: center;
  }
  .main-subtitle {
    font-size: 11px;
    color: #555;
    font-style: italic;
    margin-bottom: 14px;
    text-align: center;
  }
  /* Body */
  .certify-text {
    font-size: 13px;
    color: #444;
    margin-bottom: 6px;
    font-style: italic;
  }
  .cert-name {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 700;
    color: #1a1a1a;
    border-bottom: 2px solid #c5a03f;
    padding-bottom: 4px;
    min-width: 280px;
    text-align: center;
    margin: 4px 0 12px;
  }
  .body-text {
    font-size: 12px;
    color: #333;
    text-align: center;
    line-height: 1.7;
    max-width: 560px;
    margin-bottom: 10px;
  }
  .body-text strong { color: #1a3a6b; }
  /* Services list */
  .services-list {
    text-align: left;
    font-size: 11px;
    color: #333;
    line-height: 1.8;
    max-width: 400px;
    margin: 0 auto 14px;
  }
  .services-list li {
    list-style: none;
    padding-left: 16px;
    position: relative;
  }
  .services-list li::before {
    content: '✦';
    position: absolute;
    left: 0;
    color: #c5a03f;
    font-size: 8px;
    top: 2px;
  }
  .guidelines-text {
    font-size: 11px;
    color: #555;
    font-style: italic;
    text-align: center;
    margin-bottom: 14px;
  }
  /* Details grid */
  .details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 30px;
    margin: 0 auto 16px;
    max-width: 520px;
    width: 100%;
    background: rgba(26, 58, 107, 0.02);
    padding: 10px 16px;
    border: 1px solid rgba(197, 160, 63, 0.2);
    border-radius: 4px;
  }
  .detail-row {
    font-size: 11px;
    color: #333;
  }
  .detail-row strong {
    color: #1a3a6b;
    font-weight: 700;
    display: inline;
  }
  /* Footer */
  .footer-area {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    width: 100%;
    margin-top: auto;
    padding: 0 20px;
  }
  .footer-left, .footer-right {
    text-align: center;
    min-width: 140px;
  }
  .footer-label {
    font-size: 10px;
    color: #888;
    border-top: 1px solid #999;
    padding-top: 4px;
    margin-top: 30px;
  }
  .footer-center {
    text-align: center;
    flex: 1;
  }
  .seal-text {
    font-size: 10px;
    color: #1a3a6b;
    font-weight: 700;
    border: 1.5px solid #c5a03f;
    border-radius: 50%;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    text-align: center;
    line-height: 1.3;
    padding: 8px;
  }
  .digital-note {
    font-size: 8px;
    color: #999;
    text-align: center;
    margin-top: 6px;
    font-style: italic;
  }
  /* Signature */
  .sig-name {
    font-family: 'Great Vibes', cursive;
    font-size: 22px;
    color: #1a3a6b;
    margin-bottom: 2px;
  }
  /* Tricolor bottom bar */
  .tricolor {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 5px;
    display: flex;
    z-index: 4;
  }
  .tricolor .orange { flex: 1; background: #FF9933; }
  .tricolor .white { flex: 1; background: #FFFFFF; }
  .tricolor .green { flex: 1; background: #138808; }
</style>
</head><body>
<div class="certificate">
  <div class="border-outer"></div>
  <div class="border-inner"></div>
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>

  <div class="content">
    <div class="top-row">
      <span>CERTIFICATE NO: ${esc(certNo)}</span>
      <span>#EISOLUTIONS</span>
    </div>

    <!-- Ashoka-style emblem -->
    <div class="emblem">
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="46" stroke="#1a3a6b" stroke-width="2" fill="none"/>
        <circle cx="50" cy="50" r="40" stroke="#c5a03f" stroke-width="1" fill="none"/>
        <circle cx="50" cy="50" r="12" fill="#1a3a6b"/>
        <circle cx="50" cy="50" r="8" fill="#c5a03f"/>
        ${Array.from({length: 24}, (_, i) => {
          const angle = (i * 15) * Math.PI / 180;
          const x1 = 50 + 15 * Math.cos(angle);
          const y1 = 50 + 15 * Math.sin(angle);
          const x2 = 50 + 38 * Math.cos(angle);
          const y2 = 50 + 38 * Math.sin(angle);
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1a3a6b" stroke-width="${i % 3 === 0 ? 1.5 : 0.5}" opacity="${i % 3 === 0 ? 1 : 0.4}"/>`;
        }).join('')}
      </svg>
    </div>

    <div class="company-name">EI SOLUTIONS JANASEVANA KENDRAM (OPC) PRIVATE LIMITED</div>
    <div class="company-sub">Authorized Franchise Certificate</div>

    <div class="logos">
      <img class="logo-img" src="${KSUM_LOGO}" alt="Kerala Startup Mission" />
      <img class="logo-img" src="${DIGITAL_INDIA_LOGO}" alt="Digital India" />
    </div>

    <div class="divider"><div class="line"></div><div class="diamond"></div><div class="line"></div></div>

    <div class="main-title">Certificate of Franchise Authorization</div>
    <div class="main-subtitle">This certificate is issued under the authorization of EI SOLUTIONS</div>

    <div class="divider"><div class="line"></div><div class="diamond"></div><div class="line"></div></div>

    <div class="certify-text">This is to certify that</div>
    <div class="cert-name">${esc(data.name)}</div>

    <div class="body-text">
      is an officially authorized franchise partner of
      <strong>EI SOLUTIONS JANASEVANA KENDRAM (OPC) PRIVATE LIMITED</strong>.
      The franchise is permitted to provide digital services including:
    </div>

    <ul class="services-list">
      <li>E-Governance Services</li>
      <li>Aadhaar Services</li>
      <li>Online Application Services</li>
      <li>Financial &amp; Loan Services</li>
      <li>Skill Development Programs</li>
    </ul>

    <div class="guidelines-text">The franchise operates under the guidelines and policies of EI SOLUTIONS.</div>

    <div class="details">
      <div class="detail-row"><strong>Franchise ID:</strong> ${esc(data.franchiseeId)}</div>
      <div class="detail-row"><strong>Authorized Person:</strong> ${esc(data.name)}</div>
      <div class="detail-row"><strong>Center Name:</strong> ${esc(data.centerName)}</div>
      <div class="detail-row"><strong>Date of Issue:</strong> ${esc(data.agreementDate)}</div>
    </div>

    <div class="footer-area">
      <div class="footer-left">
        <div style="font-size:11px;color:#333;">${esc(data.agreementDate)}</div>
        <div class="footer-label">Issue Date</div>
      </div>
      <div class="footer-center">
        <div class="seal-text">EI SOLUTIONS Official Seal</div>
        <div class="digital-note">This is a digitally generated certificate and does not require physical signature.</div>
      </div>
      <div class="footer-right">
        <div class="sig-name">Sujith Thulasidharan</div>
        <div class="footer-label">Authorized Signatory</div>
      </div>
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

/**
 * VLE / PSA Authorization Certificate — printable HTML (A4 portrait).
 * Opens in new tab; user can save as PDF or print.
 */

export interface VleCertificateData {
  name: string;
  vleId: string;
  email?: string;
  phone?: string;
  centerName?: string;
  location?: string;
  issueDate: string;
}

export function generateVleCertificateHTML(data: VleCertificateData): string {
  const esc = (s: string) =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const issued = new Date(data.issueDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>VLE Certificate - ${esc(data.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Open+Sans:wght@400;600;700&family=Great+Vibes&display=swap');
  @page { size: A4 portrait; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Open Sans', sans-serif; background: #e8e8e8; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
  .cert { width: 793px; height: 1122px; background: #fffdf5; position: relative; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
  .cert::before { content: ''; position: absolute; inset: 0;
    background-image: radial-gradient(circle at 20% 30%, rgba(197,160,63,0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(11,35,84,0.04) 0%, transparent 50%);
    pointer-events: none;
  }
  .border-frame { position: absolute; inset: 24px; border: 8px double #c5a03f; pointer-events: none; }
  .border-inner { position: absolute; inset: 40px; border: 1px solid #0b2354; pointer-events: none; }
  .tricolor { position: absolute; left: 24px; right: 24px; height: 6px; display: flex; }
  .tricolor.top { top: 14px; }
  .tricolor.bottom { bottom: 14px; }
  .tricolor div { flex: 1; }
  .tricolor div:nth-child(1) { background: #ff9933; }
  .tricolor div:nth-child(2) { background: #fff; }
  .tricolor div:nth-child(3) { background: #138808; }
  .content { position: relative; padding: 70px 60px; height: 100%; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .brand { font-family: 'Cinzel', serif; font-size: 28px; color: #0b2354; letter-spacing: 4px; font-weight: 900; margin-top: 10px; }
  .sub { font-size: 11px; color: #666; letter-spacing: 3px; margin-top: 4px; text-transform: uppercase; }
  .title { font-family: 'Cinzel', serif; font-size: 44px; color: #c5a03f; margin-top: 38px; letter-spacing: 6px; font-weight: 900; }
  .title-sub { font-size: 13px; color: #666; letter-spacing: 4px; margin-top: 6px; }
  .presented { font-size: 14px; color: #555; margin-top: 36px; font-style: italic; }
  .name { font-family: 'Great Vibes', cursive; font-size: 56px; color: #0b2354; margin-top: 16px; }
  .name-line { width: 360px; border-bottom: 1px solid #c5a03f; margin: 8px auto 0; }
  .body-text { font-size: 13px; line-height: 1.9; color: #444; margin-top: 28px; max-width: 580px; }
  .vle-block { display: inline-block; margin-top: 26px; padding: 14px 28px; border: 2px solid #0b2354; background: rgba(11,35,84,0.04); border-radius: 6px; }
  .vle-label { font-size: 10px; color: #666; letter-spacing: 3px; text-transform: uppercase; }
  .vle-id { font-family: 'Courier New', monospace; font-size: 32px; font-weight: 900; color: #0b2354; letter-spacing: 4px; margin-top: 4px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 560px; margin-top: 28px; font-size: 12px; color: #555; text-align: left; }
  .meta b { color: #0b2354; display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 2px; }
  .signatures { display: flex; justify-content: space-between; width: 100%; max-width: 600px; margin-top: auto; padding-top: 20px; }
  .sig { text-align: center; flex: 1; }
  .sig-line { border-top: 1.5px solid #0b2354; margin-bottom: 6px; width: 80%; margin-left: auto; margin-right: auto; }
  .sig-name { font-size: 12px; font-weight: 700; color: #0b2354; }
  .sig-title { font-size: 10px; color: #888; }
  .seal { position: absolute; right: 70px; bottom: 130px; width: 110px; height: 110px; border: 3px solid #c5a03f; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-direction: column; transform: rotate(-12deg); color: #c5a03f; font-family: 'Cinzel', serif; }
  .seal .top-text { font-size: 8px; letter-spacing: 1.5px; }
  .seal .center { font-size: 14px; font-weight: 900; margin-top: 4px; }
  .seal .year { font-size: 18px; font-weight: 900; margin-top: 2px; }
  .cert-no { position: absolute; bottom: 70px; left: 60px; font-size: 10px; color: #888; }
  @media print { body { background: white; padding: 0; } .cert { box-shadow: none; } .no-print { display: none; } }
  .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #0b2354; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 100; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
<div class="cert">
  <div class="tricolor top"><div></div><div></div><div></div></div>
  <div class="border-frame"></div>
  <div class="border-inner"></div>
  <div class="content">
    <div class="brand">EI SOLUTIONS</div>
    <div class="sub">Authorized Franchise Network · Digital India</div>
    <div class="title">CERTIFICATE</div>
    <div class="title-sub">OF VLE AUTHORIZATION</div>
    <div class="presented">This is to certify that</div>
    <div class="name">${esc(data.name)}</div>
    <div class="name-line"></div>
    <div class="body-text">
      has been duly authorized as a <b>Village Level Entrepreneur (VLE)</b> under the
      EI SOLUTIONS franchise programme and is empowered to deliver PAN, e-Governance,
      Banking and Citizen Services through the official EI SOLUTIONS portal in accordance
      with the prevailing terms and conditions.
    </div>
    <div class="vle-block">
      <div class="vle-label">EI SOLUTIONS VLE ID</div>
      <div class="vle-id">${esc(data.vleId)}</div>
    </div>
    <div class="meta">
      <div><b>Issue Date</b>${esc(issued)}</div>
      <div><b>Center Name</b>${esc(data.centerName || data.name)}</div>
      ${data.email ? `<div><b>Email</b>${esc(data.email)}</div>` : ""}
      ${data.phone ? `<div><b>Mobile</b>${esc(data.phone)}</div>` : ""}
      ${data.location ? `<div><b>Location</b>${esc(data.location)}</div>` : ""}
    </div>
    <div class="signatures">
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-name">Authorized Signatory</div>
        <div class="sig-title">EI SOLUTIONS</div>
      </div>
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-name">Director</div>
        <div class="sig-title">Franchise Operations</div>
      </div>
    </div>
  </div>
  <div class="seal">
    <div class="top-text">★ EI SOLUTIONS ★</div>
    <div class="center">OFFICIAL</div>
    <div class="year">${new Date().getFullYear()}</div>
  </div>
  <div class="cert-no">Cert. No: EISVLE-${esc(data.vleId)}-${new Date(data.issueDate).getFullYear()}</div>
  <div class="tricolor bottom"><div></div><div></div><div></div></div>
</div>
</body></html>`;
}

export function openVleCertificate(data: VleCertificateData) {
  const html = generateVleCertificateHTML(data);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

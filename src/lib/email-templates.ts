/** Pre-built offer banner / promo HTML templates for Bulk Email composer */

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  preview: string; // emoji or short visual
  html: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Start from scratch",
    preview: "📝",
    html: `<p>Hi {{name}},</p><p></p><p>Best regards,<br/>EI Solutions</p>`,
  },
  {
    id: "offer-banner",
    name: "Offer Banner",
    description: "Bold promo with CTA button",
    preview: "🎁",
    html: `
<div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:32px 24px;border-radius:12px;text-align:center;color:#fff;margin-bottom:24px">
  <div style="font-size:14px;letter-spacing:2px;opacity:0.85;margin-bottom:8px">LIMITED-TIME OFFER</div>
  <h1 style="font-size:32px;margin:0 0 12px;font-weight:800">Special Discount for You!</h1>
  <p style="font-size:16px;opacity:0.95;margin:0 0 20px">Exclusive deal — only for valued partners</p>
  <a href="https://ei-solutions-nexus.lovable.app/login" style="display:inline-block;background:#fbbf24;color:#1e3a8a;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px">Claim Now →</a>
</div>
<p>Hi {{name}},</p>
<p>We are excited to share an exclusive offer crafted just for you. Login to your dashboard to redeem.</p>
<p>Best,<br/>EI Solutions Team</p>
    `.trim(),
  },
  {
    id: "new-service",
    name: "New Service Launch",
    description: "Announce a new service",
    preview: "🚀",
    html: `
<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:8px;margin-bottom:20px">
  <div style="font-size:12px;font-weight:700;color:#b45309;letter-spacing:1.5px">🚀 NEW LAUNCH</div>
  <h2 style="margin:6px 0 0;color:#78350f;font-size:22px">Service Name Goes Here</h2>
</div>
<p>Hi {{name}},</p>
<p>We are thrilled to announce the launch of our newest service on EI Solutions. Here's what it offers:</p>
<ul>
  <li>Feature one</li>
  <li>Feature two</li>
  <li>Feature three</li>
</ul>
<p style="text-align:center;margin:28px 0">
  <a href="https://ei-solutions-nexus.lovable.app/login" style="background:#1e3a8a;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;display:inline-block">Try It Now</a>
</p>
<p>Cheers,<br/>EI Solutions</p>
    `.trim(),
  },
  {
    id: "festival-greeting",
    name: "Festival Greeting",
    description: "Warm seasonal wishes",
    preview: "🎉",
    html: `
<div style="background:linear-gradient(135deg,#dc2626,#f59e0b);padding:40px 24px;border-radius:12px;text-align:center;color:#fff;margin-bottom:24px">
  <div style="font-size:48px;margin-bottom:8px">🎊</div>
  <h1 style="font-size:30px;margin:0;font-weight:800">Happy Festival, {{name}}!</h1>
  <p style="margin:12px 0 0;opacity:0.95;font-size:16px">From all of us at EI Solutions</p>
</div>
<p>Dear {{name}},</p>
<p>On this auspicious occasion, we extend our warmest greetings to you and your family. May this festival bring prosperity, joy and success to your business.</p>
<p>Thank you for being part of the EI Solutions family.</p>
<p>Warm wishes,<br/>The EI Solutions Team</p>
    `.trim(),
  },
  {
    id: "reactivation",
    name: "Reactivation",
    description: "Win back inactive users",
    preview: "💌",
    html: `
<div style="text-align:center;padding:24px 0">
  <div style="font-size:56px">💔</div>
  <h1 style="font-size:26px;margin:12px 0 4px;color:#1f2937">We miss you, {{name}}!</h1>
  <p style="color:#6b7280;margin:0">It's been a while since we saw you on EI Solutions</p>
</div>
<p>Hi {{name}},</p>
<p>We noticed you haven't logged in lately. Here's what's new:</p>
<ul>
  <li>✅ Faster PAN application processing</li>
  <li>✅ New IPPB & e-Governance services</li>
  <li>✅ Higher commission slabs</li>
</ul>
<p style="text-align:center;margin:28px 0">
  <a href="https://ei-solutions-nexus.lovable.app/login" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:14px 32px;border-radius:8px;font-weight:700;text-decoration:none;display:inline-block;font-size:16px">Login & Explore</a>
</p>
<p>Hope to see you back soon!<br/>EI Solutions</p>
    `.trim(),
  },
  {
    id: "newsletter",
    name: "Monthly Newsletter",
    description: "Updates & news digest",
    preview: "📰",
    html: `
<div style="border-bottom:3px solid #1e3a8a;padding-bottom:12px;margin-bottom:20px">
  <div style="font-size:12px;color:#6b7280;letter-spacing:1.5px">EI SOLUTIONS NEWSLETTER</div>
  <h1 style="margin:4px 0 0;font-size:26px;color:#1e3a8a">Monthly Update</h1>
</div>
<p>Hi {{name}},</p>
<p>Here's what happened this month at EI Solutions:</p>
<h3 style="color:#1e3a8a;margin-top:20px">📌 Highlights</h3>
<ul>
  <li>Item one</li>
  <li>Item two</li>
</ul>
<h3 style="color:#1e3a8a;margin-top:20px">🎯 What's coming next</h3>
<p>Brief teaser about upcoming features.</p>
<p style="text-align:center;margin:24px 0">
  <a href="https://ei-solutions-nexus.lovable.app" style="background:#1e3a8a;color:#fff;padding:10px 24px;border-radius:6px;font-weight:600;text-decoration:none;display:inline-block">Visit Portal</a>
</p>
<p>Stay tuned!<br/>EI Solutions</p>
    `.trim(),
  },
];

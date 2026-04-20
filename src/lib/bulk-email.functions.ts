import { createServerFn } from "@tanstack/react-start";
import { firebaseAuthMiddleware } from "./firebase-auth.middleware";

interface SendBatchInput {
  campaignId: string;
  subject: string;
  htmlBody: string;
  recipients: Array<{ email: string; name: string; recipientDocId: string }>;
  testMode?: boolean;
  baseUrl?: string;
}

/** Personalize {{name}} and append tracking pixel + unsubscribe footer */
function personalize(html: string, name: string, trackUrl: string, unsubUrl: string) {
  const safeName = (name || "there").replace(/[<>&"]/g, "");
  const body = html.replace(/\{\{\s*name\s*\}\}/gi, safeName);
  const footer = `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;font-family:Arial,sans-serif">
      You're receiving this because you registered with EI Solutions.
      <br/>
      <a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a>
    </div>
    <img src="${trackUrl}" width="1" height="1" alt="" style="display:block;border:0"/>
  `;
  return `<div style="font-family:Arial,sans-serif;color:#111827;max-width:640px;margin:0 auto;padding:24px">${body}${footer}</div>`;
}

export const sendBulkEmailBatch = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: SendBatchInput) => input)
  .handler(async ({ data, context }) => {
    if (!context.authUser) {
      return { ok: false, error: "Unauthorized" };
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.BULK_EMAIL_FROM_ADDRESS;

    if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not configured" };
    if (!fromAddress) return { ok: false, error: "BULK_EMAIL_FROM_ADDRESS is not configured" };

    const baseUrl = (data.baseUrl || "").replace(/\/$/, "") || "https://ei-solutions-nexus.lovable.app";
    const results: Array<{ recipientDocId: string; ok: boolean; resendId?: string; error?: string }> = [];

    // Sequential send w/ small delay (Resend free tier = 2/sec, paid = 10/sec)
    for (const r of data.recipients) {
      const trackUrl = `${baseUrl}/api/email/open?c=${encodeURIComponent(data.campaignId)}&r=${encodeURIComponent(r.recipientDocId)}`;
      const unsubUrl = `${baseUrl}/api/email/unsubscribe?e=${encodeURIComponent(r.email)}`;
      const personalizedHtml = personalize(data.htmlBody, r.name, trackUrl, unsubUrl);

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [r.email],
            subject: data.subject,
            html: personalizedHtml,
            tags: [
              { name: "campaign", value: data.campaignId.slice(0, 50) },
              { name: "test", value: data.testMode ? "true" : "false" },
            ],
          }),
        });

        const json: any = await res.json().catch(() => ({}));
        if (!res.ok) {
          results.push({
            recipientDocId: r.recipientDocId,
            ok: false,
            error: json?.message || `HTTP ${res.status}`,
          });
        } else {
          results.push({ recipientDocId: r.recipientDocId, ok: true, resendId: json?.id });
        }
      } catch (err: any) {
        results.push({
          recipientDocId: r.recipientDocId,
          ok: false,
          error: err?.message || "Network error",
        });
      }

      // Rate-limit: 600ms between sends (≈100/min, well under paid 10/sec)
      await new Promise((res) => setTimeout(res, 600));
    }

    return { ok: true, results };
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: { to: string; subject: string; htmlBody: string }) => input)
  .handler(async ({ data, context }) => {
    if (!context.authUser) return { ok: false, error: "Unauthorized" };

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.BULK_EMAIL_FROM_ADDRESS;
    if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not configured" };
    if (!fromAddress) return { ok: false, error: "BULK_EMAIL_FROM_ADDRESS is not configured" };

    const html = `<div style="font-family:Arial,sans-serif;color:#111827;max-width:640px;margin:0 auto;padding:24px">
      <div style="background:#fef3c7;border:1px solid #fbbf24;padding:8px 12px;border-radius:6px;font-size:12px;margin-bottom:16px">
        🧪 <strong>TEST EMAIL</strong> — sent from EI Solutions Bulk Comm preview
      </div>
      ${data.htmlBody.replace(/\{\{\s*name\s*\}\}/gi, "Test User")}
    </div>`;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromAddress,
          to: [data.to],
          subject: `[TEST] ${data.subject}`,
          html,
        }),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: json?.message || `HTTP ${res.status}` };
      return { ok: true, id: json?.id };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Network error" };
    }
  });

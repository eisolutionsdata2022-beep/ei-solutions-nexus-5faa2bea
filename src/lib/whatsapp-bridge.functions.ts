/**
 * Server functions that proxy HMAC-signed requests to the WhatsApp VPS bridge.
 * The browser NEVER calls the bridge directly — only via these server functions
 * (so HMAC_SECRET stays on the server).
 */
import { createServerFn } from "@tanstack/react-start";
import crypto from "node:crypto";
import { firebaseAuthMiddleware } from "./firebase-auth.middleware";

function bridgeBaseUrl(): string {
  const url = process.env.WA_BRIDGE_BASE_URL;
  if (!url) throw new Error("WA_BRIDGE_BASE_URL is not configured");
  return url.replace(/\/$/, "");
}

function hmacSecret(): string {
  const s = process.env.WA_BRIDGE_HMAC_SECRET;
  if (!s) throw new Error("WA_BRIDGE_HMAC_SECRET is not configured");
  return s;
}

async function callBridge(path: string, method: "GET" | "POST", body?: any) {
  const url = `${bridgeBaseUrl()}${path}`;
  const ts = Math.floor(Date.now() / 1000);
  const raw = body ? JSON.stringify(body) : "";
  const sig = crypto.createHmac("sha256", hmacSecret()).update(`${ts}.${raw}`).digest("hex");

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Timestamp": String(ts),
      "X-Signature": sig,
    },
    body: method === "GET" ? undefined : raw,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, error: (json as any)?.error || `HTTP ${res.status}` };
  }
  return { ok: true, ...json };
}

// ── Status / QR ─────────────────────────────────────────────────────────
export const getWhatsAppStatus = createServerFn({ method: "GET" })
  .middleware([firebaseAuthMiddleware])
  .handler(async ({ context }) => {
    if (!context.authUser) return { ok: false, error: "Unauthorized" };
    try {
      return await callBridge("/status", "GET");
    } catch (e: any) {
      return { ok: false, error: e?.message || "Bridge unreachable" };
    }
  });

// ── Diagnostic: hits /health (no HMAC) and explains exact failure mode ─
export const diagnoseWhatsAppBridge = createServerFn({ method: "GET" })
  .middleware([firebaseAuthMiddleware])
  .handler(async ({ context }) => {
    if (!context.authUser) return { ok: false, error: "Unauthorized" };
    const baseUrl = process.env.WA_BRIDGE_BASE_URL;
    if (!baseUrl) {
      return {
        ok: false,
        stage: "config",
        error: "WA_BRIDGE_BASE_URL secret is not set",
        hint: "Add WA_BRIDGE_BASE_URL in Lovable → Project Settings → Secrets (e.g. https://wa-bridge.yourdomain.com).",
      };
    }
    if (!process.env.WA_BRIDGE_HMAC_SECRET) {
      return {
        ok: false,
        stage: "config",
        error: "WA_BRIDGE_HMAC_SECRET secret is not set",
        hint: "Add WA_BRIDGE_HMAC_SECRET in Lovable Secrets — it must match HMAC_SECRET in the VPS .env.",
      };
    }
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const healthUrl = `${cleanUrl}/health`;
    const started = Date.now();
    try {
      const res = await fetch(healthUrl, { method: "GET", signal: AbortSignal.timeout(8000) });
      const elapsed = Date.now() - started;
      const text = await res.text().catch(() => "");
      if ([520, 521, 522, 523, 524, 525, 526, 530].includes(res.status)) {
        return {
          ok: false,
          stage: "cloudflare",
          status: res.status,
          baseUrl: cleanUrl,
          elapsedMs: elapsed,
          error: `Cloudflare ${res.status} — origin VPS not responding`,
          hint:
            "The bridge process on your VPS is DOWN or unreachable from Cloudflare. SSH in and run:\n" +
            "  sudo systemctl status whatsapp-bridge\n" +
            "If inactive/failed:  sudo systemctl restart whatsapp-bridge\n" +
            "Then check the crash reason:  sudo journalctl -u whatsapp-bridge -n 100 --no-pager\n" +
            "Also confirm: (1) port 8788 is open in firewall, (2) Cloudflare DNS A-record points to the correct VPS IP, (3) the origin SSL cert is valid if using strict mode.",
        };
      }
      if (!res.ok) {
        return {
          ok: false,
          stage: "http",
          status: res.status,
          baseUrl: cleanUrl,
          elapsedMs: elapsed,
          error: `HTTP ${res.status} from /health`,
          body: text.slice(0, 300),
          hint: "Bridge reachable but /health returned an error — check journalctl on the VPS.",
        };
      }
      return {
        ok: true,
        stage: "ok",
        status: res.status,
        baseUrl: cleanUrl,
        elapsedMs: elapsed,
        body: text.slice(0, 300),
      };
    } catch (e: any) {
      const elapsed = Date.now() - started;
      const msg = e?.message || String(e);
      let hint = "Cannot reach the bridge URL at all. ";
      if (/timeout|aborted/i.test(msg)) hint += "Request timed out — VPS firewall is blocking, or process is hung.";
      else if (/ENOTFOUND|getaddrinfo/i.test(msg)) hint += "DNS lookup failed — WA_BRIDGE_BASE_URL domain does not resolve.";
      else if (/ECONNREFUSED/i.test(msg)) hint += "Connection refused — bridge is not listening on that port.";
      else hint += "Verify the URL is correct and VPS is online.";
      return { ok: false, stage: "network", baseUrl: cleanUrl, elapsedMs: elapsed, error: msg, hint };
    }
  });

// ── Restart bridge (admin: optionally purge session for fresh QR) ──────
export const restartWhatsApp = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: { purgeSession?: boolean }) => input)
  .handler(async ({ data, context }) => {
    if (!context.authUser) return { ok: false, error: "Unauthorized" };
    try {
      return await callBridge("/restart", "POST", { purgeSession: !!data.purgeSession });
    } catch (e: any) {
      return { ok: false, error: e?.message || "Bridge unreachable" };
    }
  });

// ── Send single ─────────────────────────────────────────────────────────
export const sendWhatsAppMessage = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: {
    phone: string;
    body?: string;
    mediaBase64?: string;
    mediaMime?: string;
    caption?: string;
  }) => input)
  .handler(async ({ data, context }) => {
    if (!context.authUser) return { ok: false, error: "Unauthorized" };
    if (!data.phone) return { ok: false, error: "phone required" };
    if (!data.body && !data.mediaBase64) return { ok: false, error: "body or media required" };
    try {
      return await callBridge("/send", "POST", data);
    } catch (e: any) {
      return { ok: false, error: e?.message || "Bridge unreachable" };
    }
  });

// ── Bulk dispatch ───────────────────────────────────────────────────────
export const dispatchWhatsAppCampaign = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: {
    campaignId: string;
    messages: Array<{
      phone: string;
      body: string;
      name?: string;
      recipientId?: string;
    }>;
  }) => input)
  .handler(async ({ data, context }) => {
    if (!context.authUser) return { ok: false, error: "Unauthorized" };
    if (!data.campaignId || !Array.isArray(data.messages) || data.messages.length === 0) {
      return { ok: false, error: "campaignId + messages required" };
    }
    if (data.messages.length > 100) {
      return { ok: false, error: "Hard cap: 100 messages per dispatch (ban risk)" };
    }
    try {
      return await callBridge("/bulk", "POST", data);
    } catch (e: any) {
      return { ok: false, error: e?.message || "Bridge unreachable" };
    }
  });

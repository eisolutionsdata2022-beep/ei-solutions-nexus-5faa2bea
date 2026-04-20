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

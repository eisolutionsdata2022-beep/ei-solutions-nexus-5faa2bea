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

function bridgeCandidates(rawUrl: string): string[] {
  const clean = rawUrl.replace(/\/$/, "");
  const candidates = new Set<string>([clean]);

  if (!/\/wa$/i.test(clean)) candidates.add(`${clean}/wa`);
  if (/\/wa$/i.test(clean)) candidates.add(clean.replace(/\/wa$/i, ""));

  try {
    const parsed = new URL(clean);
    const basePath = parsed.pathname.replace(/\/$/, "");
    const rootPath = /\/wa$/i.test(basePath) ? basePath : `${basePath}/wa`;

    if (parsed.hostname.startsWith("wa.")) {
      const rootHost = parsed.hostname.slice(3);
      const rootOrigin = `${parsed.protocol}//${rootHost}${parsed.port ? `:${parsed.port}` : ""}`;
      candidates.add(`${rootOrigin}${rootPath || "/wa"}`.replace(/\/$/, ""));
    } else if (parsed.hostname.split(".").length >= 2) {
      const waOrigin = `${parsed.protocol}//wa.${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
      candidates.add((/\/wa$/i.test(basePath) ? waOrigin : `${waOrigin}${basePath}`).replace(/\/$/, ""));
    }
  } catch {
    // Ignore malformed URLs here — downstream diagnostics already explain config issues.
  }

  return [...candidates];
}

async function probeBridgeBaseUrl() {
  const rawUrl = bridgeBaseUrl();
  const attempts: Array<{ baseUrl: string; status?: number; body?: string; error?: string }> = [];

  for (const baseUrl of bridgeCandidates(rawUrl)) {
    try {
      const res = await fetch(`${baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      const body = await res.text().catch(() => "");
      attempts.push({ baseUrl, status: res.status, body: body.slice(0, 200) });

      if (res.ok) return { ok: true as const, baseUrl, attempts };
    } catch (e: any) {
      attempts.push({ baseUrl, error: e?.message || String(e) });
    }
  }

  return { ok: false as const, attempts };
}

async function callBridge(path: string, method: "GET" | "POST", body?: any) {
  const resolved = await probeBridgeBaseUrl();
  const baseUrl = resolved.ok ? resolved.baseUrl : bridgeBaseUrl();
  const url = `${baseUrl}${path}`;
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
    const started = Date.now();
    const resolved = await probeBridgeBaseUrl();
    const elapsed = Date.now() - started;

    if (resolved.ok) {
      const chosen = resolved.attempts.find((a) => a.baseUrl === resolved.baseUrl);
      const rawBase = baseUrl.replace(/\/$/, "");
      const normalized = resolved.baseUrl !== rawBase;
      return {
        ok: true,
        stage: normalized ? "normalized" : "ok",
        status: chosen?.status ?? 200,
        baseUrl: resolved.baseUrl,
        elapsedMs: elapsed,
        body: chosen?.body || "",
        hint: normalized
          ? `Bridge responded at ${resolved.baseUrl}. Your configured URL likely needs the /wa proxy path.`
          : undefined,
      };
    }

    const firstHttp = resolved.attempts.find((a) => typeof a.status === "number");
    const firstError = resolved.attempts.find((a) => a.error);
    const attempted = resolved.attempts.map((a) => `${a.baseUrl}${typeof a.status === "number" ? ` → HTTP ${a.status}` : a.error ? ` → ${a.error}` : ""}`).join("\n");

    if (firstHttp?.status === 526) {
      const rawBase = baseUrl.replace(/\/$/, "");
      const isDedicatedWaHost = /\/\/wa\./i.test(rawBase);
      return {
        ok: false,
        stage: "ssl",
        status: 526,
        baseUrl: firstHttp.baseUrl,
        elapsedMs: elapsed,
        error: "Cloudflare 526 — invalid SSL certificate on the bridge host",
        hint:
          (isDedicatedWaHost
            ? "Your bridge is configured on a dedicated wa subdomain. nginx should proxy location / to 127.0.0.1:8788, and the TLS certificate must be issued for wa.eisoluions.xyz specifically.\n\nRun on the VPS:\n  sudo cp /opt/whatsapp-bridge/nginx-wa.eisoluions.xyz.conf.example /etc/nginx/sites-available/wa.eisoluions.xyz\n  sudo ln -sf /etc/nginx/sites-available/wa.eisoluions.xyz /etc/nginx/sites-enabled/wa.eisoluions.xyz\n  sudo nginx -t && sudo systemctl reload nginx\n  sudo certbot --nginx -d wa.eisoluions.xyz --redirect --agree-tos -m admin@eisoluions.xyz --non-interactive\n\nThen verify:\n  curl -i https://wa.eisoluions.xyz/health"
            : "Your bridge appears to be behind a path-based proxy. nginx must forward /wa/ to 127.0.0.1:8788/, and the TLS certificate must match the public hostname you configured in WA_BRIDGE_BASE_URL.\n\nAfter fixing nginx + cert, verify the public URL returns 200.") +
          `\n\nTried:\n${attempted}`,
      };
    }

    if (firstHttp && [520, 521, 522, 523, 524, 525, 530].includes(firstHttp.status!)) {
      const rawBase = baseUrl.replace(/\/$/, "");
      const isDedicatedWaHost = /\/\/wa\./i.test(rawBase);
      return {
        ok: false,
        stage: "cloudflare",
        status: firstHttp.status,
        baseUrl: firstHttp.baseUrl,
        elapsedMs: elapsed,
        error: `Cloudflare ${firstHttp.status} — origin VPS not responding`,
        hint:
          "The bridge process on your VPS is DOWN or unreachable from the proxy. SSH in and run:\n" +
          "  sudo systemctl status whatsapp-bridge\n" +
          "  sudo journalctl -u whatsapp-bridge -n 100 --no-pager\n" +
          (isDedicatedWaHost
            ? "Also confirm wa.eisoluions.xyz points to the correct VPS IP and nginx proxies location / to 127.0.0.1:8788.\n\n"
            : "Also confirm the DNS record points to the correct VPS IP and nginx forwards /wa/ to 127.0.0.1:8788.\n\n") +
          `Tried:\n${attempted}`,
      };
    }

    if (firstHttp?.status === 403 || firstHttp?.status === 404) {
      return {
        ok: false,
        stage: "proxy",
        status: firstHttp.status,
        baseUrl: firstHttp.baseUrl,
        elapsedMs: elapsed,
        error: `HTTP ${firstHttp.status} from bridge health probe`,
        body: firstHttp.body,
        hint:
          "The host is reachable, but it is not serving the WhatsApp bridge route correctly. This usually means WA_BRIDGE_BASE_URL points at the main website instead of the VPS reverse proxy, or nginx is missing the /wa/ location block.\n\n" +
          `Tried:\n${attempted}`,
      };
    }

    if (firstHttp) {
      return {
        ok: false,
        stage: "http",
        status: firstHttp.status,
        baseUrl: firstHttp.baseUrl,
        elapsedMs: elapsed,
        error: `HTTP ${firstHttp.status} from /health`,
        body: firstHttp.body,
        hint: `Bridge host responded unexpectedly. Tried:\n${attempted}`,
      };
    }

    const msg = firstError?.error || "Bridge unreachable";
    let hint = "Cannot reach the bridge URL at all. ";
    if (/timeout|aborted/i.test(msg)) hint += "Request timed out — VPS firewall is blocking, or process is hung.";
    else if (/ENOTFOUND|getaddrinfo/i.test(msg)) hint += "DNS lookup failed — the bridge host does not resolve.";
    else if (/ECONNREFUSED/i.test(msg)) hint += "Connection refused — bridge is not listening on that port.";
    else hint += "Verify the URL is correct and the VPS proxy is online.";

    if (/\/\/wa\./i.test(baseUrl)) {
      try {
        const parsed = new URL(baseUrl);
        const rootHost = parsed.hostname.startsWith("wa.") ? parsed.hostname.slice(3) : parsed.hostname;
        hint += ` If you intended to use the main site domain, point WA_BRIDGE_BASE_URL to ${parsed.protocol}//${rootHost}/wa after nginx is configured.`;
      } catch {
        // no-op
      }
    }
    return { ok: false, stage: "network", baseUrl: baseUrl.replace(/\/$/, ""), elapsedMs: elapsed, error: msg, hint: `${hint}\n\nTried:\n${attempted}` };
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

// ── Refresh all contact avatars (admin maintenance) ─────────────────────
export const refreshWhatsAppAvatars = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .handler(async ({ context }) => {
    if (!context.authUser) return { ok: false, error: "Unauthorized" };
    try {
      return await callBridge("/refresh-avatars", "POST", {});
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

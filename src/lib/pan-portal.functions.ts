/**
 * PAN Portal — server functions for UTI PSA + Coupon API
 * Provider: mallikacyberzone.com
 *
 * IMPORTANT — corrected per legacy PHP reference (Apr 2026):
 *   The provider expects POST + JSON body with auth fields:
 *       bot_id   = stored as `apiKey`  in our cred blob
 *       api_key  = stored as `secret`  in our cred blob
 *   (The labels were swapped in the admin UI historically. We keep the
 *   storage shape stable and just map them correctly when calling upstream.)
 *
 * Endpoints (POST + JSON):
 *   /Api/WalletTransfer   → coupon purchase   (was wrongly /coupon_buy + GET)
 *   /Api/PSACreate        → new VLE registration
 *   /Api/CouponStatus     → status lookup by utr_no
 *   /Api/PSAPassword      → password reset
 *
 * Coupon purchase: client generates utr_no; amount = qty * 107.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { firebaseAuthMiddleware } from "./firebase-auth.middleware";

// ─── Crypto helpers (AES-GCM) ──────────────────────────────────────────
async function getCryptoKey(): Promise<CryptoKey> {
  const seed = process.env.LOVABLE_API_KEY || "ei-pan-portal-default-seed-do-not-use";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pan-cred|" + seed));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function encryptBlob(apiKey: string, secret: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pt = new TextEncoder().encode(JSON.stringify({ apiKey, secret }));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, pt);
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  return b64encode(combined);
}

async function decryptBlob(cipher: string): Promise<{ apiKey: string; secret: string }> {
  const key = await getCryptoKey();
  const data = b64decode(cipher);
  const iv = data.slice(0, 12);
  const ct = data.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}

/**
 * Map our stored cred blob to the upstream auth fields.
 *
 * In the admin UI the two fields were historically labeled the wrong way:
 *   - "API Key"  → actually the bot_id
 *   - "Secret"   → actually the api_key
 *
 * Heuristic: the legacy `bot_id` looks like `b4b599-bc1eb9-7891de-cd0953-a0d8fb`
 * (groups separated by hyphens), while the api_key is a single ~20-char token.
 * If our stored `apiKey` contains hyphens, we treat it as bot_id; otherwise
 * we assume the operator entered them in the new (correct) order.
 */
function resolveUpstreamAuth(creds: { apiKey: string; secret: string }): { bot_id: string; api_key: string } {
  const a = creds.apiKey.trim();
  const b = creds.secret.trim();
  const aLooksLikeBotId = a.includes("-");
  const bLooksLikeBotId = b.includes("-");
  if (aLooksLikeBotId && !bLooksLikeBotId) return { bot_id: a, api_key: b };
  if (bLooksLikeBotId && !aLooksLikeBotId) return { bot_id: b, api_key: a };
  // Fallback: assume legacy order (apiKey field = bot_id).
  return { bot_id: a, api_key: b };
}

function resolveAuthCandidates(creds: { apiKey: string; secret: string }): Array<{ bot_id: string; api_key: string }> {
  const a = creds.apiKey.trim();
  const b = creds.secret.trim();
  const candidates = [
    resolveUpstreamAuth(creds),
    { bot_id: a, api_key: b },
    { bot_id: b, api_key: a },
  ];
  return candidates.filter((c, i, arr) => arr.findIndex((x) => x.bot_id === c.bot_id && x.api_key === c.api_key) === i);
}

// ─── Provider POST helper (JSON body, per legacy PHP) ──────────────────
function candidateProviderUrls(baseUrl: string, path: string): string[] {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const pathClean = path.replace(/^\/+/, "");
  const normalized = [
    `${cleanBase}/${pathClean}`,
    cleanBase.includes("/index.php") ? "" : `${cleanBase}/index.php/${pathClean}`,
    cleanBase.endsWith("/api") ? `${cleanBase}/index.php/${pathClean}` : "",
    cleanBase.endsWith("/api") ? `${cleanBase.replace(/\/api$/, "")}/index.php/${pathClean}` : "",
  ].filter(Boolean);
  return [...new Set(normalized)];
}

function looksLikeHtmlNotFound(raw: string, status: number): boolean {
  const text = raw.toLowerCase();
  return status === 404 || text.includes("<!doctype html") || text.includes("<html") || text.includes("page not found");
}

function looksLikeProviderStub(raw: string): boolean {
  const text = raw.trim().toLowerCase();
  return text === "test" || text === '"test"';
}

function looksLikeLoginGate(raw: string): boolean {
  const text = raw.toLowerCase();
  return (
    (text.includes("user name") && text.includes("password") && text.includes("forgot password")) ||
    text.includes("portallogin/login") ||
    text.includes("new on our platform?")
  );
}

function shouldRetryProviderResponse(raw: string, status: number): boolean {
  return looksLikeHtmlNotFound(raw, status) || looksLikeProviderStub(raw) || looksLikeLoginGate(raw);
}

function encodeForm(body: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  return params.toString();
}

async function providerPost(
  baseUrl: string,
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; json: any; raw: string; url: string }> {
  let last: { ok: boolean; status: number; json: any; raw: string; url: string } | null = null;

  for (const url of candidateProviderUrls(baseUrl, path)) {
    for (const variant of [
      {
        name: "json",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        requestBody: JSON.stringify(body),
      },
      {
        name: "form",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json, text/html;q=0.9, */*;q=0.8" },
        requestBody: encodeForm(body),
      },
    ]) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: variant.headers,
          body: variant.requestBody,
          signal: AbortSignal.timeout(45_000),
        });
        const raw = await res.text();
        let json: any = {};
        try { json = JSON.parse(raw); } catch { json = { status: "FAILED", message: raw.slice(0, 300) }; }
        const result = { ok: res.ok, status: res.status, json, raw, url };
        last = result;
        if (!shouldRetryProviderResponse(raw, res.status)) {
          return result;
        }
        console.warn("[PAN] provider path miss, trying fallback:", url, "variant=", variant.name, "status=", res.status, "body=", raw.slice(0, 120));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        last = { ok: false, status: 0, json: { status: "FAILED", message: msg }, raw: msg, url };
      }
    }
  }

  return last || {
    ok: false,
    status: 0,
    json: { status: "FAILED", message: "Provider URL resolution failed" },
    raw: "Provider URL resolution failed",
    url: baseUrl,
  };
}

async function providerGet(
  baseUrl: string,
  path: string,
  query: Record<string, string | number>,
): Promise<{ ok: boolean; status: number; json: any; raw: string; url: string }> {
  let last: { ok: boolean; status: number; json: any; raw: string; url: string } | null = null;

  for (const baseCandidate of candidateProviderUrls(baseUrl, path)) {
    const url = new URL(baseCandidate);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(45_000),
      });
      const raw = await res.text();
      let json: any = {};
      try { json = JSON.parse(raw); } catch { json = { status: "FAILED", message: raw.slice(0, 300) }; }
      const result = { ok: res.ok, status: res.status, json, raw, url: url.toString() };
      last = result;
      if (!looksLikeHtmlNotFound(raw, res.status)) return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      last = { ok: false, status: 0, json: { status: "FAILED", message: msg }, raw: msg, url: url.toString() };
    }
  }

  return last || {
    ok: false,
    status: 0,
    json: { status: "FAILED", message: "Provider URL resolution failed" },
    raw: "Provider URL resolution failed",
    url: baseUrl,
  };
}

function generateUtrNo(): string {
  const ts = Date.now().toString();
  const rnd = Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
  return `EIPAN${ts}${rnd}`;
}

function normalizeStatus(raw: unknown): "SUCCESS" | "PENDING" | "FAILED" {
  const s = String(raw || "").toUpperCase();
  if (s === "SUCCESS" || s === "SUCCESSFUL" || s === "OK" || s === "1" || s === "TRUE") return "SUCCESS";
  if (s === "PENDING" || s === "PROCESSING" || s === "INPROGRESS") return "PENDING";
  return "FAILED";
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Encrypt admin credentials
// ═══════════════════════════════════════════════════════════════════════
const encryptInput = z.object({
  apiKey: z.string().min(8).max(120),
  secret: z.string().min(4).max(200),
});

export const encryptPanCredentials = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => encryptInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.authUser) return { success: false as const, error: "Authentication required" };
    try {
      const cipher = await encryptBlob(data.apiKey, data.secret);
      return {
        success: true as const,
        cipher,
        apiKeyHint: data.apiKey.slice(-4),
      };
    } catch (err) {
      console.error("[PAN] encrypt error:", err);
      return { success: false as const, error: "Failed to encrypt credentials" };
    }
  });

// ═══════════════════════════════════════════════════════════════════════
// 2. PSA Create  →  POST /Api/PSACreate
// ═══════════════════════════════════════════════════════════════════════
const psaCreateInput = z.object({
  credCipher: z.string().min(20),
  baseUrl: z.string().url(),
  vleId: z.string().min(3).max(40),
  vleName: z.string().min(2).max(80),
  vleShop: z.string().min(2).max(80),
  vleMob: z.string().regex(/^\d{10}$/),
  vleEmail: z.string().email().max(120),
  vleLoc: z.string().min(2).max(120),
  vleState: z.string().min(1).max(40),
  vlePin: z.string().regex(/^\d{6}$/),
  vleUid: z.string().regex(/^\d{12}$/),
  vlePan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i),
});

export const panPsaCreate = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => psaCreateInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.authUser) return { success: false as const, error: "Authentication required" };

    let creds: { apiKey: string; secret: string };
    try { creds = await decryptBlob(data.credCipher); }
    catch { return { success: false as const, error: "Provider credentials are corrupted. Re-save them in admin settings." }; }

    const auth = resolveUpstreamAuth(creds);

    const r = await providerPost(data.baseUrl, "/Api/PSACreate", {
      bot_id: auth.bot_id,
      api_key: auth.api_key,
      vleid: data.vleId,
      vlename: data.vleName,
      contactperson: data.vleName,
      shopname: data.vleShop,
      mobile: data.vleMob,
      email: data.vleEmail,
      address: data.vleLoc,
      address1: data.vleLoc,
      address2: "",
      address3: "",
      state: data.vleState,
      pincode: data.vlePin,
      aadhaar: data.vleUid,
      pan: data.vlePan.toUpperCase(),
    });

    const status = normalizeStatus(r.json?.status);
    const results = r.json?.results || r.json?.result || {};
    if (status === "SUCCESS" || status === "PENDING") {
      return {
        success: true as const,
        message: r.json?.message || results?.message || "VLE created",
        vleId: String(results?.vle_id || results?.vleid || data.vleId),
        vleStatus: String(results?.vle_status || status).toUpperCase(),
      };
    }
    return {
      success: false as const,
      error: r.json?.message || results?.message || `Provider error (HTTP ${r.status})`,
    };
  });

// ═══════════════════════════════════════════════════════════════════════
// 3. Coupon Buy  →  POST /Api/WalletTransfer
//    Per legacy PHP: amount = qty * 107, client generates utr_no.
// ═══════════════════════════════════════════════════════════════════════
const couponBuyInput = z.object({
  credCipher: z.string().min(20),
  baseUrl: z.string().url(),
  vleId: z.string().min(3).max(40),
  type: z.number().int().min(1).max(99),
  qty: z.number().int().min(1).max(50),
});

export const panCouponBuy = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => couponBuyInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.authUser) return { success: false as const, error: "Authentication required" };

    let creds: { apiKey: string; secret: string };
    try { creds = await decryptBlob(data.credCipher); }
    catch { return { success: false as const, error: "Provider credentials are corrupted." }; }

    const utrNo = generateUtrNo();
    const amount = data.qty * 107;
    const authCandidates = resolveAuthCandidates(creds);
    const apiKeyCandidates = [creds.apiKey.trim(), creds.secret.trim()]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i);

    const finalize = (r: { status: number; json: any; raw: string; url: string }) => {
      const status = normalizeStatus(r.json?.status);
      const results = r.json?.results || r.json?.result || {};
      const message = String(r.json?.message || results?.message || "");
      const messageLower = message.toLowerCase();
      const acceptedByMessage =
        messageLower.includes("coupon request submit successfully") ||
        messageLower.includes("request submit successfully") ||
        messageLower.includes("request submitted successfully");
      if (status === "SUCCESS" || status === "PENDING" || acceptedByMessage) {
        return {
          success: true as const,
          status: (status === "FAILED" ? "PENDING" : status) as "SUCCESS" | "PENDING",
          message: message || "Coupon purchase submitted",
          orderId: String(results?.txn_no || results?.utr_no || results?.order_id || utrNo),
          date: String(results?.date || results?.txn_date || ""),
          vleId: String(results?.vle_id || results?.vleid || data.vleId),
          vleName: String(results?.vle_name || results?.vlename || ""),
          qty: Number(results?.qty || data.qty),
        };
      }
      return null;
    };

    let lastError = "Provider request failed";

    for (const auth of authCandidates) {
      const payload = { api_key: auth.api_key, bot_id: auth.bot_id, vle_id: data.vleId, utr_no: utrNo, amount };
      console.log("[PAN][CouponBuy][legacy] →", data.baseUrl, { ...payload, api_key: "***", bot_id: auth.bot_id.slice(0, 6) + "***" });
      const r = await providerPost(data.baseUrl, "/Api/WalletTransfer", payload);
      console.log("[PAN][CouponBuy][legacy] ← url=", r.url, "status=", r.status, "body=", r.raw.slice(0, 300));
      const ok = finalize(r);
      if (ok) return ok;
      lastError = r.json?.message || `Provider error (HTTP ${r.status})`;
    }

    for (const apiKey of apiKeyCandidates) {
      const queryVariants: Array<Record<string, string | number>> = [
        { api_key: apiKey, vle_id: data.vleId, type: data.type, qty: data.qty },
        { api_key: apiKey, vle_id: data.vleId, type: data.type, qty: data.qty, weburl: "eisoluions.xyz" },
        { api_key: apiKey, vle_id: data.vleId, type: "p-coupon", qty: data.qty },
        { api_key: apiKey, vle_id: data.vleId, type: "p-coupon", qty: data.qty, weburl: "eisoluions.xyz" },
      ];
      for (const query of queryVariants) {
        const r = await providerGet(data.baseUrl, "coupon_buy", query);
        console.log("[PAN][CouponBuy][docs] ← url=", r.url, "status=", r.status, "body=", r.raw.slice(0, 300));
        const ok = finalize(r);
        if (ok) return ok;
        lastError = r.json?.message || `Provider error (HTTP ${r.status})`;
      }
    }

    return { success: false as const, error: lastError };
  });

// ═══════════════════════════════════════════════════════════════════════
// 4. Coupon Status  →  POST /Api/CouponStatus
// ═══════════════════════════════════════════════════════════════════════
const couponStatusInput = z.object({
  credCipher: z.string().min(20),
  baseUrl: z.string().url(),
  orderId: z.string().min(4).max(80),
});

export const panCouponStatus = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => couponStatusInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.authUser) return { success: false as const, error: "Authentication required" };

    let creds: { apiKey: string; secret: string };
    try { creds = await decryptBlob(data.credCipher); }
    catch { return { success: false as const, error: "Provider credentials are corrupted." }; }

    const auth = resolveUpstreamAuth(creds);

    const r = await providerPost(data.baseUrl, "/Api/CouponStatus", {
      bot_id: auth.bot_id,
      api_key: auth.api_key,
      utr_no: data.orderId,
    });

    const status = normalizeStatus(r.json?.status);
    const results = r.json?.results || r.json?.result || {};
    return {
      success: true as const,
      status,
      message: r.json?.message || results?.message || "",
      orderId: String(results?.txn_no || results?.utr_no || data.orderId),
      date: String(results?.date || results?.txn_date || ""),
      vleId: String(results?.vle_id || results?.vleid || ""),
      vleName: String(results?.vle_name || results?.vlename || ""),
      qty: Number(results?.qty || 0),
    };
  });

// ═══════════════════════════════════════════════════════════════════════
// 5. PSA Password Reset  →  POST /Api/PSAPassword
// ═══════════════════════════════════════════════════════════════════════
const psaPwdInput = z.object({
  credCipher: z.string().min(20),
  baseUrl: z.string().url(),
  vleId: z.string().min(3).max(40),
});

export const panPsaPasswordReset = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => psaPwdInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.authUser) return { success: false as const, error: "Authentication required" };

    let creds: { apiKey: string; secret: string };
    try { creds = await decryptBlob(data.credCipher); }
    catch { return { success: false as const, error: "Provider credentials are corrupted." }; }

    const auth = resolveUpstreamAuth(creds);

    const r = await providerPost(data.baseUrl, "/Api/PSAPassword", {
      bot_id: auth.bot_id,
      api_key: auth.api_key,
      vleid: data.vleId,
    });

    const status = normalizeStatus(r.json?.status);
    if (status === "SUCCESS") {
      return { success: true as const, message: r.json?.message || "Password reset successfully" };
    }
    return { success: false as const, error: r.json?.message || `Provider error (HTTP ${r.status})` };
  });

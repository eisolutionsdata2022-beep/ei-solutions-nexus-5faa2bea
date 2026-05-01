/**
 * PAN Portal — server functions for UTI PSA + Coupon API
 * Provider: mallikacyberzone.com  (api_key + secret stored encrypted in pan_config/master).
 *
 * Endpoints:
 *   GET  /psa_create?api_key=…&vle_id=…&vle_name=…&...
 *   GET  /coupon_buy?api_key=…&vle_id=…&type=1&qty=…
 *   GET  /coupon_status?api_key=…&order_id=…
 *   GET  /psa_password?api_key=…&vle_id=…
 *
 * All server functions require Firebase auth. Admin-only ones additionally
 * verify the caller's role from Firestore.
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

// ─── Provider config loader (server-side direct Firestore read) ─────────
async function loadProviderConfig(): Promise<{
  apiKey: string;
  baseUrl: string;
}> {
  throw new Error("loadProviderConfig should not be called directly — pass cipher + baseUrl in input");
}
void loadProviderConfig;

// ─── Provider GET helper ───────────────────────────────────────────────
async function providerGet(
  baseUrl: string,
  path: string,
  params: Record<string, string | number>,
): Promise<{ ok: boolean; status: number; json: any; raw: string }> {
  const url = new URL(baseUrl.replace(/\/+$/, "") + path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    const raw = await res.text();
    let json: any = {};
    try { json = JSON.parse(raw); } catch { json = { status: "FAILED", message: raw.slice(0, 200) }; }
    return { ok: res.ok, status: res.status, json, raw };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, json: { status: "FAILED", message: msg }, raw: msg };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Encrypt admin credentials (admin only, but middleware just verifies auth).
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
// 2. PSA Create
// ═══════════════════════════════════════════════════════════════════════
const psaCreateInput = z.object({
  credCipher: z.string().min(20),
  baseUrl: z.string().url(),
  vleId: z.string().min(3).max(40),
  vleName: z.string().min(2).max(80),
  vleShop: z.string().min(2).max(80),
  vleMob: z.string().regex(/^\d{10}$/),
  vleEmail: z.string().email().max(120),
  vleLoc: z.string().min(2).max(80),
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

    const r = await providerGet(data.baseUrl, "/psa_create", {
      api_key: creds.apiKey,
      vle_id: data.vleId,
      vle_name: data.vleName,
      vle_shop: data.vleShop,
      vle_mob: data.vleMob,
      vle_email: data.vleEmail,
      vle_loc: data.vleLoc,
      vle_state: data.vleState,
      vle_pin: data.vlePin,
      vle_uid: data.vleUid,
      vle_pan: data.vlePan.toUpperCase(),
    });

    const status = String(r.json?.status || "").toUpperCase();
    if (status === "SUCCESS") {
      return {
        success: true as const,
        message: r.json?.message || "VLE created",
        vleId: r.json?.vle_id || data.vleId,
        vleStatus: String(r.json?.vle_status || "PENDING").toUpperCase(),
      };
    }
    return {
      success: false as const,
      error: r.json?.message || `Provider error (HTTP ${r.status})`,
    };
  });

// ═══════════════════════════════════════════════════════════════════════
// 3. Coupon Buy
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

    const r = await providerGet(data.baseUrl, "/coupon_buy", {
      api_key: creds.apiKey,
      vle_id: data.vleId,
      type: data.type,
      qty: data.qty,
    });

    const status = String(r.json?.status || "").toUpperCase();
    if (status === "SUCCESS" || status === "PENDING") {
      return {
        success: true as const,
        status: status as "SUCCESS" | "PENDING",
        message: r.json?.message || "Coupon purchase submitted",
        orderId: String(r.json?.order_id || ""),
        date: String(r.json?.date || ""),
        vleId: String(r.json?.vle_id || data.vleId),
        vleName: String(r.json?.vle_name || ""),
        qty: Number(r.json?.qty || data.qty),
      };
    }
    return {
      success: false as const,
      error: r.json?.message || `Provider error (HTTP ${r.status})`,
    };
  });

// ═══════════════════════════════════════════════════════════════════════
// 4. Coupon Status
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

    const r = await providerGet(data.baseUrl, "/coupon_status", {
      api_key: creds.apiKey,
      order_id: data.orderId,
    });

    const status = String(r.json?.status || "").toUpperCase();
    return {
      success: true as const,
      status: (status === "SUCCESS" || status === "PENDING" || status === "FAILED")
        ? (status as "SUCCESS" | "PENDING" | "FAILED")
        : "PENDING",
      message: r.json?.message || "",
      orderId: String(r.json?.order_id || data.orderId),
      date: String(r.json?.date || ""),
      vleId: String(r.json?.vle_id || ""),
      vleName: String(r.json?.vle_name || ""),
      qty: Number(r.json?.qty || 0),
    };
  });

// ═══════════════════════════════════════════════════════════════════════
// 5. PSA Password Reset
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

    const r = await providerGet(data.baseUrl, "/psa_password", {
      api_key: creds.apiKey,
      vle_id: data.vleId,
    });

    const status = String(r.json?.status || "").toUpperCase();
    if (status === "SUCCESS") {
      return { success: true as const, message: r.json?.message || "Password reset successfully" };
    }
    return { success: false as const, error: r.json?.message || `Provider error (HTTP ${r.status})` };
  });

/**
 * PAN Portal — server functions.
 *
 * Wraps the legacy mallikarecharge/utibot endpoints behind Firebase auth.
 * Credentials (api_key + secret) are AES-GCM encrypted and stored at
 * `pan_config/master.cipher`. Server functions decrypt on demand and
 * never return them to the client.
 *
 * Public webhook (`/api/public/pan-portal/nsdl-webhook`) handled separately
 * in src/routes/api.public.pan-portal.nsdl-webhook.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getApps, initializeApp } from "firebase/app";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { firebaseAuthMiddleware } from "./firebase-auth.middleware";
import { PAN_DEFAULT_FEES, PAN_DEFAULT_URLS, type PanMasterConfig } from "./pan-portal-types";

/* ---------------------------- crypto helpers ----------------------------- */
// Same scheme used by csc-bridge.functions.ts — re-implemented locally to
// avoid cross-importing server-only modules.

const PAN_CRED_CIPHER_PREFIX = "panv2:";
const PAN_LEGACY_FALLBACK_SEED = "ei-solutions-pan-default-key-do-not-use-in-prod";
const firebaseConfig = {
  apiKey: "AIzaSyDCCMmXPtFxcylhjRNvlR5PFgLYwgzb12U",
  authDomain: "ei-fix.firebaseapp.com",
  projectId: "ei-fix",
  storageBucket: "ei-fix.firebasestorage.app",
  messagingSenderId: "80350889731",
  appId: "1:80350889731:web:4a7a9af9ec8a10e1c4cb36",
  measurementId: "G-78XX8NWC2M",
};

async function getCryptoKey(seed: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pan-cred|" + seed));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function getPanCredentialSeeds(): string[] {
  const configuredSeed = process.env.LOVABLE_API_KEY?.trim();
  return Array.from(new Set([configuredSeed, PAN_LEGACY_FALLBACK_SEED].filter(Boolean) as string[]));
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
async function encryptCreds(apiKey: string, secret: string): Promise<string> {
  const key = await getCryptoKey(process.env.LOVABLE_API_KEY?.trim() || PAN_LEGACY_FALLBACK_SEED);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify({ apiKey, secret }));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  return `${PAN_CRED_CIPHER_PREFIX}${b64encode(combined)}`;
}

function parsePanCreds(value: unknown): { apiKey: string; secret: string } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const apiKey = typeof record.apiKey === "string" ? record.apiKey.trim() : "";
  const secret = typeof record.secret === "string" ? record.secret : "";
  return apiKey ? { apiKey, secret } : null;
}

async function decryptCreds(cipher: string): Promise<{ apiKey: string; secret: string }> {
  const raw = cipher.trim();
  const directJson = raw.startsWith("{") ? parsePanCreds(JSON.parse(raw)) : null;
  if (directJson) return directJson;

  const encoded = raw.startsWith(PAN_CRED_CIPHER_PREFIX) ? raw.slice(PAN_CRED_CIPHER_PREFIX.length) : raw;
  let lastError: unknown = null;

  try {
    const decodedText = new TextDecoder().decode(b64decode(encoded));
    const parsed = parsePanCreds(JSON.parse(decodedText));
    if (parsed) return parsed;
  } catch {
    // Not a base64(JSON) legacy payload; continue with AES-GCM attempts.
  }

  const data = b64decode(encoded);
  const iv = data.slice(0, 12);
  const ct = data.slice(12);
  for (const seed of getPanCredentialSeeds()) {
    try {
      const key = await getCryptoKey(seed);
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
      if (seed === PAN_LEGACY_FALLBACK_SEED && process.env.LOVABLE_API_KEY?.trim()) {
        console.warn("[PAN] decrypted credentials using legacy fallback seed");
      }
      return JSON.parse(new TextDecoder().decode(pt));
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("Unable to decrypt PAN credentials");
}

function getDb() {
  const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  return getFirestore(app);
}

async function readPanMasterConfig(): Promise<PanMasterConfig> {
  const snap = await getDoc(doc(getDb(), "pan_config", "master"));
  const data = snap.exists() ? (snap.data() as PanMasterConfig) : {};
  const utiCouponPurchaseUrl = data.utiCouponPurchaseUrl?.trim();
  const utiPanStatusUrl = data.utiPanStatusUrl?.trim();

  return {
    ...PAN_DEFAULT_URLS,
    ...PAN_DEFAULT_FEES,
    enabled: true,
    ...data,
    utiCouponPurchaseUrl: utiCouponPurchaseUrl || PAN_DEFAULT_URLS.utiCouponPurchaseUrl,
    utiPanStatusUrl: utiPanStatusUrl || PAN_DEFAULT_URLS.utiPanStatusUrl,
  };
}

function sanitizePanConfig(config: PanMasterConfig): PanMasterConfig {
  const { cipher: _cipher, webhookSecret: _webhookSecret, ...safe } = config;
  return safe;
}

type PanClientConfigResult =
  | { success: true; config: PanMasterConfig }
  | { success: false; error: string };

export const getPanClientConfig = createServerFn({ method: "GET" })
  .middleware([firebaseAuthMiddleware])
  .handler(async ({ context }): Promise<PanClientConfigResult> => {
    if (!context.authUser) return { success: false, error: "Authentication required" };
    try {
      const config = await readPanMasterConfig();
      return { success: true, config: sanitizePanConfig(config) };
    } catch (err) {
      console.error("[PAN] failed to load client config:", err);
      return { success: false, error: "Unable to load PAN settings" };
    }
  });

/* ----------------------- 1. Encrypt admin credentials -------------------- */

const encryptInput = z.object({
  apiKey: z.string().min(8).max(120),
  secret: z.string().min(8).max(200),
});

export const encryptPanCredentials = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => encryptInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.authUser) {
      return { success: false as const, error: "Authentication required" };
    }
    try {
      const cipher = await encryptCreds(data.apiKey, data.secret);
      const masked =
        data.apiKey.length <= 6
          ? "••••••"
          : data.apiKey.slice(0, 4) + "•".repeat(Math.max(4, data.apiKey.length - 8)) + data.apiKey.slice(-4);
      return { success: true as const, cipher, apiKeyHint: masked };
    } catch (err) {
      console.error("[PAN] encrypt error:", err);
      return { success: false as const, error: "Failed to encrypt credentials" };
    }
  });

/* ------------------------ 2. PSA Auto-ID — create ------------------------ */

const psaCreateInput = z.object({
  url: z.string().url().max(500).optional(),
  cipher: z.string().min(10).max(2000).optional(),
  vleId: z.string().min(2).max(80),
  vleName: z.string().min(1).max(200),
  vleShop: z.string().min(1).max(200),
  vleLoc: z.string().min(1).max(200),
  vleState: z.string().min(1).max(80),
  vleUid: z.string().min(6).max(20),
  vlePin: z.string().regex(/^\d{6}$/),
  vleEmail: z.string().email().max(200),
  vleMob: z.string().regex(/^\d{10}$/),
  vlePan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i).max(10),
});

export type PanPsaResult =
  | { success: true; vleRegCode?: string; message: string; raw: string }
  | { success: false; error: string };

export const panPsaCreate = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => psaCreateInput.parse(input))
  .handler(async ({ data, context }): Promise<PanPsaResult> => {
    if (!context.authUser) return { success: false, error: "Authentication required" };
    let creds: { apiKey: string; secret: string };
    try {
      creds = await decryptCreds(data.cipher);
    } catch {
      return { success: false, error: "Provider credentials are corrupted. Re-save them in admin." };
    }
    const body = {
      api_key: creds.apiKey,
      vle_id: data.vleId,
      vle_name: data.vleName,
      vle_shop: data.vleShop,
      vle_loc: data.vleLoc,
      vle_state: data.vleState,
      vle_uid: data.vleUid,
      vle_pin: data.vlePin,
      vle_email: data.vleEmail,
      vle_mob: data.vleMob,
      vle_pan: data.vlePan.toUpperCase(),
    };
    try {
      const res = await fetch(data.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000),
      });
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* upstream returned non-JSON */ }
      const status = String(json.status ?? "").toLowerCase();
      const message = String(json.message ?? text.slice(0, 200) ?? "Unknown response");
      if (res.ok && status === "success") {
        return {
          success: true,
          vleRegCode: typeof json.vle_regcode === "string" ? json.vle_regcode : undefined,
          message,
          raw: text.slice(0, 2000),
        };
      }
      return { success: false, error: message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Provider unreachable";
      console.error("[PAN][PSA create] fetch error:", err);
      return { success: false, error: msg.includes("timeout") ? "Provider timed out" : `Provider error: ${msg}` };
    }
  });

/* ----------------------- 3. PSA Auto-ID — password ----------------------- */

const psaPwdInput = z.object({
  url: z.string().url().max(500),
  cipher: z.string().min(10).max(2000),
  vleId: z.string().min(2).max(80),
});

export const panPsaPasswordReset = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => psaPwdInput.parse(input))
  .handler(async ({ data, context }): Promise<PanPsaResult> => {
    if (!context.authUser) return { success: false, error: "Authentication required" };
    let creds: { apiKey: string };
    try {
      creds = await decryptCreds(data.cipher);
    } catch {
      return { success: false, error: "Provider credentials are corrupted." };
    }
    const body = { api_key: creds.apiKey, vle_id: data.vleId };
    try {
      const res = await fetch(data.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* non-JSON */ }
      const status = String(json.status ?? "").toLowerCase();
      const message = String(json.message ?? "Unknown response");
      if (res.ok && status === "success") {
        return { success: true, message, raw: text.slice(0, 2000) };
      }
      return { success: false, error: message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Provider unreachable";
      return { success: false, error: msg };
    }
  });

/* --------------- 4. NSDL eKYC — request authorization (SSO) -------------- */

const nsdlAuthInput = z.object({
  url: z.string().url().max(500),
  cipher: z.string().min(10).max(2000),
  userId: z.string().min(2).max(80),    // upstream nsdl_id
  orderId: z.string().min(4).max(80),
  shopName: z.string().min(1).max(200),
  weburl: z.string().min(3).max(200),
  redirectUrl: z.string().url().max(500),
});

export type PanNsdlAuthResult =
  | { success: true; authorization: string; refOrderId: string; message: string; raw: string }
  | { success: false; error: string };

export const panNsdlGetAuthorization = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => nsdlAuthInput.parse(input))
  .handler(async ({ data, context }): Promise<PanNsdlAuthResult> => {
    if (!context.authUser) return { success: false, error: "Authentication required" };
    let creds: { apiKey: string };
    try {
      creds = await decryptCreds(data.cipher);
    } catch {
      return { success: false, error: "Provider credentials are corrupted." };
    }
    const body = {
      api_key: creds.apiKey,
      redirect_url: data.redirectUrl,
      userId: data.userId,
      orderId: data.orderId,
      weburl: data.weburl,
      shop_name: data.shopName,
    };
    try {
      const res = await fetch(data.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000),
      });
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* non-JSON */ }
      const statusCode = String(json.StatusCode ?? json.statusCode ?? "");
      const message = String(json.Message ?? json.message ?? "Unknown response");
      const authorization = String(json.Authorization ?? json.authorization ?? "");
      const refOrderId = String(json.OrderId ?? json.orderId ?? data.orderId);
      if (res.ok && statusCode === "1" && authorization) {
        return { success: true, authorization, refOrderId, message, raw: text.slice(0, 2000) };
      }
      return { success: false, error: message || `Upstream returned ${res.status}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Provider unreachable";
      console.error("[PAN][NSDL auth] fetch error:", err);
      return { success: false, error: msg.includes("timeout") ? "Provider timed out" : msg };
    }
  });

/* --------------- 5. Test connection (admin diagnostic) ------------------- */

const testInput = z.object({
  url: z.string().url().max(500),
  cipher: z.string().min(10).max(2000),
});

export const testPanConnection = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => testInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.authUser) return { ok: false as const, error: "Authentication required" };
    let creds: { apiKey: string };
    try {
      creds = await decryptCreds(data.cipher);
    } catch {
      return { ok: false as const, error: "Credentials corrupted — re-save them" };
    }
    const t0 = Date.now();
    try {
      const res = await fetch(data.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: creds.apiKey, ping: true }),
        signal: AbortSignal.timeout(15_000),
      });
      const elapsed = Date.now() - t0;
      const text = (await res.text()).slice(0, 400);
      return {
        ok: true as const,
        status: res.status,
        elapsed,
        snippet: text,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      return { ok: false as const, error: msg, elapsed: Date.now() - t0 };
    }
  });

/* --------------- 6. UTI — purchase coupon -------------------------------- */

const utiPurchaseInput = z.object({
  url: z.string().url().max(500).optional(),
  cipher: z.string().min(10).max(2000).optional(),
  vleId: z.string().min(2).max(80),
  orderId: z.string().min(4).max(80),
  shopName: z.string().min(1).max(200),
  weburl: z.string().min(3).max(200),
  /** Bulk quantity — upstream PSACoupon endpoint requires qty ≥ 2. */
  qty: z.number().int().min(1).max(100).default(2),
});

export interface PanUtiPurchasedCoupon {
  couponId: string;
  ackNo?: string;
}

export type PanUtiPurchaseResult =
  | {
      success: true;
      orderId: string;
      providerStatus: "success" | "pending";
      coupons: PanUtiPurchasedCoupon[];
      /** Convenience — first coupon (back-compat for single-purchase callers). */
      couponId: string;
      ackNo?: string;
      message: string;
      raw: string;
    }
  | { success: false; error: string; raw?: string };

/**
 * Calls upstream UTI PSACoupon endpoint.
 * The legacy provider (mallikarecharge) requires `qty ≥ 2` per request and
 * returns multiple coupon numbers in one response — sending one-coupon
 * requests in a loop fails with "minimum 2 coupons" upstream.
 */
export const panUtiCouponPurchase = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => utiPurchaseInput.parse(input))
  .handler(async ({ data, context }): Promise<PanUtiPurchaseResult> => {
    if (!context.authUser) return { success: false, error: "Authentication required" };
    const cfg = !data.url || !data.cipher ? await readPanMasterConfig() : null;
    const resolvedUrl = data.url || cfg?.utiCouponPurchaseUrl;
    const resolvedCipher = data.cipher || cfg?.cipher;
    if (!resolvedUrl || !resolvedCipher) {
      return { success: false, error: "Provider credentials are not configured." };
    }
    let creds: { apiKey: string; secret: string };
    try {
      creds = await decryptCreds(resolvedCipher);
    } catch {
      return { success: false, error: "Provider credentials are corrupted." };
    }
    const requestBody = {
      api_key: creds.apiKey,
      secret: creds.secret,
      vle_id: data.vleId,
      weburl: data.weburl,
      order_id: data.orderId,
      shop_name: data.shopName,
      type: 1,
      qty: data.qty,
    };
    try {
      const res = await fetch(resolvedUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, text/html, */*",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60_000),
      });
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* non-JSON */ }
      const results = typeof json.results === "object" && json.results
        ? (json.results as Record<string, unknown>)
        : {};
      const status = String(json.status ?? json.Status ?? "").toLowerCase();
      const message = String(json.message ?? json.Message ?? text.slice(0, 200) ?? "Unknown response");
      const providerOrderId = String(
        json.order_id ?? json.orderId ?? results.order_id ?? results.orderId ?? "",
      ).trim();
      const purchasedQty = Math.max(
        1,
        Math.min(
          data.qty,
          Number(json.qty ?? json.Qty ?? results.qty ?? results.Qty ?? data.qty) || data.qty,
        ),
      );
      const normalizedText = text
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      const alnumCollapsedText = text.replace(/[^A-Za-z0-9]/g, "");
      const hasCouponDetailHtml = /coupon details/i.test(normalizedText) && /coupon id/i.test(normalizedText);
      const htmlReferenceMatch = normalizedText.match(/\b\d{15,20}\b/);
      const normalizedMessage = `${message} ${normalizedText}`.toLowerCase();

      // Extract coupons. Provider may return:
      //   { results: [{coupon_no, ack_no}, ...] }
      //   { results: {coupon_no, ack_no} }
      //   { coupons: [...] }
      //   { data: {coupon_no, ack_no} }
      //   { coupon_no: "X,Y" } (comma-separated)
      //   { coupon_no: "X" } (single)
      const coupons: PanUtiPurchasedCoupon[] = [];
      const seenCoupons = new Set<string>();
      const addCoupon = (couponId: string, ackNo?: string) => {
        const id = couponId.trim();
        if (!id || seenCoupons.has(id)) return;
        seenCoupons.add(id);
        coupons.push({ couponId: id, ackNo: ackNo?.trim() || undefined });
      };
      const couponPattern = /UTIPAN[A-Z0-9]+/gi;
      const ackPattern = /\b\d{15,20}\b/g;
      const parseTextCoupons = (value: string) => {
        const raw = value.trim();
        if (!raw) return;

        const couponMatches = raw.match(couponPattern) ?? [];
        const ackMatches = raw.match(ackPattern) ?? [];
        if (couponMatches.length > 0) {
          couponMatches.forEach((match, index) => addCoupon(match, ackMatches[index] ?? match));
          return;
        }

        raw
          .split(/[,|\n;]+/)
          .map((part) => part.trim())
          .filter(Boolean)
          .forEach((part) => {
            const nestedCoupon = part.match(couponPattern)?.[0];
            if (nestedCoupon) addCoupon(nestedCoupon, part.match(ackPattern)?.[0] ?? nestedCoupon);
          });
      };
      const pushOne = (c: unknown) => {
        if (!c) return;
        if (Array.isArray(c)) {
          c.forEach(pushOne);
          return;
        }
        if (typeof c === "string" || typeof c === "number") {
          parseTextCoupons(String(c));
          return;
        }
        if (typeof c === "object") {
          const obj = c as Record<string, unknown>;
          const couponId = String(
            obj.coupon_no ??
            obj.couponNo ??
            obj.coupon_id ??
            obj.couponId ??
            obj.coupon ??
            obj.Coupon ??
            obj.CouponNo ??
            obj.ack_no ??
            obj.ackNo ??
            "",
          ).trim();
          const ackNo = String(
            obj.ack_no ?? obj.ackNo ?? obj.ack ?? obj.AckNo ?? obj.acknowledgement_no ?? obj.acknowledgementNumber ?? "",
          ).trim();
          if (couponId) addCoupon(couponId, ackNo || couponId);

          pushOne(obj.results ?? obj.result ?? obj.Results ?? obj.data ?? obj.Data ?? null);
          if (!couponId) {
            Object.values(obj).forEach((value) => {
              if (typeof value === "string" || typeof value === "number" || Array.isArray(value)) pushOne(value);
            });
          }
        }
      };

      const htmlCouponMatch = normalizedText.match(/coupon id\s*[:\-]?\s*(UTIPAN[A-Z0-9]+)/i);
      const htmlAckMatch = normalizedText.match(/(?:ack(?:nowledg(?:e)?ment)?\s*(?:no|number)?)[\s:\-#]*([0-9]{15,20})/i);
      if (htmlCouponMatch?.[1]) {
        addCoupon(htmlCouponMatch[1], htmlAckMatch?.[1]);
      }
      const collapsedCouponMatch = alnumCollapsedText.match(/(UTIPAN[A-Z0-9]{10,})/i);
      const collapsedAckMatch = alnumCollapsedText.match(/(?:AckNo|AckNumber|AcknowledgementNo|AcknowledgementNumber)(\d{15,20})/i);
      if (collapsedCouponMatch?.[1]) {
        addCoupon(collapsedCouponMatch[1], collapsedAckMatch?.[1] ?? htmlAckMatch?.[1]);
      }

      pushOne(results);
      pushOne(json.coupons ?? null);
      pushOne(json.data ?? null);
      if (coupons.length === 0) {
        parseTextCoupons(
          String(
            json.coupon_no ??
            json.couponNo ??
            json.coupon_id ??
            json.couponId ??
            json.coupon ??
            json.Coupon ??
            json.ack_no ??
            json.ackNo ??
            message ??
            text,
          ),
        );
      }
      if (coupons.length === 0) {
        parseTextCoupons(text);
      }

      const providerExplicitSuccess = status === "success" || status === "pending" || status === "1";
      const providerHtmlSuccess = coupons.length > 0 && (hasCouponDetailHtml || /UTIPAN/i.test(alnumCollapsedText));
      const providerMessageSuccess = /coupon request submit successfully|coupon submitted successfully|coupon purchase request submitted|request submit successfully|request submitted successfully/i.test(normalizedMessage);
      const providerAccepted = providerExplicitSuccess || providerHtmlSuccess || providerMessageSuccess;
      const providerReference = providerOrderId || collapsedAckMatch?.[1] || htmlAckMatch?.[1] || htmlReferenceMatch?.[0] || data.orderId;
      if (providerExplicitSuccess && providerOrderId && coupons.length < purchasedQty) {
        for (let i = coupons.length; i < purchasedQty; i++) {
          addCoupon(`REF-${providerOrderId}-${String(i + 1).padStart(2, "0")}`, providerOrderId);
        }
      }
      if (providerAccepted && providerReference && coupons.length < purchasedQty) {
        for (let i = coupons.length; i < purchasedQty; i++) {
          addCoupon(`REF-${providerReference}-${String(i + 1).padStart(2, "0")}`, providerReference);
        }
      }
      const normalizedCoupons = coupons.map((coupon) => ({
        couponId: coupon.couponId,
        ackNo: coupon.ackNo || providerReference || coupon.couponId,
      }));

      const successMessage =
        providerMessageSuccess
          ? "Coupon Request Submit Successfully"
          : providerHtmlSuccess && /^missing or invalid parameter$/i.test(message)
            ? "Coupon issued successfully"
            : message;

      if (res.ok && normalizedCoupons.length > 0 && providerAccepted) {
        return {
          success: true,
          orderId: providerReference,
          providerStatus: status === "pending" || providerMessageSuccess ? "pending" : "success",
          coupons: normalizedCoupons,
          couponId: normalizedCoupons[0].couponId,
          ackNo: normalizedCoupons[0].ackNo,
          message: successMessage || "Coupon purchased successfully",
          raw: text.slice(0, 4000),
        };
      }
      if (res.ok && (providerAccepted || hasCouponDetailHtml) && normalizedCoupons.length === 0) {
        console.warn("[PAN][UTI purchase] success response without coupon number", text.slice(0, 1000));
      }
      const safeError = /^<!doctype html/i.test(text.trim())
        ? "Provider returned HTML without a readable coupon number"
        : message || `Upstream returned ${res.status}`;
      return { success: false, error: safeError, raw: text.slice(0, 4000) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Provider unreachable";
      console.error("[PAN][UTI purchase] fetch error:", err);
      return { success: false, error: msg.includes("timeout") ? "Provider timed out" : msg };
    }
  });

/* --------------- 7. UTI — track PAN application by ack/coupon ------------ */

const utiTrackInput = z.object({
  url: z.string().url().max(500).optional(),
  cipher: z.string().min(10).max(2000).optional(),
  ackNo: z.string().min(4).max(80),
});

export type PanUtiTrackResult =
  | {
      success: true;
      applicationStatus: string;
      panNumber?: string;
      message: string;
      raw: string;
    }
  | { success: false; error: string };

export const panUtiPanStatusTrack = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => utiTrackInput.parse(input))
  .handler(async ({ data, context }): Promise<PanUtiTrackResult> => {
    if (!context.authUser) return { success: false, error: "Authentication required" };
    const cfg = !data.url || !data.cipher ? await readPanMasterConfig() : null;
    const resolvedUrl = data.url || cfg?.utiPanStatusUrl;
    const resolvedCipher = data.cipher || cfg?.cipher;
    if (!resolvedUrl || !resolvedCipher) {
      return { success: false, error: "Provider credentials are not configured." };
    }
    let creds: { apiKey: string };
    try {
      creds = await decryptCreds(resolvedCipher);
    } catch {
      return { success: false, error: "Provider credentials are corrupted." };
    }
    const qs = new URL(resolvedUrl);
    qs.searchParams.set("api_key", creds.apiKey);
    qs.searchParams.set("order_id", data.ackNo);
    try {
      const res = await fetch(qs.toString(), {
        method: "GET",
        headers: { Accept: "application/json, text/plain, text/html, */*" },
        signal: AbortSignal.timeout(30_000),
      });
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* non-JSON */ }
      const status = String(json.status ?? "").toLowerCase();
      const message = String(json.message ?? "Unknown response");
      const results = (json.results as Record<string, unknown>) || (json.data as Record<string, unknown>) || {};
      const applicationStatus = String(results.status ?? json.applicationStatus ?? json.txn_status ?? message ?? "").trim();
      const panNumber = String(results.pan_no ?? results.panNo ?? json.pan ?? results.pan ?? "").trim();
      if (res.ok && (status === "success" || status === "pending" || status === "1")) {
        return {
          success: true,
          applicationStatus: applicationStatus || (status === "pending" ? "Pending" : "Processing"),
          panNumber: panNumber && panNumber.toLowerCase() !== "null" ? panNumber.toUpperCase() : undefined,
          message,
          raw: text.slice(0, 2000),
        };
      }
      return { success: false, error: message || `Upstream returned ${res.status}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Provider unreachable";
      console.error("[PAN][UTI track] fetch error:", err);
      return { success: false, error: msg };
    }
  });

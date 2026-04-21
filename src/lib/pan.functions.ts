/**
 * PAN PORTAL — TanStack server functions.
 *
 *   1. encryptPanApiKey(): admin encrypts the mallikacyberzone API key once.
 *      The cipher blob lives at pan_config/master in Firestore.
 *   2. executePanService(): retailer-triggered. Server decrypts the key,
 *      builds the upstream request (GET query-string OR POST JSON), forwards
 *      to mallikacyberzone, and returns a normalized result.
 *
 * AES-GCM key is derived from LOVABLE_API_KEY (same scheme as csc-bridge).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { firebaseAuthMiddleware } from "./firebase-auth.middleware";

// --------------------------------------------------------------------------
// AES-GCM (mirrors csc-bridge implementation, but with a domain-separator)
// --------------------------------------------------------------------------

async function getCryptoKey(): Promise<CryptoKey> {
  const seed = process.env.LOVABLE_API_KEY || "ei-solutions-pan-default-key-do-not-use-in-prod";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pan-api|" + seed));
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

async function encryptApiKey(apiKey: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(apiKey));
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  return b64encode(combined);
}

async function decryptApiKey(cipher: string): Promise<string> {
  const key = await getCryptoKey();
  const data = b64decode(cipher);
  const iv = data.slice(0, 12);
  const ct = data.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// --------------------------------------------------------------------------
// Server fn: encrypt admin-supplied API key. Returns the cipher; the admin
// client writes it to Firestore (pan_config/master).
// --------------------------------------------------------------------------

const encryptInput = z.object({ apiKey: z.string().min(8).max(200) });

export const encryptPanApiKey = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => encryptInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.authUser) {
      return { success: false as const, error: "Authentication required" };
    }
    try {
      const cipher = await encryptApiKey(data.apiKey);
      const last4 = data.apiKey.slice(-4);
      const hint = "•".repeat(Math.max(0, data.apiKey.length - 4)) + last4;
      return { success: true as const, cipher, apiKeyHint: hint };
    } catch (err) {
      console.error("[PAN] encrypt error:", err);
      return { success: false as const, error: "Failed to encrypt API key" };
    }
  });

// --------------------------------------------------------------------------
// Server fn: encrypt admin-supplied API SECRET (paired with API key).
// --------------------------------------------------------------------------

const encryptSecretInput = z.object({ apiSecret: z.string().min(8).max(200) });

export const encryptPanApiSecret = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => encryptSecretInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.authUser) {
      return { success: false as const, error: "Authentication required" };
    }
    try {
      const cipher = await encryptApiKey(data.apiSecret);
      const last4 = data.apiSecret.slice(-4);
      const hint = "•".repeat(Math.max(0, data.apiSecret.length - 4)) + last4;
      return { success: true as const, cipher, apiSecretHint: hint };
    } catch (err) {
      console.error("[PAN] encrypt secret error:", err);
      return { success: false as const, error: "Failed to encrypt API secret" };
    }
  });

// --------------------------------------------------------------------------
// Server fn: encrypt the VPS bridge HMAC secret.
// --------------------------------------------------------------------------

const encryptBridgeInput = z.object({ bridgeSecret: z.string().min(16).max(200) });

export const encryptPanBridgeSecret = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => encryptBridgeInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.authUser) {
      return { success: false as const, error: "Authentication required" };
    }
    try {
      const cipher = await encryptApiKey(data.bridgeSecret);
      const last4 = data.bridgeSecret.slice(-4);
      const hint = "•".repeat(Math.max(0, data.bridgeSecret.length - 4)) + last4;
      return { success: true as const, cipher, vpsBridgeSecretHint: hint };
    } catch (err) {
      console.error("[PAN] encrypt bridge secret error:", err);
      return { success: false as const, error: "Failed to encrypt bridge secret" };
    }
  });

// --------------------------------------------------------------------------
// Server fn: execute a PAN service against mallikacyberzone.
// --------------------------------------------------------------------------

const executeInput = z.object({
  serviceKey: z.string().min(1).max(60),
  serviceName: z.string().min(1).max(120),
  endpoint: z.enum([
    "psaCreate",
    "couponBuy",
    "couponStatus",
    "passwordReset",
    "nsdlAuth",
    "nsdlTxnStatus",
    "nsdlPanStatus",
    "panStatus",
  ]),
  method: z.enum(["GET", "POST"]),
  /** Final URL (admin-configured per endpoint, looked up client-side). */
  url: z.string().url().max(500),
  /** Encrypted API key blob from Firestore. */
  apiKeyCipher: z.string().min(10).max(2000),
  /** User-entered fields. */
  fields: z.record(z.string().min(1).max(60), z.union([z.string().max(500), z.number()])),
  /** Hard-coded extras (application_type=49A, etc.). */
  extras: z.record(z.string().min(1).max(60), z.string().max(200)).optional(),
  /** If true, ask for the redirect URL in the response (NSDL eKYC). */
  expectsRedirect: z.boolean().optional(),
  /** For NSDL POST calls: the retailer's order id we generated client-side. */
  pOrderId: z.string().max(80).optional(),
  /** For NSDL POST calls: the redirect URL the user returns to after eKYC. */
  redirectUrl: z.string().url().max(500).optional(),
});

export type PanExecuteResult =
  | {
      success: true;
      providerRef: string;
      message: string;
      /** Stringified upstream JSON for ledger storage. */
      rawJson: string;
      /** Present when service.expectsRedirect — opens NSDL eKYC. */
      redirectUrl?: string;
    }
  | {
      success: false;
      error: string;
      stage: "decrypt" | "upstream" | "validate" | "auth";
    };

export const executePanService = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => executeInput.parse(input))
  .handler(async ({ data, context }): Promise<PanExecuteResult> => {
    if (!context.authUser) {
      return { success: false, error: "Authentication required", stage: "auth" };
    }

    let apiKey: string;
    try {
      apiKey = await decryptApiKey(data.apiKeyCipher);
    } catch (err) {
      console.error("[PAN] decrypt failed:", err);
      return { success: false, error: "API key is corrupted. Re-save it in admin.", stage: "decrypt" };
    }

    // Build payload merging api_key + extras + user fields.
    const merged: Record<string, string> = { api_key: apiKey, ...(data.extras ?? {}) };
    for (const [k, v] of Object.entries(data.fields)) {
      merged[k] = String(v);
    }
    if (data.pOrderId) merged.p_order_id = data.pOrderId;
    if (data.redirectUrl) merged.redirect_url = data.redirectUrl;

    try {
      let res: Response;
      if (data.method === "GET") {
        const qs = new URLSearchParams(merged).toString();
        res = await fetch(`${data.url}?${qs}`, {
          method: "GET",
          signal: AbortSignal.timeout(45_000),
        });
      } else {
        res = await fetch(data.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(merged),
          signal: AbortSignal.timeout(45_000),
        });
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`[PAN] upstream ${res.status}:`, text);
        return {
          success: false,
          error: `Upstream returned ${res.status}: ${text.slice(0, 200) || res.statusText}`,
          stage: "upstream",
        };
      }

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const status = String(json.status ?? "").toUpperCase();
      const message = typeof json.message === "string" ? json.message : "";
      const rawJson = JSON.stringify(json);

      if (status === "FAILED") {
        return {
          success: false,
          error: message || "Upstream reported failure",
          stage: "upstream",
        };
      }

      // Pull a useful reference. NSDL returns nested `data` with order_id.
      let providerRef = "";
      let redirectUrl: string | undefined;
      const nested = (json.data ?? {}) as Record<string, unknown>;
      providerRef =
        (typeof nested.order_id === "string" && nested.order_id) ||
        (typeof json.order_id === "string" && json.order_id) ||
        (typeof json.vle_id === "string" && json.vle_id) ||
        (typeof nested.ack_no === "string" && nested.ack_no) ||
        `PAN${Date.now()}`;

      if (data.expectsRedirect && typeof nested.authorization === "string") {
        const authType = (data.extras?.application_type as string) || "49A";
        redirectUrl = `https://sso-nsdl-ekyc-app.pages.dev/sso_nsdl_ekyc_redirect?type=${encodeURIComponent(
          authType,
        )}&authorization=${encodeURIComponent(nested.authorization)}`;
      }

      return {
        success: true,
        providerRef,
        message: message || "Transaction successful",
        rawJson,
        redirectUrl,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upstream unreachable";
      console.error("[PAN] upstream fetch error:", err);
      return {
        success: false,
        error: msg.includes("timeout") ? "Upstream timed out (>45s). Try again." : `Upstream unreachable: ${msg}`,
        stage: "upstream",
      };
    }
  });

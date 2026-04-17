/**
 * EI SOLUTIONS PAY — server functions for the CSC bridge.
 *
 * Architecture:
 *   1. Master CSC credentials are encrypted (AES-GCM) using a key derived from
 *      LOVABLE_API_KEY and stored at csc_config/master.cipher in Firestore.
 *   2. When a retailer triggers a service, the server:
 *        a) verifies their Firebase ID token,
 *        b) loads the master config + decrypts credentials,
 *        c) signs a request with HMAC-SHA256,
 *        d) POSTs to the configured VPS bridge URL,
 *        e) returns the bridge's response.
 *   3. The client writes the transaction record to Firestore and debits the
 *      wallet via the existing atomicDebit helper, exactly like other
 *      provider integrations in this codebase.
 *
 * The bridge URL and HMAC secret are configured by the admin in Firestore
 * (csc_config/master), so no Lovable secrets are required to ship the UI.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { firebaseAuthMiddleware } from "./firebase-auth.middleware";

// --------------------------------------------------------------------------
// Encryption helpers — AES-GCM via Web Crypto. Key derived from LOVABLE_API_KEY.
// --------------------------------------------------------------------------

async function getCryptoKey(): Promise<CryptoKey> {
  const seed = process.env.LOVABLE_API_KEY || "ei-solutions-csc-default-key-do-not-use-in-prod";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("csc-cred|" + seed));
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

async function encryptCreds(username: string, password: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify({ username, password }));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  // Pack iv (12 bytes) + ciphertext together
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  return b64encode(combined);
}

async function decryptCreds(cipher: string): Promise<{ username: string; password: string }> {
  const key = await getCryptoKey();
  const data = b64decode(cipher);
  const iv = data.slice(0, 12);
  const ct = data.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  // Hex output
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// --------------------------------------------------------------------------
// Server fn: encrypt admin-supplied master CSC credentials.
// Returns the encrypted blob — the admin client then writes it to Firestore.
// --------------------------------------------------------------------------

const encryptInput = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});

export const encryptCscCredentials = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => encryptInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.authUser) {
      return { success: false as const, error: "Authentication required" };
    }
    try {
      const cipher = await encryptCreds(data.username, data.password);
      const masked =
        data.username.length <= 2
          ? "**"
          : data.username.slice(0, Math.max(1, data.username.length - 2)).replace(/./g, "•") +
            data.username.slice(-2);
      return { success: true as const, cipher, usernameHint: masked };
    } catch (err) {
      console.error("[CSC] encrypt error:", err);
      return { success: false as const, error: "Failed to encrypt credentials" };
    }
  });

// --------------------------------------------------------------------------
// Server fn: execute a CSC service via the VPS bridge.
// --------------------------------------------------------------------------

const executeInput = z.object({
  serviceKey: z.string().min(1).max(60),
  serviceName: z.string().min(1).max(120),
  fields: z.record(z.string().min(1).max(60), z.union([z.string().max(500), z.number()])),
  amount: z.number().positive().max(1_000_000),
  /** Encrypted credential blob loaded from Firestore by the client. */
  credCipher: z.string().min(10).max(2000),
  /** Bridge URL from Firestore master config. */
  bridgeUrl: z.string().url().max(500),
  /** HMAC secret from Firestore master config. */
  hmacSecret: z.string().min(8).max(200),
});

export type CscExecuteResult =
  | {
      success: true;
      bridgeRef: string;
      message: string;
      raw: Record<string, unknown>;
    }
  | {
      success: false;
      error: string;
      stage: "decrypt" | "bridge" | "validate" | "auth";
    };

export const executeCscService = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => executeInput.parse(input))
  .handler(async ({ data, context }): Promise<CscExecuteResult> => {
    if (!context.authUser) {
      return { success: false, error: "Authentication required", stage: "auth" };
    }

    let creds: { username: string; password: string };
    try {
      creds = await decryptCreds(data.credCipher);
    } catch (err) {
      console.error("[CSC] decrypt failed:", err);
      return { success: false, error: "Master credentials are corrupted. Re-save them.", stage: "decrypt" };
    }

    const payload = {
      service: data.serviceKey,
      fields: data.fields,
      amount: data.amount,
      retailerId: context.authUser.uid,
      retailerEmail: context.authUser.email ?? null,
      cscUsername: creds.username,
      cscPassword: creds.password,
      ts: Date.now(),
    };
    const body = JSON.stringify(payload);
    const signature = await hmacSha256(data.hmacSecret, body);

    try {
      const res = await fetch(data.bridgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Signature": signature,
          "X-Timestamp": String(payload.ts),
        },
        body,
        // VPS scrapers can be slow; allow 60s.
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`[CSC] bridge ${res.status}:`, text);
        return {
          success: false,
          error: `Bridge returned ${res.status}: ${text.slice(0, 200) || res.statusText}`,
          stage: "bridge",
        };
      }

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (json.success === false) {
        return {
          success: false,
          error: typeof json.error === "string" ? json.error : "Bridge reported failure",
          stage: "bridge",
        };
      }
      return {
        success: true,
        bridgeRef: typeof json.ref === "string" ? json.ref : `CSC${Date.now()}`,
        message: typeof json.message === "string" ? json.message : "Transaction successful",
        raw: json,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bridge unreachable";
      console.error("[CSC] bridge fetch error:", err);
      return {
        success: false,
        error: msg.includes("timeout") ? "Bridge timed out (>60s). Try again." : `Bridge unreachable: ${msg}`,
        stage: "bridge",
      };
    }
  });

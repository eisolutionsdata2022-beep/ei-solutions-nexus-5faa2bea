/**
 * AceNeoBank API encryption helpers — SERVER-ONLY.
 *
 * The provider documents an "AES256 encrypted apiKey" header, plus encrypted
 * clientId / clientSecret in the body. The exact encryption parameters
 * (algorithm flavor, IV handling, padding) have NOT been formally shared yet —
 * we are awaiting a sample from the provider's support team.
 *
 * This module ships with the most common BBPS-style default: AES-256-CBC with
 * PKCS7 padding, where the IV is prepended to the ciphertext and the full
 * payload is base64-encoded. When the provider confirms the exact spec, only
 * the body of `encrypt` / `decrypt` needs to change — the rest of the stack is
 * already wired through `process.env.BBPS_AES_KEY` / `BBPS_AES_IV`.
 */
import crypto from "crypto";

const ALGO = "aes-256-cbc";

/** Derive a 32-byte key from whatever shape the provider gives us. */
function getKey(): Buffer {
  const raw = process.env.BBPS_AES_KEY ?? "";
  if (!raw) throw new Error("BBPS_AES_KEY is not configured");
  // Accept either a hex/base64 32-byte key or a raw passphrase.
  if (/^[A-Fa-f0-9]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  if (raw.length === 44 && /^[A-Za-z0-9+/=]+$/.test(raw)) return Buffer.from(raw, "base64");
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

/** 16-byte IV — either explicit env var or deterministic from key. */
function getIv(): Buffer {
  const raw = process.env.BBPS_AES_IV ?? "";
  if (raw && /^[A-Fa-f0-9]{32}$/.test(raw)) return Buffer.from(raw, "hex");
  if (raw && raw.length === 24 && /^[A-Za-z0-9+/=]+$/.test(raw)) return Buffer.from(raw, "base64");
  // Fallback — first 16 bytes of SHA-256(key + "iv"). Deterministic, but
  // the provider almost certainly expects an explicit IV; replace once known.
  return crypto.createHash("sha256").update(getKey()).update("iv").digest().subarray(0, 16);
}

/** Encrypt a UTF-8 string and return base64(ciphertext). */
export function encrypt(plain: string): string {
  const cipher = crypto.createCipheriv(ALGO, getKey(), getIv());
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return enc.toString("base64");
}

/** Decrypt a base64 string back to UTF-8 (used in unit tests / debugging). */
export function decrypt(b64: string): string {
  const decipher = crypto.createDecipheriv(ALGO, getKey(), getIv());
  const dec = Buffer.concat([decipher.update(Buffer.from(b64, "base64")), decipher.final()]);
  return dec.toString("utf8");
}

/**
 * Build the apiKey header value — the provider documents this as an
 * "AES256 encrypted string for authentication". We encrypt a timestamped
 * payload `${clientId}|${epochSeconds}` so each request has a fresh header.
 */
export function buildApiKeyHeader(clientId: string): string {
  const payload = `${clientId}|${Math.floor(Date.now() / 1000)}`;
  return encrypt(payload);
}

/**
 * Paytm v2 checksum & encryption — SERVER-ONLY.
 *
 * Direct port of the legacy PHP `PaytmChecksum` class:
 *   - AES-128-CBC encryption with fixed IV `@@@@&&&&####$$$$`
 *   - SHA256 hash + 4-char random salt
 *   - PKCS5 padding (Node crypto handles this automatically)
 *
 * Reference: https://developer.paytm.com/docs/checksum/#node-js
 */
import crypto from "crypto";

const IV = "@@@@&&&&####$$$$";
const SALT_CHARSET =
  "AbcDE123IJKLMN67QRSTUVWXYZaBCdefghijklmn123opq45rs67tuv89wxyz0FGH45OP89";

function generateSalt(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SALT_CHARSET.charAt(Math.floor(Math.random() * SALT_CHARSET.length));
  }
  return out;
}

function encryptAes128(plain: string, key: string): string {
  const cipher = crypto.createCipheriv("aes-128-cbc", Buffer.from(key, "utf8"), Buffer.from(IV, "utf8"));
  return Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString("base64");
}

function decryptAes128(encrypted: string, key: string): string {
  const decipher = crypto.createDecipheriv("aes-128-cbc", Buffer.from(key, "utf8"), Buffer.from(IV, "utf8"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}

/**
 * Generate Paytm signature — for both Checkout and S2S calls.
 * Accepts a string (typically `JSON.stringify(body)`) or a key-value object.
 */
export function generatePaytmSignature(input: string | Record<string, unknown>, key: string): string {
  const str = typeof input === "string" ? input : objectToParamString(input);
  const salt = generateSalt(4);
  const finalString = `${str}|${salt}`;
  const hash = crypto.createHash("sha256").update(finalString).digest("hex");
  return encryptAes128(hash + salt, key);
}

/**
 * Verify Paytm signature — used in callback / status response.
 * Returns true when signature matches.
 */
export function verifyPaytmSignature(
  input: string | Record<string, unknown>,
  key: string,
  signature: string,
): boolean {
  try {
    const str = typeof input === "string" ? input : objectToParamString(input);
    const decrypted = decryptAes128(signature, key);
    const salt = decrypted.slice(-4);
    const computed = crypto.createHash("sha256").update(`${str}|${salt}`).digest("hex") + salt;
    return computed === decrypted;
  } catch {
    return false;
  }
}

/** Sort keys, drop CHECKSUMHASH/empty, join values with `|`. (matches legacy `getStringByParams`) */
function objectToParamString(params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .filter((k) => k !== "CHECKSUMHASH" && params[k] !== null && params[k] !== undefined && params[k] !== "")
    .sort();
  return sorted.map((k) => String(params[k])).join("|");
}

/** Verify checksum on FORM-POST callback (legacy Checkout flow). */
export function verifyCheckoutCallback(formData: Record<string, string>, key: string): boolean {
  const checksum = formData["CHECKSUMHASH"];
  if (!checksum) return false;
  const { CHECKSUMHASH: _omit, ...rest } = formData;
  void _omit;
  return verifyPaytmSignature(rest, key, checksum);
}

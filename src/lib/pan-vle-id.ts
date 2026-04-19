/**
 * Deterministic VLE ID generator for the PAN Portal.
 *
 * Each logged-in user gets a STABLE 6-digit numeric suffix derived from their
 * Firebase UID, prefixed with `PSA`. Same user → same VLE ID, every time.
 *
 * Format:
 *   - Without mobile:  `PSA######`           (e.g. `PSA482917`)
 *   - With mobile:     `PSA######-<mobile>`  (e.g. `PSA482917-9876543210`)
 *
 * The mobile suffix is the user's REGISTERED mobile number — it makes the ID
 * easier to identify for staff/admins and matches the legacy portal format.
 */

/** FNV-1a 32-bit hash — small, fast, deterministic, no external deps. */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

/** Strip everything except digits; keep last 10 (Indian mobile). */
function normalizeMobile(mobile: string | undefined | null): string {
  if (!mobile) return "";
  const digits = String(mobile).replace(/\D+/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Generate a stable VLE ID for a given user UID.
 * If a registered mobile is supplied, it is appended after a hyphen.
 *
 * Returns `PSA` + 6-digit zero-padded number in the range 100000–999999,
 * optionally followed by `-<10-digit-mobile>`.
 */
export function generateVleId(
  uid: string | undefined | null,
  mobile?: string | null,
): string {
  const base = uid
    ? `PSA${100000 + (fnv1a(uid) % 900000)}`
    : "PSA000000";
  const m = normalizeMobile(mobile);
  return m ? `${base}-${m}` : base;
}

/** Just the numeric prefix (no mobile) — used internally for storage keys. */
export function generateVleIdPrefix(uid: string | undefined | null): string {
  return generateVleId(uid, null);
}

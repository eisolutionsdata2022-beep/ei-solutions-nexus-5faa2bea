/**
 * Deterministic VLE ID generator for the PAN Portal.
 *
 * Each logged-in user gets a STABLE 6-digit numeric suffix derived from their
 * Firebase UID, prefixed with `PSA`. Same user → same VLE ID, every time.
 *
 * Format: `PSA` + 6 digits (e.g. `PSA482917`).
 *
 * This ID is auto-pasted into the VLE ID field for PSA Create / Password Reset
 * / Coupon Buy and acts as the retailer's unique identity inside the PAN
 * portal — no manual choice required.
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

/**
 * Generate a stable VLE ID for a given user UID.
 * Returns `PSA` + 6-digit zero-padded number in the range 100000–999999.
 */
export function generateVleId(uid: string | undefined | null): string {
  if (!uid) return "PSA000000";
  // Map hash into 100000..999999 (always 6 digits, never starts with 0)
  const n = 100000 + (fnv1a(uid) % 900000);
  return `PSA${n}`;
}

/**
 * VLE ID helpers for the PAN Portal.
 *
 * WORK LOGIC:
 *   When a new user registers, we auto-generate a VLE ID in the legacy
 *   UTI PSA portal format: `RMPMCST-<10-digit-mobile>` (e.g.
 *   `RMPMCST-9876543210`). This ID is used immediately for coupon buying.
 *
 *   After 2 successful coupon purchases the same ID is "promoted" to a
 *   fully-active PSA ID (badge + congrats banner). The format never changes —
 *   we just flip a flag in Firestore.
 *
 *   Legacy users who already had a PSA ID on the old portal can paste it in
 *   via the Profile page (claimLegacyPsaId).
 */

/** Strip everything except digits; keep last 10 (Indian mobile). */
function normalizeMobile(mobile: string | undefined | null): string {
  if (!mobile) return "";
  const digits = String(mobile).replace(/\D+/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/** Deterministic 10-digit fallback when the user has no mobile on file. */
function fallbackTenDigit(uid: string): string {
  // Simple FNV-1a → 10-digit number so the ID is stable per uid.
  let h = 0x811c9dc5;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  // Force a leading non-zero digit so it always reads as a 10-digit mobile.
  const n = (h % 9_000_000_000) + 1_000_000_000;
  return String(n);
}

/** Placeholder kept for back-compat with existing imports. No longer used as a gate. */
export const PSA_PENDING_PLACEHOLDER = "PSA-PENDING";

/**
 * Generate the user's VLE ID in legacy UTI PSA format: `RMPMCST-<mobile>`.
 * Falls back to a deterministic hash when no mobile is registered, so the
 * format stays uniform.
 */
export function generateVleId(
  uid: string | undefined | null,
  mobile?: string | null,
): string {
  const m = normalizeMobile(mobile);
  if (m.length === 10) return `RMPMCST-${m}`;
  if (uid) return `RMPMCST-${fallbackTenDigit(uid)}`;
  return PSA_PENDING_PLACEHOLDER;
}

/**
 * If the user already has a stored (provider/legacy) VLE ID, show that;
 * otherwise auto-generate one in the legacy `RMPMCST-<mobile>` format.
 */
export function displayVleId(
  storedPsaId: string | undefined | null,
  mobile?: string | null,
  uid?: string | null,
): string {
  if (storedPsaId && storedPsaId.trim()) return storedPsaId.trim();
  return generateVleId(uid, mobile);
}

export function generateVleIdPrefix(_uid: string | undefined | null): string {
  return "RMPMCST";
}

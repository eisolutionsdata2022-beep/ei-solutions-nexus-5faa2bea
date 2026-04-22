/**
 * VLE ID generator — produces the legacy UTI PSA portal format
 * `RMPMCST-<10-digit-mobile>` (e.g. `RMPMCST-9876543210`).
 *
 * Pure presentation helper. No backend / no Firestore writes.
 * Used on the dashboard, profile, and operator pages to display the
 * retailer's VLE ID consistently across the app.
 */

function normalizeMobile(mobile: string | undefined | null): string {
  if (!mobile) return "";
  const digits = String(mobile).replace(/\D+/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/** Deterministic 10-digit fallback when the user has no mobile on file. */
function fallbackTenDigit(uid: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const n = (h % 9_000_000_000) + 1_000_000_000;
  return String(n);
}

export function generateVleId(
  uid: string | undefined | null,
  mobile?: string | null,
): string {
  const m = normalizeMobile(mobile);
  if (m.length === 10) return `RMPMCST-${m}`;
  if (uid) return `RMPMCST-${fallbackTenDigit(uid)}`;
  return "RMPMCST-PENDING";
}

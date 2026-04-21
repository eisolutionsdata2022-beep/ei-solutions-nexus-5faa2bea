/**
 * PSA / VLE ID storage for the PAN Portal.
 *
 * WORK LOGIC (matches the legacy UTI PSA portal):
 *   1. New user registers on our portal.
 *   2. User submits "PSA ID Create" → upstream provider validates KYC and
 *      issues a real VLE ID (e.g. `RMPMCST...` / `PSA309978`).
 *   3. We persist that provider-issued ID via `savePsaIdFromProvider()`.
 *   4. From now on the user can buy coupons (the saved ID is sent upstream).
 *      Once they have ≥ 2 successful coupons they're considered fully
 *      onboarded and can also log into the official UTI portal with the
 *      same ID/password.
 *
 * Legacy users (already had a VLE ID on the old portal) can paste it in
 * via `claimLegacyPsaId()` — no provider call required.
 *
 * We NEVER fabricate a VLE ID locally — fake IDs make the upstream API
 * return "Vle Data Not Exist".
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Retailers need ≥ this many successful coupons to be considered onboarded. */
export const PSA_ONBOARDED_THRESHOLD = 2;

export type PsaIdSource = "provider" | "legacy";

export interface PsaIdRecord {
  uid: string;
  psaId: string;
  status: "active";
  generatedAt: string;
  successfulCouponCount: number;
  source: PsaIdSource;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  /** Optional reference to the upstream PSA-create transaction. */
  providerRef?: string | null;
}

/** Count successful coupon-buy transactions (refunded / failed are ignored). */
export async function countSuccessfulCouponPurchases(uid: string): Promise<number> {
  const snap = await getDocs(
    query(
      collection(db, "pan_transactions"),
      where("retailerId", "==", uid),
      where("serviceKey", "==", "coupon-buy"),
      where("status", "==", "success"),
    ),
  );
  return snap.size;
}

/** Loose validation for any provider-issued or legacy VLE ID. */
function isValidVleId(id: string): boolean {
  return /^[A-Z0-9][A-Z0-9\-]{3,40}$/i.test(id.trim());
}

/**
 * Persist the REAL VLE ID returned by the provider after a successful
 * "PSA ID Create" call. Idempotent — re-running with the same ID is a no-op;
 * a new ID overwrites the previous record (e.g. provider re-issues).
 */
export async function savePsaIdFromProvider(opts: {
  uid: string;
  providerVleId: string;
  providerRef?: string | null;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
}): Promise<PsaIdRecord> {
  const cleaned = opts.providerVleId.trim().toUpperCase();
  if (!isValidVleId(cleaned)) {
    throw new Error(`Provider returned an invalid VLE ID: "${opts.providerVleId}"`);
  }

  const psaRef = doc(db, "psa_ids", opts.uid);
  const successCount = await countSuccessfulCouponPurchases(opts.uid).catch(() => 0);

  return runTransaction(db, async (tx) => {
    const existing = await tx.get(psaRef);
    const record: PsaIdRecord = {
      uid: opts.uid,
      psaId: cleaned,
      status: "active",
      generatedAt: existing.exists()
        ? (existing.data() as PsaIdRecord).generatedAt
        : new Date().toISOString(),
      successfulCouponCount: successCount,
      source: "provider",
      email: opts.email ?? null,
      name: opts.name ?? null,
      phone: opts.phone ?? null,
      providerRef: opts.providerRef ?? null,
    };
    tx.set(psaRef, { ...record, _serverTime: serverTimestamp(), updatedAt: new Date().toISOString() });
    return record;
  });
}

/**
 * LEGACY CLAIM — for users who already had a PSA / VLE ID on the OLD portal.
 * They paste in their existing ID; we save it as-is (no provider call).
 */
export async function claimLegacyPsaId(opts: {
  uid: string;
  legacyPsaId: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
}): Promise<PsaIdRecord> {
  const cleaned = opts.legacyPsaId.trim().toUpperCase();
  if (!isValidVleId(cleaned)) {
    throw new Error("Invalid VLE ID format. Expected something like RMPMCST-9876543210 or PSA123456.");
  }

  const psaRef = doc(db, "psa_ids", opts.uid);
  const successCount = await countSuccessfulCouponPurchases(opts.uid).catch(() => 0);

  return runTransaction(db, async (tx) => {
    const existing = await tx.get(psaRef);
    const record: PsaIdRecord = {
      uid: opts.uid,
      psaId: cleaned,
      status: "active",
      generatedAt: existing.exists()
        ? (existing.data() as PsaIdRecord).generatedAt
        : new Date().toISOString(),
      successfulCouponCount: successCount,
      source: "legacy",
      email: opts.email ?? null,
      name: opts.name ?? null,
      phone: opts.phone ?? null,
    };
    tx.set(psaRef, { ...record, _serverTime: serverTimestamp(), updatedAt: new Date().toISOString() });
    return record;
  });
}

/** Read the stored PSA record. Returns null if the user hasn't registered yet. */
export async function getPsaIdRecord(uid: string): Promise<PsaIdRecord | null> {
  const snap = await getDoc(doc(db, "psa_ids", uid));
  if (!snap.exists()) return null;
  return snap.data() as PsaIdRecord;
}

// ─── Back-compat shims ─────────────────────────────────────────────────────
// Older code paths (admin monitor, dashboard cards) still import these names.
// Keep them exported so the build doesn't break, but the new flow uses
// `savePsaIdFromProvider`.

/** @deprecated — VLE IDs are now provider-issued, not auto-generated. */
export const PSA_AUTO_THRESHOLD = PSA_ONBOARDED_THRESHOLD;

/**
 * @deprecated — kept only so the existing coupon-buy success handler compiles.
 * It NO LONGER fabricates a VLE ID; it just returns the existing record (if
 * any) so callers can refresh their UI.
 */
export async function maybeGeneratePsaId(opts: {
  uid: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
}): Promise<{ generated: boolean; record: PsaIdRecord | null }> {
  void opts.email;
  void opts.name;
  void opts.phone;
  const record = await getPsaIdRecord(opts.uid);
  return { generated: false, record };
}

/**
 * PSA Auto-ID generation + legacy claim.
 *
 * - **Auto-generate**: When a retailer/VLE successfully purchases their **2nd
 *   coupon** (status="success" — refunded/failed are ignored), a unique PSA ID
 *   is auto-generated and persisted to `psa_ids/{uid}` exactly once.
 * - **Legacy claim**: Existing members who already had a PSA ID on the OLD
 *   portal can log in here and *claim/update* their PSA ID via
 *   `claimLegacyPsaId()` — no coupon purchase required. Stored with
 *   `source: "legacy"` so admins can tell them apart.
 *
 * PSA ID format = `PSA######-<10-digit-mobile>` (matches old portal).
 *
 * Uses a Firestore transaction so concurrent triggers can never create a
 * duplicate, and rechecks the success-count inside the txn for safety.
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
import { generateVleId } from "@/lib/pan-vle-id";

/** Minimum number of successful coupon purchases required to auto-generate. */
export const PSA_AUTO_THRESHOLD = 2;

export type PsaIdSource = "auto" | "legacy";

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
}

/**
 * Count successful (non-refunded, non-failed) coupon-buy transactions for a user.
 */
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

/**
 * Atomically create a PSA ID for the user IF:
 *  - they have ≥ PSA_AUTO_THRESHOLD successful coupon-buy transactions, AND
 *  - they don't already have a `psa_ids/{uid}` doc.
 *
 * Returns the new (or existing) record, plus a `generated` flag so callers
 * can show the "Congratulations" notification only on first creation.
 */
export async function maybeGeneratePsaId(opts: {
  uid: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
}): Promise<{ generated: boolean; record: PsaIdRecord | null }> {
  const successCount = await countSuccessfulCouponPurchases(opts.uid);
  if (successCount < PSA_AUTO_THRESHOLD) {
    return { generated: false, record: null };
  }

  const psaRef = doc(db, "psa_ids", opts.uid);

  return runTransaction(db, async (tx) => {
    const existing = await tx.get(psaRef);
    if (existing.exists()) {
      return { generated: false, record: existing.data() as PsaIdRecord };
    }

    // Stable, deterministic, unique-per-uid (FNV-1a hash → PSA + 6 digits)
    // suffixed with the registered mobile number when available.
    const psaId = generateVleId(opts.uid, opts.phone);
    const record: PsaIdRecord = {
      uid: opts.uid,
      psaId,
      status: "active",
      generatedAt: new Date().toISOString(),
      successfulCouponCount: successCount,
      source: "auto",
      email: opts.email ?? null,
      name: opts.name ?? null,
      phone: opts.phone ?? null,
    };

    tx.set(psaRef, { ...record, _serverTime: serverTimestamp() });
    return { generated: true, record };
  });
}

/**
 * LEGACY CLAIM — for users who already had a PSA ID on the OLD portal.
 * They enter their existing PSA ID; we save it (no coupon threshold required).
 *
 * Idempotent: if the user already has a PSA record (auto OR legacy), the
 * stored ID is updated to the supplied legacy ID.
 *
 * Validates the legacy PSA ID format loosely: must contain "PSA" + digits.
 */
export async function claimLegacyPsaId(opts: {
  uid: string;
  legacyPsaId: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
}): Promise<PsaIdRecord> {
  const cleaned = opts.legacyPsaId.trim().toUpperCase();
  if (!/^(PSA|RMPMCST)[\dA-Z\-]{4,}$/i.test(cleaned)) {
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

/** Read the stored PSA record (used by Profile + Admin). Returns null if not created yet. */
export async function getPsaIdRecord(uid: string): Promise<PsaIdRecord | null> {
  const snap = await getDoc(doc(db, "psa_ids", uid));
  if (!snap.exists()) return null;
  return snap.data() as PsaIdRecord;
}

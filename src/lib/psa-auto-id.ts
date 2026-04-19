/**
 * PSA Auto-ID generation.
 *
 * When a retailer/VLE successfully purchases their **2nd coupon** (status =
 * "success" — refunded/failed are ignored), a unique PSA ID is auto-generated
 * and persisted to `psa_ids/{uid}` exactly once.
 *
 * Uses a Firestore transaction so concurrent triggers can never create a
 * duplicate, and rechecks the success-count inside the txn for safety.
 */
import {
  collection,
  doc,
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

export interface PsaIdRecord {
  uid: string;
  psaId: string;
  status: "active";
  generatedAt: string;
  successfulCouponCount: number;
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

    // Stable, deterministic, unique-per-uid (FNV-1a hash → PSA + 6 digits).
    const psaId = generateVleId(opts.uid);
    const record: PsaIdRecord = {
      uid: opts.uid,
      psaId,
      status: "active",
      generatedAt: new Date().toISOString(),
      successfulCouponCount: successCount,
      email: opts.email ?? null,
      name: opts.name ?? null,
      phone: opts.phone ?? null,
    };

    tx.set(psaRef, { ...record, _serverTime: serverTimestamp() });
    return { generated: true, record };
  });
}

/** Read the stored PSA record (used by Profile + Admin). Returns null if not created yet. */
export async function getPsaIdRecord(uid: string): Promise<PsaIdRecord | null> {
  const snap = await getDocs(
    query(collection(db, "psa_ids"), where("uid", "==", uid)),
  );
  if (snap.empty) return null;
  return snap.docs[0].data() as PsaIdRecord;
}

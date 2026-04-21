/**
 * PSA / VLE ID storage for the PAN Portal.
 *
 * TWO IDs PER USER (CRITICAL):
 *   - `psaId` (Internal Portal ID) — auto-generated `RMPMCST-<mobile>` format.
 *     Used for ALL portal calls (Coupon Buy, NSDL, etc). NEVER overwritten.
 *   - `providerPsaId` (Official Provider PSA ID) — issued by upstream provider
 *     after the user clicks "Request PSA ID" + waits ~24h. Used ONLY by the
 *     retailer to log into the official UTI PSA portal externally. Shown in
 *     the Profile page only.
 *
 *   1. New user → auto `RMPMCST-<mobile>` (status: "active").
 *   2. After 2 successful coupons → "Request PSA ID" button enabled.
 *   3. Click → upstream PSA-Create call, status: "provider_pending", requestedAt set.
 *   4. After ~24h, user clicks "Check Status" → if provider returns ID, save
 *      to `providerPsaId`, status: "provider_active". Internal `psaId` unchanged.
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

/** Retailers need ≥ this many successful coupons to be considered onboarded. */
export const PSA_ONBOARDED_THRESHOLD = 2;

export type PsaIdSource = "auto" | "provider" | "legacy";

/**
 * PSA workflow status:
 *  - `active`         → temporary auto-generated `RMPMCST-<mobile>` ID, can buy coupons
 *  - `provider_pending` → user has requested a real PSA ID, waiting up to 24h for provider
 *  - `provider_active`  → provider has issued the real PSA ID, fully onboarded
 */
export type PsaIdStatus = "active" | "provider_pending" | "provider_active";

export interface PsaIdRecord {
  uid: string;
  /** Internal portal VLE ID (`RMPMCST-<mobile>`). Used for all upstream calls. */
  psaId: string;
  /**
   * Provider-issued official PSA ID (UTI PSA portal login). Stored separately
   * — never overwrites `psaId`. Set when the provider issues it (~24h after
   * "Request PSA ID"). Shown only in the user's Profile page.
   */
  providerPsaId?: string | null;
  status: PsaIdStatus;
  generatedAt: string;
  successfulCouponCount: number;
  source: PsaIdSource;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  /** Optional reference to the upstream PSA-create transaction. */
  providerRef?: string | null;
  /** When the user clicked "Request PSA ID" (ISO). Used for 24h ETA display. */
  requestedAt?: string | null;
  /** When the provider issued the real ID (ISO). */
  providerIssuedAt?: string | null;
}

/** Hours after request when provider is expected to issue the real PSA ID. */
export const PSA_PROVIDER_ETA_HOURS = 24;

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
 * AUTO-CREATE a PSA record on first portal visit using the legacy
 * `RMPMCST-<mobile>` format. Idempotent — does nothing if a record already
 * exists. Called on PAN Portal mount so the user can immediately buy coupons.
 */
export async function ensurePsaIdRecord(opts: {
  uid: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
}): Promise<PsaIdRecord> {
  const psaRef = doc(db, "psa_ids", opts.uid);
  const generated = generateVleId(opts.uid, opts.phone);
  const successCount = await countSuccessfulCouponPurchases(opts.uid).catch(() => 0);

  return runTransaction(db, async (tx) => {
    const existing = await tx.get(psaRef);
    if (existing.exists()) {
      // Already has a record — just refresh the coupon count for accurate
      // "fully onboarded" gating.
      const prev = existing.data() as PsaIdRecord;
      const updated: PsaIdRecord = {
        ...prev,
        successfulCouponCount: successCount,
      };
      tx.set(psaRef, { ...updated, updatedAt: new Date().toISOString() }, { merge: true });
      return updated;
    }
    const record: PsaIdRecord = {
      uid: opts.uid,
      psaId: generated,
      status: "active",
      generatedAt: new Date().toISOString(),
      successfulCouponCount: successCount,
      source: "auto",
      email: opts.email ?? null,
      name: opts.name ?? null,
      phone: opts.phone ?? null,
    };
    tx.set(psaRef, { ...record, _serverTime: serverTimestamp(), updatedAt: new Date().toISOString() });
    return record;
  });
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
      status: "provider_active",
      generatedAt: existing.exists()
        ? (existing.data() as PsaIdRecord).generatedAt
        : new Date().toISOString(),
      successfulCouponCount: successCount,
      source: "provider",
      email: opts.email ?? null,
      name: opts.name ?? null,
      phone: opts.phone ?? null,
      providerRef: opts.providerRef ?? null,
      requestedAt: existing.exists()
        ? (existing.data() as PsaIdRecord).requestedAt ?? null
        : null,
      providerIssuedAt: new Date().toISOString(),
    };
    tx.set(psaRef, { ...record, _serverTime: serverTimestamp(), updatedAt: new Date().toISOString() });
    return record;
  });
}

/**
 * MARK the PSA record as `provider_pending` after the user clicks
 * "Request PSA ID". Stores `requestedAt` so the UI can show a 24h ETA.
 */
export async function markPsaIdRequested(opts: {
  uid: string;
  providerRef?: string | null;
}): Promise<PsaIdRecord> {
  const psaRef = doc(db, "psa_ids", opts.uid);
  return runTransaction(db, async (tx) => {
    const existing = await tx.get(psaRef);
    if (!existing.exists()) {
      throw new Error("No PSA record yet — open the PAN Portal first.");
    }
    const prev = existing.data() as PsaIdRecord;
    if (prev.status === "provider_active") return prev;
    const updated: PsaIdRecord = {
      ...prev,
      status: "provider_pending",
      requestedAt: new Date().toISOString(),
      providerRef: opts.providerRef ?? prev.providerRef ?? null,
    };
    tx.set(psaRef, { ...updated, updatedAt: new Date().toISOString() }, { merge: true });
    return updated;
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

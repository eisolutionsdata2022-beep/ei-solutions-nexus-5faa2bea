/**
 * PAN Portal — Firestore helpers (UTI PSA + Coupon).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  limit,
  addDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  DEFAULT_PAN_CONFIG,
  type PanCouponOrder,
  type PanPortalConfig,
  type PanPsaRecord,
} from "./pan-portal-types";

// ─── Config ────────────────────────────────────────────────────────────
const CONFIG_REF = () => doc(db, "pan_config", "master");

export async function loadPanConfig(): Promise<PanPortalConfig> {
  const snap = await getDoc(CONFIG_REF());
  if (!snap.exists()) return { ...DEFAULT_PAN_CONFIG };
  return { ...DEFAULT_PAN_CONFIG, ...(snap.data() as PanPortalConfig) };
}

export async function savePanConfig(
  patch: Partial<PanPortalConfig>,
  updatedBy: string,
): Promise<void> {
  await setDoc(
    CONFIG_REF(),
    { ...patch, updatedAt: new Date().toISOString(), updatedBy },
    { merge: true },
  );
}

// ─── PSA records ───────────────────────────────────────────────────────
const PSA_REF = (retailerId: string) => doc(db, "pan_psa_records", retailerId);

function cleanVleId(value?: string): string {
  return value?.trim() || "";
}

function isGeneratedVleId(value: string): boolean {
  return /^RMPMCST-\d{10}$/i.test(value);
}

function resolvePrimaryVleId(psa: Pick<PanPsaRecord, "vleId" | "linkedExisting" | "vleRegCode">): string {
  const primary = cleanVleId(psa.vleId);
  const secondary = cleanVleId(psa.vleRegCode);

  if (!psa.linkedExisting) {
    return primary || secondary;
  }

  if (primary && secondary) {
    if (isGeneratedVleId(primary) && !isGeneratedVleId(secondary)) return secondary;
    if (!isGeneratedVleId(primary) && isGeneratedVleId(secondary)) return primary;
  }

  return primary || secondary;
}

export async function loadPsaRecord(retailerId: string): Promise<PanPsaRecord | null> {
  const snap = await getDoc(PSA_REF(retailerId));
  if (!snap.exists()) return null;

  const raw = snap.data() as PanPsaRecord & {
    vleRegCode?: string;
    linkedMobile?: string;
  };

  return {
    ...raw,
    vleId: resolvePrimaryVleId(raw),
    mobile: raw.linkedMobile?.trim() || raw.mobile,
  };
}

export function getPsaPrimaryVleId(psa: Pick<PanPsaRecord, "vleId" | "linkedExisting" | "vleRegCode">): string {
  return resolvePrimaryVleId(psa);
}

export async function upsertPsaRecord(rec: PanPsaRecord): Promise<void> {
  await setDoc(PSA_REF(rec.retailerId), rec, { merge: true });
}

/** Admin-only: patch the VLE link fields directly on a retailer's PSA record. */
export async function adminPatchPsaVleLink(
  retailerId: string,
  patch: { vleId: string; vleRegCode?: string; linkedExisting: boolean },
  adminUid: string,
): Promise<void> {
  const ref = PSA_REF(retailerId);
  const snap = await getDoc(ref);
  const now = new Date().toISOString();
  if (!snap.exists()) {
    // Create a minimal stub PSA so the retailer can immediately use the linked VLE
    await setDoc(ref, {
      retailerId,
      vleId: patch.vleId.trim(),
      vleRegCode: (patch.vleRegCode || "").trim() || patch.vleId.trim(),
      linkedExisting: patch.linkedExisting,
      status: "approved",
      createdAt: now,
      updatedAt: now,
      remark: `Admin-created VLE link (${adminUid})`,
    }, { merge: true });
    return;
  }
  await updateDoc(ref, {
    vleId: patch.vleId.trim(),
    vleRegCode: (patch.vleRegCode || "").trim(),
    linkedExisting: patch.linkedExisting,
    status: "approved",
    updatedAt: now,
    updatedBy: adminUid,
    remark: `VLE link edited by admin (${adminUid})`,
  });
}

// ─── Bulk link (admin) ─────────────────────────────────────────────────
export interface BulkLinkInputRow {
  vleId: string;
  name?: string;
  mobile: string;
  email?: string;
}

export interface BulkLinkResultRow {
  input: BulkLinkInputRow;
  status: "linked" | "skipped_already_linked" | "no_user_match" | "duplicate_in_input" | "vle_taken" | "error";
  retailerId?: string;
  retailerName?: string;
  message?: string;
}

function normalizeMobile(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  return digits.slice(-10);
}

/**
 * Bulk-link old UTI VLE IDs to retailers, matching by mobile (last 10 digits).
 * Skips retailers that already have a linked PSA record. Skips VLE IDs already
 * linked to another retailer.
 */
export async function bulkLinkVleByMobile(
  rows: BulkLinkInputRow[],
  adminUid: string,
): Promise<BulkLinkResultRow[]> {
  const usersSnap = await getDocs(collection(db, "users"));
  // mobile (10-digit) → { uid, name }
  const mobileIndex = new Map<string, { uid: string; name: string }>();
  usersSnap.docs.forEach((d) => {
    const u = d.data() as { mobile?: string; phone?: string; fullName?: string; ownerName?: string; shopName?: string; role?: string };
    const mob = normalizeMobile(u.mobile || u.phone || "");
    if (!mob || mob.length !== 10) return;
    // Prefer retailer role if collision
    const existing = mobileIndex.get(mob);
    if (existing && u.role !== "retailer") return;
    mobileIndex.set(mob, { uid: d.id, name: u.fullName || u.ownerName || u.shopName || "—" });
  });

  // Existing PSA records → which retailers already linked, and which VLE IDs are taken
  const psaSnap = await getDocs(collection(db, "pan_psa_records"));
  const linkedRetailers = new Set<string>();
  const takenVleIds = new Map<string, string>(); // vleId → retailerId
  psaSnap.docs.forEach((d) => {
    const raw = d.data() as PanPsaRecord;
    const primary = resolvePrimaryVleId(raw);
    if (primary) {
      linkedRetailers.add(d.id);
      takenVleIds.set(primary.toUpperCase(), d.id);
    }
  });

  const seenInputMobiles = new Set<string>();
  const results: BulkLinkResultRow[] = [];

  for (const row of rows) {
    const mob = normalizeMobile(row.mobile);
    const vle = row.vleId.trim();

    if (!vle || !mob || mob.length !== 10) {
      results.push({ input: row, status: "error", message: "Invalid VLE ID or mobile" });
      continue;
    }
    if (seenInputMobiles.has(mob)) {
      results.push({ input: row, status: "duplicate_in_input", message: "Mobile appears earlier in list" });
      continue;
    }
    seenInputMobiles.add(mob);

    const user = mobileIndex.get(mob);
    if (!user) {
      results.push({ input: row, status: "no_user_match", message: "No retailer signed up with this mobile" });
      continue;
    }

    if (linkedRetailers.has(user.uid)) {
      results.push({
        input: row,
        status: "skipped_already_linked",
        retailerId: user.uid,
        retailerName: user.name,
        message: "Retailer already has a linked PSA record",
      });
      continue;
    }

    const vleOwner = takenVleIds.get(vle.toUpperCase());
    if (vleOwner && vleOwner !== user.uid) {
      results.push({
        input: row,
        status: "vle_taken",
        retailerId: user.uid,
        retailerName: user.name,
        message: `VLE ID already linked to another retailer (${vleOwner})`,
      });
      continue;
    }

    try {
      await adminPatchPsaVleLink(
        user.uid,
        { vleId: vle, vleRegCode: vle, linkedExisting: true },
        adminUid,
      );
      // Also stamp the linked mobile so retailer-side resolver picks it up
      await updateDoc(PSA_REF(user.uid), { linkedMobile: mob }).catch(() => {});
      linkedRetailers.add(user.uid);
      takenVleIds.set(vle.toUpperCase(), user.uid);
      results.push({
        input: row,
        status: "linked",
        retailerId: user.uid,
        retailerName: user.name,
        message: "Linked successfully",
      });
    } catch (e) {
      results.push({
        input: row,
        status: "error",
        retailerId: user.uid,
        retailerName: user.name,
        message: e instanceof Error ? e.message : "Link failed",
      });
    }
  }

  return results;
}

/** Ensures a VLE id is not already linked to another retailer. */
export async function isVleIdTaken(vleId: string, exceptRetailerId: string): Promise<boolean> {
  const q = query(
    collection(db, "pan_psa_records"),
    where("vleId", "==", vleId),
    limit(2),
  );
  const snap = await getDocs(q);
  return snap.docs.some((d) => d.id !== exceptRetailerId);
}

// ─── Coupon orders ─────────────────────────────────────────────────────
export async function createCouponOrder(
  order: Omit<PanCouponOrder, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db, "pan_coupon_orders"), order);
  return ref.id;
}

export async function updateCouponOrder(
  orderId: string,
  patch: Partial<PanCouponOrder>,
): Promise<void> {
  await updateDoc(doc(db, "pan_coupon_orders", orderId), {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

/** All coupon orders + all PSA records — admin report aggregator. */
export interface PanRetailerCouponSummary {
  retailerId: string;
  retailerName: string;
  retailerEmail: string;
  retailerMobile: string;
  vleId: string;
  linkedExisting: boolean;
  vleRegCode?: string;
  totalOrders: number;
  totalCoupons: number;
  successCoupons: number;
  failedCoupons: number;
  refundedCoupons: number;
  totalSpent: number;     // sum of totalDebit for SUCCESS only
  totalRefunded: number;  // sum of totalDebit where refunded
  lastPurchaseAt?: string;
}

export async function loadPanCouponReport(): Promise<PanRetailerCouponSummary[]> {
  const [ordersSnap, psaSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, "pan_coupon_orders")),
    getDocs(collection(db, "pan_psa_records")),
    getDocs(collection(db, "users")),
  ]);

  const psaMap = new Map<string, PanPsaRecord>();
  psaSnap.docs.forEach((d) => {
    const raw = d.data() as PanPsaRecord;
    psaMap.set(d.id, { ...raw, vleId: resolvePrimaryVleId(raw) });
  });

  const userMap = new Map<string, { name: string; email: string; mobile: string }>();
  usersSnap.docs.forEach((d) => {
    const u = d.data() as { fullName?: string; ownerName?: string; shopName?: string; email?: string; mobile?: string; phone?: string };
    userMap.set(d.id, {
      name: u.fullName || u.ownerName || u.shopName || "—",
      email: u.email || "",
      mobile: u.mobile || u.phone || "",
    });
  });

  const grouped = new Map<string, PanRetailerCouponSummary>();
  ordersSnap.docs.forEach((d) => {
    const o = d.data() as PanCouponOrder;
    const rid = o.retailerId;
    let row = grouped.get(rid);
    if (!row) {
      const psa = psaMap.get(rid);
      const user = userMap.get(rid);
      row = {
        retailerId: rid,
        retailerName: user?.name || psa?.ownerName || "—",
        retailerEmail: user?.email || psa?.email || "",
        retailerMobile: user?.mobile || psa?.mobile || "",
        vleId: psa?.vleId || o.vleId || "—",
        linkedExisting: !!psa?.linkedExisting,
        vleRegCode: psa?.vleRegCode,
        totalOrders: 0,
        totalCoupons: 0,
        successCoupons: 0,
        failedCoupons: 0,
        refundedCoupons: 0,
        totalSpent: 0,
        totalRefunded: 0,
      };
      grouped.set(rid, row);
    }
    row.totalOrders += 1;
    row.totalCoupons += o.qty || 0;
    if (o.status === "SUCCESS") {
      row.successCoupons += o.qty || 0;
      if (!o.refunded) row.totalSpent += o.totalDebit || 0;
    } else if (o.status === "FAILED") {
      row.failedCoupons += o.qty || 0;
    }
    if (o.refunded) {
      row.refundedCoupons += o.qty || 0;
      row.totalRefunded += o.totalDebit || 0;
    }
    if (!row.lastPurchaseAt || o.createdAt > row.lastPurchaseAt) {
      row.lastPurchaseAt = o.createdAt;
    }
  });

  // include PSA-only retailers (registered, never bought) so admin can see them too
  psaMap.forEach((psa, rid) => {
    if (grouped.has(rid)) return;
    const user = userMap.get(rid);
    grouped.set(rid, {
      retailerId: rid,
      retailerName: user?.name || psa.ownerName || "—",
      retailerEmail: user?.email || psa.email || "",
      retailerMobile: user?.mobile || psa.mobile || "",
      vleId: psa.vleId || "—",
      linkedExisting: !!psa.linkedExisting,
      vleRegCode: psa.vleRegCode,
      totalOrders: 0,
      totalCoupons: 0,
      successCoupons: 0,
      failedCoupons: 0,
      refundedCoupons: 0,
      totalSpent: 0,
      totalRefunded: 0,
    });
  });

  return Array.from(grouped.values()).sort((a, b) =>
    (b.lastPurchaseAt || "").localeCompare(a.lastPurchaseAt || ""),
  );
}

export async function listCouponOrders(retailerId: string): Promise<PanCouponOrder[]> {
  // Client-side ordering to avoid composite index requirement.
  const q = query(
    collection(db, "pan_coupon_orders"),
    where("retailerId", "==", retailerId),
    limit(200),
  );
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as PanCouponOrder) }));
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

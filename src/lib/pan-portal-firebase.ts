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

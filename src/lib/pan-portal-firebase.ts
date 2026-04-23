/**
 * PAN Portal — Firestore helpers (client-safe).
 * Reads master config, PSA records, orders. Writes happen server-side or
 * via the admin UI directly.
 */
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  PAN_DEFAULT_FEES,
  PAN_DEFAULT_URLS,
  type PanMasterConfig,
  type PanOrder,
  type PanPsaRecord,
  type PanServiceActivation,
  type PanUtiCoupon,
} from "./pan-portal-types";

const CONFIG_DOC = doc(db, "pan_config", "master");
const PSA_COL = collection(db, "pan_psa_records");
const ORDERS_COL = collection(db, "pan_orders");
const ACTIVATIONS_COL = collection(db, "pan_activations");
const UTI_COUPONS_COL = collection(db, "pan_uti_coupons");

function normalizePanConfig(data: PanMasterConfig): PanMasterConfig {
  return {
    ...data,
    utiCouponPurchaseUrl:
      !data.utiCouponPurchaseUrl || /\/Api\/PSACoupon$/i.test(data.utiCouponPurchaseUrl)
        ? PAN_DEFAULT_URLS.utiCouponPurchaseUrl
        : data.utiCouponPurchaseUrl,
    utiPanStatusUrl:
      !data.utiPanStatusUrl || /\/Api\/PANStatus$/i.test(data.utiPanStatusUrl)
        ? PAN_DEFAULT_URLS.utiPanStatusUrl
        : data.utiPanStatusUrl,
  };
}

/* ------------------------------ master config ----------------------------- */

export async function getPanConfig(): Promise<PanMasterConfig> {
  const snap = await getDoc(CONFIG_DOC);
  const data = normalizePanConfig(snap.exists() ? (snap.data() as PanMasterConfig) : {});
  return {
    ...PAN_DEFAULT_URLS,
    ...PAN_DEFAULT_FEES,
    enabled: true,
    ...data,
  };
}

export function subscribePanConfig(cb: (cfg: PanMasterConfig) => void) {
  return onSnapshot(CONFIG_DOC, (snap) => {
    const data = normalizePanConfig(snap.exists() ? (snap.data() as PanMasterConfig) : {});
    cb({
      ...PAN_DEFAULT_URLS,
      ...PAN_DEFAULT_FEES,
      enabled: true,
      ...data,
    });
  });
}

/** Admin-only: write the public-safe parts of the config (URLs, fees, enabled). */
export async function savePanConfigPublic(
  patch: Partial<PanMasterConfig>,
  adminId: string,
) {
  await setDoc(
    CONFIG_DOC,
    { ...patch, updatedAt: new Date().toISOString(), updatedBy: adminId },
    { merge: true },
  );
}

/** Admin-only: store the encrypted credential blob produced by the server fn. */
export async function savePanCredentials(cipher: string, adminId: string) {
  await setDoc(
    CONFIG_DOC,
    {
      cipher,
      hasCredentials: true,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
    },
    { merge: true },
  );
}

/* --------------------------------- PSA ------------------------------------ */

export async function getPsaRecord(retailerId: string): Promise<PanPsaRecord | null> {
  const snap = await getDoc(doc(PSA_COL, retailerId));
  return snap.exists() ? (snap.data() as PanPsaRecord) : null;
}

export function subscribePsaRecord(
  retailerId: string,
  cb: (rec: PanPsaRecord | null) => void,
) {
  return onSnapshot(doc(PSA_COL, retailerId), (snap) => {
    cb(snap.exists() ? (snap.data() as PanPsaRecord) : null);
  });
}

export async function upsertPsaRecord(rec: PanPsaRecord) {
  await setDoc(doc(PSA_COL, rec.retailerId), rec, { merge: true });
}

/* ------------------------------ NSDL activation --------------------------- */

export async function getPanActivation(retailerId: string): Promise<PanServiceActivation | null> {
  const snap = await getDoc(doc(ACTIVATIONS_COL, retailerId));
  return snap.exists() ? (snap.data() as PanServiceActivation) : null;
}

export function subscribePanActivation(
  retailerId: string,
  cb: (act: PanServiceActivation | null) => void,
) {
  return onSnapshot(doc(ACTIVATIONS_COL, retailerId), (snap) => {
    cb(snap.exists() ? (snap.data() as PanServiceActivation) : null);
  });
}

export async function setPanActivation(act: PanServiceActivation) {
  await setDoc(doc(ACTIVATIONS_COL, act.retailerId), act, { merge: true });
}

/* -------------------------------- Orders ---------------------------------- */

export async function createPanOrder(order: PanOrder) {
  await setDoc(doc(ORDERS_COL, order.orderId), order, { merge: true });
}

export async function updatePanOrder(orderId: string, patch: Partial<PanOrder>) {
  await updateDoc(doc(ORDERS_COL, orderId), {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export async function getPanOrder(orderId: string): Promise<PanOrder | null> {
  const snap = await getDoc(doc(ORDERS_COL, orderId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as PanOrder) }) : null;
}

export function subscribeRetailerOrders(
  retailerId: string,
  cb: (orders: PanOrder[]) => void,
) {
  // Client-side ordering to avoid composite index — see project memory.
  const q = query(ORDERS_COL, where("retailerId", "==", retailerId));
  return onSnapshot(q, (snap) => {
    const list: PanOrder[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as PanOrder) }));
    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    cb(list);
  });
}

export function subscribeAllOrders(cb: (orders: PanOrder[]) => void) {
  const q = query(ORDERS_COL, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list: PanOrder[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as PanOrder) }));
    cb(list);
  });
}

export function newOrderId(retailerId: string): string {
  return `EKYC${Date.now()}A${retailerId.slice(-8)}`;
}

/* ------------------------------ UTI Coupons ------------------------------ */

export async function createUtiCoupon(coupon: PanUtiCoupon) {
  await setDoc(doc(UTI_COUPONS_COL, coupon.couponId), coupon, { merge: true });
}

export async function updateUtiCoupon(couponId: string, patch: Partial<PanUtiCoupon>) {
  await updateDoc(doc(UTI_COUPONS_COL, couponId), {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeRetailerUtiCoupons(
  retailerId: string,
  cb: (coupons: PanUtiCoupon[]) => void,
) {
  const q = query(UTI_COUPONS_COL, where("retailerId", "==", retailerId));
  return onSnapshot(q, (snap) => {
    const list: PanUtiCoupon[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as PanUtiCoupon) }));
    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    cb(list);
  });
}

export function subscribeAllUtiCoupons(cb: (coupons: PanUtiCoupon[]) => void) {
  const q = query(UTI_COUPONS_COL, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list: PanUtiCoupon[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as PanUtiCoupon) }));
    cb(list);
  });
}

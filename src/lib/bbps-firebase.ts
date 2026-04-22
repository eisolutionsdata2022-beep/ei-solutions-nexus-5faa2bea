/**
 * Bharat Connect / BBPS — Firestore helpers (CLIENT-SAFE).
 *
 * Read-only data layer for transactions, biller cache, and admin config.
 * All mutations of credentials / live API calls happen in
 * `bbps-api.functions.ts` (server functions, behind firebase auth middleware).
 */
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  DEFAULT_BBPS_CONFIG,
  type BbpsMasterConfig,
  type BbpsTransaction,
  type BbpsCategory,
  type BbpsBiller,
} from "./bbps-types";

// ──────────────── Master config ────────────────

const CONFIG_DOC = "bbps_config/master";

export async function getBbpsConfig(): Promise<BbpsMasterConfig> {
  const snap = await getDoc(doc(db, CONFIG_DOC));
  if (!snap.exists()) return DEFAULT_BBPS_CONFIG;
  return { ...DEFAULT_BBPS_CONFIG, ...(snap.data() as Partial<BbpsMasterConfig>) };
}

export function subscribeBbpsConfig(
  cb: (cfg: BbpsMasterConfig) => void,
): Unsubscribe {
  return onSnapshot(doc(db, CONFIG_DOC), (snap) => {
    if (!snap.exists()) cb(DEFAULT_BBPS_CONFIG);
    else cb({ ...DEFAULT_BBPS_CONFIG, ...(snap.data() as Partial<BbpsMasterConfig>) });
  });
}

export async function saveBbpsConfig(
  patch: Partial<BbpsMasterConfig>,
  updatedBy: string,
): Promise<void> {
  await setDoc(
    doc(db, CONFIG_DOC),
    { ...patch, updatedAt: new Date().toISOString(), updatedBy },
    { merge: true },
  );
}

// ──────────────── Cached categories / billers ────────────────

const CATEGORIES_DOC = "bbps_cache/categories";
const BILLERS_DOC = (categoryName: string) =>
  `bbps_cache/billers__${categoryName.replace(/\s+/g, "_")}`;

export async function getCachedCategories(): Promise<BbpsCategory[] | null> {
  const snap = await getDoc(doc(db, CATEGORIES_DOC));
  if (!snap.exists()) return null;
  const data = snap.data() as { categories?: BbpsCategory[]; updatedAt?: string };
  return data.categories ?? null;
}

export async function setCachedCategories(categories: BbpsCategory[]): Promise<void> {
  await setDoc(doc(db, CATEGORIES_DOC), {
    categories,
    updatedAt: new Date().toISOString(),
  });
}

export async function getCachedBillers(categoryName: string): Promise<BbpsBiller[] | null> {
  const snap = await getDoc(doc(db, BILLERS_DOC(categoryName)));
  if (!snap.exists()) return null;
  const data = snap.data() as { billers?: BbpsBiller[]; updatedAt?: string };
  return data.billers ?? null;
}

export async function setCachedBillers(
  categoryName: string,
  billers: BbpsBiller[],
): Promise<void> {
  await setDoc(doc(db, BILLERS_DOC(categoryName)), {
    billers,
    categoryName,
    updatedAt: new Date().toISOString(),
  });
}

// ──────────────── Transactions ────────────────

export function subscribeRetailerTransactions(
  retailerId: string,
  cb: (txs: BbpsTransaction[]) => void,
  max = 100,
): Unsubscribe {
  const q = query(
    collection(db, "bbps_transactions"),
    where("retailerId", "==", retailerId),
    orderBy("createdAt", "desc"),
    limit(max),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as BbpsTransaction) })));
  });
}

export function subscribeAllTransactions(
  cb: (txs: BbpsTransaction[]) => void,
  max = 200,
): Unsubscribe {
  const q = query(
    collection(db, "bbps_transactions"),
    orderBy("createdAt", "desc"),
    limit(max),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as BbpsTransaction) })));
  });
}

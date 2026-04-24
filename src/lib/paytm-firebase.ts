/**
 * Paytm — client-side Firestore CRUD.
 * Server-side wallet credit uses atomicCredit() inside the callback route.
 */
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_PAYTM_CONFIG,
  type PaytmMasterConfig,
  type PaytmTopupRequest,
} from "@/lib/paytm-types";

const CONFIG_DOC = "paytm_config/master";
const TOPUP_COLLECTION = "wallet_topup_requests";

export async function getPaytmConfig(): Promise<PaytmMasterConfig> {
  const snap = await getDoc(doc(db, CONFIG_DOC));
  if (!snap.exists()) return DEFAULT_PAYTM_CONFIG;
  return { ...DEFAULT_PAYTM_CONFIG, ...(snap.data() as Partial<PaytmMasterConfig>) };
}

export async function savePaytmConfig(
  partial: Partial<PaytmMasterConfig>,
  updatedBy: string,
): Promise<void> {
  await setDoc(
    doc(db, CONFIG_DOC),
    { ...partial, updatedAt: new Date().toISOString(), updatedBy },
    { merge: true },
  );
}

/** Live subscription to a single topup request — used during QR polling UI. */
export function subscribeToTopup(
  orderId: string,
  cb: (req: PaytmTopupRequest | null) => void,
): () => void {
  const q = query(
    collection(db, TOPUP_COLLECTION),
    where("orderId", "==", orderId),
    limit(1),
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) return cb(null);
    const d = snap.docs[0];
    cb({ id: d.id, ...(d.data() as PaytmTopupRequest) });
  });
}

export async function listMyTopupRequests(
  retailerId: string,
  max = 20,
): Promise<PaytmTopupRequest[]> {
  const q = query(
    collection(db, TOPUP_COLLECTION),
    where("retailerId", "==", retailerId),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as PaytmTopupRequest) }))
    .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""));
}

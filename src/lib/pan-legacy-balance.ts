/**
 * PAN Portal — legacy balance Firestore helpers (client-safe reads + writes
 * that go through admin-protected collections / rules).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  PanLegacyBalance,
  PanLegacyTransferRequest,
} from "./pan-legacy-balance-types";

const BAL_COL = collection(db, "pan_legacy_balances");
const REQ_COL = collection(db, "pan_legacy_transfers");

export async function getLegacyBalance(
  username: string,
): Promise<PanLegacyBalance | null> {
  const snap = await getDoc(doc(BAL_COL, username.trim().toUpperCase()));
  return snap.exists() ? (snap.data() as PanLegacyBalance) : null;
}

/** Idempotent — used by admin "Import" button. */
export async function upsertLegacyBalance(rec: PanLegacyBalance) {
  await setDoc(
    doc(BAL_COL, rec.username.trim().toUpperCase()),
    {
      ...rec,
      remaining: rec.remaining ?? rec.balance,
      claimed: rec.claimed ?? false,
      importedAt: rec.importedAt ?? new Date().toISOString(),
    },
    { merge: true },
  );
}

/**
 * Delete ALL legacy balance records that have NOT been claimed yet.
 * Claimed records are preserved (audit trail / prevent re-claim).
 * Used by admin "Clear & Replace" flow before uploading a fresh sheet.
 */
export async function clearUnclaimedLegacyBalances(): Promise<{ deleted: number; kept: number }> {
  const snap = await getDocs(BAL_COL);
  let deleted = 0;
  let kept = 0;
  let batch = writeBatch(db);
  let ops = 0;
  for (const d of snap.docs) {
    const data = d.data() as PanLegacyBalance;
    if (data.claimed) {
      kept++;
      continue;
    }
    batch.delete(d.ref);
    deleted++;
    ops++;
    if (ops >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return { deleted, kept };
}

/* ----------------------------- transfer requests --------------------------- */

export async function createLegacyTransferRequest(
  req: Omit<PanLegacyTransferRequest, "id" | "status" | "createdAt">,
) {
  const id = `LWT${Date.now()}${req.retailerId.slice(-6)}`;
  const payload: PanLegacyTransferRequest = {
    ...req,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(REQ_COL, id), payload, { merge: false });
  return id;
}

export function subscribeRetailerTransferRequests(
  retailerId: string,
  cb: (list: PanLegacyTransferRequest[]) => void,
) {
  const q = query(REQ_COL, where("retailerId", "==", retailerId));
  return onSnapshot(
    q,
    (snap) => {
      const list: PanLegacyTransferRequest[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as PanLegacyTransferRequest) }));
      list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      cb(list);
    },
    (error) => {
      console.warn("[PAN legacy] transfer requests listener skipped:", error.message);
      cb([]);
    },
  );
}

export function subscribeAllTransferRequests(
  cb: (list: PanLegacyTransferRequest[]) => void,
) {
  const q = query(REQ_COL, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list: PanLegacyTransferRequest[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as PanLegacyTransferRequest) }));
    cb(list);
  });
}

export async function countLegacyBalances(): Promise<{
  total: number;
  unclaimed: number;
  totalBalance: number;
}> {
  const snap = await getDocs(BAL_COL);
  let unclaimed = 0;
  let totalBalance = 0;
  snap.forEach((d) => {
    const r = d.data() as PanLegacyBalance;
    if (!r.claimed) unclaimed++;
    totalBalance += Number(r.remaining ?? r.balance ?? 0);
  });
  return { total: snap.size, unclaimed, totalBalance };
}

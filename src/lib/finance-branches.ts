/**
 * Finance — Branch Management (admin-controlled)
 *
 * Architecture:
 *  - Admin creates a flat list of branches in the `financeBranches` collection.
 *  - A retailer is assigned to ONE branch via `users/{uid}.financeBranchId`.
 *  - Forward-only: existing loans/customers/payments stay un-stamped.
 *    From the moment a retailer is assigned, every new finance record
 *    written by them carries `branchId` so the admin can roll up income,
 *    expenses, loans and customers by branch.
 *  - Branch can be disabled (soft) — disabled branches stay visible in
 *    historical reports but are hidden from "assign retailer" pickers.
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface FinanceBranch {
  id: string;
  code: string;          // e.g. BR-KOL-001 — unique short code
  name: string;          // "Kollam Main Branch"
  address: string;
  city: string;
  state: string;
  pincode: string;
  managerName: string;
  managerPhone: string;
  enabled: boolean;      // disabled branches hidden from new assignments
  createdAt: string;
  updatedAt: string;
  createdBy: string;     // admin email/uid
  notes?: string;
}

// ─── Branch CRUD ────────────────────────────────────────────────────────────
export function subscribeBranches(cb: (list: FinanceBranch[]) => void) {
  const q = query(collection(db, "financeBranches"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceBranch));
    list.sort((a, b) => a.name.localeCompare(b.name));
    cb(list);
  });
}

export async function getBranch(id: string): Promise<FinanceBranch | null> {
  const snap = await getDoc(doc(db, "financeBranches", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as FinanceBranch) : null;
}

export async function addBranch(
  data: Omit<FinanceBranch, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = new Date().toISOString();
  // enforce unique branch code
  const existing = await getDocs(
    query(collection(db, "financeBranches"), where("code", "==", data.code)),
  );
  if (!existing.empty) {
    throw new Error(`Branch code "${data.code}" already exists`);
  }
  const ref = await addDoc(collection(db, "financeBranches"), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateBranch(
  id: string,
  data: Partial<Omit<FinanceBranch, "id" | "createdAt" | "createdBy">>,
) {
  await updateDoc(doc(db, "financeBranches", id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function setBranchEnabled(id: string, enabled: boolean) {
  await updateDoc(doc(db, "financeBranches", id), {
    enabled,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteBranch(id: string) {
  await deleteDoc(doc(db, "financeBranches", id));
}

// ─── Retailer ⇄ Branch assignment ───────────────────────────────────────────
/**
 * Assign a retailer to a branch (or unassign with branchId = null).
 * Stored on the user doc under `financeBranchId` so existing finance
 * mutations can pick it up and stamp new records automatically.
 */
export async function assignRetailerToBranch(
  retailerId: string,
  branchId: string | null,
) {
  await setDoc(
    doc(db, "users", retailerId),
    {
      financeBranchId: branchId,
      financeBranchAssignedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function getRetailerBranchId(retailerId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "users", retailerId));
  if (!snap.exists()) return null;
  const v = (snap.data() as { financeBranchId?: string | null }).financeBranchId;
  return v || null;
}

/**
 * Subscribe to all retailer-branch assignments. Reads `users` collection,
 * filtered to role=retailer. Returns a Map<retailerId, branchId|null>.
 */
export function subscribeRetailerAssignments(
  cb: (map: Map<string, string | null>, retailers: Array<{ id: string; name: string; email: string; branchId: string | null }>) => void,
) {
  const q = query(collection(db, "users"), where("role", "==", "retailer"));
  return onSnapshot(q, (snap) => {
    const m = new Map<string, string | null>();
    const list: Array<{ id: string; name: string; email: string; branchId: string | null }> = [];
    snap.docs.forEach((d) => {
      const data = d.data() as { name?: string; email?: string; financeBranchId?: string | null };
      const bid = data.financeBranchId || null;
      m.set(d.id, bid);
      list.push({
        id: d.id,
        name: data.name || "",
        email: data.email || "",
        branchId: bid,
      });
    });
    list.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
    cb(m, list);
  });
}

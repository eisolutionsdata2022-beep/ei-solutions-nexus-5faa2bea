/**
 * Retailer Staff Sub-accounts.
 *
 * Stored at:  retailerStaff/{retailerId}/staff/{staffUid}
 * Each staff member has their own Firebase Auth login but is scoped to the
 * parent retailer (parentRetailerId). On login, if the user document at
 * users/{uid} has role = "operator" or "staffSub", they are redirected to the
 * operator dashboard.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebase";

export type RetailerStaffRole = "staff" | "operator" | "manager";

export interface RetailerStaff {
  uid: string;
  parentRetailerId: string;
  name: string;
  email: string;
  phone?: string;
  role: RetailerStaffRole;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export async function listStaffOfRetailer(retailerId: string): Promise<RetailerStaff[]> {
  const snap = await getDocs(collection(db, "retailerStaff", retailerId, "staff"));
  const out: RetailerStaff[] = [];
  snap.forEach((d) => out.push({ uid: d.id, ...d.data() } as RetailerStaff));
  return out;
}

export function subscribeStaff(
  retailerId: string,
  cb: (list: RetailerStaff[]) => void,
) {
  return onSnapshot(collection(db, "retailerStaff", retailerId, "staff"), (snap) => {
    const out: RetailerStaff[] = [];
    snap.forEach((d) => out.push({ uid: d.id, ...d.data() } as RetailerStaff));
    cb(out);
  });
}

/**
 * Create a brand-new Firebase Auth user + staff record under a retailer.
 * NOTE: This signs in as the new user temporarily. The caller MUST sign back
 * in as the retailer afterward. We do this client-side because we don't have
 * Admin SDK access in the Worker runtime.
 */
export async function createRetailerStaff(opts: {
  parentRetailerId: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: RetailerStaffRole;
}): Promise<string> {
  const cred = await createUserWithEmailAndPassword(auth, opts.email, opts.password);
  const uid = cred.user.uid;

  // Top-level user doc (for login routing + role detection)
  await setDoc(doc(db, "users", uid), {
    uid,
    email: opts.email,
    name: opts.name,
    phone: opts.phone || "",
    role: opts.role === "operator" ? "operator" : "staffSub",
    parentRetailerId: opts.parentRetailerId,
    kycStatus: "approved", // inherits from retailer
    createdAt: new Date().toISOString(),
  });

  // Staff sub-doc under retailer
  await setDoc(doc(db, "retailerStaff", opts.parentRetailerId, "staff", uid), {
    parentRetailerId: opts.parentRetailerId,
    name: opts.name,
    email: opts.email,
    phone: opts.phone || "",
    role: opts.role,
    active: true,
    createdAt: new Date().toISOString(),
  });

  return uid;
}

export async function updateStaffRole(
  retailerId: string,
  staffUid: string,
  role: RetailerStaffRole,
) {
  await updateDoc(doc(db, "retailerStaff", retailerId, "staff", staffUid), {
    role,
    updatedAt: new Date().toISOString(),
  });
  // Also update top-level role (for login routing)
  await updateDoc(doc(db, "users", staffUid), {
    role: role === "operator" ? "operator" : "staffSub",
  });
}

export async function setStaffActive(
  retailerId: string,
  staffUid: string,
  active: boolean,
) {
  await updateDoc(doc(db, "retailerStaff", retailerId, "staff", staffUid), {
    active,
    updatedAt: new Date().toISOString(),
  });
}

export async function getStaffParentRetailer(uid: string): Promise<string | null> {
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return null;
  return (userSnap.data().parentRetailerId as string) || null;
}

export async function countStaffForRetailer(retailerId: string): Promise<number> {
  const snap = await getDocs(collection(db, "retailerStaff", retailerId, "staff"));
  return snap.size;
}

/** Helper used by the admin user panel — counts staff across all retailers map. */
export async function getStaffCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const snap = await getDocs(query(collection(db, "users"), where("role", "in", ["operator", "staffSub"])));
  snap.forEach((d) => {
    const parent = (d.data() as any).parentRetailerId;
    if (parent) out[parent] = (out[parent] || 0) + 1;
  });
  return out;
}

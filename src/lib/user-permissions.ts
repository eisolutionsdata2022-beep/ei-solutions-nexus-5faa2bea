import { collection, doc, getDoc, getDocs, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { PLATFORM_SERVICES } from "./platform-services";

/** A reusable plan that bundles a set of enabled service keys. */
export interface ServicePlan {
  id: string;
  name: string;
  description?: string;
  enabledServices: string[]; // service keys
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Per-user override stored at userPermissions/{uid}. */
export interface UserPermissionDoc {
  userId: string;
  planId?: string;                       // optional reference to a ServicePlan
  /** Explicit per-service overrides — wins over plan and global. */
  overrides?: Record<string, boolean>;   // { "ippb": false }
  updatedAt: string;
  updatedBy?: string;
}

// ─────────────── Plans CRUD ───────────────
export async function listServicePlans(): Promise<ServicePlan[]> {
  const snap = await getDocs(collection(db, "servicePlans"));
  const list: ServicePlan[] = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ServicePlan));
  return list;
}

export async function saveServicePlan(p: ServicePlan): Promise<void> {
  await setDoc(doc(db, "servicePlans", p.id), p, { merge: true });
}

export async function getServicePlan(id: string): Promise<ServicePlan | null> {
  const snap = await getDoc(doc(db, "servicePlans", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as ServicePlan) : null;
}

// ─────────────── Per-user permissions ───────────────
export async function getUserPermission(uid: string): Promise<UserPermissionDoc | null> {
  const snap = await getDoc(doc(db, "userPermissions", uid));
  return snap.exists() ? (snap.data() as UserPermissionDoc) : null;
}

export async function saveUserPermission(p: UserPermissionDoc): Promise<void> {
  await setDoc(doc(db, "userPermissions", p.userId), p, { merge: true });
}

// ─────────────── Resolution ───────────────
/**
 * Decide whether a user can access a given service key.
 *
 * Order (highest precedence first):
 *   1. Per-user override (true/false)
 *   2. Assigned plan's enabledServices list
 *   3. Global platformServices doc (enabled !== false)
 */
export function isServiceAllowedForUser(
  serviceKey: string,
  ctx: {
    globalDisabled: Set<string>;
    plan?: ServicePlan | null;
    overrides?: Record<string, boolean>;
  },
): boolean {
  if (ctx.overrides && serviceKey in ctx.overrides) {
    return ctx.overrides[serviceKey] === true;
  }
  if (ctx.plan) {
    return ctx.plan.enabledServices.includes(serviceKey);
  }
  return !ctx.globalDisabled.has(serviceKey);
}

/** React-friendly hook — subscribe to current user's permissions + global toggles. */
export function subscribeUserPermission(
  uid: string,
  cb: (perm: UserPermissionDoc | null) => void,
) {
  return onSnapshot(doc(db, "userPermissions", uid), (snap) => {
    cb(snap.exists() ? (snap.data() as UserPermissionDoc) : null);
  });
}

/** Return a default new plan template. */
export function emptyPlan(name = "New Plan"): ServicePlan {
  return {
    id: `plan-${Date.now()}`,
    name,
    description: "",
    enabledServices: PLATFORM_SERVICES.map((s) => s.key),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

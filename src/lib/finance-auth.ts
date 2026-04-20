/**
 * Finance subsite authentication — uses a SECOND Firebase Auth instance so it
 * does not collide with the main retailer/admin auth session. An admin can be
 * logged into the main portal AND the finance subsite at the same time.
 *
 * Finance users are managed by admins only:
 *  - Admin creates username + password (no public signup).
 *  - The auth account uses a synthetic email `{username}@finance.eisolutions.local`.
 *  - Profile lives at `financeUsers/{uid}` with `{ username, displayName, active }`.
 *  - Setting `active = false` revokes access on next login.
 */
import { initializeApp, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const firebaseConfig = {
  apiKey: "AIzaSyDCCMmXPtFxcylhjRNvlR5PFgLYwgzb12U",
  authDomain: "ei-fix.firebaseapp.com",
  projectId: "ei-fix",
  storageBucket: "ei-fix.firebasestorage.app",
  messagingSenderId: "80350889731",
  appId: "1:80350889731:web:4a7a9af9ec8a10e1c4cb36",
};

// Separate named Firebase app so its auth state is isolated from the main app.
const FINANCE_APP_NAME = "finance-portal";
let financeApp;
try {
  financeApp = getApp(FINANCE_APP_NAME);
} catch {
  financeApp = initializeApp(firebaseConfig, FINANCE_APP_NAME);
}
export const financeAuth = getAuth(financeApp);

const FINANCE_EMAIL_DOMAIN = "finance.eisolutions.local";

export interface FinanceUserProfile {
  uid: string;
  username: string;
  displayName: string;
  active: boolean;
  createdAt: string;
  createdBy: string; // admin uid/email
  lastLoginAt?: string;
  notes?: string;
}

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${FINANCE_EMAIL_DOMAIN}`;
}

export async function getFinanceUserProfile(
  uid: string,
): Promise<FinanceUserProfile | null> {
  const snap = await getDoc(doc(db, "financeUsers", uid));
  return snap.exists() ? ({ uid, ...(snap.data() as any) } as FinanceUserProfile) : null;
}

/**
 * Sign in a finance user. Throws if the account is deactivated.
 */
export async function financeSignIn(
  username: string,
  password: string,
): Promise<FinanceUserProfile> {
  const email = usernameToEmail(username);
  const cred = await signInWithEmailAndPassword(financeAuth, email, password);
  const profile = await getFinanceUserProfile(cred.user.uid);
  if (!profile) {
    await signOut(financeAuth);
    throw new Error("Account not provisioned. Contact administrator.");
  }
  if (!profile.active) {
    await signOut(financeAuth);
    throw new Error("This account has been deactivated. Contact administrator.");
  }
  await updateDoc(doc(db, "financeUsers", cred.user.uid), {
    lastLoginAt: new Date().toISOString(),
  }).catch(() => {});
  return profile;
}

export async function financeSignOut() {
  await signOut(financeAuth);
}

export function onFinanceAuthChange(
  cb: (user: FirebaseUser | null) => void,
) {
  return onAuthStateChanged(financeAuth, cb);
}

// ─── Admin operations ───────────────────────────────────────────────────────
/**
 * Create a new finance user. Runs in the admin's browser — uses the isolated
 * finance Auth instance so the admin's main session is untouched. After create,
 * we sign the new user OUT of the finance app immediately.
 */
export async function adminCreateFinanceUser(params: {
  username: string;
  displayName: string;
  password: string;
  createdBy: string;
  notes?: string;
}): Promise<FinanceUserProfile> {
  const username = params.username.trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
    throw new Error("Username must be 3–32 chars: a–z, 0–9, . _ -");
  }
  if (params.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const email = usernameToEmail(username);
  const cred = await createUserWithEmailAndPassword(financeAuth, email, params.password);
  const profile: FinanceUserProfile = {
    uid: cred.user.uid,
    username,
    displayName: params.displayName.trim() || username,
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: params.createdBy,
    notes: params.notes?.trim() || "",
  };
  await setDoc(doc(db, "financeUsers", cred.user.uid), profile);
  // sign the new user out of the isolated finance auth so admin doesn't
  // accidentally end up signed in as them on this device.
  await signOut(financeAuth).catch(() => {});
  return profile;
}

export async function adminSetFinanceUserActive(uid: string, active: boolean) {
  await updateDoc(doc(db, "financeUsers", uid), {
    active,
    deactivatedAt: active ? null : new Date().toISOString(),
  });
}

export async function adminUpdateFinanceUser(
  uid: string,
  data: Partial<Pick<FinanceUserProfile, "displayName" | "notes">>,
) {
  await updateDoc(doc(db, "financeUsers", uid), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeFinanceUsers(cb: (list: FinanceUserProfile[]) => void) {
  const q = query(collection(db, "financeUsers"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) } as FinanceUserProfile)));
  });
}

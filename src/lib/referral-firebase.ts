/**
 * Referral System — auto code per retailer, capture-on-signup, payout-on-activation.
 *
 * Flow:
 *  1. On retailer signup with ?ref=CODE → store referredBy on user doc.
 *  2. New user opens /retailer/activate → pays activation fee (default ₹150).
 *  3. atomicReferralActivation runs in a single Firestore transaction:
 *       - debits new user's wallet (activationFee)
 *       - credits new user reward (default ₹100)
 *       - credits referrer reward (default ₹50) if referrer exists & not already paid
 *       - writes user.activated=true, user.activatedAt
 *       - writes referralPayouts/{newUserUid} (idempotency lock)
 */
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, runTransaction,
  onSnapshot, orderBy, addDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export interface ReferralConfig {
  enabled: boolean;
  activationFee: number;       // charged to new user (default 150)
  newUserReward: number;       // credited to new user (default 100)
  referrerReward: number;      // credited to referrer  (default 50)
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_REFERRAL_CONFIG: ReferralConfig = {
  enabled: true,
  activationFee: 150,
  newUserReward: 100,
  referrerReward: 50,
};

export interface ReferralPayout {
  id: string;                  // === newUserUid (idempotency)
  newUserUid: string;
  newUserName?: string;
  newUserEmail?: string;
  referrerUid?: string;
  referrerCode?: string;
  activationFee: number;
  newUserReward: number;
  referrerReward: number;
  paidAt: string;
}

// ───── Config CRUD ─────
export async function loadReferralConfig(): Promise<ReferralConfig> {
  const snap = await getDoc(doc(db, "config", "referral"));
  if (snap.exists()) return { ...DEFAULT_REFERRAL_CONFIG, ...(snap.data() as ReferralConfig) };
  return DEFAULT_REFERRAL_CONFIG;
}

export async function saveReferralConfig(cfg: ReferralConfig, updatedBy: string) {
  await setDoc(doc(db, "config", "referral"), {
    ...cfg,
    updatedAt: new Date().toISOString(),
    updatedBy,
  }, { merge: true });
}

// ───── Code generation ─────
function makeCode(uid: string): string {
  // 6-char alphanumeric, deterministic from uid
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let h = 2166136261 >>> 0;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[h % alphabet.length];
    h = Math.floor(h / alphabet.length) + 31 + i;
  }
  return `REF-${out}`;
}

/** Get-or-create referralCodes/{code} → { uid }. Stable per uid. */
export async function getOrCreateReferralCode(uid: string): Promise<string> {
  // Check if user already has a code
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().referralCode) {
    return userSnap.data().referralCode as string;
  }
  let code = makeCode(uid);
  // Collision guard (extremely rare)
  for (let attempt = 0; attempt < 5; attempt++) {
    const cRef = doc(db, "referralCodes", code);
    const cSnap = await getDoc(cRef);
    if (!cSnap.exists()) {
      await setDoc(cRef, { uid, createdAt: new Date().toISOString() });
      await setDoc(userRef, { referralCode: code }, { merge: true });
      return code;
    }
    if (cSnap.data().uid === uid) {
      await setDoc(userRef, { referralCode: code }, { merge: true });
      return code;
    }
    code = makeCode(uid + "_" + attempt);
  }
  throw new Error("Could not allocate referral code");
}

export async function resolveReferralCode(code: string): Promise<string | null> {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  const snap = await getDoc(doc(db, "referralCodes", c));
  return snap.exists() ? (snap.data().uid as string) : null;
}

/** Mark a new signup with the referrer uid (one-time per referee). */
export async function attachReferralToUser(newUserUid: string, referrerUid: string) {
  if (newUserUid === referrerUid) return;
  await setDoc(doc(db, "users", newUserUid), {
    referredBy: referrerUid,
    referralPending: true,
  }, { merge: true });
}

// ───── Atomic activation + payouts ─────
export interface ActivationResult {
  alreadyActivated: boolean;
  newBalance: number;
  referrerPaid: boolean;
}

export async function atomicReferralActivation(args: {
  newUserUid: string;
  newUserName?: string;
  newUserEmail?: string;
}): Promise<ActivationResult> {
  const { newUserUid, newUserName, newUserEmail } = args;
  const cfg = await loadReferralConfig();
  if (!cfg.enabled) throw new Error("Referral system is currently disabled.");

  const fee = Number(cfg.activationFee || 0);
  const newReward = Number(cfg.newUserReward || 0);
  const refReward = Number(cfg.referrerReward || 0);

  return await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", newUserUid);
    const walletRef = doc(db, "wallets", newUserUid);
    const payoutRef = doc(db, "referralPayouts", newUserUid);

    const [userSnap, walletSnap, payoutSnap] = await Promise.all([
      tx.get(userRef), tx.get(walletRef), tx.get(payoutRef),
    ]);
    if (!userSnap.exists()) throw new Error("User not found");
    if (!walletSnap.exists()) throw new Error("Wallet not found");
    if (payoutSnap.exists() || userSnap.data().activated) {
      return {
        alreadyActivated: true,
        newBalance: walletSnap.data().balance || 0,
        referrerPaid: false,
      };
    }

    const userData = userSnap.data();
    const referrerUid: string | undefined = userData.referredBy;

    // Read referrer wallet up-front (transaction rule: all reads before writes)
    let referrerWalletRef = null as any;
    let referrerCurrent = 0;
    let referrerCode: string | undefined;
    if (referrerUid && refReward > 0) {
      referrerWalletRef = doc(db, "wallets", referrerUid);
      const refWalletSnap = await tx.get(referrerWalletRef);
      if (refWalletSnap.exists()) {
        referrerCurrent = (refWalletSnap.data() as any).balance || 0;
        const refUserSnap = await tx.get(doc(db, "users", referrerUid));
        referrerCode = refUserSnap.exists() ? (refUserSnap.data() as any).referralCode : undefined;
      } else {
        referrerWalletRef = null; // can't credit non-existent wallet
      }
    }

    // Debit fee, credit new user reward (net)
    const currentBal = walletSnap.data().balance || 0;
    if (currentBal < fee) throw new Error("Insufficient balance to activate");
    const newBal = currentBal - fee + newReward;

    tx.update(walletRef, { balance: newBal });
    tx.update(userRef, {
      activated: true,
      activatedAt: new Date().toISOString(),
      referralPending: false,
    });

    // Credit referrer
    if (referrerWalletRef) {
      tx.update(referrerWalletRef, { balance: referrerCurrent + refReward });
    }

    // Idempotency lock + audit
    tx.set(payoutRef, {
      id: newUserUid,
      newUserUid,
      newUserName: newUserName ?? userData.name ?? null,
      newUserEmail: newUserEmail ?? userData.email ?? null,
      referrerUid: referrerUid ?? null,
      referrerCode: referrerCode ?? null,
      activationFee: fee,
      newUserReward: newReward,
      referrerReward: referrerWalletRef ? refReward : 0,
      paidAt: new Date().toISOString(),
    });

    return {
      alreadyActivated: false,
      newBalance: newBal,
      referrerPaid: !!referrerWalletRef,
    };
  }).then(async (result) => {
    // Outside the transaction: log txn entries (best-effort)
    if (result.alreadyActivated) return result;
    const now = new Date().toISOString();
    await addDoc(collection(db, "transactions"), {
      userId: newUserUid,
      type: "debit",
      amount: fee,
      source: "account_activation",
      description: `Account activation fee`,
      createdAt: now,
    });
    if (newReward > 0) {
      await addDoc(collection(db, "transactions"), {
        userId: newUserUid,
        type: "credit",
        amount: newReward,
        source: "referral_welcome",
        description: `Welcome bonus on activation`,
        createdAt: now,
      });
    }
    return result;
  });
}

// ───── Read helpers for dashboards ─────
export function subscribeReferredUsers(
  referrerUid: string,
  cb: (rows: Array<{ uid: string; name?: string; email?: string; activated?: boolean; createdAt?: string }>) => void,
) {
  const q = query(collection(db, "users"), where("referredBy", "==", referrerUid));
  return onSnapshot(q, (snap) => {
    const rows: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      rows.push({
        uid: d.id,
        name: data.name,
        email: data.email,
        activated: !!data.activated,
        createdAt: data.createdAt,
      });
    });
    rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    cb(rows);
  });
}

export function subscribeReferrerPayouts(
  referrerUid: string,
  cb: (payouts: ReferralPayout[]) => void,
) {
  const q = query(collection(db, "referralPayouts"), where("referrerUid", "==", referrerUid));
  return onSnapshot(q, (snap) => {
    const list: ReferralPayout[] = [];
    snap.forEach((d) => list.push({ ...(d.data() as ReferralPayout), id: d.id }));
    list.sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    cb(list);
  });
}

export function subscribeAllPayouts(cb: (payouts: ReferralPayout[]) => void) {
  const q = query(collection(db, "referralPayouts"), orderBy("paidAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list: ReferralPayout[] = [];
    snap.forEach((d) => list.push({ ...(d.data() as ReferralPayout), id: d.id }));
    cb(list);
  });
}

/** Find user by referral code (for showing "you were referred by ..." on activation). */
export async function getReferrerInfo(uid: string): Promise<{ name?: string; code?: string } | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { name: snap.data().name, code: snap.data().referralCode };
}

import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/** Global default minimum balance config (collection: platformConfig/minBalance). */
export interface MinBalanceConfig {
  /** Default minimum wallet balance required for retailers. */
  defaultMinBalance: number;
  /** Per-retailer overrides keyed by uid. */
  overrides?: Record<string, number>;
  updatedAt?: string;
  updatedBy?: string;
}

const DOC_PATH = ["platformConfig", "minBalance"] as const;
export const FALLBACK_MIN_BALANCE = 100;

export async function getMinBalanceConfig(): Promise<MinBalanceConfig> {
  const snap = await getDoc(doc(db, DOC_PATH[0], DOC_PATH[1]));
  if (!snap.exists()) {
    return { defaultMinBalance: FALLBACK_MIN_BALANCE, overrides: {} };
  }
  const data = snap.data() as MinBalanceConfig;
  return {
    defaultMinBalance: Number(data.defaultMinBalance ?? FALLBACK_MIN_BALANCE),
    overrides: data.overrides ?? {},
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  };
}

export function subscribeMinBalanceConfig(cb: (cfg: MinBalanceConfig) => void) {
  return onSnapshot(doc(db, DOC_PATH[0], DOC_PATH[1]), (snap) => {
    if (!snap.exists()) {
      cb({ defaultMinBalance: FALLBACK_MIN_BALANCE, overrides: {} });
      return;
    }
    const data = snap.data() as MinBalanceConfig;
    cb({
      defaultMinBalance: Number(data.defaultMinBalance ?? FALLBACK_MIN_BALANCE),
      overrides: data.overrides ?? {},
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy,
    });
  });
}

export async function saveMinBalanceDefault(amount: number, updatedBy?: string): Promise<void> {
  await setDoc(
    doc(db, DOC_PATH[0], DOC_PATH[1]),
    {
      defaultMinBalance: Math.max(0, Number(amount) || 0),
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy ?? null,
    },
    { merge: true },
  );
}

export async function saveRetailerMinBalanceOverride(
  uid: string,
  amount: number | null,
  updatedBy?: string,
): Promise<void> {
  const ref = doc(db, DOC_PATH[0], DOC_PATH[1]);
  const snap = await getDoc(ref);
  const current = (snap.exists() ? (snap.data() as MinBalanceConfig) : { defaultMinBalance: FALLBACK_MIN_BALANCE, overrides: {} });
  const overrides = { ...(current.overrides ?? {}) };
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    delete overrides[uid];
  } else {
    overrides[uid] = Math.max(0, Number(amount));
  }
  await setDoc(
    ref,
    {
      defaultMinBalance: current.defaultMinBalance ?? FALLBACK_MIN_BALANCE,
      overrides,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy ?? null,
    },
    { merge: true },
  );
}

/** Resolve effective minimum balance for a retailer (override > default > fallback). */
export function resolveMinBalance(cfg: MinBalanceConfig | null, uid: string): number {
  if (!cfg) return FALLBACK_MIN_BALANCE;
  const override = cfg.overrides?.[uid];
  if (typeof override === "number" && !isNaN(override)) return override;
  return Number(cfg.defaultMinBalance ?? FALLBACK_MIN_BALANCE);
}

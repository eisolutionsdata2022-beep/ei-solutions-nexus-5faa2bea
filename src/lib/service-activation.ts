import {
  collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, where, addDoc, orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { atomicDebit } from "./firebase-transactions";
import { PLATFORM_SERVICES } from "./platform-services";

/** Validity model for an activatable service. */
export type ActivationValidity = "lifetime" | "monthly" | "yearly";

/** Admin-managed activation config per service key (collection: serviceActivationConfig). */
export interface ActivationConfig {
  serviceKey: string;
  /** Fee deducted from retailer wallet on activation. 0 = free (still requires click). */
  fee: number;
  validity: ActivationValidity;
  /** If true, the Activate Now flow is enabled for this service. */
  enabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}

/** Per-user activation record (collection: serviceActivations/{uid_serviceKey}). */
export interface ServiceActivation {
  id: string;             // `${uid}__${serviceKey}`
  userId: string;
  serviceKey: string;
  serviceName: string;
  feePaid: number;
  validity: ActivationValidity;
  activatedAt: string;
  /** ISO date string; undefined for lifetime. */
  expiresAt?: string;
}

/** Services eligible for activation = all business services with a route except pure account pages. */
const NON_ACTIVATABLE = new Set(["wallet", "kyc", "transactions"]);

export function getActivatableServices() {
  return PLATFORM_SERVICES.filter((s) => s.route && !NON_ACTIVATABLE.has(s.key));
}

// ───── Config CRUD ─────
export async function getActivationConfig(serviceKey: string): Promise<ActivationConfig | null> {
  const snap = await getDoc(doc(db, "serviceActivationConfig", serviceKey));
  return snap.exists() ? (snap.data() as ActivationConfig) : null;
}

export async function listActivationConfigs(): Promise<Record<string, ActivationConfig>> {
  const snap = await getDocs(collection(db, "serviceActivationConfig"));
  const map: Record<string, ActivationConfig> = {};
  snap.forEach((d) => { map[d.id] = d.data() as ActivationConfig; });
  return map;
}

export async function saveActivationConfig(cfg: ActivationConfig): Promise<void> {
  await setDoc(doc(db, "serviceActivationConfig", cfg.serviceKey), cfg, { merge: true });
}

// ───── User activations ─────
function activationDocId(uid: string, key: string) {
  return `${uid}__${key}`;
}

export async function getUserActivation(
  uid: string, serviceKey: string,
): Promise<ServiceActivation | null> {
  const snap = await getDoc(doc(db, "serviceActivations", activationDocId(uid, serviceKey)));
  return snap.exists() ? (snap.data() as ServiceActivation) : null;
}

export function subscribeUserActivations(
  uid: string,
  cb: (activeKeys: Set<string>, list: ServiceActivation[]) => void,
) {
  const q = query(collection(db, "serviceActivations"), where("userId", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      const all: ServiceActivation[] = [];
      snap.forEach((d) => all.push({ ...(d.data() as ServiceActivation), id: d.id }));
      const now = Date.now();
      const active = new Set<string>();
      all.forEach((a) => {
        if (!a.expiresAt || new Date(a.expiresAt).getTime() > now) {
          active.add(a.serviceKey);
        }
      });
      cb(active, all);
    },
    (error) => {
      console.warn("[ServiceActivation] user activations listener skipped:", error.message);
      cb(new Set(), []);
    },
  );
}

/** Admin-side: subscribe to all activations (for the report page). */
export function subscribeAllActivations(cb: (list: ServiceActivation[]) => void) {
  const q = query(collection(db, "serviceActivations"), orderBy("activatedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list: ServiceActivation[] = [];
    snap.forEach((d) => list.push({ ...(d.data() as ServiceActivation), id: d.id }));
    cb(list);
  });
}

/** Compute expiry ISO string for a validity model from now(). */
function computeExpiry(validity: ActivationValidity): string | undefined {
  if (validity === "lifetime") return undefined;
  const d = new Date();
  if (validity === "monthly") d.setMonth(d.getMonth() + 1);
  if (validity === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

/**
 * Activate a service for the current user:
 *  1. Look up admin config (must exist + enabled).
 *  2. Atomic debit (throws "Insufficient balance" if low).
 *  3. Write activation doc + log activationHistory entry.
 */
export async function activateServiceForUser(args: {
  uid: string;
  serviceKey: string;
  serviceName: string;
}): Promise<ServiceActivation> {
  const { uid, serviceKey, serviceName } = args;

  const cfg = await getActivationConfig(serviceKey);
  if (!cfg || !cfg.enabled) {
    throw new Error("This service is not available for activation right now.");
  }
  const fee = Number(cfg.fee || 0);
  const validity = cfg.validity || "lifetime";

  // Idempotency: already active?
  const existing = await getUserActivation(uid, serviceKey);
  if (existing && (!existing.expiresAt || new Date(existing.expiresAt).getTime() > Date.now())) {
    return existing;
  }

  // Charge wallet (only if fee > 0)
  if (fee > 0) {
    await atomicDebit(uid, fee, {
      source: "service_activation",
      description: `Activation: ${serviceName}`,
      serviceKey,
    });
  }

  const activation: ServiceActivation = {
    id: activationDocId(uid, serviceKey),
    userId: uid,
    serviceKey,
    serviceName,
    feePaid: fee,
    validity,
    activatedAt: new Date().toISOString(),
    expiresAt: computeExpiry(validity),
  };
  await setDoc(doc(db, "serviceActivations", activation.id), activation);

  // Append to history collection (one row per activation event, not overwritten on renewal)
  await addDoc(collection(db, "activationHistory"), {
    userId: uid,
    serviceKey,
    serviceName,
    feePaid: fee,
    validity,
    activatedAt: activation.activatedAt,
    expiresAt: activation.expiresAt ?? null,
  });

  return activation;
}

/** Subscribe to a user's full activation history (for retailer panel). */
export function subscribeUserActivationHistory(
  uid: string,
  cb: (entries: Array<ServiceActivation & { eventId: string }>) => void,
) {
  const q = query(
    collection(db, "activationHistory"),
    where("userId", "==", uid),
    orderBy("activatedAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    const list: Array<ServiceActivation & { eventId: string }> = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      list.push({
        eventId: d.id,
        id: d.id,
        userId: data.userId,
        serviceKey: data.serviceKey,
        serviceName: data.serviceName,
        feePaid: data.feePaid,
        validity: data.validity,
        activatedAt: data.activatedAt,
        expiresAt: data.expiresAt ?? undefined,
      });
    });
    cb(list);
  });
}

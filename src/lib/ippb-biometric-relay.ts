/**
 * IPPB Biometric Relay
 * --------------------
 * Implements the redirected biometric capture flow:
 *   Staff Tablet (web) → Firestore relay → Retailer PC (web) → RD Service / simulation
 *   → Firestore relay → Staff Tablet (web)
 *
 * In production this is the same channel a native APK + Windows PC agent will use,
 * so the data shape here IS the API contract. See docs/ippb-biometric-api.md.
 */
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// Module-level cache: once we know the retailer can't read the IPPB
// collection-group, never try again — every failed snapshot listener
// can corrupt the Firestore SDK internal state and trigger
// "INTERNAL ASSERTION FAILED (ve:-1)", which silently breaks every other
// Firestore call in the app (blank pages, hung loaders, etc.).
const ippbReadDeniedFor = new Set<string>();

export type CaptureStatus =
  | "requested" // staff asked for capture
  | "capturing" // retailer device started capture
  | "captured" // retailer returned data
  | "failed"
  | "timeout"
  | "cancelled";

export interface CaptureRequest {
  id: string;
  ippbRequestId: string;
  retailerId: string;
  staffId: string;
  status: CaptureStatus;
  mode?: "L1_SIMULATION" | "L2_RD_SERVICE";
  // Captured payload (HASHED — raw biometric never stored)
  hash?: string;
  deviceModel?: string;
  rdServiceVersion?: string;
  errorCode?: string;
  errorMessage?: string;
  requestedAt: string;
  capturingAt?: string;
  capturedAt?: string;
  expiresAt: string; // 90s window
}

const TIMEOUT_MS = 90_000;

const COL = (ippbRequestId: string) =>
  collection(db, "ippbRequests", ippbRequestId, "captureRequests");

/* -------------------- Staff side -------------------- */

export async function staffCreateCaptureRequest(
  ippbRequestId: string,
  staffId: string,
  retailerId: string
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(COL(ippbRequestId), {
    ippbRequestId,
    staffId,
    retailerId,
    status: "requested" as CaptureStatus,
    requestedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TIMEOUT_MS).toISOString(),
    _ts: serverTimestamp(),
  });
  return ref.id;
}

export async function staffCancelCaptureRequest(
  ippbRequestId: string,
  captureId: string,
  staffId: string
): Promise<void> {
  const ref = doc(db, "ippbRequests", ippbRequestId, "captureRequests", captureId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as CaptureRequest;
    if (data.staffId !== staffId) throw new Error("Not your request");
    if (data.status === "captured") return;
    tx.update(ref, { status: "cancelled" as CaptureStatus });
  });
}

/* -------------------- Retailer side -------------------- */

export async function retailerStartCapture(
  ippbRequestId: string,
  captureId: string,
  retailerId: string
): Promise<void> {
  const ref = doc(db, "ippbRequests", ippbRequestId, "captureRequests", captureId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Capture request not found");
    const data = snap.data() as CaptureRequest;
    if (data.retailerId !== retailerId) throw new Error("Not your capture");
    if (data.status !== "requested") throw new Error("Capture is not pending");
    if (Date.now() > new Date(data.expiresAt).getTime()) {
      tx.update(ref, { status: "timeout" as CaptureStatus });
      throw new Error("Capture window expired");
    }
    tx.update(ref, {
      status: "capturing" as CaptureStatus,
      capturingAt: new Date().toISOString(),
    });
  });
}

export async function retailerSubmitCapture(
  ippbRequestId: string,
  captureId: string,
  retailerId: string,
  payload: {
    mode: "L1_SIMULATION" | "L2_RD_SERVICE";
    hash: string;
    deviceModel?: string;
    rdServiceVersion?: string;
  }
): Promise<void> {
  const ref = doc(db, "ippbRequests", ippbRequestId, "captureRequests", captureId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Capture request not found");
    const data = snap.data() as CaptureRequest;
    if (data.retailerId !== retailerId) throw new Error("Not your capture");
    if (!["requested", "capturing"].includes(data.status))
      throw new Error("Capture already finalized");
    tx.update(ref, {
      status: "captured" as CaptureStatus,
      capturedAt: new Date().toISOString(),
      mode: payload.mode,
      hash: payload.hash,
      deviceModel: payload.deviceModel ?? null,
      rdServiceVersion: payload.rdServiceVersion ?? null,
    });
  });
}

export async function retailerFailCapture(
  ippbRequestId: string,
  captureId: string,
  retailerId: string,
  error: { code: string; message: string }
): Promise<void> {
  const ref = doc(db, "ippbRequests", ippbRequestId, "captureRequests", captureId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as CaptureRequest;
    if (data.retailerId !== retailerId) throw new Error("Not your capture");
    if (["captured", "cancelled"].includes(data.status)) return;
    tx.update(ref, {
      status: "failed" as CaptureStatus,
      errorCode: error.code,
      errorMessage: error.message,
      capturedAt: new Date().toISOString(),
    });
  });
}

/* -------------------- Subscriptions -------------------- */

/** Staff watches one specific capture request to get the response. */
export function subscribeCaptureRequest(
  ippbRequestId: string,
  captureId: string,
  cb: (row: CaptureRequest | null) => void
): Unsubscribe {
  const ref = doc(db, "ippbRequests", ippbRequestId, "captureRequests", captureId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return cb(null);
    cb({ id: snap.id, ...(snap.data() as any) } as CaptureRequest);
  });
}

/** Retailer listens for any pending capture requests addressed to them. */
export function subscribeRetailerPendingCaptures(
  retailerId: string,
  cb: (rows: (CaptureRequest & { ippbRequestId: string })[]) => void
): Unsubscribe {
  // Single-field where → no composite index required. Status filtered client-side.
  const q = query(
    collectionGroup(db, "captureRequests"),
    where("retailerId", "==", retailerId)
  );
  // If a previous attempt for this retailer was denied (rules / no index),
  // do NOT attach another listener — repeated permission-denied snapshots
  // poison the Firestore SDK and crash unrelated pages.
  if (ippbReadDeniedFor.has(retailerId)) {
    cb([]);
    return () => {};
  }

  const q = query(
    collectionGroup(db, "captureRequests"),
    where("retailerId", "==", retailerId),
    limit(20)
  );

  // Precheck: try ONE getDocs call. If it fails (rules / index / network),
  // bail out before we set up the realtime listener that would otherwise
  // throw the INTERNAL ASSERTION crash.
  let unsub: Unsubscribe = () => {};
  let cancelled = false;

  getDocs(q)
    .then((snap) => {
      if (cancelled) return;
      // Initial deliver
      const initial = snap.docs
        .map((d) => {
          const data = d.data() as any;
          return { id: d.id, ippbRequestId: d.ref.parent.parent!.id, ...data } as
            CaptureRequest & { ippbRequestId: string };
        })
        .filter((r) => r.status === "requested" || r.status === "capturing");
      initial.sort((a, b) => (a.requestedAt ?? "").localeCompare(b.requestedAt ?? ""));
      cb(initial);

      // Now safe to subscribe
      unsub = onSnapshot(
        q,
        (s) => {
          const rows = s.docs
            .map((d) => {
              const data = d.data() as any;
              return { id: d.id, ippbRequestId: d.ref.parent.parent!.id, ...data } as
                CaptureRequest & { ippbRequestId: string };
            })
            .filter((r) => r.status === "requested" || r.status === "capturing");
          rows.sort((a, b) => (a.requestedAt ?? "").localeCompare(b.requestedAt ?? ""));
          cb(rows);
        },
        (err) => {
          console.warn("[ippb] pending-captures listener error:", err?.message ?? err);
          ippbReadDeniedFor.add(retailerId);
          try { unsub(); } catch {}
          cb([]);
        }
      );
    })
    .catch((err) => {
      console.warn("[ippb] pending-captures precheck failed, listener disabled:", err?.message ?? err);
      ippbReadDeniedFor.add(retailerId);
      cb([]);
    });

  return () => {
    cancelled = true;
    try { unsub(); } catch {}
  };
}

/* -------------------- RD Service helper (browser side) -------------------- */

/**
 * Try to detect a locally-installed RD Service (Mantra/Morpho/Startek...).
 * Returns the service info if reachable, otherwise null.
 *
 * NOTE: Most signed RD Services do NOT allow CORS from arbitrary origins,
 * so this typically fails in the browser. The native PC agent is the real path.
 */
export async function detectRDService(timeoutMs = 1500): Promise<{
  available: boolean;
  info?: string;
}> {
  const ports = [11100, 11101, 11102];
  for (const port of ports) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        method: "RDSERVICE" as any,
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        const txt = await res.text();
        return { available: true, info: txt.slice(0, 200) };
      }
    } catch {
      /* keep trying */
    }
  }
  return { available: false };
}

/** Generate a fake-but-realistic-looking hash for L1 simulation. */
export function simulateBiometricHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

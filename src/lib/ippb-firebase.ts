/**
 * IPPB Firebase actions — turn-based 19-step flow.
 * Every transition runs through `advanceStep` which:
 *  - validates the actor matches the current `turn`
 *  - validates the request is at the expected `currentStep`
 *  - updates the per-step data field
 *  - moves to the next step and flips the `turn`
 *  - appends a history entry
 *
 * This guarantees: no skipping, no double-action, full audit trail.
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  generateRequestNo,
  STEP_ORDER,
  STEP_TURN,
  type AccountInfo,
  type AccountResult,
  type AdditionalInfo,
  type AadhaarData,
  type BasicDetails,
  type BiometricCapture,
  type DBTMapping,
  type IPPBHistoryEntry,
  type IPPBRequest,
  type IPPBStep,
  type NomineeDetails,
  type PanAddress,
  type PersonalInfo,
  type Turn,
  type WelcomeKit,
} from "./ippb-types";
import { getIPPBFeeConfig } from "./ippb-fee-config";
import { hasIPPBBadge } from "./ippb-badge";

const COL = "ippbRequests";

async function findAdminId(): Promise<string | null> {
  const q = query(collection(db, "users"), where("role", "==", "admin"));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

function nextStep(current: IPPBStep): IPPBStep {
  const i = STEP_ORDER.indexOf(current);
  if (i < 0 || i >= STEP_ORDER.length - 1) return "completed";
  return STEP_ORDER[i + 1];
}

function appendHistory(
  prev: IPPBHistoryEntry[] | undefined,
  step: IPPBStep,
  by: string,
  byRole: "retailer" | "staff",
  note?: string
): IPPBHistoryEntry[] {
  return [
    ...(prev ?? []),
    { step, by, byRole, at: new Date().toISOString(), ...(note ? { note } : {}) },
  ];
}

/* ============ Create ============ */

export async function createIPPBRequest(input: {
  retailerId: string;
  retailerName: string;
  retailerEmail: string;
}): Promise<string> {
  const allowed = await hasIPPBBadge(input.retailerId);
  if (!allowed) {
    throw new Error(
      "IPPB badge required. Apply from the IPPB page and wait for admin approval."
    );
  }
  const requestNo = generateRequestNo();
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, COL), {
    requestNo,
    retailerId: input.retailerId,
    retailerName: input.retailerName,
    retailerEmail: input.retailerEmail,
    status: "pending",
    currentStep: "basic_details" as IPPBStep,
    turn: "retailer" as Turn,
    retryCount: 0,
    history: [
      {
        step: "basic_details" as IPPBStep,
        by: input.retailerId,
        byRole: "retailer" as const,
        at: now,
        note: "Request created",
      },
    ],
    createdAt: now,
    updatedAt: now,
    _ts: serverTimestamp(),
  });
  return ref.id;
}

/* ============ Core advance ============ */

interface AdvanceArgs {
  requestId: string;
  actorId: string;
  actorRole: "retailer" | "staff";
  expectedStep: IPPBStep;
  patch: Record<string, unknown>;
  note?: string;
  /** Override which step comes next (defaults to nextStep()) */
  overrideNextStep?: IPPBStep;
}

async function advanceStep(args: AdvanceArgs): Promise<void> {
  const { requestId, actorId, actorRole, expectedStep, patch, note, overrideNextStep } = args;
  const ref = doc(db, COL, requestId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Request not found");
    const data = snap.data() as IPPBRequest;

    if (data.status === "cancelled") throw new Error("Request was cancelled");
    if (data.status === "success") throw new Error("Already completed");

    if (data.currentStep !== expectedStep) {
      throw new Error(
        `Step mismatch — expected ${expectedStep}, current ${data.currentStep}`
      );
    }
    const turn = data.turn ?? STEP_TURN[data.currentStep];
    if (turn !== actorRole) {
      throw new Error(
        `Not your turn — currently waiting for ${turn}. Refresh and try again.`
      );
    }
    if (actorRole === "retailer" && data.retailerId !== actorId) {
      throw new Error("Not your request");
    }
    if (actorRole === "staff" && data.staffId && data.staffId !== actorId) {
      throw new Error("Already claimed by another staff");
    }

    const next = overrideNextStep ?? nextStep(data.currentStep);
    const nextTurn: Turn = STEP_TURN[next] ?? "staff";
    const nowIso = new Date().toISOString();

    tx.update(ref, {
      ...patch,
      status: next === "completed" ? "success" : "in_progress",
      currentStep: next,
      turn: nextTurn,
      updatedAt: nowIso,
      history: appendHistory(data.history, data.currentStep, actorId, actorRole, note),
    });
  });
}

/* ============ Staff claim (does NOT advance step) ============ */

export async function staffClaimRequest(
  requestId: string,
  staffId: string,
  staffName: string
): Promise<void> {
  const ref = doc(db, COL, requestId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Request not found");
    const data = snap.data() as IPPBRequest;
    if (data.staffId && data.staffId !== staffId) {
      throw new Error("Already claimed by another staff");
    }
    tx.update(ref, {
      staffId,
      staffName,
      updatedAt: new Date().toISOString(),
      history: appendHistory(data.history, data.currentStep, staffId, "staff", "Claimed"),
    });
  });
}

/* ============ Retailer-side step submitters ============ */

export const retailerSubmitBasicDetails = (requestId: string, retailerId: string, data: BasicDetails) =>
  advanceStep({
    requestId, actorId: retailerId, actorRole: "retailer",
    expectedStep: "basic_details",
    patch: { basicDetails: data },
    note: "Basic details submitted",
  });

export const retailerSubmitOTP = (requestId: string, retailerId: string, otp: string) => {
  if (!/^\d{4,8}$/.test(otp)) throw new Error("OTP must be 4-8 digits");
  return advanceStep({
    requestId, actorId: retailerId, actorRole: "retailer",
    expectedStep: "otp_verify",
    patch: { otp, otpVerifiedAt: new Date().toISOString() },
    note: "OTP relayed",
  });
};

export const retailerSubmitAadhaar = (requestId: string, retailerId: string, data: AadhaarData) => {
  if (!data.consent) throw new Error("Customer consent required");
  if (!/^\d{12}$/.test(data.aadhaarNumber)) throw new Error("Aadhaar must be 12 digits");
  return advanceStep({
    requestId, actorId: retailerId, actorRole: "retailer",
    expectedStep: "aadhaar_auth",
    patch: { aadhaar: data },
    note: "Aadhaar + consent submitted",
  });
};

export const retailerSubmitPersonalInfo = (requestId: string, retailerId: string, data: PersonalInfo) =>
  advanceStep({
    requestId, actorId: retailerId, actorRole: "retailer",
    expectedStep: "personal_info",
    patch: { personalInfo: data },
    note: "Personal info saved",
  });

export const retailerSubmitPanAddress = (requestId: string, retailerId: string, data: PanAddress) =>
  advanceStep({
    requestId, actorId: retailerId, actorRole: "retailer",
    expectedStep: "pan_address",
    patch: { panAddress: data },
    note: "PAN & address saved",
  });

export const retailerSubmitNominee = (requestId: string, retailerId: string, data: NomineeDetails) =>
  advanceStep({
    requestId, actorId: retailerId, actorRole: "retailer",
    expectedStep: "nominee_details",
    patch: { nomineeDetails: data },
    note: "Nominee saved",
  });

export const retailerSubmitAdditional = (requestId: string, retailerId: string, data: AdditionalInfo) =>
  advanceStep({
    requestId, actorId: retailerId, actorRole: "retailer",
    expectedStep: "additional_info",
    patch: { additionalInfo: data },
    note: "Additional info saved",
  });

export const retailerSubmitConsent = (requestId: string, retailerId: string) =>
  advanceStep({
    requestId, actorId: retailerId, actorRole: "retailer",
    expectedStep: "final_consent",
    patch: { finalConsent: { accepted: true, at: new Date().toISOString() } },
    note: "Consent accepted",
  });

export async function cancelIPPBRequest(requestId: string, retailerId: string): Promise<void> {
  const ref = doc(db, COL, requestId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Request not found");
    const data = snap.data() as IPPBRequest;
    if (data.retailerId !== retailerId) throw new Error("Not your request");
    if (data.status === "success") throw new Error("Cannot cancel — already completed");
    tx.update(ref, {
      status: "cancelled",
      updatedAt: new Date().toISOString(),
      history: appendHistory(data.history, data.currentStep, retailerId, "retailer", "Cancelled"),
    });
  });
}

/* ============ Staff-side step actions ============ */

export const staffNextOTP = (requestId: string, staffId: string) =>
  advanceStep({
    requestId, actorId: staffId, actorRole: "staff",
    expectedStep: "otp_verify",
    patch: {},
    note: "OTP verified by staff",
  });

export const staffCaptureBiometric1 = (requestId: string, staffId: string, bio: BiometricCapture) =>
  advanceStep({
    requestId, actorId: staffId, actorRole: "staff",
    expectedStep: "biometric_1",
    patch: { biometric1: bio },
    note: `Biometric 1 (${bio.mode})`,
  });

export const staffNextPersonalInfo = (requestId: string, staffId: string) =>
  advanceStep({
    requestId, actorId: staffId, actorRole: "staff",
    expectedStep: "personal_info",
    patch: {},
    note: "Personal info verified",
    overrideNextStep: "pan_address",
  });

export const staffSubmitAccountInfo = (requestId: string, staffId: string, data: AccountInfo) =>
  advanceStep({
    requestId, actorId: staffId, actorRole: "staff",
    expectedStep: "account_info",
    patch: { accountInfo: data },
    note: "Account info filled",
  });

export const staffSubmitDBT = (requestId: string, staffId: string, data: DBTMapping) =>
  advanceStep({
    requestId, actorId: staffId, actorRole: "staff",
    expectedStep: "dbt_mapping",
    patch: { dbtMapping: data },
    note: `DBT ${data.optIn ? "opted-in" : "skipped"}`,
  });

export const staffCaptureBiometric2 = (requestId: string, staffId: string, bio: BiometricCapture) =>
  advanceStep({
    requestId, actorId: staffId, actorRole: "staff",
    expectedStep: "biometric_2",
    patch: { biometric2: bio },
    note: `Biometric 2 (${bio.mode})`,
  });

export const staffSubmitWelcomeKit = (requestId: string, staffId: string, data: WelcomeKit) =>
  advanceStep({
    requestId, actorId: staffId, actorRole: "staff",
    expectedStep: "welcome_kit",
    patch: { welcomeKit: data },
    note: `Kit ${data.kitId}`,
  });

export const staffCaptureBiometricFinal = (requestId: string, staffId: string, bio: BiometricCapture) =>
  advanceStep({
    requestId, actorId: staffId, actorRole: "staff",
    expectedStep: "biometric_final",
    patch: { biometricFinal: bio },
    note: `Final biometric (${bio.mode})`,
  });

export async function staffSubmitFinalAccount(
  requestId: string,
  staffId: string,
  outcome: { success: boolean; result?: AccountResult; reason?: string }
): Promise<void> {
  if (outcome.success && outcome.result) {
    await advanceStep({
      requestId, actorId: staffId, actorRole: "staff",
      expectedStep: "account_created",
      patch: { accountResult: outcome.result },
      note: `Account ${outcome.result.accountNumber}`,
    });
    // Charge fee on terminal success
    try {
      const reqRef = doc(db, COL, requestId);
      const reqSnap = await getDoc(reqRef);
      const data = reqSnap.data() as IPPBRequest | undefined;
      if (data) await chargeIPPBFee({ requestId, retailerId: data.retailerId, staffId });
    } catch (e) {
      console.error("[IPPB] Fee charge failed:", e);
      await updateDoc(doc(db, COL, requestId), {
        feeStatus: "failed",
        feeError: (e as Error).message,
      });
    }
  } else {
    const ref = doc(db, COL, requestId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Request not found");
      const data = snap.data() as IPPBRequest;
      if (data.staffId !== staffId) throw new Error("Not your request");
      tx.update(ref, {
        status: "failed",
        failureReason: outcome.reason ?? "Submission failed",
        updatedAt: new Date().toISOString(),
        history: appendHistory(data.history, data.currentStep, staffId, "staff", outcome.reason),
      });
    });
  }
}

/* ============ Fee charging (unchanged from original) ============ */

async function chargeIPPBFee(params: { requestId: string; retailerId: string; staffId: string }): Promise<void> {
  const { requestId, retailerId, staffId } = params;
  if (!retailerId) throw new Error("Retailer not found");

  const reqRef = doc(db, COL, requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error("Request not found");
  if ((reqSnap.data() as any).feeStatus === "charged") return;

  const cfg = await getIPPBFeeConfig();
  if (cfg.serviceCharge <= 0) {
    await updateDoc(reqRef, { feeStatus: "skipped" });
    return;
  }

  const retailerWalletRef = doc(db, "wallets", retailerId);
  await runTransaction(db, async (tx) => {
    const w = await tx.get(retailerWalletRef);
    if (!w.exists()) throw new Error("Retailer wallet not found");
    const cur = (w.data().balance as number) || 0;
    if (cur < cfg.serviceCharge) throw new Error("Insufficient retailer balance");
    tx.update(retailerWalletRef, { balance: cur - cfg.serviceCharge });
  });
  await addDoc(collection(db, "transactions"), {
    userId: retailerId,
    amount: cfg.serviceCharge,
    type: "debit",
    source: "ippb_account_opening",
    description: "IPPB Account Opening – Service Charge",
    ippbRequestId: requestId,
    createdAt: new Date().toISOString(),
  });

  if (cfg.retailerCommission > 0) {
    await runTransaction(db, async (tx) => {
      const w = await tx.get(retailerWalletRef);
      if (!w.exists()) return;
      const cur = (w.data().balance as number) || 0;
      tx.update(retailerWalletRef, { balance: cur + cfg.retailerCommission });
    });
    await addDoc(collection(db, "transactions"), {
      userId: retailerId,
      amount: cfg.retailerCommission,
      type: "credit",
      source: "ippb_commission",
      description: "IPPB Commission (Retailer Share)",
      ippbRequestId: requestId,
      createdAt: new Date().toISOString(),
    });
  }

  if (cfg.staffCommission > 0) {
    const staffWalletRef = doc(db, "wallets", staffId);
    await runTransaction(db, async (tx) => {
      const w = await tx.get(staffWalletRef);
      const cur = w.exists() ? (w.data().balance as number) || 0 : 0;
      tx.set(staffWalletRef, { balance: cur + cfg.staffCommission }, { merge: true });
    });
    await addDoc(collection(db, "transactions"), {
      userId: staffId,
      amount: cfg.staffCommission,
      type: "credit",
      source: "ippb_commission",
      description: "IPPB Commission (Staff Share)",
      ippbRequestId: requestId,
      retailerId,
      createdAt: new Date().toISOString(),
    });
  }

  if (cfg.adminCommission > 0) {
    const adminId = await findAdminId();
    if (adminId) {
      const adminWalletRef = doc(db, "wallets", adminId);
      await runTransaction(db, async (tx) => {
        const w = await tx.get(adminWalletRef);
        const cur = w.exists() ? (w.data().balance as number) || 0 : 0;
        tx.set(adminWalletRef, { balance: cur + cfg.adminCommission }, { merge: true });
      });
      await addDoc(collection(db, "transactions"), {
        userId: adminId,
        amount: cfg.adminCommission,
        type: "credit",
        source: "ippb_commission",
        description: "IPPB Commission (Admin Share)",
        ippbRequestId: requestId,
        retailerId,
        createdAt: new Date().toISOString(),
      });
    }
  }

  await updateDoc(reqRef, {
    feeStatus: "charged",
    feeChargedAt: new Date().toISOString(),
    feeBreakdown: {
      serviceCharge: cfg.serviceCharge,
      retailerCommission: cfg.retailerCommission,
      staffCommission: cfg.staffCommission,
      adminCommission: cfg.adminCommission,
    },
  });
}

/* ============ Subscriptions ============ */

export function subscribeRetailerRequests(
  retailerId: string,
  cb: (rows: IPPBRequest[]) => void
): Unsubscribe {
  const q = query(collection(db, COL), where("retailerId", "==", retailerId));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as IPPBRequest[];
    rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    cb(rows);
  });
}

export function subscribeStaffQueue(cb: (rows: IPPBRequest[]) => void): Unsubscribe {
  const q = query(collection(db, COL));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as IPPBRequest[];
    rows.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    cb(rows);
  });
}

export function subscribeRequest(
  requestId: string,
  cb: (row: IPPBRequest | null) => void
): Unsubscribe {
  const ref = doc(db, COL, requestId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return cb(null);
    cb({ id: snap.id, ...(snap.data() as any) } as IPPBRequest);
  });
}

export async function getRequest(requestId: string): Promise<IPPBRequest | null> {
  const snap = await getDoc(doc(db, COL, requestId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as IPPBRequest;
}

/* ============ One-time migration: cancel legacy-schema requests ============
 * The new 19-step flow expects `currentStep` ∈ STEP_ORDER and `turn` ∈ {retailer,staff}.
 * Old requests used legacy statuses (mobile_entered, otp_relayed, otp_verified,
 * details_filled, biometric_captured, submitted) without `currentStep` / `turn`.
 * Loading them in the new UI breaks step rendering. This migration auto-cancels
 * any non-terminal request that is missing `currentStep` OR uses a legacy status,
 * so retailers/staff start fresh on the new flow.
 */

const LEGACY_STATUSES = new Set([
  "mobile_entered",
  "otp_relayed",
  "otp_verified",
  "details_filled",
  "biometric_captured",
  "submitted",
]);
const TERMINAL_STATUSES = new Set(["success", "failed", "cancelled"]);

export interface MigrationResult {
  scanned: number;
  cancelled: number;
  skipped: number;
  errors: number;
  details: Array<{ id: string; requestNo?: string; reason: string }>;
}

export async function migrateLegacyIPPBRequests(adminId: string): Promise<MigrationResult> {
  const result: MigrationResult = { scanned: 0, cancelled: 0, skipped: 0, errors: 0, details: [] };
  const snap = await getDocs(collection(db, COL));
  const validSteps = new Set(STEP_ORDER as string[]);

  for (const d of snap.docs) {
    result.scanned++;
    const data = d.data() as any;
    const status: string | undefined = data.status;
    const currentStep: string | undefined = data.currentStep;
    const isLegacyStatus = status && LEGACY_STATUSES.has(status);
    const missingStep = !currentStep || !validSteps.has(currentStep);
    const isTerminal = status && TERMINAL_STATUSES.has(status);

    if (isTerminal) {
      result.skipped++;
      continue;
    }
    if (!isLegacyStatus && !missingStep) {
      result.skipped++;
      continue;
    }

    try {
      const reason = isLegacyStatus
        ? `Legacy status: ${status}`
        : `Missing/invalid currentStep: ${currentStep ?? "<none>"}`;
      await updateDoc(doc(db, COL, d.id), {
        status: "cancelled",
        failureReason: "Auto-cancelled by migration to 19-step flow",
        updatedAt: new Date().toISOString(),
        history: appendHistory(
          Array.isArray(data.history) ? data.history : [],
          (currentStep && validSteps.has(currentStep) ? currentStep : "basic_details") as IPPBStep,
          adminId,
          "staff",
          `Migration: ${reason}`
        ),
        migratedAt: new Date().toISOString(),
        migratedBy: adminId,
      });
      result.cancelled++;
      result.details.push({ id: d.id, requestNo: data.requestNo, reason });
    } catch (e) {
      result.errors++;
      result.details.push({
        id: d.id,
        requestNo: data.requestNo,
        reason: `ERROR: ${(e as Error).message}`,
      });
    }
  }
  return result;
}

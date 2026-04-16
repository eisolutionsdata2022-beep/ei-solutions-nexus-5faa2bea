import {
  addDoc,
  collection,
  doc,
  getDoc,
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
  type IPPBBiometric,
  type IPPBCustomerDetails,
  type IPPBRequest,
  type IPPBStatus,
} from "./ippb-types";

const COL = "ippbRequests";

function appendHistory(
  current: IPPBRequest["history"] | undefined,
  status: IPPBStatus,
  by: string,
  note?: string
) {
  return [
    ...(current ?? []),
    { status, by, at: new Date().toISOString(), ...(note ? { note } : {}) },
  ];
}

/* ------------ Retailer ------------ */

export async function createIPPBRequest(input: {
  retailerId: string;
  retailerName: string;
  retailerEmail: string;
}): Promise<string> {
  const requestNo = generateRequestNo();
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, COL), {
    requestNo,
    retailerId: input.retailerId,
    retailerName: input.retailerName,
    retailerEmail: input.retailerEmail,
    status: "pending" as IPPBStatus,
    retryCount: 0,
    history: [{ status: "pending", by: input.retailerId, at: now }],
    createdAt: now,
    updatedAt: now,
    _ts: serverTimestamp(),
  });
  return ref.id;
}

export async function retailerSubmitOTP(
  requestId: string,
  retailerId: string,
  otp: string
): Promise<void> {
  if (!/^\d{4,8}$/.test(otp)) throw new Error("OTP must be 4-8 digits");
  const ref = doc(db, COL, requestId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Request not found");
    const data = snap.data() as IPPBRequest;
    if (data.retailerId !== retailerId) throw new Error("Not your request");
    if (data.status !== "mobile_entered" && data.status !== "otp_relayed") {
      throw new Error("Staff has not requested OTP yet");
    }
    tx.update(ref, {
      otpRelayed: otp,
      otpEnteredAt: new Date().toISOString(),
      status: "otp_relayed" as IPPBStatus,
      updatedAt: new Date().toISOString(),
      history: appendHistory(data.history, "otp_relayed", retailerId, "OTP relayed"),
    });
  });
}

export async function cancelIPPBRequest(
  requestId: string,
  retailerId: string
): Promise<void> {
  const ref = doc(db, COL, requestId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Request not found");
    const data = snap.data() as IPPBRequest;
    if (data.retailerId !== retailerId) throw new Error("Not your request");
    if (["success", "submitted", "biometric_captured"].includes(data.status)) {
      throw new Error("Cannot cancel – process already advanced");
    }
    tx.update(ref, {
      status: "cancelled" as IPPBStatus,
      updatedAt: new Date().toISOString(),
      history: appendHistory(data.history, "cancelled", retailerId),
    });
  });
}

/* ------------ Staff ------------ */

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
      history: appendHistory(data.history, data.status, staffId, "Claimed by staff"),
    });
  });
}

export async function staffEnterMobileAndSendOTP(
  requestId: string,
  staffId: string,
  mobileNumber: string
): Promise<void> {
  if (!/^[6-9]\d{9}$/.test(mobileNumber))
    throw new Error("Invalid 10-digit Indian mobile number");
  const ref = doc(db, COL, requestId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Request not found");
    const data = snap.data() as IPPBRequest;
    if (data.staffId !== staffId) throw new Error("Claim the request first");
    tx.update(ref, {
      mobileNumber,
      status: "mobile_entered" as IPPBStatus,
      otpRelayed: null,
      otpEnteredAt: null,
      updatedAt: new Date().toISOString(),
      history: appendHistory(
        data.history,
        "mobile_entered",
        staffId,
        `OTP sent to ${mobileNumber.slice(0, 2)}******${mobileNumber.slice(-2)}`
      ),
    });
  });
}

export async function staffMarkOTPVerified(
  requestId: string,
  staffId: string,
  success: boolean
): Promise<void> {
  const ref = doc(db, COL, requestId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Request not found");
    const data = snap.data() as IPPBRequest;
    if (data.staffId !== staffId) throw new Error("Not your request");
    if (data.status !== "otp_relayed") throw new Error("No OTP to verify");
    if (success) {
      tx.update(ref, {
        status: "otp_verified" as IPPBStatus,
        otpVerifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: appendHistory(data.history, "otp_verified", staffId),
      });
    } else {
      tx.update(ref, {
        status: "mobile_entered" as IPPBStatus,
        otpRelayed: null,
        retryCount: (data.retryCount ?? 0) + 1,
        updatedAt: new Date().toISOString(),
        history: appendHistory(
          data.history,
          "mobile_entered",
          staffId,
          "OTP wrong – retry"
        ),
      });
    }
  });
}

export async function staffSaveDetails(
  requestId: string,
  staffId: string,
  details: IPPBCustomerDetails
): Promise<void> {
  const ref = doc(db, COL, requestId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Request not found");
    const data = snap.data() as IPPBRequest;
    if (data.staffId !== staffId) throw new Error("Not your request");
    if (!["otp_verified", "details_filled"].includes(data.status))
      throw new Error("OTP must be verified first");
    tx.update(ref, {
      customerDetails: details,
      status: "details_filled" as IPPBStatus,
      updatedAt: new Date().toISOString(),
      history: appendHistory(data.history, "details_filled", staffId),
    });
  });
}

export async function staffCaptureBiometric(
  requestId: string,
  staffId: string,
  biometric: IPPBBiometric
): Promise<void> {
  const ref = doc(db, COL, requestId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Request not found");
    const data = snap.data() as IPPBRequest;
    if (data.staffId !== staffId) throw new Error("Not your request");
    if (!["details_filled", "biometric_captured"].includes(data.status))
      throw new Error("Fill details first");
    tx.update(ref, {
      biometric,
      status: "biometric_captured" as IPPBStatus,
      updatedAt: new Date().toISOString(),
      history: appendHistory(
        data.history,
        "biometric_captured",
        staffId,
        biometric.mode
      ),
    });
  });
}

export async function staffSubmitAccount(
  requestId: string,
  staffId: string,
  outcome: { success: boolean; accountNumber?: string; reason?: string }
): Promise<void> {
  const ref = doc(db, COL, requestId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Request not found");
    const data = snap.data() as IPPBRequest;
    if (data.staffId !== staffId) throw new Error("Not your request");
    if (data.status !== "biometric_captured")
      throw new Error("Biometric required");
    if (outcome.success) {
      tx.update(ref, {
        status: "success" as IPPBStatus,
        accountNumber: outcome.accountNumber ?? null,
        updatedAt: new Date().toISOString(),
        history: appendHistory(
          data.history,
          "success",
          staffId,
          outcome.accountNumber ? `A/c ${outcome.accountNumber}` : undefined
        ),
      });
    } else {
      tx.update(ref, {
        status: "failed" as IPPBStatus,
        failureReason: outcome.reason ?? "Submission failed",
        updatedAt: new Date().toISOString(),
        history: appendHistory(data.history, "failed", staffId, outcome.reason),
      });
    }
  });
}

/* ------------ Subscriptions ------------ */

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

export async function updateRequestStatus(
  requestId: string,
  status: IPPBStatus,
  by: string
): Promise<void> {
  const ref = doc(db, COL, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as IPPBRequest;
  await updateDoc(ref, {
    status,
    updatedAt: new Date().toISOString(),
    history: appendHistory(data.history, status, by),
  });
}

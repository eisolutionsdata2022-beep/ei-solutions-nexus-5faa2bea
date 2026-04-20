import {
  collection, doc, getDoc, getDocs, onSnapshot, query, where, orderBy, limit,
  setDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { DripSequence, DripEnrollment, DripStep } from "./drip-types";
import { DEFAULT_DRIP_STEPS } from "./drip-types";

const SEQ_COL = "whatsappDripSequences";
const ENROLL_COL = "whatsappDripEnrollments";
const DEFAULT_SEQ_ID = "default";

// ── Sequence ───────────────────────────────────────────────────────────
export function subscribeDefaultSequence(cb: (s: DripSequence | null) => void) {
  return onSnapshot(doc(db, SEQ_COL, DEFAULT_SEQ_ID), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as DripSequence) : null);
  });
}

export async function getDefaultSequence(): Promise<DripSequence | null> {
  const snap = await getDoc(doc(db, SEQ_COL, DEFAULT_SEQ_ID));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as DripSequence) : null;
}

export async function ensureDefaultSequence(createdBy: string): Promise<DripSequence> {
  const existing = await getDefaultSequence();
  if (existing) return existing;
  const seed: Omit<DripSequence, "id"> = {
    name: "New lead welcome",
    enabled: false, // off by default — admin must turn it on
    leadSources: [], // empty = all sources
    steps: DEFAULT_DRIP_STEPS,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, SEQ_COL, DEFAULT_SEQ_ID), seed);
  return { id: DEFAULT_SEQ_ID, ...seed } as DripSequence;
}

export async function saveSequence(patch: {
  name?: string;
  enabled?: boolean;
  leadSources?: string[];
  steps?: DripStep[];
}) {
  await setDoc(
    doc(db, SEQ_COL, DEFAULT_SEQ_ID),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ── Enrollments ────────────────────────────────────────────────────────
export function subscribeEnrollment(leadId: string, cb: (e: DripEnrollment | null) => void) {
  return onSnapshot(doc(db, ENROLL_COL, leadId), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as DripEnrollment) : null);
  });
}

export async function getEnrollment(leadId: string): Promise<DripEnrollment | null> {
  const snap = await getDoc(doc(db, ENROLL_COL, leadId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as DripEnrollment) : null;
}

export async function stopEnrollmentManual(leadId: string, reason: string = "Stopped by user") {
  await updateDoc(doc(db, ENROLL_COL, leadId), {
    status: "stopped_manual",
    nextSendAt: null,
    stoppedReason: reason,
    updatedAt: serverTimestamp(),
  });
}

/** Compute the next-send ISO timestamp for a given step, anchored to enrollmentDate. */
export function computeNextSendAt(enrolledAtIso: string, step: DripStep): string {
  const base = new Date(enrolledAtIso);
  base.setUTCDate(base.getUTCDate() + step.dayOffset);
  // Hour is interpreted as IST (UTC+5:30); convert to UTC.
  const utcHour = step.hourOfDay - 5;
  const utcMin = -30;
  base.setUTCHours(utcHour, utcMin, 0, 0);
  // If already in the past (e.g. dayOffset 0 + late evening), schedule for "now + 60s"
  if (base.getTime() < Date.now()) {
    return new Date(Date.now() + 60_000).toISOString();
  }
  return base.toISOString();
}

/** Create an enrollment for a brand-new lead (client-side; bridge can also do it). */
export async function enrollLead(input: {
  leadId: string;
  phone: string;
  name: string;
  sequence: DripSequence;
}) {
  if (!input.sequence.enabled || input.sequence.steps.length === 0) return;
  // Source filter: empty array = all
  const enrolledAt = new Date().toISOString();
  const nextSendAt = computeNextSendAt(enrolledAt, input.sequence.steps[0]);
  const enrollment: Omit<DripEnrollment, "id"> = {
    leadId: input.leadId,
    phone: (input.phone || "").replace(/\D/g, "").slice(-10),
    name: input.name || "",
    sequenceId: input.sequence.id,
    currentStep: 0,
    status: "active",
    nextSendAt,
    enrolledAt,
    lastSentAt: null,
    lastMessageId: null,
  };
  await setDoc(doc(db, ENROLL_COL, input.leadId), enrollment);
}

/** Stop active enrollment because lead's CRM status moved away from New. */
export async function stopEnrollmentForStatusChange(leadId: string, newStatus: string) {
  const ex = await getEnrollment(leadId);
  if (!ex || ex.status !== "active") return;
  await updateDoc(doc(db, ENROLL_COL, leadId), {
    status: "stopped_status",
    nextSendAt: null,
    stoppedReason: `Lead status changed to "${newStatus}"`,
    updatedAt: serverTimestamp(),
  });
}

// ── Stats (admin dashboard counters) ───────────────────────────────────
export async function getDripStats(days = 30) {
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const snap = await getDocs(
    query(collection(db, ENROLL_COL), where("enrolledAt", ">=", sinceIso))
  );
  const rows = snap.docs.map((d) => d.data() as DripEnrollment);
  return {
    total: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    stoppedReplied: rows.filter((r) => r.status === "stopped_replied").length,
    stoppedStatus: rows.filter((r) => r.status === "stopped_status").length,
    stoppedManual: rows.filter((r) => r.status === "stopped_manual" || r.status === "stopped_optout").length,
    completed: rows.filter((r) => r.status === "completed").length,
    failed: rows.filter((r) => r.status === "failed").length,
  };
}

export function subscribeRecentEnrollments(cb: (rows: DripEnrollment[]) => void, max = 25) {
  return onSnapshot(
    query(collection(db, ENROLL_COL), orderBy("enrolledAt", "desc"), limit(max)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DripEnrollment)))
  );
}

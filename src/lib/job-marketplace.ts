import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { atomicCredit, atomicDebit } from "./firebase-transactions";
import {
  DEFAULT_COMMISSION_PERCENT,
  DEFAULT_WORKER_SECURITY_PERCENT,
  type CategoryCommissionDoc,
  type DisputeResolution,
  type JobCategory,
  type JobDoc,
  type JobNotificationDoc,
  type WorkBadgeApplicationDoc,
} from "./job-marketplace-types";

const ADMIN_WALLET_ID = "__admin__";

/* -------------------- Commission settings -------------------- */

export async function getCategoryCommission(
  category: JobCategory
): Promise<CategoryCommissionDoc> {
  const ref = doc(db, "jobCategoryCommissions", category);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as CategoryCommissionDoc;
  return {
    category,
    type: "percent",
    value: DEFAULT_COMMISSION_PERCENT,
    workerSecurityFeePercent: DEFAULT_WORKER_SECURITY_PERCENT,
    updatedAt: new Date().toISOString(),
  };
}

export async function setCategoryCommission(c: CategoryCommissionDoc) {
  await setDoc(doc(db, "jobCategoryCommissions", c.category), {
    ...c,
    updatedAt: new Date().toISOString(),
  });
}

export function calcCommission(
  bid: number,
  rule: CategoryCommissionDoc
): number {
  if (rule.type === "percent") return Math.round((bid * rule.value) / 100);
  return Math.min(rule.value, bid);
}

export function calcSecurityFee(bid: number, rule: CategoryCommissionDoc) {
  return Math.round((bid * rule.workerSecurityFeePercent) / 100);
}

/* -------------------- Work badge -------------------- */

export async function applyForWorkBadge(
  app: Omit<WorkBadgeApplicationDoc, "id" | "status" | "createdAt">
) {
  const docRef = await addDoc(collection(db, "workBadgeApplications"), {
    ...app,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

export async function reviewWorkBadge(
  applicationId: string,
  userId: string,
  approve: boolean,
  note?: string
) {
  await updateDoc(doc(db, "workBadgeApplications", applicationId), {
    status: approve ? "approved" : "rejected",
    reviewNote: note || "",
    reviewedAt: new Date().toISOString(),
  });
  if (approve) {
    await setDoc(
      doc(db, "users", userId),
      { workBadge: true, workBadgeAt: new Date().toISOString() },
      { merge: true }
    );
  } else {
    await setDoc(doc(db, "users", userId), { workBadge: false }, { merge: true });
  }
}

export async function hasWorkBadge(userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", userId));
  return !!(snap.exists() && (snap.data() as any).workBadge);
}

/* -------------------- Notifications -------------------- */

export async function notifyUser(
  n: Omit<JobNotificationDoc, "id" | "createdAt" | "read">
) {
  await addDoc(collection(db, "jobNotifications"), {
    ...n,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

/* -------------------- Job lifecycle (with escrow) -------------------- */

export async function createJobWithEscrow(
  uploaderId: string,
  uploaderName: string,
  data: {
    title: string;
    description: string;
    category: JobCategory;
    pages?: number;
    budget: number;
    deadline: string;
    requiredDocs: string;
  }
): Promise<string> {
  if (data.budget < 50) throw new Error("Minimum budget is ₹50");
  // Hold uploader's budget in escrow
  await atomicDebit(uploaderId, data.budget, {
    source: "job-escrow",
    description: `Escrow hold: ${data.title}`,
  });

  const jobRef = await addDoc(collection(db, "jobs"), {
    ...data,
    uploaderId,
    uploaderName,
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return jobRef.id;
}

export async function placeBid(
  jobId: string,
  jobTitle: string,
  workerId: string,
  workerName: string,
  amount: number,
  message?: string
) {
  if (amount <= 0) throw new Error("Bid must be > 0");
  // Worker must hold a Work Badge
  if (!(await hasWorkBadge(workerId))) {
    throw new Error("NO_BADGE");
  }
  await addDoc(collection(db, "bids"), {
    jobId,
    jobTitle,
    workerId,
    workerName,
    amount,
    message: message || "",
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  // Notify uploader
  const jobSnap = await getDoc(doc(db, "jobs", jobId));
  if (jobSnap.exists()) {
    const j = jobSnap.data() as JobDoc;
    await notifyUser({
      userId: j.uploaderId,
      type: "bid_received",
      jobId,
      jobTitle,
      message: `${workerName} bid ₹${amount}`,
    });
  }
}

export async function acceptBid(jobId: string, bidId: string) {
  const jobRef = doc(db, "jobs", jobId);
  const bidRef = doc(db, "bids", bidId);

  const { job, bid } = await runTransaction(db, async (tx) => {
    const jobSnap = await tx.get(jobRef);
    const bidSnap = await tx.get(bidRef);
    if (!jobSnap.exists() || !bidSnap.exists())
      throw new Error("Job or bid not found");
    const job = { id: jobSnap.id, ...(jobSnap.data() as any) } as JobDoc;
    const bid = { id: bidSnap.id, ...(bidSnap.data() as any) };
    if (job.status !== "open")
      throw new Error("Job is no longer accepting bids");
    return { job, bid };
  });

  const rule = await getCategoryCommission(job.category);
  const securityFee = calcSecurityFee(bid.amount, rule);

  // Worker pays a security fee (escrow)
  await atomicDebit(bid.workerId, securityFee, {
    source: "job-security-fee",
    description: `Security fee for: ${job.title}`,
  });

  await updateDoc(jobRef, {
    status: "assigned",
    assignedWorkerId: bid.workerId,
    assignedWorkerName: bid.workerName,
    finalBidAmount: bid.amount,
    workerSecurityFee: securityFee,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(bidRef, { status: "accepted" });

  // Reject all other bids
  const others = await getDocs(
    query(collection(db, "bids"), where("jobId", "==", jobId))
  );
  for (const d of others.docs) {
    if (d.id !== bidId) await updateDoc(d.ref, { status: "rejected" });
  }

  await notifyUser({
    userId: bid.workerId,
    type: "bid_accepted",
    jobId,
    jobTitle: job.title,
    message: `Your bid of ₹${bid.amount} was accepted!`,
  });
}

export async function requestDocuments(
  jobId: string,
  workerId: string,
  workerName: string,
  text: string
) {
  await addDoc(collection(db, "jobMessages"), {
    jobId,
    type: "doc_request",
    fromUserId: workerId,
    fromUserName: workerName,
    text,
    createdAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, "jobs", jobId), {
    status: "doc_requested",
    updatedAt: new Date().toISOString(),
  });
  const jobSnap = await getDoc(doc(db, "jobs", jobId));
  if (jobSnap.exists()) {
    const j = jobSnap.data() as JobDoc;
    await notifyUser({
      userId: j.uploaderId,
      type: "doc_requested",
      jobId,
      jobTitle: j.title,
      message: `Worker requested documents`,
    });
  }
}

export async function uploadDocumentsResponse(
  jobId: string,
  uploaderId: string,
  uploaderName: string,
  text: string,
  fileUrls: string[]
) {
  await addDoc(collection(db, "jobMessages"), {
    jobId,
    type: "doc_upload",
    fromUserId: uploaderId,
    fromUserName: uploaderName,
    text,
    fileUrls,
    createdAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, "jobs", jobId), {
    status: "assigned",
    updatedAt: new Date().toISOString(),
  });
  const jobSnap = await getDoc(doc(db, "jobs", jobId));
  if (jobSnap.exists()) {
    const j = jobSnap.data() as JobDoc;
    if (j.assignedWorkerId) {
      await notifyUser({
        userId: j.assignedWorkerId,
        type: "doc_uploaded",
        jobId,
        jobTitle: j.title,
        message: `Documents uploaded by client`,
      });
    }
  }
}

export async function submitWork(
  jobId: string,
  workerId: string,
  workerName: string,
  text: string,
  fileUrls: string[]
) {
  await addDoc(collection(db, "jobMessages"), {
    jobId,
    type: "submission",
    fromUserId: workerId,
    fromUserName: workerName,
    text,
    fileUrls,
    createdAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, "jobs", jobId), {
    status: "submitted",
    updatedAt: new Date().toISOString(),
  });
  const jobSnap = await getDoc(doc(db, "jobs", jobId));
  if (jobSnap.exists()) {
    const j = jobSnap.data() as JobDoc;
    await notifyUser({
      userId: j.uploaderId,
      type: "work_submitted",
      jobId,
      jobTitle: j.title,
      message: `Worker submitted the completed work`,
    });
  }
}

export async function ensureAdminWallet() {
  const ref = doc(db, "wallets", ADMIN_WALLET_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      userId: ADMIN_WALLET_ID,
      balance: 0,
      createdAt: new Date().toISOString(),
    });
  }
}

export async function completeJobAndRelease(jobId: string) {
  await ensureAdminWallet();
  const jobRef = doc(db, "jobs", jobId);
  const snap = await getDoc(jobRef);
  if (!snap.exists()) throw new Error("Job not found");
  const job = { id: snap.id, ...(snap.data() as any) } as JobDoc;
  if (job.status !== "submitted")
    throw new Error("Worker has not submitted the work yet");
  if (!job.assignedWorkerId || !job.finalBidAmount)
    throw new Error("Job missing worker/bid info");

  const rule = await getCategoryCommission(job.category);
  const commission = calcCommission(job.finalBidAmount, rule);
  const workerNet = job.finalBidAmount - commission;
  const uploaderRefund = job.budget - job.finalBidAmount;
  const securityFee = job.workerSecurityFee || 0;

  // Pay worker (bid - commission) + return security fee
  await atomicCredit(job.assignedWorkerId, workerNet + securityFee, {
    source: "job-payment",
    description: `Payment + security refund: ${job.title}`,
  });

  // Pay admin commission
  await atomicCredit(ADMIN_WALLET_ID, commission, {
    source: "job-commission",
    description: `Commission from job: ${job.title}`,
  });

  // Refund uploader excess (budget - bid)
  if (uploaderRefund > 0) {
    await atomicCredit(job.uploaderId, uploaderRefund, {
      source: "job-refund",
      description: `Escrow refund (excess): ${job.title}`,
    });
  }

  await updateDoc(jobRef, {
    status: "completed",
    adminCommission: commission,
    workerNet,
    uploaderRefund,
    updatedAt: new Date().toISOString(),
  });

  await notifyUser({
    userId: job.assignedWorkerId,
    type: "payment_completed",
    jobId,
    jobTitle: job.title,
    message: `₹${workerNet} credited (commission ₹${commission} deducted)`,
  });
}

export async function rejectJob(jobId: string) {
  const jobRef = doc(db, "jobs", jobId);
  const snap = await getDoc(jobRef);
  if (!snap.exists()) return;
  const job = snap.data() as JobDoc;
  if (job.status === "completed") throw new Error("Job already completed");
  // Refund uploader the full budget
  await atomicCredit(job.uploaderId, job.budget, {
    source: "job-refund",
    description: `Job cancelled refund: ${job.title}`,
  });
  // Refund worker security fee if any
  if (job.assignedWorkerId && job.workerSecurityFee) {
    await atomicCredit(job.assignedWorkerId, job.workerSecurityFee, {
      source: "job-refund",
      description: `Security refund: ${job.title}`,
    });
  }
  await updateDoc(jobRef, {
    status: "rejected",
    updatedAt: new Date().toISOString(),
  });
}

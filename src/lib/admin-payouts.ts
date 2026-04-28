/**
 * Admin → User manual payout generator.
 * Used by Commission Center "Admin Payouts" tab.
 *
 * Atomically credits recipient wallet and logs a payout record.
 * NOTE: Admin wallet is conceptual (system funded) — we do not debit a
 * specific admin wallet doc, but every payout is logged for audit.
 */
import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";
import { atomicCredit } from "./firebase-transactions";

export interface AdminPayoutInput {
  recipientUserId: string;
  recipientEmail: string;
  recipientRole: string;
  amount: number;
  serviceKey: string;       // e.g. "job-payout", "task-payout"
  serviceName: string;
  reason: string;
  adminUserId: string;
  adminEmail: string;
}

export async function generateAdminPayout(input: AdminPayoutInput): Promise<void> {
  if (!input.recipientUserId) throw new Error("Recipient is required");
  if (!input.amount || input.amount <= 0) throw new Error("Amount must be positive");
  if (!input.reason?.trim()) throw new Error("Reason is required");

  // Credit recipient wallet (atomic)
  await atomicCredit(input.recipientUserId, input.amount, {
    source: "admin_payout",
    description: `${input.serviceName}: ${input.reason}`,
    serviceKey: input.serviceKey,
    adminUserId: input.adminUserId,
    adminEmail: input.adminEmail,
  });

  // Audit log
  await addDoc(collection(db, "admin_payouts"), {
    ...input,
    status: "completed",
    createdAt: new Date().toISOString(),
  });
}

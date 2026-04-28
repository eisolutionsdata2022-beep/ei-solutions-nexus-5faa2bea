import { doc, runTransaction, collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Atomically debit a wallet and log the transaction.
 * Auto-creates the wallet doc if missing (with balance 0) so debits fail
 * cleanly with "Insufficient balance" rather than the misleading
 * "Wallet not found" — which previously broke service activation for any
 * retailer who had never topped up.
 */
export async function atomicDebit(
  userId: string,
  amount: number,
  txData: { source: string; description: string; [key: string]: any }
): Promise<number> {
  if (amount <= 0) throw new Error("Amount must be positive");

  const walletRef = doc(db, "wallets", userId);
  const newBalance = await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(walletRef);
    const current = walletDoc.exists() ? walletDoc.data().balance || 0 : 0;
    if (current < amount) throw new Error("Insufficient balance");
    const updated = current - amount;
    if (walletDoc.exists()) {
      transaction.update(walletRef, { balance: updated });
    } else {
      transaction.set(walletRef, { balance: updated, userId, createdAt: new Date().toISOString() });
    }
    return updated;
  });

  await addDoc(collection(db, "transactions"), {
    userId,
    amount,
    type: "debit",
    ...txData,
    createdAt: new Date().toISOString(),
  });

  return newBalance;
}

/**
 * Atomically credit a wallet and log the transaction.
 * Auto-creates the wallet doc if missing — fixes the bug where admin-approved
 * wallet top-ups appeared "approved" but never actually credited the user
 * because their wallet doc didn't exist yet.
 */
export async function atomicCredit(
  userId: string,
  amount: number,
  txData: { source: string; description: string; [key: string]: any }
): Promise<number> {
  if (amount <= 0) throw new Error("Amount must be positive");

  const walletRef = doc(db, "wallets", userId);
  const newBalance = await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(walletRef);
    const current = walletDoc.exists() ? walletDoc.data().balance || 0 : 0;
    const updated = current + amount;
    if (walletDoc.exists()) {
      transaction.update(walletRef, { balance: updated });
    } else {
      transaction.set(walletRef, { balance: updated, userId, createdAt: new Date().toISOString() });
    }
    return updated;
  });

  await addDoc(collection(db, "transactions"), {
    userId,
    amount,
    type: "credit",
    ...txData,
    createdAt: new Date().toISOString(),
  });

  return newBalance;
}

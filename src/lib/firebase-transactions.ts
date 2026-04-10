import { doc, runTransaction, collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Atomically debit a wallet and log the transaction.
 * Returns the new balance or throws on insufficient funds.
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
    if (!walletDoc.exists()) throw new Error("Wallet not found");
    const current = walletDoc.data().balance || 0;
    if (current < amount) throw new Error("Insufficient balance");
    const updated = current - amount;
    transaction.update(walletRef, { balance: updated });
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
    if (!walletDoc.exists()) throw new Error("Wallet not found");
    const current = walletDoc.data().balance || 0;
    const updated = current + amount;
    transaction.update(walletRef, { balance: updated });
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

/**
 * Handles the full recharge/BBPS transaction flow:
 * 1. Validate wallet balance
 * 2. Debit retailer wallet (amount + service charge)
 * 3. Call external backend API
 * 4. Distribute commissions
 * 5. Log transaction with full audit trail
 */

import { doc, getDoc, runTransaction, collection, addDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { calculateCommissionSplit, type CommissionRate, type CommissionSplit } from "./commission-config";
import { callAmbikaRechargeApi, type AmbikaApiResponse } from "./ambika-api.functions";
import { callInsuranceApi, type InsuranceApiResponse } from "./busyworld-insurance-api.functions";

const INSURANCE_SERVICE_TYPES = ["bike_insurance", "four_wheeler_insurance", "life_insurance"];

export interface RechargeRequest {
  userId: string;           // retailer uid
  userEmail: string;
  serviceType: string;      // "mobile_recharge", "dth", "bbps"
  operator: string;         // "airtel", "jio", etc.
  mobileNumber: string;     // subscriber number
  amount: number;           // recharge amount
  distributorId?: string;   // parent distributor
}

export interface RechargeResult {
  success: boolean;
  transactionId: string;
  message: string;
  commission: CommissionSplit;
  newBalance: number;
  apiResponse?: AmbikaApiResponse;
}

/**
 * Get commission rate from Firebase or use defaults
 */
async function getCommissionRate(serviceType: string, operator: string): Promise<CommissionRate | null> {
  const q = query(
    collection(db, "commissionRates"),
    where("serviceType", "==", serviceType),
    where("operator", "==", operator)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as CommissionRate;
  }
  // Fallback to defaults imported at call site
  return null;
}

/**
 * Check for duplicate transaction within 2 minutes
 */
async function isDuplicate(userId: string, mobileNumber: string, amount: number): Promise<boolean> {
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const q = query(
    collection(db, "rechargeTransactions"),
    where("userId", "==", userId),
    where("mobileNumber", "==", mobileNumber),
    where("amount", "==", amount),
    where("createdAt", ">=", twoMinAgo)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Credit commission to a wallet
 */
async function creditWallet(walletUserId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const walletRef = doc(db, "wallets", walletUserId);
  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(walletRef);
    if (!walletDoc.exists()) return; // skip if wallet doesn't exist
    const current = walletDoc.data().balance || 0;
    transaction.update(walletRef, { balance: current + amount });
  });
}

/**
 * Find admin user ID (first admin user)
 */
async function getAdminUserId(): Promise<string | null> {
  const q = query(collection(db, "users"), where("role", "==", "admin"));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

/**
 * Find distributor for a retailer
 */
async function getDistributorId(retailerId: string): Promise<string | null> {
  const userDoc = await getDoc(doc(db, "users", retailerId));
  if (userDoc.exists()) {
    return userDoc.data().distributorId || null;
  }
  return null;
}

/**
 * Execute full recharge transaction
 */
export async function executeRechargeTransaction(
  request: RechargeRequest,
  commissionRate: CommissionRate
): Promise<RechargeResult> {
  // 1. Prevent duplicates
  const dup = await isDuplicate(request.userId, request.mobileNumber, request.amount);
  if (dup) {
    throw new Error("Duplicate transaction detected. Please wait before retrying.");
  }

  // 2. Calculate commission split
  const commission = calculateCommissionSplit(request.amount, commissionRate);
  const totalDebit = request.amount + commissionRate.serviceCharge;

  // 3. Debit retailer wallet atomically
  const walletRef = doc(db, "wallets", request.userId);
  const newBalance = await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(walletRef);
    if (!walletDoc.exists()) throw new Error("Wallet not found");
    const current = walletDoc.data().balance || 0;
    if (current < totalDebit) throw new Error(`Insufficient balance. Need ₹${totalDebit}, have ₹${current.toFixed(2)}`);
    const updated = current - totalDebit;
    transaction.update(walletRef, { balance: updated });
    return updated;
  });

  // 4. Log the main transaction
  const txRef = await addDoc(collection(db, "rechargeTransactions"), {
    userId: request.userId,
    userEmail: request.userEmail,
    serviceType: request.serviceType,
    operator: request.operator,
    mobileNumber: request.mobileNumber,
    amount: request.amount,
    serviceCharge: commissionRate.serviceCharge,
    totalDebit,
    status: "processing",
    commission: {
      retailer: commission.retailerAmount,
      distributor: commission.distributorAmount,
      admin: commission.adminAmount,
      serviceCharge: commission.serviceChargeAmount,
      total: commission.totalCommission,
    },
    createdAt: new Date().toISOString(),
  });

  // 5. Also log in general transactions collection for wallet history
  await addDoc(collection(db, "transactions"), {
    userId: request.userId,
    amount: totalDebit,
    type: "debit",
    source: "recharge",
    description: `${request.operator.toUpperCase()} ${request.serviceType === "mobile_recharge" ? "Recharge" : "Payment"} - ${request.mobileNumber}`,
    rechargeTransactionId: txRef.id,
    createdAt: new Date().toISOString(),
  });

  // 6. Call external Ambika Recharge API
  let apiResponse: AmbikaApiResponse;
  try {
    apiResponse = await callAmbikaRechargeApi({
      data: {
        serviceType: request.serviceType,
        operator: request.operator,
        mobileNumber: request.mobileNumber,
        amount: request.amount,
        transactionId: txRef.id,
      },
    });

    // Update transaction with API response
    await updateDoc(txRef, {
      apiStatus: apiResponse.status,
      apiTransactionId: apiResponse.apiTransactionId || null,
      operatorRef: apiResponse.operatorRef || null,
      apiMessage: apiResponse.message,
    });
  } catch (err) {
    // API call failed — refund wallet and mark failed
    await runTransaction(db, async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      if (walletDoc.exists()) {
        const current = walletDoc.data().balance || 0;
        transaction.update(walletRef, { balance: current + totalDebit });
      }
    });

    // Log refund transaction
    await addDoc(collection(db, "transactions"), {
      userId: request.userId,
      amount: totalDebit,
      type: "credit",
      source: "refund",
      description: `Refund: API call failed - ${request.operator.toUpperCase()}`,
      rechargeTransactionId: txRef.id,
      createdAt: new Date().toISOString(),
    });

    await updateDoc(txRef, { status: "api_failed", error: String(err) });

    throw new Error("Recharge API call failed. Amount refunded to wallet.");
  }

  // 7. Handle API response
  if (apiResponse.status === "failed") {
    // Refund wallet on API failure
    await runTransaction(db, async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      if (walletDoc.exists()) {
        const current = walletDoc.data().balance || 0;
        transaction.update(walletRef, { balance: current + totalDebit });
      }
    });

    await addDoc(collection(db, "transactions"), {
      userId: request.userId,
      amount: totalDebit,
      type: "credit",
      source: "refund",
      description: `Refund: ${apiResponse.message}`,
      rechargeTransactionId: txRef.id,
      createdAt: new Date().toISOString(),
    });

    await updateDoc(txRef, { status: "failed" });

    throw new Error(apiResponse.message || "Recharge failed. Amount refunded.");
  }

  // For "pending" status, mark transaction but still distribute commissions
  // (callback from eisolutionseprint.com will update final status)
  if (apiResponse.status === "pending") {
    await updateDoc(txRef, { status: "pending" });
  }

  // 8. Distribute commissions (only on success or pending)
  try {
    // Credit retailer commission
    if (commission.retailerAmount > 0) {
      await creditWallet(request.userId, commission.retailerAmount);
      await addDoc(collection(db, "transactions"), {
        userId: request.userId,
        amount: commission.retailerAmount,
        type: "credit",
        source: "commission",
        description: `Commission: ${request.operator.toUpperCase()} ${request.serviceType}`,
        rechargeTransactionId: txRef.id,
        createdAt: new Date().toISOString(),
      });
    }

    // Credit distributor commission
    const distributorId = request.distributorId || await getDistributorId(request.userId);
    if (distributorId && commission.distributorAmount > 0) {
      await creditWallet(distributorId, commission.distributorAmount);
      await addDoc(collection(db, "transactions"), {
        userId: distributorId,
        amount: commission.distributorAmount,
        type: "credit",
        source: "commission",
        description: `Distributor Commission: ${request.operator.toUpperCase()}`,
        rechargeTransactionId: txRef.id,
        retailerId: request.userId,
        createdAt: new Date().toISOString(),
      });
    }

    // Credit admin (commission + service charge)
    const adminId = await getAdminUserId();
    if (adminId) {
      const adminTotal = commission.adminAmount + commission.serviceChargeAmount;
      if (adminTotal > 0) {
        await creditWallet(adminId, adminTotal);
        await addDoc(collection(db, "transactions"), {
          userId: adminId,
          amount: adminTotal,
          type: "credit",
          source: "commission",
          description: `Admin Commission + Service Charge: ${request.operator.toUpperCase()}`,
          rechargeTransactionId: txRef.id,
          retailerId: request.userId,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Update transaction status to success (if not pending)
    if (apiResponse.status === "success") {
      await updateDoc(txRef, { status: "success" });
    }
  } catch (err) {
    await updateDoc(txRef, { status: "commission_pending", error: String(err) });
  }

  return {
    success: true,
    transactionId: txRef.id,
    message: apiResponse.status === "pending"
      ? `${request.operator.toUpperCase()} recharge of ₹${request.amount} is being processed!`
      : `${request.operator.toUpperCase()} recharge of ₹${request.amount} successful!`,
    commission,
    newBalance: newBalance + commission.retailerAmount,
    apiResponse,
  };
}

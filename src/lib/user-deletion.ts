/**
 * Admin-only helper to permanently remove a user's Firestore footprint.
 *
 * NOTE: This deletes Firestore data only. The Firebase Auth account itself
 * can only be removed via the Admin SDK (server-side / Cloud Functions).
 * The user doc removal here means they can no longer log in to the app
 * (auth-context throws "User profile not found"), so for app purposes the
 * user is fully gone.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Collections where a document is keyed BY the user's uid (doc.id === uid).
 * These get a direct deleteDoc(uid).
 */
const UID_KEYED_COLLECTIONS = [
  "users",
  "wallets",
  "userPermissions",
  "kyc",
  "profiles",
  "workBadges",
  "ippbBadges",
  "serviceActivations",
  "panPortalAccounts",
  "psaRecords",
  "referralCodes",
  "vleProfiles",
] as const;

/**
 * Collections containing documents that REFERENCE the user via a field.
 * Each entry: [collectionName, fieldName].
 * We query where(field, '==', uid) and batch-delete the results.
 */
const REFERENCE_COLLECTIONS: ReadonlyArray<[string, string]> = [
  ["wallets", "userId"],
  ["walletTransactions", "userId"],
  ["walletRequests", "userId"],
  ["transactions", "userId"],
  ["userPermissions", "userId"],
  ["serviceApplications", "userId"],
  ["edisApplications", "retailerId"],
  ["edisApplications", "userId"],
  ["bbpsTransactions", "userId"],
  ["dmtTransfers", "userId"],
  ["dmtCustomers", "userId"],
  ["dmtBeneficiaries", "userId"],
  ["panPortalOrders", "userId"],
  ["panPortalCoupons", "userId"],
  ["referrals", "referrerId"],
  ["referrals", "newUserId"],
  ["financeAccounts", "userId"],
  ["financeDeposits", "userId"],
  ["horoscopeRequests", "userId"],
  ["matrimonyProfiles", "userId"],
  ["jobApplications", "userId"],
  ["jobPostings", "userId"],
  ["trainingBookings", "userId"],
  ["trainingBookings", "trainerId"],
  ["trainingReviews", "userId"],
  ["sessionQualityLogs", "userId"],
  ["loginActivity", "userId"],
  ["profileEdits", "userId"],
  ["retailerStaff", "retailerId"],
  ["retailerStaff", "userId"],
  ["chatMessages", "userId"],
  ["notifications", "userId"],
  ["paytmOrders", "userId"],
  ["cscRequests", "userId"],
  ["ippbAccounts", "userId"],
  ["ippbApplications", "userId"],
  ["crmLeads", "assignedTo"],
  ["crmLeads", "createdBy"],
  ["serviceActivations", "userId"],
  ["cvDrafts", "userId"],
  ["jobRatings", "userId"],
];

export interface DeletionReport {
  uid: string;
  uidDocsDeleted: number;
  referenceDocsDeleted: number;
  perCollection: Record<string, number>;
  errors: string[];
}

async function batchDeleteIds(collectionName: string, ids: string[]) {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db, collectionName, id)));
    await batch.commit();
  }
}

export async function deleteUserCompletely(uid: string): Promise<DeletionReport> {
  const report: DeletionReport = {
    uid,
    uidDocsDeleted: 0,
    referenceDocsDeleted: 0,
    perCollection: {},
    errors: [],
  };

  // 1) Delete uid-keyed docs (one per collection).
  for (const col of UID_KEYED_COLLECTIONS) {
    try {
      await deleteDoc(doc(db, col, uid));
      report.uidDocsDeleted++;
      report.perCollection[col] = (report.perCollection[col] || 0) + 1;
    } catch (e: any) {
      // Ignore "not found" — we're attempting blind deletes.
      if (e?.code && e.code !== "not-found") {
        report.errors.push(`${col}/${uid}: ${e.message || e.code}`);
      }
    }
  }

  // 2) Delete reference docs (query each collection by field).
  for (const [col, field] of REFERENCE_COLLECTIONS) {
    try {
      const q = query(collection(db, col), where(field, "==", uid));
      const snap = await getDocs(q);
      if (snap.empty) continue;
      const ids = snap.docs.map((d) => d.id);
      await batchDeleteIds(col, ids);
      report.referenceDocsDeleted += ids.length;
      report.perCollection[`${col} (${field})`] =
        (report.perCollection[`${col} (${field})`] || 0) + ids.length;
    } catch (e: any) {
      // Common: missing collection/index — skip silently unless it's a real error.
      const msg = String(e?.message || e?.code || "");
      if (!msg.includes("not-found") && !msg.includes("permission-denied")) {
        report.errors.push(`${col} where ${field}==${uid}: ${msg}`);
      }
    }
  }

  return report;
}

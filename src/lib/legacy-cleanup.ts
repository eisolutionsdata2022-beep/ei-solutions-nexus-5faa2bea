/**
 * One-time admin tool to permanently delete legacy E-dis (v1) and DMT (v1) records.
 * Targets ONLY the legacy collections — the new v2 collections are untouched.
 */
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "./firebase";

export const LEGACY_COLLECTIONS = [
  "serviceApplications",
  "dmtTransfers",
  "dmtCustomers",
  "dmtBeneficiaries",
] as const;

export type LegacyCollection = (typeof LEGACY_COLLECTIONS)[number];

export type CleanupResult = Record<LegacyCollection, number>;

/** Count documents in each legacy collection. */
export async function countLegacyDocs(): Promise<CleanupResult> {
  const result = {} as CleanupResult;
  await Promise.all(
    LEGACY_COLLECTIONS.map(async (name) => {
      const snap = await getDocs(collection(db, name));
      result[name] = snap.size;
    }),
  );
  return result;
}

/** Permanently delete every doc in the listed legacy collections (batched 400/op). */
export async function purgeLegacyCollections(
  onProgress?: (col: LegacyCollection, deleted: number, total: number) => void,
): Promise<CleanupResult> {
  const result = {} as CleanupResult;
  for (const name of LEGACY_COLLECTIONS) {
    const snap = await getDocs(collection(db, name));
    const total = snap.size;
    const ids = snap.docs.map((d) => d.id);
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(db);
      ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db, name, id)));
      await batch.commit();
      deleted += Math.min(400, ids.length - i);
      onProgress?.(name, deleted, total);
    }
    result[name] = total;
  }
  return result;
}

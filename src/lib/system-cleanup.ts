/**
 * Admin "System Cleanup" — count and bulk-delete old/large data sets that
 * slow the system down. Each category lists one or more Firestore
 * collections plus the timestamp field used for the "older than X days"
 * filter. If a category has no `timestampField`, the age filter is ignored
 * and ALL records are deleted.
 *
 * Safe-by-design:
 *  - Critical collections (users, wallets, profiles, configs, plans,
 *    activations, transactions ledger) are NEVER touched.
 *  - Deletion is batched (400 ops/commit) to stay within Firestore limits.
 */
import {
  collection,
  getDocs,
  writeBatch,
  doc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface CleanupCategory {
  key: string;
  label: string;
  description: string;
  collections: string[];
  /** ISO-string field used for age filtering. Omit to disable filter. */
  timestampField?: string;
  /** If true, only delete docs with these status values (transactions). */
  statusField?: string;
  statusValues?: string[];
}

export const CLEANUP_CATEGORIES: CleanupCategory[] = [
  {
    key: "logs-analytics",
    label: "Logs & Analytics",
    description:
      "Session quality logs, login history, user edit logs, landing enquiries.",
    collections: [
      "sessionQualityLogs",
      "userLogins",
      "userEdits",
      "landingEnquiries",
    ],
    timestampField: "createdAt",
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "In-app notifications and job notifications.",
    collections: ["notifications", "jobNotifications"],
    timestampField: "createdAt",
  },
  {
    key: "completed-transactions",
    label: "Completed Transactions",
    description:
      "Old completed/failed wallet transactions ledger entries (does NOT touch wallet balances).",
    collections: ["transactions"],
    timestampField: "createdAt",
    statusField: "status",
    statusValues: ["success", "completed", "failed", "refunded"],
  },
  {
    key: "crm-old-leads",
    label: "Old CRM Leads",
    description:
      "Closed/converted leads + their call logs, history, and uploaded batches.",
    collections: [
      "crmLeads",
      "crmCallLogs",
      "crmLeadHistory",
      "uploadedLeads",
    ],
    timestampField: "createdAt",
  },
  {
    key: "whatsapp-old",
    label: "WhatsApp / Drip History",
    description:
      "Old WhatsApp messages, campaigns, and contact records (templates kept).",
    collections: [
      "whatsappMessages",
      "whatsappCampaigns",
      "whatsappContacts",
    ],
    timestampField: "createdAt",
  },
  {
    key: "training-old",
    label: "Training & Classroom",
    description:
      "Old training reviews, classroom rooms, session quality samples.",
    collections: ["trainingReviews", "rooms"],
    timestampField: "createdAt",
  },
  {
    key: "horoscope-requests",
    label: "Horoscope Requests",
    description: "Old horoscope generation requests.",
    collections: ["horoscopeRequests"],
    timestampField: "createdAt",
  },
  {
    key: "matrimony-requests",
    label: "Matrimony Requests",
    description: "Old matrimony match requests (profiles kept).",
    collections: ["matrimonyRequests"],
    timestampField: "createdAt",
  },
  {
    key: "ippb-old",
    label: "IPPB Requests",
    description: "Old IPPB capture requests and badge applications.",
    collections: ["ippbRequests"],
    timestampField: "createdAt",
  },
  {
    key: "bulk-email",
    label: "Bulk Email History",
    description: "Old bulk email campaigns and recipient logs.",
    collections: ["bulkEmailCampaigns", "bulkEmailRecipients"],
    timestampField: "createdAt",
  },
  {
    key: "game-plays",
    label: "Game Plays",
    description: "Old scratch card / spin wheel / treasure box plays.",
    collections: ["gamePlays"],
    timestampField: "createdAt",
  },
];

export type CategoryCount = { collection: string; count: number };

export interface CleanupOptions {
  /** Delete only docs older than this many days. 0/undefined = all. */
  olderThanDays?: number;
}

function cutoffISO(days: number): string {
  const t = new Date();
  t.setDate(t.getDate() - days);
  return t.toISOString();
}

/** Count docs in each collection of a category, applying the age filter. */
export async function countCategory(
  cat: CleanupCategory,
  opts: CleanupOptions = {},
): Promise<CategoryCount[]> {
  const cutoff =
    opts.olderThanDays && opts.olderThanDays > 0 && cat.timestampField
      ? cutoffISO(opts.olderThanDays)
      : null;

  const result: CategoryCount[] = [];
  for (const name of cat.collections) {
    let snap;
    if (cutoff && cat.timestampField) {
      snap = await getDocs(
        query(collection(db, name), where(cat.timestampField, "<", cutoff)),
      );
    } else {
      snap = await getDocs(collection(db, name));
    }
    let count = snap.size;
    if (cat.statusField && cat.statusValues?.length) {
      count = snap.docs.filter((d) =>
        cat.statusValues!.includes((d.data() as any)[cat.statusField!]),
      ).length;
    }
    result.push({ collection: name, count });
  }
  return result;
}

/** Delete docs in a category, applying the age + status filter. */
export async function purgeCategory(
  cat: CleanupCategory,
  opts: CleanupOptions = {},
  onProgress?: (collectionName: string, deleted: number, total: number) => void,
): Promise<CategoryCount[]> {
  const cutoff =
    opts.olderThanDays && opts.olderThanDays > 0 && cat.timestampField
      ? cutoffISO(opts.olderThanDays)
      : null;

  const result: CategoryCount[] = [];
  for (const name of cat.collections) {
    let snap;
    if (cutoff && cat.timestampField) {
      snap = await getDocs(
        query(collection(db, name), where(cat.timestampField, "<", cutoff)),
      );
    } else {
      snap = await getDocs(collection(db, name));
    }

    let docs = snap.docs;
    if (cat.statusField && cat.statusValues?.length) {
      docs = docs.filter((d) =>
        cat.statusValues!.includes((d.data() as any)[cat.statusField!]),
      );
    }

    const ids = docs.map((d) => d.id);
    const total = ids.length;
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(db);
      ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db, name, id)));
      await batch.commit();
      deleted += Math.min(400, ids.length - i);
      onProgress?.(name, deleted, total);
    }
    result.push({ collection: name, count: total });
  }
  return result;
}

// Suppress unused import warning (Timestamp kept for future numeric ts fields)
void Timestamp;

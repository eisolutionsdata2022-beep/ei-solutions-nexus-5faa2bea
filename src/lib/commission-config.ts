/**
 * Unified Commission Center
 * ----------------------------------------------------------------------------
 * Single source of truth for ALL service fees, splits, and payouts.
 * Stored in Firestore collection: commission_config/{serviceKey}
 *
 * Three template types:
 *  - customer_charge  → debited from retailer wallet (PAN, IPPB, CSC, E-dis...)
 *  - admin_payout     → admin → user/staff/trainer payout (Jobs, Tasks, Trainer earnings)
 *  - operator_based   → operator-level commission table (BBPS / Recharge)
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type CommissionType =
  | "customer_charge"
  | "admin_payout"
  | "operator_based";

export type CommissionCategory =
  | "Customer Charges"
  | "Admin Payouts"
  | "Operator-Based"
  | "Training"
  | "Activation";

export interface CommissionConfig {
  serviceKey: string;
  serviceName: string;
  category: CommissionCategory;
  type: CommissionType;
  enabled: boolean;
  /** Customer-facing charge (debited). Used only for customer_charge. */
  customerCharge?: number;
  /** Commission credited back to retailer on success. */
  retailerCommission?: number;
  /** Commission credited to staff who completed/approved. */
  staffCommission?: number;
  /** Optional commission credited to trainer (training services). */
  trainerCommission?: number;
  /** Commission credited to admin (rest). */
  adminCommission?: number;
  /** "fixed" amount or "percentage" of customerCharge. */
  mode?: "fixed" | "percentage";
  /** Default payout amount for admin_payout services (admin -> user). */
  defaultPayoutAmount?: number;
  /** For operator_based: operator key -> commission %. */
  operatorRates?: Record<string, number>;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

const COL = () => collection(db, "commission_config");
const REF = (key: string) => doc(db, "commission_config", key);

export async function getCommissionConfig(
  key: string,
): Promise<CommissionConfig | null> {
  const snap = await getDoc(REF(key));
  if (!snap.exists()) return null;
  return snap.data() as CommissionConfig;
}

export async function listCommissionConfigs(): Promise<CommissionConfig[]> {
  const snap = await getDocs(COL());
  return snap.docs.map((d) => d.data() as CommissionConfig);
}

export async function saveCommissionConfig(
  cfg: CommissionConfig,
  updatedBy: string,
): Promise<void> {
  if (cfg.type === "customer_charge") {
    const splits =
      (cfg.retailerCommission ?? 0) +
      (cfg.staffCommission ?? 0) +
      (cfg.trainerCommission ?? 0) +
      (cfg.adminCommission ?? 0);
    if (splits > (cfg.customerCharge ?? 0)) {
      throw new Error(
        `Commission splits (₹${splits}) cannot exceed customer charge (₹${cfg.customerCharge ?? 0})`,
      );
    }
  }
  await setDoc(
    REF(cfg.serviceKey),
    {
      ...cfg,
      updatedAt: new Date().toISOString(),
      updatedBy,
      _ts: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Default seed used to bootstrap the unified collection.
 * Existing per-service configs (IPPB, training, etc.) are read by the
 * compatibility wrappers and kept in sync — these defaults only apply when
 * a service has no entry yet.
 */
export const DEFAULT_COMMISSION_SEEDS: CommissionConfig[] = [
  // --- Customer Charges ---
  {
    serviceKey: "pan-portal",
    serviceName: "PAN Portal (PSA + NSDL)",
    category: "Customer Charges",
    type: "customer_charge",
    enabled: true,
    customerCharge: 107,
    retailerCommission: 20,
    staffCommission: 0,
    adminCommission: 87,
    mode: "fixed",
  },
  {
    serviceKey: "ippb",
    serviceName: "IPPB Account Opening",
    category: "Customer Charges",
    type: "customer_charge",
    enabled: true,
    customerCharge: 100,
    retailerCommission: 40,
    staffCommission: 20,
    adminCommission: 40,
    mode: "fixed",
  },
  {
    serviceKey: "ei-pay",
    serviceName: "EI Solutions Pay (CSC)",
    category: "Customer Charges",
    type: "customer_charge",
    enabled: true,
    customerCharge: 20,
    retailerCommission: 5,
    adminCommission: 15,
    mode: "fixed",
  },
  {
    serviceKey: "e-dis",
    serviceName: "E-dis (E-Governance)",
    category: "Customer Charges",
    type: "customer_charge",
    enabled: true,
    customerCharge: 50,
    retailerCommission: 15,
    staffCommission: 10,
    adminCommission: 25,
    mode: "fixed",
  },
  {
    serviceKey: "money-transfer",
    serviceName: "Money Transfer (DMT)",
    category: "Customer Charges",
    type: "customer_charge",
    enabled: true,
    customerCharge: 10,
    retailerCommission: 5,
    adminCommission: 5,
    mode: "fixed",
  },
  {
    serviceKey: "cv-builder",
    serviceName: "CV Builder",
    category: "Customer Charges",
    type: "customer_charge",
    enabled: true,
    customerCharge: 10,
    retailerCommission: 4,
    adminCommission: 6,
    mode: "fixed",
  },
  {
    serviceKey: "page-tools",
    serviceName: "Page Tools (PDF)",
    category: "Customer Charges",
    type: "customer_charge",
    enabled: true,
    customerCharge: 5,
    retailerCommission: 2,
    adminCommission: 3,
    mode: "fixed",
  },
  {
    serviceKey: "horoscope",
    serviceName: "Horoscope",
    category: "Customer Charges",
    type: "customer_charge",
    enabled: true,
    customerCharge: 50,
    retailerCommission: 20,
    adminCommission: 30,
    mode: "fixed",
  },
  {
    serviceKey: "matrimony",
    serviceName: "Matrimony",
    category: "Customer Charges",
    type: "customer_charge",
    enabled: true,
    customerCharge: 100,
    retailerCommission: 40,
    adminCommission: 60,
    mode: "fixed",
  },
  {
    serviceKey: "virtual-trainer",
    serviceName: "Virtual Trainer",
    category: "Customer Charges",
    type: "customer_charge",
    enabled: true,
    customerCharge: 0,
    retailerCommission: 0,
    adminCommission: 0,
    mode: "fixed",
  },

  // --- Training ---
  {
    serviceKey: "training-session",
    serviceName: "Training Session (per hour)",
    category: "Training",
    type: "customer_charge",
    enabled: true,
    customerCharge: 300,
    trainerCommission: 150,
    adminCommission: 150,
    mode: "fixed",
  },

  // --- Admin Payouts ---
  {
    serviceKey: "job-payout",
    serviceName: "Job Marketplace Payout",
    category: "Admin Payouts",
    type: "admin_payout",
    enabled: true,
    defaultPayoutAmount: 0,
    notes: "Admin pays freelancer per completed job. Use Generate Payment.",
  },
  {
    serviceKey: "task-payout",
    serviceName: "Task / Bonus Payout",
    category: "Admin Payouts",
    type: "admin_payout",
    enabled: true,
    defaultPayoutAmount: 0,
    notes: "Manual bonus / task reward to staff or retailer.",
  },
  {
    serviceKey: "trainer-payout",
    serviceName: "Trainer Manual Payout",
    category: "Admin Payouts",
    type: "admin_payout",
    enabled: true,
    defaultPayoutAmount: 0,
    notes: "Off-cycle trainer payment outside automatic split.",
  },
  {
    serviceKey: "referral-payout",
    serviceName: "Referral Bonus",
    category: "Admin Payouts",
    type: "admin_payout",
    enabled: true,
    defaultPayoutAmount: 50,
    notes: "Referral bonus to existing retailer.",
  },

  // --- Service Activation ---
  {
    serviceKey: "activation-default",
    serviceName: "Service Activation (default)",
    category: "Activation",
    type: "customer_charge",
    enabled: true,
    customerCharge: 150,
    retailerCommission: 0,
    adminCommission: 150,
    mode: "fixed",
    notes: "Default per-service activation fee. Per-service overrides handled in legacy activation config.",
  },
];

/**
 * Idempotent seed — only inserts missing services.
 * Called from the Commission Center on first load if collection is empty.
 */
export async function seedCommissionConfigs(updatedBy: string): Promise<number> {
  const existing = await listCommissionConfigs();
  const existingKeys = new Set(existing.map((c) => c.serviceKey));
  let added = 0;
  for (const seed of DEFAULT_COMMISSION_SEEDS) {
    if (!existingKeys.has(seed.serviceKey)) {
      await saveCommissionConfig(seed, updatedBy);
      added++;
    }
  }
  return added;
}

export const COMMISSION_TABS: { key: CommissionCategory; label: string; description: string }[] = [
  { key: "Customer Charges", label: "Customer Charges", description: "Services where retailer wallet is debited (PAN, IPPB, CSC, etc.)" },
  { key: "Admin Payouts", label: "Admin Payouts", description: "Manual payments from admin → user (Jobs, Tasks, Bonuses)" },
  { key: "Training", label: "Training", description: "Training session price + trainer earning split" },
  { key: "Operator-Based", label: "Operator-Based", description: "Operator-level commission tables (BBPS, Recharge)" },
  { key: "Activation", label: "Activation", description: "Per-service activation fees and validity" },
];

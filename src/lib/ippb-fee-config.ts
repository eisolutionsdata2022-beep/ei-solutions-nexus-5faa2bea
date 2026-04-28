/**
 * IPPB account-opening fee configuration.
 * Stored in Firestore at: settings/ippbFee
 *
 * Charge timing: only debited on staff "success" approval.
 * Distribution:  retailer keeps (serviceCharge - retailerCommission - staffCommission - adminCommission)
 *                actually we DEBIT serviceCharge from retailer, then CREDIT splits.
 *                Net cost to retailer = serviceCharge - retailerCommission.
 */
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface IPPBFeeConfig {
  /** Total amount debited from retailer wallet on success */
  serviceCharge: number;
  /** Commission credited back to retailer */
  retailerCommission: number;
  /** Commission credited to the staff who completed the request */
  staffCommission: number;
  /** Commission credited to admin (rest goes to admin too) */
  adminCommission: number;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_IPPB_FEE: IPPBFeeConfig = {
  serviceCharge: 100,
  retailerCommission: 40,
  staffCommission: 20,
  adminCommission: 40,
};

const REF = () => doc(db, "settings", "ippbFee");

export async function getIPPBFeeConfig(): Promise<IPPBFeeConfig> {
  const snap = await getDoc(REF());
  if (!snap.exists()) return DEFAULT_IPPB_FEE;
  const data = snap.data() as Partial<IPPBFeeConfig>;
  return {
    serviceCharge: Number(data.serviceCharge ?? DEFAULT_IPPB_FEE.serviceCharge),
    retailerCommission: Number(data.retailerCommission ?? DEFAULT_IPPB_FEE.retailerCommission),
    staffCommission: Number(data.staffCommission ?? DEFAULT_IPPB_FEE.staffCommission),
    adminCommission: Number(data.adminCommission ?? DEFAULT_IPPB_FEE.adminCommission),
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  };
}

export async function saveIPPBFeeConfig(
  cfg: Omit<IPPBFeeConfig, "updatedAt" | "updatedBy">,
  updatedBy: string
): Promise<void> {
  if (cfg.serviceCharge < 0) throw new Error("Service charge cannot be negative");
  const sumSplits = cfg.retailerCommission + cfg.staffCommission + cfg.adminCommission;
  if (sumSplits > cfg.serviceCharge) {
    throw new Error(
      `Commission splits (₹${sumSplits}) cannot exceed service charge (₹${cfg.serviceCharge})`
    );
  }
  await setDoc(REF(), {
    ...cfg,
    updatedAt: new Date().toISOString(),
    updatedBy,
    _ts: serverTimestamp(),
  });
}

export function netRetailerCost(cfg: IPPBFeeConfig): number {
  return Math.max(0, cfg.serviceCharge - cfg.retailerCommission);
}

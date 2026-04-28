/**
 * IPPB fee – compatibility shim.
 *
 * The legacy `settings/ippbFee` document and its admin UI have been retired.
 * The single source of truth for IPPB pricing is now the unified Commission
 * Center at `commission_config/ippb` (managed via /admin/commission-center).
 *
 * This file remains only as a thin adapter so existing imports
 * (`getIPPBFeeConfig`, `IPPBFeeConfig`, `DEFAULT_IPPB_FEE`) keep working
 * without touching every call site.
 */
import { getCommissionConfig } from "./commission-config";

export interface IPPBFeeConfig {
  serviceCharge: number;
  retailerCommission: number;
  staffCommission: number;
  adminCommission: number;
}

export const DEFAULT_IPPB_FEE: IPPBFeeConfig = {
  serviceCharge: 100,
  retailerCommission: 40,
  staffCommission: 20,
  adminCommission: 40,
};

export async function getIPPBFeeConfig(): Promise<IPPBFeeConfig> {
  const cfg = await getCommissionConfig("ippb");
  if (!cfg || cfg.enabled === false) return DEFAULT_IPPB_FEE;
  return {
    serviceCharge: Number(cfg.customerCharge ?? DEFAULT_IPPB_FEE.serviceCharge),
    retailerCommission: Number(cfg.retailerCommission ?? DEFAULT_IPPB_FEE.retailerCommission),
    staffCommission: Number(cfg.staffCommission ?? DEFAULT_IPPB_FEE.staffCommission),
    adminCommission: Number(cfg.adminCommission ?? DEFAULT_IPPB_FEE.adminCommission),
  };
}

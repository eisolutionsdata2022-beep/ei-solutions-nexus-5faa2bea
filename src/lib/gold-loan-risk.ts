/**
 * Pure helpers for the pledged-weight quick-quote calculator and the
 * dual-cap risk policy (single-loan ceiling + per-customer outstanding cap).
 *
 * No Firestore / no React imports — safe for unit testing.
 */
import { purityFraction } from "./finance-calculations";
import type { FinanceLoan } from "./finance-types";

export type RiskLevel = "ok" | "approaching" | "breach";

export interface RiskPolicy {
  /** Hard ceiling for a single loan disbursal (₹). 0 = disabled. */
  singleLoanLimit: number;
  /** Hard ceiling for a customer's combined active outstanding (₹). 0 = disabled. */
  perCustomerCap: number;
  /** Warn when within this % of either limit (default 80). */
  warnAtPercent?: number;
}

export interface QuoteInput {
  netWeightGrams: number;
  purityKarat: number;       // 22, 24, 18 …
  ratePerGram24k: number;    // current ₹/g (24k reference)
  ltvPercent: number;        // e.g. 75
}

export interface QuoteResult {
  pureGoldGrams: number;     // weight × purity/24
  valuation: number;         // pureGold × rate
  eligibleAmount: number;    // valuation × LTV%
}

export interface RiskEvaluation {
  level: RiskLevel;
  reasons: string[];
  /** Highest-utilisation cap, e.g. "single" or "customer" — drives the headline message. */
  driver: "none" | "single" | "customer";
  utilisationPercent: number; // 0–200; >100 = breach
}

/** Pure quote — no risk consideration. */
export function quoteFromWeight(input: QuoteInput): QuoteResult {
  const w = Math.max(0, Number(input.netWeightGrams) || 0);
  const rate = Math.max(0, Number(input.ratePerGram24k) || 0);
  const ltv = Math.max(0, Math.min(100, Number(input.ltvPercent) || 0));
  const pureGold = w * purityFraction(input.purityKarat);
  const valuation = pureGold * rate;
  const eligible = Math.floor((valuation * ltv) / 100);
  return { pureGoldGrams: pureGold, valuation, eligibleAmount: eligible };
}

/**
 * Sum of outstanding principal on this customer's currently-active loans
 * (Renewed/Closed are excluded; the active loan from a renewal carries the new balance).
 */
export function sumCustomerOutstanding(
  customerId: string,
  loans: FinanceLoan[],
): number {
  return loans
    .filter((l) => l.customerId === customerId && (l.status === "Active" || l.status === "Overdue"))
    .reduce((s, l) => s + (l.outstandingPrincipal || 0), 0);
}

/**
 * Dual-cap risk evaluation. Checks both the single-loan ceiling and the
 * per-customer outstanding cap; reports the higher-utilisation driver.
 */
export function evaluateRisk(params: {
  proposedAmount: number;
  customerOutstanding: number;
  policy: RiskPolicy;
}): RiskEvaluation {
  const warnAt = Math.max(50, Math.min(100, params.policy.warnAtPercent ?? 80));
  const reasons: string[] = [];

  // Compute utilisation for both caps independently
  const singleU =
    params.policy.singleLoanLimit > 0
      ? (params.proposedAmount / params.policy.singleLoanLimit) * 100
      : 0;
  const projectedCustomer = params.customerOutstanding + params.proposedAmount;
  const customerU =
    params.policy.perCustomerCap > 0
      ? (projectedCustomer / params.policy.perCustomerCap) * 100
      : 0;

  // Choose the higher-utilisation driver
  const driver: RiskEvaluation["driver"] =
    singleU === 0 && customerU === 0
      ? "none"
      : singleU >= customerU
      ? "single"
      : "customer";
  const utilisation = Math.max(singleU, customerU);

  let level: RiskLevel;
  if (utilisation >= 100) level = "breach";
  else if (utilisation >= warnAt) level = "approaching";
  else level = "ok";

  if (params.policy.singleLoanLimit > 0) {
    if (singleU >= 100) {
      reasons.push(
        `Single-loan limit ₹${params.policy.singleLoanLimit.toLocaleString("en-IN")} would be exceeded.`,
      );
    } else if (singleU >= warnAt) {
      reasons.push(
        `Approaching single-loan limit (${singleU.toFixed(0)}% of ₹${params.policy.singleLoanLimit.toLocaleString("en-IN")}).`,
      );
    }
  }
  if (params.policy.perCustomerCap > 0) {
    if (customerU >= 100) {
      reasons.push(
        `Customer total outstanding would reach ₹${projectedCustomer.toLocaleString("en-IN")} ` +
          `(cap ₹${params.policy.perCustomerCap.toLocaleString("en-IN")}).`,
      );
    } else if (customerU >= warnAt) {
      reasons.push(
        `Customer total outstanding ₹${projectedCustomer.toLocaleString("en-IN")} ` +
          `is ${customerU.toFixed(0)}% of cap.`,
      );
    }
  }

  return { level, reasons, driver, utilisationPercent: Math.round(utilisation) };
}

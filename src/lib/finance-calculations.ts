/**
 * Pure calculation helpers for the Finance / Gold Loan module.
 * No Firestore / no React imports — safe for unit testing.
 */
import type { GoldItem, FinanceLoan } from "./finance-types";

/** Convert a karat purity (e.g. 22) to a fraction (22/24). */
export function purityFraction(carat: number): number {
  if (carat <= 0) return 0;
  return Math.min(carat, 24) / 24;
}

/** Effective gold weight after subtracting stone & adjusting for purity. */
export function effectivePureGoldGrams(item: GoldItem): number {
  const net = Math.max(item.netWeight, 0);
  return net * purityFraction(item.purity);
}

/** Total market value of one gold item at given ₹/g (24k reference). */
export function itemValuation(item: GoldItem, ratePerGram24k: number): number {
  return effectivePureGoldGrams(item) * ratePerGram24k;
}

/** Total valuation across multiple items. */
export function totalValuation(items: GoldItem[], ratePerGram24k: number): number {
  return items.reduce((sum, it) => sum + itemValuation(it, ratePerGram24k), 0);
}

/** Eligible loan amount = valuation × LTV%. */
export function eligibleLoanAmount(
  items: GoldItem[],
  ratePerGram24k: number,
  ltvPercent: number,
): number {
  return Math.floor((totalValuation(items, ratePerGram24k) * ltvPercent) / 100);
}

/** Weighted average purity across items (by net weight). */
export function weightedAveragePurity(items: GoldItem[]): number {
  const totalNet = items.reduce((s, i) => s + i.netWeight, 0);
  if (totalNet === 0) return 0;
  const weighted = items.reduce((s, i) => s + i.netWeight * i.purity, 0);
  return Number((weighted / totalNet).toFixed(2));
}

/** Sum of net & gross weights. */
export function sumWeights(items: GoldItem[]): { gross: number; net: number } {
  return items.reduce(
    (acc, i) => ({
      gross: acc.gross + (i.grossWeight || 0),
      net: acc.net + (i.netWeight || 0),
    }),
    { gross: 0, net: 0 },
  );
}

/** Standard EMI formula: P×r×(1+r)^n / ((1+r)^n - 1). */
export function calculateEMI(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  const r = annualRatePercent / 12 / 100;
  if (r === 0) return Math.round(principal / tenureMonths);
  const n = tenureMonths;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
}

/** Total payable over tenure. */
export function totalPayable(emi: number, tenureMonths: number): number {
  return emi * tenureMonths;
}

/** Days between two ISO dates (positive only). */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

/** Simple-interest accrued from loan date to a given date. */
export function accruedInterest(
  principal: number,
  annualRatePercent: number,
  fromIso: string,
  toIso: string,
): number {
  const days = daysBetween(fromIso, toIso);
  if (days === 0 || principal <= 0) return 0;
  return Math.round((principal * annualRatePercent * days) / (365 * 100));
}

/** Penalty for overdue days. */
export function overduePenalty(
  outstandingPrincipal: number,
  penaltyRatePercentPerDay: number,
  dueDateIso: string,
  asOfIso: string,
): number {
  const overdueDays = daysBetween(dueDateIso, asOfIso);
  if (overdueDays === 0) return 0;
  return Math.round((outstandingPrincipal * penaltyRatePercentPerDay * overdueDays) / 100);
}

/** Compute outstanding balance & accruals as of a date. */
export function computeOutstanding(loan: FinanceLoan, asOfIso: string = new Date().toISOString()) {
  const interest = accruedInterest(loan.loanAmount, loan.interestRate, loan.loanDate, asOfIso);
  const isOverdue = new Date(asOfIso) > new Date(loan.dueDate);
  const penalty = isOverdue
    ? overduePenalty(loan.outstandingPrincipal, 0.05, loan.dueDate, asOfIso)
    : 0;
  const totalDue = Math.max(0, loan.outstandingPrincipal + interest + penalty - 0);
  return {
    principal: loan.outstandingPrincipal,
    interest,
    penalty,
    totalDue,
    isOverdue,
  };
}

/** Format a number as Indian Rupees. */
export function formatINR(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

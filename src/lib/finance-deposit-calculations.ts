/**
 * Maturity calculators for the Deposits suite.
 *
 *  • FD  — Compound interest (quarterly compounding by default)
 *           A = P * (1 + r/n)^(n*t)
 *  • RD  — Series Future Value (monthly compounding)
 *           A = R * [((1 + i)^n - 1) / i] * (1 + i)
 *           where i = annualRate / 12 / 100 and n = tenureMonths
 *  • PIGMY — Daily collection. Treated as "sum of contributions" + simple
 *           interest on average outstanding balance for the period.
 *           A = (daily * days) + (avgBalance * r * t)
 *           where avgBalance ≈ (daily * days) / 2
 *  • SB  — Simple monthly interest on principal.
 *           A = P * (1 + (r/100) * (months/12))
 */

import type { DepositProduct } from "./finance-deposit-types";

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calculateFdMaturity(
  principal: number,
  annualRatePct: number,
  tenureMonths: number,
  compoundingPerYear = 4,
): { maturity: number; interest: number } {
  if (principal <= 0 || tenureMonths <= 0) return { maturity: r2(principal || 0), interest: 0 };
  const t = tenureMonths / 12;
  const r = annualRatePct / 100;
  const n = compoundingPerYear;
  const a = principal * Math.pow(1 + r / n, n * t);
  return { maturity: r2(a), interest: r2(a - principal) };
}

export function calculateRdMaturity(
  monthlyInstallment: number,
  annualRatePct: number,
  tenureMonths: number,
): { maturity: number; interest: number; totalDeposited: number } {
  if (monthlyInstallment <= 0 || tenureMonths <= 0) {
    return { maturity: 0, interest: 0, totalDeposited: 0 };
  }
  const i = annualRatePct / 12 / 100;
  const n = tenureMonths;
  const totalDeposited = monthlyInstallment * n;
  if (i === 0) return { maturity: r2(totalDeposited), interest: 0, totalDeposited: r2(totalDeposited) };
  const a = monthlyInstallment * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  return { maturity: r2(a), interest: r2(a - totalDeposited), totalDeposited: r2(totalDeposited) };
}

export function calculatePigmyMaturity(
  dailyAmount: number,
  annualRatePct: number,
  collectionDays: number,
): { maturity: number; interest: number; totalDeposited: number } {
  if (dailyAmount <= 0 || collectionDays <= 0) {
    return { maturity: 0, interest: 0, totalDeposited: 0 };
  }
  const totalDeposited = dailyAmount * collectionDays;
  const tYears = collectionDays / 365;
  const avgBalance = totalDeposited / 2;
  const interest = avgBalance * (annualRatePct / 100) * tYears;
  return {
    maturity: r2(totalDeposited + interest),
    interest: r2(interest),
    totalDeposited: r2(totalDeposited),
  };
}

export function calculateSbMaturity(
  principal: number,
  annualRatePct: number,
  tenureMonths: number,
): { maturity: number; interest: number } {
  if (principal <= 0 || tenureMonths <= 0) return { maturity: r2(principal || 0), interest: 0 };
  const interest = principal * (annualRatePct / 100) * (tenureMonths / 12);
  return { maturity: r2(principal + interest), interest: r2(interest) };
}

export function calculateMaturity(
  product: DepositProduct,
  amount: number,
  annualRatePct: number,
  tenureMonths: number,
  tenureDays?: number,
): { maturity: number; interest: number; totalDeposited: number } {
  switch (product) {
    case "FD": {
      const r = calculateFdMaturity(amount, annualRatePct, tenureMonths);
      return { ...r, totalDeposited: amount };
    }
    case "RD":
      return calculateRdMaturity(amount, annualRatePct, tenureMonths);
    case "PIGMY":
      return calculatePigmyMaturity(amount, annualRatePct, tenureDays ?? 365);
    case "SB":
    default: {
      const r = calculateSbMaturity(amount, annualRatePct, tenureMonths);
      return { ...r, totalDeposited: amount };
    }
  }
}

export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Days elapsed between two ISO dates (positive if to >= from). */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  return Math.max(0, Math.floor((b - a) / 86400000));
}

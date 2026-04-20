/**
 * Quick Quote — pledged-weight calculator.
 * Sits on top of the Loans tab. Shows live disbursable amount based on
 * today's rate + LTV, and surfaces the dual-cap risk badge as the user types.
 */
import { useMemo, useState } from "react";
import { Calculator, ChevronDown } from "lucide-react";
import {
  StudioCard,
  StudioInput,
  StudioSelect,
} from "./StudioShell";
import { RiskBadge, RiskReasons } from "./RiskBadge";
import { evaluateRisk, quoteFromWeight, sumCustomerOutstanding } from "@/lib/gold-loan-risk";
import type { FinanceCustomer, FinanceLoan, FinanceSettings, GoldRateSnapshot } from "@/lib/finance-types";
import { GOLD_PURITIES, DEFAULT_RISK_WARN_AT } from "@/lib/finance-types";
import { formatINR } from "@/lib/finance-calculations";

interface Props {
  customers: FinanceCustomer[];
  loans: FinanceLoan[];
  settings: FinanceSettings | null;
  goldRate: GoldRateSnapshot | null;
}

export function QuickQuoteCard({ customers, loans, settings, goldRate }: Props) {
  const [open, setOpen] = useState(true);
  const [weight, setWeight] = useState<number>(10);
  const [purity, setPurity] = useState<number>(22);
  const [customerId, setCustomerId] = useState<string>("");

  const ratePerGram24k = goldRate?.rate24k ?? settings?.defaultGoldRatePerGram ?? 0;
  const ltv = settings?.defaultLtvPercent ?? 75;

  const quote = useMemo(
    () => quoteFromWeight({ netWeightGrams: weight, purityKarat: purity, ratePerGram24k, ltvPercent: ltv }),
    [weight, purity, ratePerGram24k, ltv],
  );

  const customerOutstanding = useMemo(
    () => (customerId ? sumCustomerOutstanding(customerId, loans) : 0),
    [customerId, loans],
  );

  const evaluation = useMemo(
    () =>
      evaluateRisk({
        proposedAmount: quote.eligibleAmount,
        customerOutstanding,
        policy: {
          singleLoanLimit: settings?.singleLoanLimit ?? 0,
          perCustomerCap: customerId ? settings?.perCustomerCap ?? 0 : 0,
          warnAtPercent: settings?.riskWarnAtPercent ?? DEFAULT_RISK_WARN_AT,
        },
      }),
    [quote.eligibleAmount, customerOutstanding, settings, customerId],
  );

  return (
    <StudioCard className="border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.06] to-violet-500/[0.04]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 shadow-md shadow-cyan-500/20">
            <Calculator className="h-4 w-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              Quick Quote
            </p>
            <p className="text-sm font-bold text-slate-100">Pledged-weight calculator</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StudioInput
              label="Weight (g)"
              type="number"
              step="0.01"
              value={weight || ""}
              onChange={(e) => setWeight(Number(e.target.value))}
            />
            <StudioSelect
              label="Purity"
              value={purity}
              onChange={(e) => setPurity(Number(e.target.value))}
            >
              {GOLD_PURITIES.map((p) => (
                <option key={p} value={p} className="bg-slate-900">
                  {p}k
                </option>
              ))}
            </StudioSelect>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Today's rate (24k)
              </label>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-amber-300">
                ₹{ratePerGram24k.toLocaleString("en-IN")} / g
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                LTV
              </label>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-slate-200">
                {ltv}%
              </div>
            </div>
          </div>

          <StudioSelect
            label="Customer (optional — enables per-customer cap check)"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="" className="bg-slate-900">
              No customer selected
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900">
                {c.customerCode} — {c.fullName} ({c.mobile})
              </option>
            ))}
          </StudioSelect>

          <div className="rounded-xl border border-cyan-400/20 bg-slate-950/60 p-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <Mini label="Pure gold" value={`${quote.pureGoldGrams.toFixed(2)} g`} />
              <Mini label="Valuation" value={formatINR(quote.valuation)} />
              <Mini label="Eligible" value={formatINR(quote.eligibleAmount)} accent />
              <Mini
                label="Customer o/s"
                value={customerId ? formatINR(customerOutstanding) : "—"}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              <p className="text-[11px] text-slate-400">
                Disbursable today, before risk overrides
              </p>
              <RiskBadge evaluation={evaluation} />
            </div>
            <RiskReasons evaluation={evaluation} />
          </div>
        </div>
      )}
    </StudioCard>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-base font-bold ${accent ? "text-cyan-300" : "text-slate-100"}`}>
        {value}
      </p>
    </div>
  );
}

/**
 * Loans tab — dark studio theme.
 * Create gold loans against a customer with multiple gold items.
 */
import { useEffect, useMemo, useState } from "react";
import { Banknote, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addLoan, getNextLoanNo, subscribeGoldRate } from "@/lib/finance-firebase";
import type {
  FinanceCustomer,
  FinanceLoan,
  FinanceSettings,
  GoldItem,
  GoldRateSnapshot,
  LoanStatus,
} from "@/lib/finance-types";
import { GOLD_PURITIES, DEFAULT_RISK_WARN_AT } from "@/lib/finance-types";
import { evaluateRisk, sumCustomerOutstanding } from "@/lib/gold-loan-risk";
import { RiskBadge, RiskReasons } from "./RiskBadge";
import { QuickQuoteCard } from "./QuickQuoteCard";
import {
  totalValuation,
  eligibleLoanAmount,
  weightedAveragePurity,
  sumWeights,
  calculateEMI,
  totalPayable,
  formatINR,
} from "@/lib/finance-calculations";
import {
  StudioCard,
  StudioSectionTitle,
  StudioInput,
  StudioSelect,
  StudioTextarea,
  StudioButton,
  StudioBadge,
  StudioEmpty,
  StudioModal,
} from "./StudioShell";

const STATUS_TONE: Record<LoanStatus, "info" | "success" | "danger" | "warning"> = {
  Active: "info",
  Closed: "success",
  Overdue: "danger",
  Renewed: "warning",
};

interface Props {
  ownerId: string;
  ownerEmail: string;
  customers: FinanceCustomer[];
  loans: FinanceLoan[];
  settings: FinanceSettings | null;
}

export function LoansTab({ ownerId, ownerEmail, customers, loans, settings }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [goldRate, setGoldRate] = useState<GoldRateSnapshot | null>(null);

  useEffect(() => {
    if (!ownerId) return;
    const unsub = subscribeGoldRate(ownerId, setGoldRate);
    return () => unsub();
  }, [ownerId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return loans;
    const q = search.toLowerCase();
    return loans.filter(
      (l) => l.loanNo?.toLowerCase().includes(q) || l.customerName?.toLowerCase().includes(q),
    );
  }, [loans, search]);

  return (
    <div className="space-y-4">
      <QuickQuoteCard
        customers={customers}
        loans={loans}
        settings={settings}
        goldRate={goldRate}
      />
      <StudioSectionTitle
        eyebrow="Workspace"
        title="Gold Loans"
        right={
          <StudioButton onClick={() => setShowNew(true)} disabled={customers.length === 0}>
            <Plus className="h-4 w-4" /> New Loan
          </StudioButton>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by loan no or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
        />
      </div>

      {customers.length === 0 ? (
        <StudioEmpty
          icon={<Banknote className="h-5 w-5" />}
          title="Add a customer first"
          hint="Loans must be linked to an existing customer."
        />
      ) : filtered.length === 0 ? (
        <StudioEmpty
          icon={<Banknote className="h-5 w-5" />}
          title={loans.length === 0 ? "No loans yet" : "No matching loans"}
          hint={loans.length === 0 ? "Click 'New Loan' to disburse your first gold loan." : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((l) => {
            const overdue = l.status === "Active" && new Date(l.dueDate) < new Date();
            return (
              <StudioCard key={l.id} className="hover:border-white/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-cyan-300">{l.loanNo}</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-100">{l.customerName}</p>
                    <p className="text-xs text-slate-400">{l.customerMobile}</p>
                  </div>
                  <StudioBadge tone={overdue ? "danger" : STATUS_TONE[l.status]}>
                    {overdue ? "Overdue" : l.status}
                  </StudioBadge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-3 text-xs">
                  <Stat label="Loan" value={formatINR(l.loanAmount)} accent />
                  <Stat label="Outstanding" value={formatINR(l.outstandingPrincipal)} />
                  <Stat label="Rate" value={`${l.interestRate}% p.a.`} />
                  <Stat label="EMI" value={formatINR(l.monthlyEmi)} />
                  <Stat label="Net Gold" value={`${l.totalNetWeight.toFixed(2)} g`} />
                  <Stat
                    label="Due"
                    value={new Date(l.dueDate).toLocaleDateString("en-IN")}
                  />
                </div>
              </StudioCard>
            );
          })}
        </div>
      )}

      <NewLoanModal
        open={showNew}
        onClose={() => setShowNew(false)}
        ownerId={ownerId}
        ownerEmail={ownerEmail}
        customers={customers}
        loans={loans}
        settings={settings}
        goldRate={goldRate}
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 font-semibold ${accent ? "text-cyan-300" : "text-slate-200"}`}>
        {value}
      </p>
    </div>
  );
}

function NewLoanModal({
  open,
  onClose,
  ownerId,
  ownerEmail,
  customers,
  loans,
  settings,
  goldRate,
}: {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  ownerEmail: string;
  customers: FinanceCustomer[];
  loans: FinanceLoan[];
  settings: FinanceSettings | null;
  goldRate: GoldRateSnapshot | null;
}) {
  const defaultRate = goldRate?.rate24k ?? settings?.defaultGoldRatePerGram ?? 6500;
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<GoldItem[]>([newItem()]);
  const [rate, setRate] = useState(defaultRate);
  const [ltv, setLtv] = useState(settings?.defaultLtvPercent ?? 75);
  const [interestRate, setInterestRate] = useState(settings?.defaultInterestRate ?? 12);
  const [tenure, setTenure] = useState(12);
  const [loanAmount, setLoanAmount] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync rate when live snapshot updates and the user hasn't typed yet
  useEffect(() => {
    if (goldRate?.rate24k) setRate(goldRate.rate24k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goldRate?.rate24k]);

  function newItem(): GoldItem {
    return {
      id: crypto.randomUUID(),
      itemName: "Chain",
      count: 1,
      grossWeight: 0,
      netWeight: 0,
      stoneWeight: 0,
      purity: 22,
    };
  }

  const valuation = totalValuation(items, rate);
  const eligible = eligibleLoanAmount(items, rate, ltv);
  const weights = sumWeights(items);
  const avgPurity = weightedAveragePurity(items);
  const emi = calculateEMI(loanAmount || eligible, interestRate, tenure);
  const total = totalPayable(emi, tenure);

  function updateItem(idx: number, patch: Partial<GoldItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // Risk evaluation for the live form
  const finalAmountForRisk = loanAmount || eligible;
  const customerOutstanding = customerId ? sumCustomerOutstanding(customerId, loans) : 0;
  const riskEval = evaluateRisk({
    proposedAmount: finalAmountForRisk,
    customerOutstanding,
    policy: {
      singleLoanLimit: settings?.singleLoanLimit ?? 0,
      perCustomerCap: customerId ? settings?.perCustomerCap ?? 0 : 0,
      warnAtPercent: settings?.riskWarnAtPercent ?? DEFAULT_RISK_WARN_AT,
    },
  });

  async function save() {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) {
      toast.error("Select a customer");
      return;
    }
    if (items.length === 0 || items.every((i) => i.netWeight <= 0)) {
      toast.error("Add at least one gold item with net weight > 0");
      return;
    }
    const finalAmount = loanAmount || eligible;
    if (finalAmount <= 0) {
      toast.error("Loan amount must be positive");
      return;
    }
    if (riskEval.level === "breach") {
      const ok = window.confirm(
        `Risk policy breach:\n\n${riskEval.reasons.join("\n")}\n\nProceed anyway?`,
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const loanNo = await getNextLoanNo(ownerId);
      const now = new Date().toISOString();
      const due = new Date();
      due.setMonth(due.getMonth() + tenure);
      await addLoan({
        retailerId: ownerId,
        branchId: null,
        loanNo,
        customerId: cust.id,
        customerName: cust.fullName,
        customerMobile: cust.mobile,
        goldItems: items,
        totalGrossWeight: weights.gross,
        totalNetWeight: weights.net,
        averagePurity: avgPurity,
        marketRatePerGram: rate,
        goldValuation: valuation,
        ltvPercent: ltv,
        loanAmount: finalAmount,
        interestRate,
        tenureMonths: tenure,
        loanDate: now,
        dueDate: due.toISOString(),
        monthlyEmi: emi,
        totalPayable: total,
        status: "Active",
        totalPaid: 0,
        outstandingPrincipal: finalAmount,
        remarks: remarks.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: ownerEmail,
      });
      toast.success(`Loan ${loanNo} disbursed`);
      onClose();
      // reset
      setCustomerId("");
      setItems([newItem()]);
      setLoanAmount(0);
      setRemarks("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create loan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StudioModal open={open} onClose={onClose} title="New Gold Loan" width="max-w-3xl">
      <div className="space-y-4">
        <StudioSelect
          label="Customer *"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="" className="bg-slate-900">
            Select customer…
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id} className="bg-slate-900">
              {c.customerCode} — {c.fullName} ({c.mobile})
            </option>
          ))}
        </StudioSelect>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Gold items
            </p>
            <button
              onClick={() => setItems([...items, newItem()])}
              className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            >
              + Add item
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div
                key={it.id}
                className="grid grid-cols-12 items-end gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2"
              >
                <input
                  className="col-span-3 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-slate-100"
                  placeholder="Item"
                  value={it.itemName}
                  onChange={(e) => updateItem(idx, { itemName: e.target.value })}
                />
                <input
                  type="number"
                  className="col-span-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-slate-100"
                  placeholder="Qty"
                  value={it.count}
                  onChange={(e) => updateItem(idx, { count: Number(e.target.value) })}
                />
                <input
                  type="number"
                  step="0.01"
                  className="col-span-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-slate-100"
                  placeholder="Gross g"
                  value={it.grossWeight}
                  onChange={(e) => updateItem(idx, { grossWeight: Number(e.target.value) })}
                />
                <input
                  type="number"
                  step="0.01"
                  className="col-span-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-slate-100"
                  placeholder="Net g"
                  value={it.netWeight}
                  onChange={(e) => updateItem(idx, { netWeight: Number(e.target.value) })}
                />
                <input
                  type="number"
                  step="0.01"
                  className="col-span-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-slate-100"
                  placeholder="Stone g"
                  value={it.stoneWeight}
                  onChange={(e) => updateItem(idx, { stoneWeight: Number(e.target.value) })}
                />
                <select
                  className="col-span-1 rounded-md border border-white/10 bg-slate-900 px-1 py-1.5 text-xs text-slate-100"
                  value={it.purity}
                  onChange={(e) => updateItem(idx, { purity: Number(e.target.value) })}
                >
                  {GOLD_PURITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}k
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className="col-span-1 flex items-center justify-center rounded-md border border-rose-500/20 bg-rose-500/10 py-1.5 text-rose-300 hover:bg-rose-500/20 disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StudioInput
            label="Rate ₹/g (24k)"
            type="number"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
          <StudioInput
            label="LTV %"
            type="number"
            value={ltv}
            onChange={(e) => setLtv(Number(e.target.value))}
          />
          <StudioInput
            label="Interest % p.a."
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
          />
          <StudioInput
            label="Tenure (months)"
            type="number"
            value={tenure}
            onChange={(e) => setTenure(Number(e.target.value))}
          />
        </div>

        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
            <Mini label="Net" value={`${weights.net.toFixed(2)} g`} />
            <Mini label="Avg purity" value={`${avgPurity}k`} />
            <Mini label="Valuation" value={formatINR(valuation)} />
            <Mini label="Eligible" value={formatINR(eligible)} accent />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StudioInput
            label={`Loan amount (default ${formatINR(eligible)})`}
            type="number"
            value={loanAmount || ""}
            placeholder={String(eligible)}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
          />
          <div className="flex items-end gap-3 text-xs">
            <Mini label="Monthly EMI" value={formatINR(emi)} />
            <Mini label="Total payable" value={formatINR(total)} accent />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Risk policy check
            </p>
            <RiskBadge evaluation={riskEval} />
          </div>
          <RiskReasons evaluation={riskEval} />
        </div>

        <StudioTextarea
          label="Remarks"
          rows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <StudioButton variant="ghost" onClick={onClose}>
          Cancel
        </StudioButton>
        <StudioButton onClick={save} disabled={saving}>
          {saving ? "Disbursing…" : "Disburse Loan"}
        </StudioButton>
      </div>
    </StudioModal>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`font-bold ${accent ? "text-cyan-300" : "text-slate-200"}`}>{value}</p>
    </div>
  );
}

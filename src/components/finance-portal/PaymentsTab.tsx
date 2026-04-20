/**
 * Payments tab — record loan EMI/part-payments and view receipt history.
 */
import { useMemo, useState } from "react";
import { Receipt, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { getNextReceiptNo, recordPayment } from "@/lib/finance-firebase";
import type {
  FinanceCustomer,
  FinanceLoan,
  LoanPayment,
  PaymentType,
} from "@/lib/finance-types";
import { PAYMENT_MODES } from "@/lib/finance-types";
import { formatINR } from "@/lib/finance-calculations";
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

interface Props {
  ownerId: string;
  ownerEmail: string;
  customers: FinanceCustomer[];
  loans: FinanceLoan[];
  payments: LoanPayment[];
}

export function PaymentsTab({ ownerId, ownerEmail, loans, payments }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.toLowerCase();
    return payments.filter(
      (p) =>
        p.receiptNo?.toLowerCase().includes(q) ||
        p.loanNo?.toLowerCase().includes(q) ||
        p.customerName?.toLowerCase().includes(q),
    );
  }, [payments, search]);

  const todayTotal = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return payments
      .filter((p) => (p.collectedAt || "").startsWith(today))
      .reduce((s, p) => s + p.amount, 0);
  }, [payments]);

  const activeLoans = loans.filter((l) => l.status === "Active");

  return (
    <div className="space-y-4">
      <StudioSectionTitle
        eyebrow="Workspace"
        title="Payments & Receipts"
        right={
          <StudioButton onClick={() => setShowNew(true)} disabled={activeLoans.length === 0}>
            <Plus className="h-4 w-4" /> Record Payment
          </StudioButton>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StudioCard>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Today's collection</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{formatINR(todayTotal)}</p>
        </StudioCard>
        <StudioCard>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Total receipts</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{payments.length}</p>
        </StudioCard>
        <StudioCard className="col-span-2 lg:col-span-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Active loans</p>
          <p className="mt-1 text-2xl font-bold text-cyan-300">{activeLoans.length}</p>
        </StudioCard>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by receipt, loan, or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
        />
      </div>

      {filtered.length === 0 ? (
        <StudioEmpty
          icon={<Receipt className="h-5 w-5" />}
          title={payments.length === 0 ? "No payments recorded" : "No matching receipts"}
          hint={payments.length === 0 ? "Click 'Record Payment' when you collect EMI." : undefined}
        />
      ) : (
        <StudioCard className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5 text-left text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                  <th className="px-4 py-3 font-medium">Loan</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Mode</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-cyan-300">{p.receiptNo}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{p.loanNo}</td>
                    <td className="px-4 py-3 text-slate-100">{p.customerName}</td>
                    <td className="px-4 py-3">
                      <StudioBadge tone={p.type === "Settlement" ? "success" : "info"}>
                        {p.type}
                      </StudioBadge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                      {formatINR(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{p.paymentMode}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(p.collectedAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StudioCard>
      )}

      <NewPaymentModal
        open={showNew}
        onClose={() => setShowNew(false)}
        ownerId={ownerId}
        ownerEmail={ownerEmail}
        loans={activeLoans}
      />
    </div>
  );
}

function NewPaymentModal({
  open,
  onClose,
  ownerId,
  ownerEmail,
  loans,
}: {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  ownerEmail: string;
  loans: FinanceLoan[];
}) {
  const [loanId, setLoanId] = useState("");
  const [type, setType] = useState<PaymentType>("EMI");
  const [amount, setAmount] = useState(0);
  const [principal, setPrincipal] = useState(0);
  const [interest, setInterest] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [mode, setMode] = useState<"Cash" | "UPI" | "Bank">("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loan = loans.find((l) => l.id === loanId);

  async function save() {
    if (!loan) {
      toast.error("Select a loan");
      return;
    }
    if (amount <= 0) {
      toast.error("Amount must be positive");
      return;
    }
    setSaving(true);
    try {
      const receiptNo = await getNextReceiptNo(ownerId);
      await recordPayment({
        retailerId: ownerId,
        branchId: null,
        loanId: loan.id,
        loanNo: loan.loanNo,
        customerId: loan.customerId,
        customerName: loan.customerName,
        receiptNo,
        type,
        amount,
        principalComponent: principal,
        interestComponent: interest,
        penaltyComponent: penalty,
        paymentMode: mode,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        collectedBy: ownerEmail,
        collectedAt: new Date().toISOString(),
      });
      toast.success(`Receipt ${receiptNo} recorded`);
      onClose();
      // reset
      setLoanId("");
      setAmount(0);
      setPrincipal(0);
      setInterest(0);
      setPenalty(0);
      setReference("");
      setNotes("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StudioModal open={open} onClose={onClose} title="Record Payment" width="max-w-xl">
      <div className="space-y-3">
        <StudioSelect
          label="Active loan *"
          value={loanId}
          onChange={(e) => setLoanId(e.target.value)}
        >
          <option value="" className="bg-slate-900">
            Select loan…
          </option>
          {loans.map((l) => (
            <option key={l.id} value={l.id} className="bg-slate-900">
              {l.loanNo} — {l.customerName} ({formatINR(l.outstandingPrincipal)} due)
            </option>
          ))}
        </StudioSelect>

        {loan && (
          <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-2 text-xs text-cyan-200">
            Outstanding: <strong>{formatINR(loan.outstandingPrincipal)}</strong> · EMI:{" "}
            <strong>{formatINR(loan.monthlyEmi)}</strong>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <StudioSelect
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as PaymentType)}
          >
            <option value="EMI" className="bg-slate-900">EMI</option>
            <option value="PartPayment" className="bg-slate-900">Part Payment</option>
            <option value="Settlement" className="bg-slate-900">Settlement (close)</option>
          </StudioSelect>
          <StudioInput
            label="Amount *"
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StudioInput
            label="Principal"
            type="number"
            value={principal || ""}
            onChange={(e) => setPrincipal(Number(e.target.value))}
          />
          <StudioInput
            label="Interest"
            type="number"
            value={interest || ""}
            onChange={(e) => setInterest(Number(e.target.value))}
          />
          <StudioInput
            label="Penalty"
            type="number"
            value={penalty || ""}
            onChange={(e) => setPenalty(Number(e.target.value))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StudioSelect
            label="Mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m} className="bg-slate-900">
                {m}
              </option>
            ))}
          </StudioSelect>
          <StudioInput
            label="Reference (UPI/Txn ID)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>

        <StudioTextarea
          label="Notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <StudioButton variant="ghost" onClick={onClose}>
          Cancel
        </StudioButton>
        <StudioButton onClick={save} disabled={saving}>
          {saving ? "Recording…" : "Record Payment"}
        </StudioButton>
      </div>
    </StudioModal>
  );
}

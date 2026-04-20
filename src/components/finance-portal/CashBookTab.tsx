/**
 * Cash Book tab — daily income/expense/bank deposit ledger.
 */
import { useMemo, useState } from "react";
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, Building2 } from "lucide-react";
import { toast } from "sonner";
import { addCashEntry } from "@/lib/finance-firebase";
import type { CashEntry, CashEntryType } from "@/lib/finance-types";
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
  cashBook: CashEntry[];
}

export function CashBookTab({ ownerId, ownerEmail, cashBook }: Props) {
  const [showNew, setShowNew] = useState(false);

  const totals = useMemo(() => {
    let income = 0,
      expense = 0,
      deposit = 0;
    cashBook.forEach((e) => {
      if (e.type === "Income") income += e.amount;
      else if (e.type === "Expense") expense += e.amount;
      else if (e.type === "BankDeposit") deposit += e.amount;
    });
    return { income, expense, deposit, balance: income - expense - deposit };
  }, [cashBook]);

  return (
    <div className="space-y-4">
      <StudioSectionTitle
        eyebrow="Workspace"
        title="Cash Book"
        right={
          <StudioButton onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" /> New Entry
          </StudioButton>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={<ArrowUpCircle className="h-4 w-4" />}
          label="Income"
          value={formatINR(totals.income)}
          accent="text-emerald-300"
        />
        <SummaryCard
          icon={<ArrowDownCircle className="h-4 w-4" />}
          label="Expense"
          value={formatINR(totals.expense)}
          accent="text-rose-300"
        />
        <SummaryCard
          icon={<Building2 className="h-4 w-4" />}
          label="Bank Deposits"
          value={formatINR(totals.deposit)}
          accent="text-amber-300"
        />
        <SummaryCard
          icon={<Wallet className="h-4 w-4" />}
          label="Cash in Hand"
          value={formatINR(totals.balance)}
          accent="text-cyan-300"
        />
      </div>

      {cashBook.length === 0 ? (
        <StudioEmpty
          icon={<Wallet className="h-5 w-5" />}
          title="No cash entries yet"
          hint="Click 'New Entry' to log income, expense, or a bank deposit."
        />
      ) : (
        <StudioCard className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5 text-left text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cashBook.map((e) => (
                  <tr key={e.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(e.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <StudioBadge
                        tone={
                          e.type === "Income"
                            ? "success"
                            : e.type === "Expense"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {e.type}
                      </StudioBadge>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{e.category}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{e.description || "—"}</td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        e.type === "Income" ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {e.type === "Income" ? "+" : "−"}
                      {formatINR(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StudioCard>
      )}

      <NewCashEntryModal
        open={showNew}
        onClose={() => setShowNew(false)}
        ownerId={ownerId}
        ownerEmail={ownerEmail}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <StudioCard>
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-[10px] uppercase tracking-wider">{label}</p>
      </div>
      <p className={`mt-1 text-xl font-bold ${accent}`}>{value}</p>
    </StudioCard>
  );
}

function NewCashEntryModal({
  open,
  onClose,
  ownerId,
  ownerEmail,
}: {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  ownerEmail: string;
}) {
  const [type, setType] = useState<CashEntryType>("Income");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!category.trim() || amount <= 0) {
      toast.error("Category and a positive amount are required");
      return;
    }
    setSaving(true);
    try {
      await addCashEntry({
        retailerId: ownerId,
        branchId: null,
        type,
        category: category.trim(),
        amount,
        description: description.trim(),
        date,
        enteredBy: ownerEmail,
        createdAt: new Date().toISOString(),
      });
      toast.success("Cash entry saved");
      onClose();
      setCategory("");
      setAmount(0);
      setDescription("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StudioModal open={open} onClose={onClose} title="New Cash Entry" width="max-w-md">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <StudioSelect
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as CashEntryType)}
          >
            <option value="Income" className="bg-slate-900">Income</option>
            <option value="Expense" className="bg-slate-900">Expense</option>
            <option value="BankDeposit" className="bg-slate-900">Bank Deposit</option>
          </StudioSelect>
          <StudioInput
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <StudioInput
          label="Category *"
          placeholder="Salary, Rent, Office Supplies…"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <StudioInput
          label="Amount *"
          type="number"
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <StudioTextarea
          label="Description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <StudioButton variant="ghost" onClick={onClose}>
          Cancel
        </StudioButton>
        <StudioButton onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Entry"}
        </StudioButton>
      </div>
    </StudioModal>
  );
}

/**
 * DepositsTab — Retailer Finance / Deposits suite UI.
 * Supports SB / FD / RD / Pigmy with collector tracking and live maturity calc.
 * Branch-tagged forward-only via `branchId`.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PiggyBank,
  Plus,
  Wallet,
  CheckCircle2,
  Loader2,
  Receipt,
  Calendar as CalendarIcon,
  Search,
  Coins,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  type FinanceDeposit,
  type DepositCollection,
  type DepositProduct,
  type DepositInterestPayout,
  DEPOSIT_PRODUCT_LABELS,
  DEPOSIT_STATUS_COLORS,
  DEFAULT_DEPOSIT_RATES,
} from "@/lib/finance-deposit-types";
import {
  calculateMaturity,
  addMonthsIso,
  addDaysIso,
} from "@/lib/finance-deposit-calculations";
import {
  subscribeDeposits,
  subscribeDepositCollections,
  addDeposit,
  getNextDepositAccountNo,
  getNextDepositReceiptNo,
  recordDepositCollection,
  closeDeposit,
} from "@/lib/finance-deposits";
import type { FinanceCustomer } from "@/lib/finance-types";
import { PAYMENT_MODES } from "@/lib/finance-types";
import { formatINR } from "@/lib/finance-calculations";

interface Props {
  retailerId: string;
  branchId: string | null;
  customers: FinanceCustomer[];
  createdBy: string;
}

export function DepositsTab({ retailerId, branchId, customers, createdBy }: Props) {
  const [deposits, setDeposits] = useState<FinanceDeposit[]>([]);
  const [collections, setCollections] = useState<DepositCollection[]>([]);
  const [productFilter, setProductFilter] = useState<DepositProduct | "ALL">("ALL");
  const [searchQ, setSearchQ] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [openCollect, setOpenCollect] = useState<FinanceDeposit | null>(null);
  const [openClose, setOpenClose] = useState<FinanceDeposit | null>(null);

  useEffect(() => {
    if (!retailerId) return;
    const u1 = subscribeDeposits(retailerId, setDeposits);
    const u2 = subscribeDepositCollections(retailerId, setCollections);
    return () => {
      u1();
      u2();
    };
  }, [retailerId]);

  const stats = useMemo(() => {
    const total = deposits.length;
    const active = deposits.filter((d) => d.status === "Active").length;
    const principal = deposits.reduce((s, d) => s + (d.amount || 0), 0);
    const collected = deposits.reduce((s, d) => s + (d.totalCollected || 0), 0);
    const expectedMaturity = deposits.reduce((s, d) => s + (d.expectedMaturityAmount || 0), 0);
    return { total, active, principal, collected, expectedMaturity };
  }, [deposits]);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return deposits.filter((d) => {
      if (productFilter !== "ALL" && d.product !== productFilter) return false;
      if (!q) return true;
      return (
        d.accountNo.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q) ||
        (d.customerMobile || "").includes(q)
      );
    });
  }, [deposits, productFilter, searchQ]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile label="Accounts" value={String(stats.total)} icon={<PiggyBank className="w-4 h-4" />} tone="blue" />
        <StatTile label="Active" value={String(stats.active)} icon={<CheckCircle2 className="w-4 h-4" />} tone="emerald" />
        <StatTile label="Principal" value={formatINR(stats.principal)} icon={<Coins className="w-4 h-4" />} tone="indigo" />
        <StatTile label="Collected" value={formatINR(stats.collected)} icon={<Wallet className="w-4 h-4" />} tone="amber" />
        <StatTile label="Maturity (est.)" value={formatINR(stats.expectedMaturity)} icon={<TrendingUp className="w-4 h-4" />} tone="green" />
      </div>

      {/* Toolbar */}
      <Card className="border-gov-blue/15">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search account / name / mobile…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={productFilter} onValueChange={(v) => setProductFilter(v as DepositProduct | "ALL")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Products</SelectItem>
                <SelectItem value="SB">Savings (SB)</SelectItem>
                <SelectItem value="FD">Fixed Deposit</SelectItem>
                <SelectItem value="RD">Recurring Deposit</SelectItem>
                <SelectItem value="PIGMY">Daily (Pigmy)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => setOpenCreate(true)}
            disabled={customers.length === 0}
            className="bg-gradient-to-br from-gov-blue to-gov-blue-dark text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Deposit
          </Button>
        </CardContent>
      </Card>

      {customers.length === 0 && (
        <Card className="border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/20">
          <CardContent className="p-4 text-sm text-amber-800 dark:text-amber-200">
            Add at least one customer in the <strong>Customers</strong> tab before opening a deposit account.
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="w-4 h-4" /> Deposit Accounts ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No deposit accounts yet.</p>
          ) : (
            <div className="divide-y">
              {filtered.map((d) => (
                <DepositRow
                  key={d.id}
                  d={d}
                  onCollect={() => setOpenCollect(d)}
                  onClose={() => setOpenClose(d)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {openCreate && (
        <CreateDepositDialog
          retailerId={retailerId}
          branchId={branchId}
          customers={customers}
          createdBy={createdBy}
          onClose={() => setOpenCreate(false)}
        />
      )}
      {openCollect && (
        <CollectDialog
          retailerId={retailerId}
          branchId={branchId}
          deposit={openCollect}
          collectedBy={createdBy}
          onClose={() => setOpenCollect(null)}
        />
      )}
      {openClose && (
        <CloseDialog
          retailerId={retailerId}
          deposit={openClose}
          onClose={() => setOpenClose(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "indigo" | "amber" | "green";
}) {
  const toneMap: Record<string, string> = {
    blue: "from-blue-500/10 to-blue-500/5 border-blue-200 text-blue-700 dark:text-blue-300",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-200 text-emerald-700 dark:text-emerald-300",
    indigo: "from-indigo-500/10 to-indigo-500/5 border-indigo-200 text-indigo-700 dark:text-indigo-300",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-200 text-amber-700 dark:text-amber-300",
    green: "from-green-500/10 to-green-500/5 border-green-200 text-green-700 dark:text-green-300",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-3 ${toneMap[tone]}`}>
      <div className="flex items-center justify-between text-xs font-medium opacity-90">
        <span>{label}</span>
        {icon}
      </div>
      <p className="mt-1 text-lg font-bold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

function DepositRow({
  d,
  onCollect,
  onClose,
}: {
  d: FinanceDeposit;
  onCollect: () => void;
  onClose: () => void;
}) {
  const opened = new Date(d.openDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const matures = new Date(d.maturityDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const isMatured = new Date(d.maturityDate) <= new Date();

  return (
    <div className="p-3 sm:p-4 hover:bg-muted/40 transition flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-[10px]">
            {d.accountNo}
          </Badge>
          <Badge className={`text-[10px] ${DEPOSIT_STATUS_COLORS[d.status]}`} variant="outline">
            {d.status}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {DEPOSIT_PRODUCT_LABELS[d.product]}
          </Badge>
          {isMatured && d.status === "Active" && (
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
              Maturity reached
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm font-semibold truncate">{d.customerName}</p>
        <p className="text-xs text-muted-foreground">
          {d.customerMobile} · Opened {opened} · Matures {matures}
          {d.collectorName ? ` · Collector: ${d.collectorName}` : ""}
        </p>
        <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-xs">
          <Field label={d.product === "FD" || d.product === "SB" ? "Principal" : d.product === "RD" ? "Monthly" : "Daily"} value={formatINR(d.amount)} />
          <Field label="Rate" value={`${d.interestRate}%`} />
          <Field label="Collected" value={formatINR(d.totalCollected || 0)} />
          <Field label="Maturity (est.)" value={formatINR(d.expectedMaturityAmount)} highlight />
        </div>
      </div>
      <div className="flex sm:flex-col gap-2 sm:w-32">
        {(d.product === "RD" || d.product === "PIGMY" || d.product === "SB") && d.status === "Active" && (
          <Button size="sm" variant="outline" onClick={onCollect} className="flex-1 sm:flex-none">
            <Receipt className="w-3.5 h-3.5 mr-1" /> Collect
          </Button>
        )}
        {d.status === "Active" && (
          <Button size="sm" variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Close
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-semibold tabular-nums ${highlight ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{value}</span>
    </div>
  );
}

// ─── Create Deposit Dialog ──────────────────────────────────────────────────

function CreateDepositDialog({
  retailerId,
  branchId,
  customers,
  createdBy,
  onClose,
}: {
  retailerId: string;
  branchId: string | null;
  customers: FinanceCustomer[];
  createdBy: string;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<DepositProduct>("RD");
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || "");
  const [amount, setAmount] = useState<string>("");
  const [rate, setRate] = useState<number>(DEFAULT_DEPOSIT_RATES["RD"]);
  const [tenureMonths, setTenureMonths] = useState<number>(12);
  const [tenureDays, setTenureDays] = useState<number>(365);
  const [payout, setPayout] = useState<DepositInterestPayout>("Maturity");
  const [collectorName, setCollectorName] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Update default rate when product changes
  useEffect(() => {
    setRate(DEFAULT_DEPOSIT_RATES[product]);
  }, [product]);

  const customer = customers.find((c) => c.id === customerId);
  const amt = parseFloat(amount) || 0;

  const projection = useMemo(() => {
    return calculateMaturity(product, amt, rate, tenureMonths, tenureDays);
  }, [product, amt, rate, tenureMonths, tenureDays]);

  const amountLabel =
    product === "FD" || product === "SB"
      ? "Principal Amount (₹)"
      : product === "RD"
        ? "Monthly Installment (₹)"
        : "Daily Collection (₹)";

  const handleCreate = async () => {
    if (!customer) return toast.error("Select a customer");
    if (amt <= 0) return toast.error("Enter a valid amount");
    setSubmitting(true);
    try {
      const accountNo = await getNextDepositAccountNo(retailerId, product);
      const now = new Date().toISOString();
      const maturityIso =
        product === "PIGMY"
          ? addDaysIso(now, tenureDays)
          : addMonthsIso(now, tenureMonths);

      const data: Omit<FinanceDeposit, "id"> = {
        retailerId,
        branchId,
        accountNo,
        product,
        customerId: customer.id,
        customerName: customer.fullName,
        customerMobile: customer.mobile,
        amount: amt,
        interestRate: rate,
        tenureMonths,
        tenureDays: product === "PIGMY" ? tenureDays : undefined,
        payout,
        openDate: now,
        maturityDate: maturityIso,
        expectedMaturityAmount: projection.maturity,
        expectedInterest: projection.interest,
        totalCollected: product === "FD" ? amt : 0,
        totalCollections: product === "FD" ? 1 : 0,
        lastCollectionDate: product === "FD" ? now : null,
        collectorName: collectorName.trim() || null,
        status: "Active",
        remarks: remarks.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        createdBy,
      };
      await addDeposit(data);
      toast.success(`${DEPOSIT_PRODUCT_LABELS[product]} ${accountNo} opened`);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to create deposit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4" /> Open New Deposit Account
          </DialogTitle>
          <DialogDescription>
            Create a Savings, FD, RD or Pigmy account. Maturity is auto-calculated.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Product</Label>
              <Select value={product} onValueChange={(v) => setProduct(v as DepositProduct)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SB">Savings (SB)</SelectItem>
                  <SelectItem value="FD">Fixed Deposit (FD)</SelectItem>
                  <SelectItem value="RD">Recurring Deposit (RD)</SelectItem>
                  <SelectItem value="PIGMY">Daily Deposit (Pigmy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.customerCode} · {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{amountLabel}</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Interest Rate (% p.a.)</Label>
              <Input
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {product === "PIGMY" ? (
              <div>
                <Label>Collection Days</Label>
                <Input
                  type="number"
                  value={tenureDays}
                  onChange={(e) => setTenureDays(parseInt(e.target.value) || 0)}
                />
              </div>
            ) : (
              <div>
                <Label>Tenure (months)</Label>
                <Input
                  type="number"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(parseInt(e.target.value) || 0)}
                />
              </div>
            )}
            {product === "FD" ? (
              <div>
                <Label>Interest Payout</Label>
                <Select value={payout} onValueChange={(v) => setPayout(v as DepositInterestPayout)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maturity">On Maturity</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Collector / Agent (optional)</Label>
                <Input
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  placeholder="Agent name"
                />
              </div>
            )}
          </div>

          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
          </div>

          {/* Live projection */}
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/40 dark:from-emerald-950/30 dark:to-emerald-950/10 p-3">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
              Maturity Projection
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <ProjBox label="Total Deposit" value={formatINR(projection.totalDeposited)} />
              <ProjBox label="Interest" value={formatINR(projection.interest)} />
              <ProjBox label="Maturity Amount" value={formatINR(projection.maturity)} highlight />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleCreate} disabled={submitting} className="bg-gov-blue text-white">
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
            Open Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2 ${highlight ? "bg-emerald-600 text-white" : "bg-white/60 dark:bg-emerald-950/30"}`}>
      <p className={`text-[10px] uppercase tracking-wider font-semibold ${highlight ? "text-emerald-100" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className={`text-sm font-bold tabular-nums ${highlight ? "text-white" : ""}`}>{value}</p>
    </div>
  );
}

// ─── Collect Dialog ─────────────────────────────────────────────────────────

function CollectDialog({
  retailerId,
  branchId,
  deposit,
  collectedBy,
  onClose,
}: {
  retailerId: string;
  branchId: string | null;
  deposit: FinanceDeposit;
  collectedBy: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState<string>(String(deposit.amount));
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Bank">("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return toast.error("Enter a valid amount");
    setSubmitting(true);
    try {
      const receiptNo = await getNextDepositReceiptNo(retailerId);
      await recordDepositCollection({
        retailerId,
        branchId,
        depositId: deposit.id,
        accountNo: deposit.accountNo,
        product: deposit.product,
        customerId: deposit.customerId,
        customerName: deposit.customerName,
        sequence: (deposit.totalCollections || 0) + 1,
        amount: amt,
        paymentMode,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        collectedBy,
        collectorName: deposit.collectorName ?? null,
        collectedAt: new Date().toISOString(),
        receiptNo,
      });
      toast.success(`Receipt ${receiptNo} recorded`);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to record collection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Record Collection — {deposit.accountNo}
          </DialogTitle>
          <DialogDescription>
            {deposit.customerName} · {DEPOSIT_PRODUCT_LABELS[deposit.product]}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Payment Mode</Label>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as "Cash" | "UPI" | "Bank")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reference / UTR (optional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="rounded-lg bg-muted/40 p-2 text-xs flex justify-between">
            <span className="text-muted-foreground">Currently collected:</span>
            <span className="font-semibold tabular-nums">
              {formatINR(deposit.totalCollected || 0)} ({deposit.totalCollections || 0} entries)
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-gov-blue text-white">
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Receipt className="w-4 h-4 mr-1.5" />}
            Save Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Close / Withdraw Dialog ────────────────────────────────────────────────

function CloseDialog({
  retailerId,
  deposit,
  onClose,
}: {
  retailerId: string;
  deposit: FinanceDeposit;
  onClose: () => void;
}) {
  const isMatured = new Date(deposit.maturityDate) <= new Date();
  const defaultPayout = isMatured ? deposit.expectedMaturityAmount : (deposit.totalCollected || deposit.amount);
  const [payout, setPayout] = useState<string>(String(defaultPayout));
  const [closeStatus, setCloseStatus] = useState<"Closed" | "Matured" | "Withdrawn">(
    isMatured ? "Matured" : "Withdrawn",
  );
  const [submitting, setSubmitting] = useState(false);

  const handleClose = async () => {
    const amt = parseFloat(payout) || 0;
    setSubmitting(true);
    try {
      await closeDeposit(deposit.id, amt, closeStatus, undefined, retailerId);
      toast.success(`Account ${deposit.accountNo} marked ${closeStatus}`);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to close account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Close Account — {deposit.accountNo}
          </DialogTitle>
          <DialogDescription>
            {deposit.customerName} · Opened {new Date(deposit.openDate).toLocaleDateString("en-IN")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Box label="Principal" value={formatINR(deposit.amount)} />
            <Box label="Collected" value={formatINR(deposit.totalCollected || 0)} />
            <Box label="Expected Maturity" value={formatINR(deposit.expectedMaturityAmount)} highlight />
            <Box label="Maturity Date" value={new Date(deposit.maturityDate).toLocaleDateString("en-IN")} />
          </div>

          <div>
            <Label>Closure Status</Label>
            <Select value={closeStatus} onValueChange={(v) => setCloseStatus(v as "Closed" | "Matured" | "Withdrawn")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Matured">Matured (full payout)</SelectItem>
                <SelectItem value="Withdrawn">Premature Withdrawal</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Payout Amount (₹)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={payout}
              onChange={(e) => setPayout(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleClose} disabled={submitting} className="bg-gov-blue text-white">
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
            Confirm Closure
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Box({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${highlight ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-border bg-muted/30"}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${highlight ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{value}</p>
    </div>
  );
}

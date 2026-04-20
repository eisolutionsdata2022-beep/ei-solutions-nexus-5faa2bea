/**
 * Admin — Finance Multi-Branch Management.
 *
 * Lets the admin:
 *  - Create / edit / disable branches (flat list).
 *  - Assign each retailer to ONE branch.
 *  - View per-branch totals: customers, loans, disbursed, outstanding,
 *    income (interest+penalty from payments), expense (cash book Expense
 *    entries) and net profit.
 *  - Drill into a branch to see its retailers and recent payments.
 *
 * Forward-only: only finance records that already carry `branchId` roll up
 * to a branch. Older un-tagged records appear under "Unassigned".
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Plus,
  Edit2,
  Power,
  Users,
  Banknote,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShieldCheck,
  Activity,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  type FinanceBranch,
  subscribeBranches,
  addBranch,
  updateBranch,
  setBranchEnabled,
  assignRetailerToBranch,
  subscribeRetailerAssignments,
} from "@/lib/finance-branches";
import {
  subscribeCustomersAll,
  subscribeLoansAll,
  subscribePaymentsAll,
  subscribeCashBookAll,
} from "@/lib/finance-firebase";
import type {
  FinanceCustomer,
  FinanceLoan,
  LoanPayment,
  CashEntry,
} from "@/lib/finance-types";
import { formatINR } from "@/lib/finance-calculations";

export const Route = createFileRoute("/admin/finance-branches")({
  component: AdminBranchesPage,
  ssr: false,
});

interface Retailer {
  id: string;
  name: string;
  email: string;
  branchId: string | null;
}

interface BranchTotals {
  customers: number;
  loans: number;
  activeLoans: number;
  disbursed: number;
  outstanding: number;
  income: number;
  expense: number;
  net: number;
  retailers: number;
}

const EMPTY_TOTALS: BranchTotals = {
  customers: 0,
  loans: 0,
  activeLoans: 0,
  disbursed: 0,
  outstanding: 0,
  income: 0,
  expense: 0,
  net: 0,
  retailers: 0,
};

function AdminBranchesPage() {
  const { appUser } = useAuth();

  const [branches, setBranches] = useState<FinanceBranch[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [customers, setCustomers] = useState<FinanceCustomer[]>([]);
  const [loans, setLoans] = useState<FinanceLoan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [cashBook, setCashBook] = useState<CashEntry[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<FinanceBranch | null>(null);
  const [drilldown, setDrilldown] = useState<FinanceBranch | null>(null);

  useEffect(() => {
    const u1 = subscribeBranches(setBranches);
    const u2 = subscribeRetailerAssignments((_m, list) => setRetailers(list));
    const u3 = subscribeCustomersAll(setCustomers);
    const u4 = subscribeLoansAll(setLoans);
    const u5 = subscribePaymentsAll(setPayments);
    const u6 = subscribeCashBookAll(setCashBook);
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, []);

  // ─── Derived per-branch roll-ups ──────────────────────────────────────────
  const totalsByBranch = useMemo(() => {
    const map = new Map<string, BranchTotals>();
    const ensure = (key: string) => {
      if (!map.has(key)) map.set(key, { ...EMPTY_TOTALS });
      return map.get(key)!;
    };
    customers.forEach((c) => {
      const k = c.branchId || "__unassigned__";
      ensure(k).customers += 1;
    });
    loans.forEach((l) => {
      const k = l.branchId || "__unassigned__";
      const t = ensure(k);
      t.loans += 1;
      if (l.status === "Active") t.activeLoans += 1;
      t.disbursed += l.loanAmount || 0;
      if (l.status === "Active") t.outstanding += l.outstandingPrincipal || 0;
    });
    payments.forEach((p) => {
      const k = p.branchId || "__unassigned__";
      const t = ensure(k);
      t.income += (p.interestComponent || 0) + (p.penaltyComponent || 0);
    });
    cashBook.forEach((e) => {
      const k = e.branchId || "__unassigned__";
      const t = ensure(k);
      if (e.type === "Expense") t.expense += e.amount || 0;
      else if (e.type === "Income") t.income += e.amount || 0;
    });
    retailers.forEach((r) => {
      const k = r.branchId || "__unassigned__";
      ensure(k).retailers += 1;
    });
    map.forEach((t) => { t.net = t.income - t.expense; });
    return map;
  }, [customers, loans, payments, cashBook, retailers]);

  // ─── Platform-wide totals ─────────────────────────────────────────────────
  const platformTotals = useMemo<BranchTotals>(() => {
    const t = { ...EMPTY_TOTALS };
    totalsByBranch.forEach((b) => {
      t.customers += b.customers;
      t.loans += b.loans;
      t.activeLoans += b.activeLoans;
      t.disbursed += b.disbursed;
      t.outstanding += b.outstanding;
      t.income += b.income;
      t.expense += b.expense;
    });
    t.net = t.income - t.expense;
    t.retailers = retailers.length;
    return t;
  }, [totalsByBranch, retailers]);

  const unassignedTotals = totalsByBranch.get("__unassigned__") || EMPTY_TOTALS;
  const enabledBranches = branches.filter((b) => b.enabled).length;

  if (!appUser) return null;

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-5">
      {/* Premium banking header */}
      <header className="relative overflow-hidden rounded-2xl border border-gov-blue/30 bg-gradient-to-br from-[hsl(216_75%_18%)] via-gov-blue-dark to-gov-blue text-white shadow-[0_18px_50px_-20px_rgba(20,40,90,0.55)]">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-gov-saffron/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-gov-green/20 blur-3xl pointer-events-none" />
        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-inner">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Multi-Branch Management</h1>
              <p className="text-[11px] sm:text-xs text-white/75 mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" />
                Admin · {enabledBranches} active · {branches.length - enabledBranches} disabled
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAdd(true)}
            className="bg-white text-gov-blue hover:bg-white/90 font-bold shadow-md"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Branch
          </Button>
        </div>
        <div className="relative h-1.5 flex">
          <div className="flex-1 bg-gov-saffron" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-gov-green" />
        </div>
      </header>

      {/* Platform-wide stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PremiumStat label="Branches" value={`${enabledBranches} / ${branches.length}`} sub="active / total" icon={Building2} gradient="from-gov-blue to-gov-blue-dark" />
        <PremiumStat label="Retailers" value={String(platformTotals.retailers)} sub={`${unassignedTotals.retailers} unassigned`} icon={Users} gradient="from-purple-500 to-fuchsia-600" />
        <PremiumStat label="Active Loans" value={String(platformTotals.activeLoans)} sub={`of ${platformTotals.loans} total`} icon={Banknote} gradient="from-emerald-500 to-green-600" />
        <PremiumStat label="Net Income" value={formatINR(platformTotals.net)} sub={`In ${formatINR(platformTotals.income)} · Out ${formatINR(platformTotals.expense)}`} icon={platformTotals.net >= 0 ? TrendingUp : TrendingDown} gradient={platformTotals.net >= 0 ? "from-teal-500 to-emerald-600" : "from-red-500 to-rose-600"} />
      </div>

      <Tabs defaultValue="branches" className="w-full">
        <TabsList className="bg-card border border-gov-blue/15 shadow-sm p-1 rounded-xl">
          <TabsTrigger value="branches" className="data-[state=active]:bg-gov-blue data-[state=active]:text-white font-medium">
            <Building2 className="w-3.5 h-3.5 mr-1.5" /> Branches
          </TabsTrigger>
          <TabsTrigger value="retailers" className="data-[state=active]:bg-gov-blue data-[state=active]:text-white font-medium">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Retailer Assignments
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-gov-blue data-[state=active]:text-white font-medium">
            <Activity className="w-3.5 h-3.5 mr-1.5" /> Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branches" className="mt-4 space-y-3">
          {branches.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No branches yet. Click <span className="font-semibold">New Branch</span> to add one.</p>
              </CardContent>
            </Card>
          )}
          {branches.map((b) => {
            const t = totalsByBranch.get(b.id) || EMPTY_TOTALS;
            return (
              <Card
                key={b.id}
                className={`transition-all hover:shadow-md ${b.enabled ? "border-border" : "border-dashed border-muted-foreground/30 opacity-70"}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base truncate">{b.name}</h3>
                        <Badge variant="outline" className="font-mono text-[10px]">{b.code}</Badge>
                        {b.enabled ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Disabled</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {b.address}, {b.city}, {b.state} - {b.pincode}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Manager: <span className="font-medium text-foreground">{b.managerName || "—"}</span>
                        {b.managerPhone && <> · {b.managerPhone}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setDrilldown(b)}>
                        <Activity className="w-3.5 h-3.5 mr-1" /> Details
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await setBranchEnabled(b.id, !b.enabled);
                          toast.success(b.enabled ? "Branch disabled" : "Branch enabled");
                        }}
                        className={b.enabled ? "text-amber-700 hover:bg-amber-50" : "text-emerald-700 hover:bg-emerald-50"}
                      >
                        <Power className="w-3.5 h-3.5 mr-1" /> {b.enabled ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-4 pt-3 border-t">
                    <Mini label="Retailers" value={String(t.retailers)} />
                    <Mini label="Customers" value={String(t.customers)} />
                    <Mini label="Active" value={String(t.activeLoans)} />
                    <Mini label="Disbursed" value={formatINR(t.disbursed)} />
                    <Mini label="Outstanding" value={formatINR(t.outstanding)} />
                    <Mini label="Income" value={formatINR(t.income)} accent="text-emerald-700" />
                    <Mini label="Net" value={formatINR(t.net)} accent={t.net >= 0 ? "text-emerald-700" : "text-red-700"} />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Unassigned roll-up */}
          {unassignedTotals.customers + unassignedTotals.loans + unassignedTotals.retailers > 0 && (
            <Card className="border-dashed border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-amber-700" />
                  <h3 className="font-bold text-sm">Unassigned</h3>
                  <Badge variant="outline" className="text-[10px]">Records without branchId</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Existing data created before branch assignment. Future records auto-stamp branchId.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  <Mini label="Retailers" value={String(unassignedTotals.retailers)} />
                  <Mini label="Customers" value={String(unassignedTotals.customers)} />
                  <Mini label="Active" value={String(unassignedTotals.activeLoans)} />
                  <Mini label="Disbursed" value={formatINR(unassignedTotals.disbursed)} />
                  <Mini label="Outstanding" value={formatINR(unassignedTotals.outstanding)} />
                  <Mini label="Income" value={formatINR(unassignedTotals.income)} accent="text-emerald-700" />
                  <Mini label="Net" value={formatINR(unassignedTotals.net)} />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="retailers" className="mt-4">
          <RetailerAssignmentTable retailers={retailers} branches={branches} />
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <PerformanceLeaderboard branches={branches} totalsByBranch={totalsByBranch} />
        </TabsContent>
      </Tabs>

      <BranchFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        actor={appUser.email}
      />
      {editing && (
        <BranchFormDialog
          open={!!editing}
          onOpenChange={(b) => { if (!b) setEditing(null); }}
          actor={appUser.email}
          existing={editing}
        />
      )}
      {drilldown && (
        <BranchDrilldownDialog
          branch={drilldown}
          retailers={retailers.filter((r) => r.branchId === drilldown.id)}
          loans={loans.filter((l) => l.branchId === drilldown.id)}
          payments={payments.filter((p) => p.branchId === drilldown.id)}
          customers={customers.filter((c) => c.branchId === drilldown.id)}
          totals={totalsByBranch.get(drilldown.id) || EMPTY_TOTALS}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}

// ─── Stat tiles ─────────────────────────────────────────────────────────────
function PremiumStat({
  label, value, sub, icon: Icon, gradient,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; gradient: string;
}) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-95`} />
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/15 blur-2xl" />
      <CardContent className="relative p-4 text-white">
        <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <p className="text-[11px] uppercase tracking-wide text-white/85 font-medium">{label}</p>
        <p className="text-xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-white/75 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${accent || ""}`}>{value}</p>
    </div>
  );
}

// ─── Branch create / edit dialog ────────────────────────────────────────────
function BranchFormDialog({
  open, onOpenChange, actor, existing,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  actor: string;
  existing?: FinanceBranch;
}) {
  const [form, setForm] = useState({
    code: "", name: "", address: "", city: "", state: "", pincode: "",
    managerName: "", managerPhone: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        code: existing.code,
        name: existing.name,
        address: existing.address,
        city: existing.city,
        state: existing.state,
        pincode: existing.pincode,
        managerName: existing.managerName,
        managerPhone: existing.managerPhone,
        notes: existing.notes || "",
      });
    } else if (open) {
      setForm({
        code: "", name: "", address: "", city: "", state: "", pincode: "",
        managerName: "", managerPhone: "", notes: "",
      });
    }
  }, [existing, open]);

  async function save() {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await updateBranch(existing.id, {
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          managerName: form.managerName.trim(),
          managerPhone: form.managerPhone.trim(),
          notes: form.notes.trim() || undefined,
        });
        toast.success("Branch updated");
      } else {
        await addBranch({
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          managerName: form.managerName.trim(),
          managerPhone: form.managerPhone.trim(),
          notes: form.notes.trim() || undefined,
          enabled: true,
          createdBy: actor,
        });
        toast.success(`Branch "${form.name}" created`);
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save branch");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Branch" : "New Branch"}</DialogTitle>
          <DialogDescription>
            {existing ? "Update branch details" : "Create a new branch. Retailers can then be assigned to it."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Branch Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="BR-KOL-001"
                className="font-mono"
                disabled={!!existing}
              />
            </div>
            <div>
              <Label className="text-xs">Branch Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Kollam Main"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Door no, street"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Pincode</Label>
              <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Manager Name</Label>
              <Input value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Manager Phone</Label>
              <Input value={form.managerPhone} onChange={(e) => setForm({ ...form, managerPhone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {existing ? "Save Changes" : "Create Branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Retailer assignment table ──────────────────────────────────────────────
function RetailerAssignmentTable({
  retailers, branches,
}: {
  retailers: Retailer[];
  branches: FinanceBranch[];
}) {
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const filtered = retailers.filter((r) =>
    !search.trim()
      ? true
      : r.name.toLowerCase().includes(search.toLowerCase())
        || r.email.toLowerCase().includes(search.toLowerCase()),
  );
  const enabledBranches = branches.filter((b) => b.enabled);

  async function reassign(retailerId: string, branchId: string) {
    setSavingId(retailerId);
    try {
      await assignRetailerToBranch(retailerId, branchId === "__none__" ? null : branchId);
      toast.success("Assignment updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update assignment");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" /> Retailer → Branch Assignments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
        />
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.name || r.email}</p>
                <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {savingId === r.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                <Select
                  value={r.branchId || "__none__"}
                  onValueChange={(v) => reassign(r.id, v)}
                  disabled={savingId === r.id}
                >
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {enabledBranches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} <span className="font-mono text-muted-foreground">({b.code})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No retailers found.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Performance leaderboard ────────────────────────────────────────────────
function PerformanceLeaderboard({
  branches, totalsByBranch,
}: {
  branches: FinanceBranch[];
  totalsByBranch: Map<string, BranchTotals>;
}) {
  const ranked = branches
    .map((b) => ({ branch: b, totals: totalsByBranch.get(b.id) || EMPTY_TOTALS }))
    .sort((a, b) => b.totals.net - a.totals.net);

  const max = Math.max(1, ...ranked.map((r) => Math.abs(r.totals.net)));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Branch Performance — Net Income Ranking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ranked.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Add branches to see performance data.</p>
        )}
        {ranked.map(({ branch: b, totals: t }, idx) => {
          const widthPct = (Math.abs(t.net) / max) * 100;
          return (
            <div key={b.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-gov-blue/10 text-gov-blue font-bold text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-semibold truncate">{b.name}</span>
                  <Badge variant="outline" className="font-mono text-[9px]">{b.code}</Badge>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-emerald-700 font-medium">↑ {formatINR(t.income)}</span>
                  <span className="text-red-700 font-medium">↓ {formatINR(t.expense)}</span>
                  <span className={`font-bold ${t.net >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {formatINR(t.net)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${t.net >= 0 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-red-500 to-red-400"}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Branch drilldown ───────────────────────────────────────────────────────
function BranchDrilldownDialog({
  branch, retailers, loans, payments, customers, totals, onClose,
}: {
  branch: FinanceBranch;
  retailers: Retailer[];
  loans: FinanceLoan[];
  payments: LoanPayment[];
  customers: FinanceCustomer[];
  totals: BranchTotals;
  onClose: () => void;
}) {
  const recentPayments = [...payments]
    .sort((a, b) => (b.collectedAt || "").localeCompare(a.collectedAt || ""))
    .slice(0, 10);

  return (
    <Dialog open onOpenChange={(b) => { if (!b) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gov-blue" />
            {branch.name}
            <Badge variant="outline" className="font-mono text-[10px]">{branch.code}</Badge>
          </DialogTitle>
          <DialogDescription>
            {branch.address}, {branch.city}, {branch.state} — {branch.pincode}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Mini label="Retailers" value={String(totals.retailers)} />
          <Mini label="Customers" value={String(totals.customers)} />
          <Mini label="Active Loans" value={String(totals.activeLoans)} />
          <Mini label="Total Loans" value={String(totals.loans)} />
          <Mini label="Disbursed" value={formatINR(totals.disbursed)} />
          <Mini label="Outstanding" value={formatINR(totals.outstanding)} />
          <Mini label="Income" value={formatINR(totals.income)} accent="text-emerald-700" />
          <Mini label="Net" value={formatINR(totals.net)} accent={totals.net >= 0 ? "text-emerald-700" : "text-red-700"} />
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2 mt-2">
            <Users className="w-4 h-4" /> Retailers ({retailers.length})
          </h4>
          {retailers.length === 0 && (
            <p className="text-xs text-muted-foreground">No retailers assigned to this branch.</p>
          )}
          <div className="space-y-1 max-h-[140px] overflow-y-auto">
            {retailers.map((r) => (
              <div key={r.id} className="flex justify-between items-center text-xs border-b py-1.5">
                <span className="truncate">{r.name || r.email}</span>
                <span className="text-muted-foreground text-[11px] truncate">{r.email}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Banknote className="w-4 h-4" /> Recent Payments
          </h4>
          {recentPayments.length === 0 && (
            <p className="text-xs text-muted-foreground">No payments recorded yet.</p>
          )}
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex justify-between items-center text-xs border-b py-1.5">
                <div>
                  <p className="font-mono text-[11px]">{p.receiptNo}</p>
                  <p className="text-muted-foreground">{p.customerName} · {p.loanNo}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-700">{formatINR(p.amount)}</p>
                  <p className="text-[10px] text-muted-foreground">{p.type} · {p.paymentMode}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

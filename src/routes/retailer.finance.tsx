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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Banknote,
  Users,
  UserPlus,
  Camera,
  Search,
  Plus,
  Trash2,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Settings as SettingsIcon,
  FileText,
  Download,
  MessageCircle,
  Loader2,
  X,
  RotateCcw,
  ListChecks,
  UploadCloud,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  type FinanceCustomer,
  type FinanceLoan,
  type LoanPayment,
  type CashEntry,
  type FinanceSettings,
  type GoldItem,
  type PaymentType,
  GOLD_PURITIES,
  PAYMENT_MODES,
  LOAN_STATUS_COLORS,
  KYC_STATUS_COLORS,
} from "@/lib/finance-types";
import {
  subscribeCustomers,
  subscribeLoans,
  subscribePayments,
  subscribeCashBook,
  subscribeFinanceSettings,
  getNextCustomerCode,
  getNextLoanNo,
  getNextReceiptNo,
  addCustomer,
  updateCustomer,
  uploadCustomerPhoto,
  uploadCustomerDoc,
  addLoan,
  recordPayment,
  closeLoan,
  renewLoan,
  addCashEntry,
  saveFinanceSettings,
  uploadSettingsAsset,
} from "@/lib/finance-firebase";
import {
  totalValuation,
  eligibleLoanAmount,
  weightedAveragePurity,
  sumWeights,
  calculateEMI,
  totalPayable,
  computeOutstanding,
  formatINR,
} from "@/lib/finance-calculations";
import {
  downloadPledgeReceipt,
  downloadPaymentReceipt,
  downloadClosureCertificate,
  downloadRenewalHistoryPdf,
} from "@/lib/finance-receipt-pdf";
import { CameraCaptureDialog } from "@/components/finance/CameraCaptureDialog";
import { SignaturePadDialog } from "@/components/finance/SignaturePadDialog";

export const Route = createFileRoute("/retailer/finance")({
  component: FinancePage,
  ssr: false,
});

function FinancePage() {
  const { appUser } = useAuth();
  const retailerId = appUser?.uid || "";
  const [customers, setCustomers] = useState<FinanceCustomer[]>([]);
  const [loans, setLoans] = useState<FinanceLoan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [cashBook, setCashBook] = useState<CashEntry[]>([]);
  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  // Cross-tab signal: when the Quick Action Bar wants to "Apply Loan",
  // we switch to the loans tab AND ask it to open its New Loan dialog.
  const [openNewLoanSignal, setOpenNewLoanSignal] = useState(0);

  // Sync tab from URL hash (e.g. #loans, #repay) so deep-links work
  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      const h = window.location.hash.replace(/^#/, "");
      if (h && ["dashboard","customers","loans","repay","closure","cashbook","reports","settings"].includes(h)) {
        setActiveTab(h);
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  useEffect(() => {
    if (!retailerId) return;
    const u1 = subscribeCustomers(retailerId, setCustomers);
    const u2 = subscribeLoans(retailerId, setLoans);
    const u3 = subscribePayments(retailerId, setPayments);
    const u4 = subscribeCashBook(retailerId, setCashBook);
    const u5 = subscribeFinanceSettings(retailerId, setSettings);
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  }, [retailerId]);

  // Live clock — banking-software touch (HH:MM:SS · DD MMM YYYY)
  // Must run before any early-return so hook order stays stable.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!appUser) return null;

  const activeCount = loans.filter((l) => l.status === "Active").length;
  const overdueCount = loans.filter((l) => l.status === "Active" && new Date(l.dueDate) < new Date()).length;

  const clockTime = now.toLocaleTimeString("en-IN", { hour12: false });
  const clockDate = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const handleApplyLoan = () => {
    setActiveTab("loans");
    // Trigger New Loan dialog inside LoansTab
    setTimeout(() => setOpenNewLoanSignal((n) => n + 1), 0);
  };
  const handleCheckStatus = () => setActiveTab("loans");
  const handleUploadDocs = () => setActiveTab("customers");
  const handleDownloadApproval = () => {
    // Try to download the most recent active loan's pledge receipt
    const latest = [...loans].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
    if (!latest || !settings) {
      toast.info("No loan available yet — apply for one first.");
      setActiveTab("loans");
      return;
    }
    const cust = customers.find((c) => c.id === latest.customerId);
    if (!cust) {
      toast.error("Customer record missing for the latest loan.");
      return;
    }
    downloadPledgeReceipt(latest, cust, settings);
  };

  return (
    <div className="container mx-auto p-4 space-y-5 max-w-7xl">
      {/* Premium banking-software header */}
      <header className="relative overflow-hidden rounded-2xl border border-gov-blue/30 bg-gradient-to-br from-[hsl(216_75%_18%)] via-gov-blue-dark to-gov-blue text-white shadow-[0_18px_50px_-20px_rgba(20,40,90,0.55)]">
        {/* subtle grid pattern */}
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

        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-inner">
                <Banknote className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-gov-blue-dark flex items-center justify-center" title="Secure session">
                  <ShieldCheck className="w-2.5 h-2.5 text-white" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    {settings?.companyName || "Bank Console"}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-400/20 border border-emerald-300/40 text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                    <ShieldCheck className="w-3 h-3" /> Secured
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-white/75 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Branch: <span className="font-semibold text-white">{settings?.branchName || "Main Branch"}</span>
                  <span className="text-white/40">·</span>
                  Operator: <span className="font-semibold text-white truncate max-w-[140px] sm:max-w-none">{appUser.email}</span>
                </p>
              </div>
            </div>

            {/* Live clock + status chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 rounded-lg bg-black/25 border border-white/15 backdrop-blur-sm font-mono text-right">
                <p className="text-base sm:text-lg font-bold leading-none tabular-nums tracking-wider">{clockTime}</p>
                <p className="text-[9px] uppercase tracking-widest text-white/60 mt-1">{clockDate}</p>
              </div>
              <div className="flex flex-col gap-1">
                <div className="px-2.5 py-1 rounded-md bg-white/12 backdrop-blur-sm border border-white/20 text-[10px] flex items-center justify-between gap-2 min-w-[88px]">
                  <span className="text-white/70 uppercase tracking-wider">Active</span>
                  <span className="font-bold text-emerald-300 tabular-nums">{activeCount}</span>
                </div>
                <div className={`px-2.5 py-1 rounded-md backdrop-blur-sm border text-[10px] flex items-center justify-between gap-2 min-w-[88px] ${
                  overdueCount > 0
                    ? "bg-red-500/30 border-red-300/40"
                    : "bg-white/12 border-white/20"
                }`}>
                  <span className="text-white/80 uppercase tracking-wider">Overdue</span>
                  <span className={`font-bold tabular-nums ${overdueCount > 0 ? "text-red-100" : "text-white"}`}>{overdueCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust strip — tricolour bank ribbon */}
        <div className="relative h-1.5 flex">
          <div className="flex-1 bg-gov-saffron" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-gov-green" />
        </div>
      </header>

      {/* Sticky Quick Action Bar — visible on every tab so users always have one-tap access */}
      <div className="sticky top-2 z-30 -mx-1">
        <div className="rounded-2xl border border-gov-blue/15 bg-card/85 backdrop-blur-md shadow-md p-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            onClick={handleApplyLoan}
            className="h-12 bg-gradient-to-br from-gov-blue to-gov-blue-dark hover:opacity-95 text-white font-bold shadow-md"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Apply Loan
          </Button>
          <Button
            onClick={handleCheckStatus}
            variant="outline"
            className="h-12 font-semibold border-gov-blue/40 text-gov-blue hover:bg-gov-blue/10"
          >
            <ListChecks className="w-4 h-4 mr-1.5" /> Check Status
          </Button>
          <Button
            onClick={handleUploadDocs}
            variant="outline"
            className="h-12 font-semibold border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            <UploadCloud className="w-4 h-4 mr-1.5" /> Upload Docs
          </Button>
          <Button
            onClick={handleDownloadApproval}
            variant="outline"
            className="h-12 font-semibold border-amber-500/40 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
          >
            <Download className="w-4 h-4 mr-1.5" /> Download Approval
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full overflow-x-auto justify-start flex-nowrap bg-gradient-to-r from-card via-card/95 to-card border border-gov-blue/15 shadow-[0_4px_18px_-8px_rgba(20,40,90,0.18)] p-1 rounded-xl gap-0.5 h-auto">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-gov-blue data-[state=active]:text-white data-[state=active]:shadow-md font-medium">Dashboard</TabsTrigger>
          <TabsTrigger value="customers" className="data-[state=active]:bg-gov-blue data-[state=active]:text-white data-[state=active]:shadow-md font-medium">Customers</TabsTrigger>
          <TabsTrigger value="loans" className="data-[state=active]:bg-gov-blue data-[state=active]:text-white data-[state=active]:shadow-md font-medium">Loans</TabsTrigger>
          <TabsTrigger value="repay" className="data-[state=active]:bg-gov-blue data-[state=active]:text-white data-[state=active]:shadow-md font-medium">Repayments</TabsTrigger>
          <TabsTrigger value="closure" className="data-[state=active]:bg-gov-blue data-[state=active]:text-white data-[state=active]:shadow-md font-medium">Closure</TabsTrigger>
          <TabsTrigger value="cashbook" className="data-[state=active]:bg-gov-blue data-[state=active]:text-white data-[state=active]:shadow-md font-medium">Cash Book</TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-gov-blue data-[state=active]:text-white data-[state=active]:shadow-md font-medium">Reports</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-gov-blue data-[state=active]:text-white data-[state=active]:shadow-md font-medium">
            <SettingsIcon className="w-3.5 h-3.5 mr-1" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab
            loans={loans}
            payments={payments}
            customers={customers}
            onNavigate={setActiveTab}
          />
        </TabsContent>
        <TabsContent value="customers">
          <CustomersTab
            retailerId={retailerId}
            customers={customers}
            loans={loans}
            settings={settings}
            createdBy={appUser.email}
          />
        </TabsContent>
        <TabsContent value="loans">
          <LoansTab
            retailerId={retailerId}
            customers={customers}
            loans={loans}
            settings={settings}
            createdBy={appUser.email}
            openNewLoanSignal={openNewLoanSignal}
          />
        </TabsContent>
        <TabsContent value="repay">
          <RepaymentsTab
            retailerId={retailerId}
            loans={loans}
            customers={customers}
            settings={settings}
            collectedBy={appUser.email}
          />
        </TabsContent>
        <TabsContent value="closure">
          <ClosureTab
            retailerId={retailerId}
            loans={loans}
            customers={customers}
            settings={settings}
          />
        </TabsContent>
        <TabsContent value="cashbook">
          <CashBookTab
            retailerId={retailerId}
            cashBook={cashBook}
            payments={payments}
            enteredBy={appUser.email}
          />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab loans={loans} payments={payments} customers={customers} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab
            retailerId={retailerId}
            settings={settings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────────────────────
function DashboardTab({
  loans,
  payments,
  customers,
  onNavigate,
}: {
  loans: FinanceLoan[];
  payments: LoanPayment[];
  customers: FinanceCustomer[];
  onNavigate: (tab: string) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const todayCollection = payments
    .filter((p) => p.collectedAt?.startsWith(today))
    .reduce((s, p) => s + p.amount, 0);
  const active = loans.filter((l) => l.status === "Active").length;
  const closed = loans.filter((l) => l.status === "Closed").length;
  const overdue = loans.filter(
    (l) => l.status === "Active" && new Date(l.dueDate) < new Date(),
  ).length;
  const totalDisbursed = loans.reduce((s, l) => s + l.loanAmount, 0);
  const totalOutstanding = loans
    .filter((l) => l.status === "Active")
    .reduce((s, l) => s + l.outstandingPrincipal, 0);
  const goldStock = loans
    .filter((l) => l.status === "Active")
    .reduce((s, l) => s + l.totalNetWeight, 0);

  const cards = [
    { label: "Today Collection", value: formatINR(todayCollection), icon: Wallet, gradient: "from-emerald-500 to-green-600", glow: "shadow-emerald-500/20" },
    { label: "Active Loans", value: String(active), icon: Banknote, gradient: "from-gov-blue to-gov-blue-dark", glow: "shadow-blue-500/20" },
    { label: "Overdue", value: String(overdue), icon: AlertTriangle, gradient: "from-red-500 to-rose-600", glow: "shadow-red-500/20" },
    { label: "Closed Loans", value: String(closed), icon: CheckCircle2, gradient: "from-teal-500 to-emerald-600", glow: "shadow-teal-500/20" },
    { label: "Customers", value: String(customers.length), icon: Users, gradient: "from-purple-500 to-fuchsia-600", glow: "shadow-purple-500/20" },
    { label: "Disbursed", value: formatINR(totalDisbursed), icon: TrendingUp, gradient: "from-indigo-500 to-blue-600", glow: "shadow-indigo-500/20" },
    { label: "Outstanding", value: formatINR(totalOutstanding), icon: Clock, gradient: "from-amber-500 to-orange-600", glow: "shadow-amber-500/20" },
    { label: "Gold Stock", value: `${goldStock.toFixed(2)} g`, icon: Banknote, gradient: "from-gov-saffron to-yellow-600", glow: "shadow-yellow-500/20" },
  ];

  // Quick action tiles for easy navigation between tabs
  const quickActions = [
    { label: "New Customer", desc: "KYC & photo", icon: UserPlus, tab: "customers", accent: "from-purple-500/15 to-fuchsia-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300" },
    { label: "New Loan", desc: "Pledge gold", icon: Plus, tab: "loans", accent: "from-gov-blue/15 to-blue-500/10 border-gov-blue/30 text-gov-blue dark:text-blue-300" },
    { label: "Collect EMI", desc: "Record payment", icon: Receipt, tab: "repay", accent: "from-emerald-500/15 to-green-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" },
    { label: "Cash Book", desc: "Daily entries", icon: Wallet, tab: "cashbook", accent: "from-amber-500/15 to-orange-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300" },
    { label: "Reports", desc: "Analytics", icon: FileText, tab: "reports", accent: "from-indigo-500/15 to-blue-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300" },
    { label: "Closure", desc: "Release gold", icon: CheckCircle2, tab: "closure", accent: "from-teal-500/15 to-emerald-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300" },
  ];

  const goToTab = (tab: string) => onNavigate(tab);

  // Recent payments for mini activity feed
  const recentPayments = [...payments]
    .sort((a, b) => (b.collectedAt || "").localeCompare(a.collectedAt || ""))
    .slice(0, 5);

  // Mini-report: due-soon (next 7 days)
  const today2 = new Date();
  const in7 = new Date(today2.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dueSoon = loans
    .filter((l) => l.status === "Active" && new Date(l.dueDate) >= today2 && new Date(l.dueDate) <= in7)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  return (
    <div className="space-y-5 mt-4">
      {/* Premium gradient stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card
            key={c.label}
            className={`relative overflow-hidden border-0 shadow-lg ${c.glow} hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-95`} />
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/15 blur-2xl group-hover:bg-white/25 transition-all" />
            <CardContent className="relative p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <c.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-[11px] uppercase tracking-wide text-white/85 font-medium">{c.label}</p>
              <p className="text-xl font-bold mt-0.5 drop-shadow-sm">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions — easy navigation */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-1 h-5 bg-gradient-to-b from-gov-blue to-gov-saffron rounded-full" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {quickActions.map((a) => (
              <button
                key={a.tab}
                onClick={() => goToTab(a.tab)}
                className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${a.accent} p-3 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-white/70 dark:bg-white/10 flex items-center justify-center shadow-sm">
                    <a.icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-sm font-semibold leading-tight">{a.label}</p>
                <p className="text-[11px] opacity-75 mt-0.5">{a.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two-column: Recent loans + Mini reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-1 h-5 bg-gov-blue rounded-full" />
              Recent Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loans.slice(0, 6).map((l) => {
                const isOverdue = l.status === "Active" && new Date(l.dueDate) < new Date();
                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-gradient-to-r from-card to-muted/20 hover:border-gov-blue/40 hover:shadow-sm transition-all"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{l.loanNo} · {l.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatINR(l.loanAmount)} · {l.totalNetWeight.toFixed(2)}g · Due{" "}
                        {new Date(l.dueDate).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <Badge variant="outline" className={LOAN_STATUS_COLORS[isOverdue ? "Overdue" : l.status]}>
                      {isOverdue ? "Overdue" : l.status}
                    </Badge>
                  </div>
                );
              })}
              {loans.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No loans yet. Tap “New Loan” above to get started.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Due Soon mini-report */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-1 h-5 bg-gov-saffron rounded-full" />
                Due in 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {dueSoon.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-xs p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
                    <div>
                      <p className="font-semibold">{l.loanNo} · {l.customerName}</p>
                      <p className="text-muted-foreground">{formatINR(l.outstandingPrincipal)} outstanding</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                      {new Date(l.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </Badge>
                  </div>
                ))}
                {dueSoon.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No loans due in the next 7 days.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent payments */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-1 h-5 bg-gov-green rounded-full" />
                Latest Collections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded-md hover:bg-muted/40 transition-colors">
                    <div>
                      <p className="font-semibold">{p.receiptNo} · {p.customerName}</p>
                      <p className="text-muted-foreground">{p.type} · {p.paymentMode}</p>
                    </div>
                    <span className="font-bold text-emerald-600">+{formatINR(p.amount)}</span>
                  </div>
                ))}
                {recentPayments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No payments collected yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// CUSTOMERS
// ──────────────────────────────────────────────────────────────────────────
function CustomersTab({
  retailerId,
  customers,
  loans,
  settings,
  createdBy,
}: {
  retailerId: string;
  customers: FinanceCustomer[];
  loans: FinanceLoan[];
  settings: FinanceSettings | null;
  createdBy: string;
}) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [viewing, setViewing] = useState<FinanceCustomer | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.fullName?.toLowerCase().includes(q) ||
        c.mobile?.includes(q) ||
        c.aadhaarNo?.includes(q) ||
        c.customerCode?.toLowerCase().includes(q),
    );
  }, [customers, search]);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, mobile, Aadhaar, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <UserPlus className="w-4 h-4 mr-1" /> New Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c) => (
          <Card key={c.id} className="cursor-pointer hover:border-gov-blue" onClick={() => setViewing(c)}>
            <CardContent className="p-4 flex gap-3">
              {c.photoUrl ? (
                <img src={c.photoUrl} alt={c.fullName} className="w-16 h-16 rounded-full object-cover border" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{c.fullName}</p>
                <p className="text-xs text-muted-foreground">{c.customerCode}</p>
                <p className="text-xs">{c.mobile}</p>
                <Badge variant="outline" className={`${KYC_STATUS_COLORS[c.kycStatus]} text-[10px] mt-1`}>
                  KYC: {c.kycStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">
            No customers found.
          </p>
        )}
      </div>

      <AddCustomerDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        retailerId={retailerId}
        createdBy={createdBy}
      />
      <CustomerDetailDialog
        customer={viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        retailerId={retailerId}
        loans={loans}
        settings={settings}
      />
    </div>
  );
}

function AddCustomerDialog({
  open,
  onOpenChange,
  retailerId,
  createdBy,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  retailerId: string;
  createdBy: string;
}) {
  const { appUser: authUser } = useAuth();
  const branchId = authUser?.financeBranchId ?? null;
  const [form, setForm] = useState({
    fullName: "", mobile: "", altMobile: "", address: "", aadhaarNo: "", panNo: "", notes: "",
  });
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [showCam, setShowCam] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setForm({ fullName: "", mobile: "", altMobile: "", address: "", aadhaarNo: "", panNo: "", notes: "" });
    setPhotoData(null);
  }

  async function save() {
    if (!form.fullName.trim() || !form.mobile.trim() || !form.aadhaarNo.trim()) {
      toast.error("Name, mobile, and Aadhaar are required");
      return;
    }
    if (!photoData) {
      toast.error("Customer photo is required (use camera capture)");
      return;
    }
    setSaving(true);
    try {
      const code = await getNextCustomerCode(retailerId);
      const now = new Date().toISOString();
      const id = await addCustomer({
        retailerId,
        branchId,
        customerCode: code,
        fullName: form.fullName.trim(),
        mobile: form.mobile.trim(),
        altMobile: form.altMobile.trim() || undefined,
        address: form.address.trim(),
        aadhaarNo: form.aadhaarNo.trim(),
        panNo: form.panNo.trim() || undefined,
        kycStatus: "Pending",
        notes: form.notes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        createdBy,
      });
      const photoUrl = await uploadCustomerPhoto(retailerId, id, photoData);
      await updateCustomer(id, { photoUrl });
      toast.success(`Customer ${code} created`);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (!b) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Customer</DialogTitle>
            <DialogDescription>Add a new customer with KYC details and camera photo.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 flex flex-col items-center gap-2">
              {photoData ? (
                <img src={photoData} alt="captured" className="w-32 h-32 rounded-full object-cover border-2 border-gov-blue" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowCam(true)}>
                <Camera className="w-4 h-4 mr-1" /> {photoData ? "Retake" : "Capture Photo"}
              </Button>
            </div>

            <div className="sm:col-span-2 space-y-3">
              <Field label="Full Name *" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Mobile *" value={form.mobile} onChange={(v) => setForm({ ...form, mobile: v })} />
                <Field label="Alt Mobile" value={form.altMobile} onChange={(v) => setForm({ ...form, altMobile: v })} />
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Aadhaar No *" value={form.aadhaarNo} onChange={(v) => setForm({ ...form, aadhaarNo: v })} />
                <Field label="PAN No" value={form.panNo} onChange={(v) => setForm({ ...form, panNo: v })} />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Save Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CameraCaptureDialog
        open={showCam}
        onOpenChange={setShowCam}
        onCapture={setPhotoData}
        title="Capture Customer Photo"
      />
    </>
  );
}

function CustomerDetailDialog({
  customer,
  onOpenChange,
  retailerId,
  loans,
  settings,
}: {
  customer: FinanceCustomer | null;
  onOpenChange: (open: boolean) => void;
  retailerId: string;
  loans: FinanceLoan[];
  settings: FinanceSettings | null;
}) {
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const customerLoans = useMemo(
    () => (customer ? loans.filter((l) => l.customerId === customer.id) : []),
    [loans, customer],
  );
  const renewalChains = useMemo(() => buildRenewalChains(customerLoans), [customerLoans]);

  async function uploadDoc(kind: "aadhaarFront" | "aadhaarBack" | "pan", file: File) {
    if (!customer) return;
    setUploadingDoc(kind);
    try {
      const url = await uploadCustomerDoc(retailerId, customer.id, kind, file);
      await updateCustomer(customer.id, { [`${kind}Url`]: url } as any);
      toast.success("Document uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploadingDoc(null);
    }
  }

  async function setKyc(status: "Verified" | "Rejected") {
    if (!customer) return;
    await updateCustomer(customer.id, { kycStatus: status });
    toast.success(`KYC ${status}`);
  }

  if (!customer) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer.fullName}</DialogTitle>
          <DialogDescription>{customer.customerCode} · {customer.mobile}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-2">
            {customer.photoUrl && (
              <img src={customer.photoUrl} className="w-32 h-32 rounded-full object-cover border-2 border-gov-blue" />
            )}
            <Badge variant="outline" className={KYC_STATUS_COLORS[customer.kycStatus]}>
              KYC: {customer.kycStatus}
            </Badge>
            {customer.kycStatus === "Pending" && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setKyc("Verified")}>Verify</Button>
                <Button size="sm" variant="outline" onClick={() => setKyc("Rejected")}>Reject</Button>
              </div>
            )}
          </div>

          <div className="sm:col-span-2 space-y-2 text-sm">
            <Info label="Aadhaar" value={customer.aadhaarNo} />
            {customer.panNo && <Info label="PAN" value={customer.panNo} />}
            {customer.altMobile && <Info label="Alt Mobile" value={customer.altMobile} />}
            <Info label="Address" value={customer.address || "—"} />
            {customer.notes && <Info label="Notes" value={customer.notes} />}
          </div>
        </div>

        <div className="border-t pt-3">
          <p className="text-sm font-semibold mb-2">Documents</p>
          <div className="grid grid-cols-3 gap-2">
            {(["aadhaarFront", "aadhaarBack", "pan"] as const).map((k) => {
              const url = (customer as any)[`${k}Url`];
              return (
                <div key={k} className="border rounded-md p-2">
                  <p className="text-xs font-medium mb-1">
                    {k === "aadhaarFront" ? "Aadhaar Front" : k === "aadhaarBack" ? "Aadhaar Back" : "PAN"}
                  </p>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                      View
                    </a>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadDoc(k, e.target.files[0])}
                      />
                      <span className="text-xs text-blue-600 underline">
                        {uploadingDoc === k ? "Uploading..." : "Upload"}
                      </span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Loan & Renewal History */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Loan & Renewal History
            </p>
            {renewalChains.length > 0 && settings && customer && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadRenewalHistoryPdf(customer, renewalChains, settings)}
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Export PDF
              </Button>
            )}
          </div>
          {renewalChains.length === 0 ? (
            <p className="text-xs text-muted-foreground">No loans yet for this customer.</p>
          ) : (
            <div className="space-y-3">
              {renewalChains.map((chain, idx) => (
                <RenewalChainTimeline key={chain[0].id} chain={chain} index={idx} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Renewal-chain helpers ─────────────────────────────────────────────────
/**
 * Group a customer's loans into renewal chains. Each chain is an ordered list
 * starting from the original loan (no `renewedFromLoanId`) and following
 * `renewedToLoanId` until it ends. Standalone loans become single-item chains.
 */
function buildRenewalChains(loans: FinanceLoan[]): FinanceLoan[][] {
  const byId = new Map(loans.map((l) => [l.id, l]));
  const chains: FinanceLoan[][] = [];
  const seen = new Set<string>();
  // Roots: loans with no parent renewal link
  const roots = loans
    .filter((l) => !l.renewedFromLoanId || !byId.has(l.renewedFromLoanId))
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  for (const root of roots) {
    const chain: FinanceLoan[] = [];
    let cur: FinanceLoan | undefined = root;
    while (cur && !seen.has(cur.id)) {
      chain.push(cur);
      seen.add(cur.id);
      cur = cur.renewedToLoanId ? byId.get(cur.renewedToLoanId) : undefined;
    }
    chains.push(chain);
  }
  // Newest chain (latest loan) first
  chains.sort(
    (a, b) =>
      (b[b.length - 1].createdAt || "").localeCompare(a[a.length - 1].createdAt || ""),
  );
  return chains;
}

function RenewalChainTimeline({ chain, index }: { chain: FinanceLoan[]; index: number }) {
  const isRenewalChain = chain.length > 1;
  return (
    <div className="border rounded-md p-3 bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold">
          {isRenewalChain ? `Renewal Chain #${index + 1}` : `Loan #${index + 1}`}
          <span className="ml-2 text-muted-foreground font-normal">
            {isRenewalChain ? `${chain.length} loans` : "standalone"}
          </span>
        </p>
        <Badge variant="outline" className={LOAN_STATUS_COLORS[chain[chain.length - 1].status]}>
          Current: {chain[chain.length - 1].status}
        </Badge>
      </div>

      <ol className="relative border-l-2 border-gov-blue/30 ml-2 space-y-3">
        {chain.map((loan, i) => {
          const isLast = i === chain.length - 1;
          const isFirst = i === 0;
          return (
            <li key={loan.id} className="ml-4 relative">
              <span
                className={`absolute -left-[1.45rem] top-1 w-3 h-3 rounded-full border-2 ${
                  isLast
                    ? "bg-gov-blue border-gov-blue"
                    : "bg-background border-gov-blue/60"
                }`}
              />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-bold text-sm">{loan.loanNo}</span>
                <Badge
                  variant="outline"
                  className={`${LOAN_STATUS_COLORS[loan.status]} text-[10px] py-0 px-1.5`}
                >
                  {loan.status}
                </Badge>
                {isFirst && isRenewalChain && (
                  <span className="text-[10px] text-muted-foreground">(original)</span>
                )}
                {isLast && isRenewalChain && (
                  <span className="text-[10px] text-muted-foreground">(latest)</span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-0.5 mt-1 text-[11px]">
                <span><span className="text-muted-foreground">Loan:</span> <strong>{formatINR(loan.loanAmount)}</strong></span>
                <span><span className="text-muted-foreground">Rate:</span> {loan.interestRate}% · {loan.tenureMonths}m</span>
                <span><span className="text-muted-foreground">Date:</span> {new Date(loan.loanDate).toLocaleDateString("en-IN")}</span>
                <span>
                  <span className="text-muted-foreground">
                    {loan.status === "Active" ? "Outstanding:" : loan.status === "Closed" ? "Closed:" : "Renewed:"}
                  </span>{" "}
                  {loan.status === "Active"
                    ? formatINR(loan.outstandingPrincipal)
                    : loan.status === "Closed"
                      ? loan.releasedAt
                        ? new Date(loan.releasedAt).toLocaleDateString("en-IN")
                        : "—"
                      : loan.renewedAt
                        ? new Date(loan.renewedAt).toLocaleDateString("en-IN")
                        : "—"}
                </span>
              </div>
              {!isLast && (
                <div className="mt-1.5 text-[11px] text-gov-blue flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> renewed →
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// LOANS — New loan entry with gold items
// ──────────────────────────────────────────────────────────────────────────
function LoansTab({
  retailerId,
  customers,
  loans,
  settings,
  createdBy,
  openNewLoanSignal,
}: {
  retailerId: string;
  customers: FinanceCustomer[];
  loans: FinanceLoan[];
  settings: FinanceSettings | null;
  createdBy: string;
  openNewLoanSignal?: number;
}) {
  const [showNew, setShowNew] = useState(false);
  const [renewing, setRenewing] = useState<FinanceLoan | null>(null);
  const [search, setSearch] = useState("");

  // Open the New Loan dialog whenever the parent bumps the signal counter
  useEffect(() => {
    if (openNewLoanSignal && openNewLoanSignal > 0) setShowNew(true);
  }, [openNewLoanSignal]);

  const filtered = useMemo(() => {
    if (!search.trim()) return loans;
    const q = search.toLowerCase();
    return loans.filter(
      (l) => l.loanNo?.toLowerCase().includes(q) || l.customerName?.toLowerCase().includes(q),
    );
  }, [loans, search]);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search by loan no or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Gold Loan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((l) => {
          const cust = customers.find((c) => c.id === l.customerId);
          const isOverdue = l.status === "Active" && new Date(l.dueDate) < new Date();
          return (
            <Card key={l.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-base">{l.loanNo}</p>
                    <p className="text-sm">{l.customerName}</p>
                    <p className="text-xs text-muted-foreground">{l.customerMobile}</p>
                  </div>
                  <Badge variant="outline" className={LOAN_STATUS_COLORS[isOverdue ? "Overdue" : l.status]}>
                    {isOverdue ? "Overdue" : l.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-xs">
                  <Stat label="Loan" value={formatINR(l.loanAmount)} />
                  <Stat label="EMI" value={formatINR(l.monthlyEmi)} />
                  <Stat label="Net Wt" value={`${l.totalNetWeight.toFixed(2)}g`} />
                  <Stat label="Outstanding" value={formatINR(l.outstandingPrincipal)} />
                  <Stat label="Loan Date" value={new Date(l.loanDate).toLocaleDateString("en-IN")} />
                  <Stat label="Due" value={new Date(l.dueDate).toLocaleDateString("en-IN")} />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {settings && cust && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadPledgeReceipt(l, cust, settings)}
                    >
                      <Receipt className="w-3.5 h-3.5 mr-1" /> Pledge PDF
                    </Button>
                  )}
                  {l.status === "Active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRenewing(l)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Renew
                    </Button>
                  )}
                  {cust && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(
                          `https://wa.me/${cust.mobile.replace(/\D/g, "")}?text=${encodeURIComponent(
                            `Hi ${cust.fullName}, your loan ${l.loanNo} of ${formatINR(l.loanAmount)} is due on ${new Date(l.dueDate).toLocaleDateString("en-IN")}.`,
                          )}`,
                          "_blank",
                        )
                      }
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                    </Button>
                  )}
                  {l.renewedToLoanNo && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                      → {l.renewedToLoanNo}
                    </Badge>
                  )}
                  {l.renewedFromLoanNo && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                      ← {l.renewedFromLoanNo}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted-foreground py-8">No loans yet.</p>
        )}
      </div>

      <NewLoanDialog
        open={showNew}
        onOpenChange={setShowNew}
        retailerId={retailerId}
        customers={customers}
        settings={settings}
        createdBy={createdBy}
      />

      {renewing && (
        <RenewLoanDialog
          oldLoan={renewing}
          settings={settings}
          retailerId={retailerId}
          actor={createdBy}
          onClose={() => setRenewing(null)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// RENEW LOAN — settle interest+penalty on old loan, open a fresh one against same gold
// ──────────────────────────────────────────────────────────────────────────
function RenewLoanDialog({
  oldLoan,
  settings,
  retailerId,
  actor,
  onClose,
}: {
  oldLoan: FinanceLoan;
  settings: FinanceSettings | null;
  retailerId: string;
  actor: string;
  onClose: () => void;
}) {
  const due = useMemo(() => computeOutstanding(oldLoan), [oldLoan]);

  // Settlement of old loan
  const [interestPaid, setInterestPaid] = useState<number>(due.interest);
  const [penaltyPaid, setPenaltyPaid] = useState<number>(due.penalty);
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Bank">("Cash");
  const [paymentReference, setPaymentReference] = useState("");

  // New loan terms — default to old loan's terms but editable
  const [newRatePerGram, setNewRatePerGram] = useState<number>(
    settings?.defaultGoldRatePerGram || oldLoan.marketRatePerGram,
  );
  const [newLtv, setNewLtv] = useState<number>(
    settings?.defaultLtvPercent || oldLoan.ltvPercent,
  );
  const [newInterestRate, setNewInterestRate] = useState<number>(
    settings?.defaultInterestRate || oldLoan.interestRate,
  );
  const [newTenureMonths, setNewTenureMonths] = useState<number>(oldLoan.tenureMonths);
  const [newLoanAmount, setNewLoanAmount] = useState<number>(oldLoan.loanAmount);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const newValuation = useMemo(
    () => totalValuation(oldLoan.goldItems, newRatePerGram),
    [oldLoan.goldItems, newRatePerGram],
  );
  const eligible = useMemo(
    () => eligibleLoanAmount(oldLoan.goldItems, newRatePerGram, newLtv),
    [oldLoan.goldItems, newRatePerGram, newLtv],
  );
  const newEmi = useMemo(
    () => calculateEMI(newLoanAmount, newInterestRate, newTenureMonths),
    [newLoanAmount, newInterestRate, newTenureMonths],
  );
  const newPayable = totalPayable(newEmi, newTenureMonths);
  const settlementTotal = interestPaid + penaltyPaid;

  async function submit() {
    if (newLoanAmount <= 0) return toast.error("New loan amount must be positive");
    if (newLoanAmount > eligible)
      return toast.error(`New loan exceeds eligible ${formatINR(eligible)}`);
    if (interestPaid < 0 || penaltyPaid < 0)
      return toast.error("Settlement amounts cannot be negative");

    setSaving(true);
    try {
      const result = await renewLoan({
        oldLoan,
        retailerId,
        interestPaid,
        penaltyPaid,
        principalCarryOver: oldLoan.outstandingPrincipal,
        paymentMode,
        paymentReference,
        newLoanAmount,
        newInterestRate,
        newTenureMonths,
        newMarketRatePerGram: newRatePerGram,
        newLtvPercent: newLtv,
        newGoldValuation: newValuation,
        newMonthlyEmi: newEmi,
        newTotalPayable: newPayable,
        remarks,
        actor,
      });
      toast.success(
        `Renewed: ${oldLoan.loanNo} → ${result.newLoanNo} · Receipt ${result.receiptNo}`,
      );
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Renewal failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Renew Loan · {oldLoan.loanNo}</DialogTitle>
          <DialogDescription>
            Settle interest & penalty on the old loan, then open a fresh loan against the
            same {oldLoan.totalNetWeight.toFixed(2)}g of gold.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Old loan summary */}
          <div className="border rounded-md p-3 bg-muted/30">
            <p className="text-xs font-semibold mb-2">Old Loan Settlement</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <Stat label="Outstanding" value={formatINR(due.principal)} />
              <Stat label="Interest Due" value={formatINR(due.interest)} />
              <Stat label="Penalty" value={formatINR(due.penalty)} />
              <Stat label="Total Due" value={formatINR(due.totalDue)} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <NumField label="Interest Collected" value={interestPaid} onChange={setInterestPaid} />
              <NumField label="Penalty Collected" value={penaltyPaid} onChange={setPenaltyPaid} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label className="text-xs">Payment Mode</Label>
                <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Reference (optional)" value={paymentReference} onChange={setPaymentReference} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Settlement receipt: <strong>{formatINR(settlementTotal)}</strong>
              {oldLoan.outstandingPrincipal > 0 && (
                <> · Principal carried to new loan: <strong>{formatINR(oldLoan.outstandingPrincipal)}</strong></>
              )}
            </p>
          </div>

          {/* New loan terms */}
          <div className="border rounded-md p-3">
            <p className="text-xs font-semibold mb-2">New Loan Terms</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <NumField label="Rate ₹/g (24k)" value={newRatePerGram} onChange={setNewRatePerGram} />
              <NumField label="LTV %" value={newLtv} onChange={setNewLtv} />
              <NumField label="Interest % p.a." value={newInterestRate} onChange={setNewInterestRate} />
              <NumField label="Tenure (months)" value={newTenureMonths} onChange={setNewTenureMonths} />
            </div>
            <div className="bg-muted/40 rounded-md p-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mt-3">
              <Stat label="Re-Valuation" value={formatINR(newValuation)} />
              <Stat label="Eligible" value={formatINR(eligible)} />
              <Stat label="Net Wt" value={`${oldLoan.totalNetWeight.toFixed(2)}g`} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              <NumField label="New Loan Amount" value={newLoanAmount} onChange={setNewLoanAmount} />
              <Stat label="Monthly EMI" value={formatINR(newEmi)} />
              <Stat label="Total Payable" value={formatINR(newPayable)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder={`Renewed from ${oldLoan.loanNo}`} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            <RotateCcw className="w-4 h-4 mr-1" /> Renew Loan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewLoanDialog({
  open,
  onOpenChange,
  retailerId,
  customers,
  settings,
  createdBy,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  retailerId: string;
  customers: FinanceCustomer[];
  settings: FinanceSettings | null;
  createdBy: string;
}) {
  const { appUser: authUser } = useAuth();
  const branchId = authUser?.financeBranchId ?? null;
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<GoldItem[]>([
    { id: crypto.randomUUID(), itemName: "", count: 1, grossWeight: 0, netWeight: 0, stoneWeight: 0, purity: 22 },
  ]);
  const [ratePerGram, setRatePerGram] = useState(settings?.defaultGoldRatePerGram || 6500);
  const [ltv, setLtv] = useState(settings?.defaultLtvPercent || 75);
  const [interestRate, setInterestRate] = useState(settings?.defaultInterestRate || 12);
  const [tenureMonths, setTenureMonths] = useState(12);
  const [loanAmount, setLoanAmount] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setRatePerGram(settings.defaultGoldRatePerGram);
      setLtv(settings.defaultLtvPercent);
      setInterestRate(settings.defaultInterestRate);
    }
  }, [settings]);

  const valuation = useMemo(() => totalValuation(items, ratePerGram), [items, ratePerGram]);
  const eligible = useMemo(() => eligibleLoanAmount(items, ratePerGram, ltv), [items, ratePerGram, ltv]);
  const weights = useMemo(() => sumWeights(items), [items]);
  const avgPurity = useMemo(() => weightedAveragePurity(items), [items]);
  const emi = useMemo(() => calculateEMI(loanAmount, interestRate, tenureMonths), [loanAmount, interestRate, tenureMonths]);
  const payable = totalPayable(emi, tenureMonths);

  useEffect(() => {
    if (loanAmount === 0 && eligible > 0) setLoanAmount(eligible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible]);

  function addItem() {
    setItems([...items, { id: crypto.randomUUID(), itemName: "", count: 1, grossWeight: 0, netWeight: 0, stoneWeight: 0, purity: 22 }]);
  }
  function removeItem(id: string) {
    setItems(items.filter((i) => i.id !== id));
  }
  function updateItem(id: string, patch: Partial<GoldItem>) {
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function save() {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return toast.error("Select a customer");
    if (items.some((i) => !i.itemName.trim() || i.netWeight <= 0))
      return toast.error("Fill all gold item names and net weights");
    if (loanAmount <= 0) return toast.error("Loan amount must be positive");
    if (loanAmount > eligible)
      return toast.error(`Loan amount exceeds eligible ${formatINR(eligible)}`);

    setSaving(true);
    try {
      const loanNo = await getNextLoanNo(retailerId);
      const now = new Date().toISOString();
      const due = new Date();
      due.setMonth(due.getMonth() + tenureMonths);
      await addLoan({
        retailerId,
        branchId,
        loanNo,
        customerId: customer.id,
        customerName: customer.fullName,
        customerMobile: customer.mobile,
        goldItems: items,
        totalGrossWeight: weights.gross,
        totalNetWeight: weights.net,
        averagePurity: avgPurity,
        marketRatePerGram: ratePerGram,
        goldValuation: valuation,
        ltvPercent: ltv,
        loanAmount,
        interestRate,
        tenureMonths,
        loanDate: now,
        dueDate: due.toISOString(),
        monthlyEmi: emi,
        totalPayable: payable,
        status: "Active",
        totalPaid: 0,
        outstandingPrincipal: loanAmount,
        remarks: remarks.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        createdBy,
      });
      toast.success(`Loan ${loanNo} created`);
      onOpenChange(false);
      // reset
      setCustomerId("");
      setItems([{ id: crypto.randomUUID(), itemName: "", count: 1, grossWeight: 0, netWeight: 0, stoneWeight: 0, purity: 22 }]);
      setLoanAmount(0);
      setRemarks("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create loan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Gold Loan</DialogTitle>
          <DialogDescription>Enter pledged gold items and loan terms.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.customerCode} · {c.fullName} · {c.mobile}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Gold Items</p>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
              </Button>
            </div>
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-3">
                  <Label className="text-[11px]">Item Name</Label>
                  <Input value={it.itemName} onChange={(e) => updateItem(it.id, { itemName: e.target.value })} placeholder="Chain, Ring..." />
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <Label className="text-[11px]">Qty</Label>
                  <Input type="number" min={1} value={it.count} onChange={(e) => updateItem(it.id, { count: +e.target.value })} />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <Label className="text-[11px]">Gross (g)</Label>
                  <Input type="number" step="0.01" value={it.grossWeight} onChange={(e) => updateItem(it.id, { grossWeight: +e.target.value })} />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <Label className="text-[11px]">Net (g)</Label>
                  <Input type="number" step="0.01" value={it.netWeight} onChange={(e) => updateItem(it.id, { netWeight: +e.target.value })} />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <Label className="text-[11px]">Stone (g)</Label>
                  <Input type="number" step="0.01" value={it.stoneWeight} onChange={(e) => updateItem(it.id, { stoneWeight: +e.target.value })} />
                </div>
                <div className="col-span-9 sm:col-span-1">
                  <Label className="text-[11px]">Carat</Label>
                  <Select value={String(it.purity)} onValueChange={(v) => updateItem(it.id, { purity: +v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GOLD_PURITIES.map((p) => <SelectItem key={p} value={String(p)}>{p}k</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <Button size="sm" variant="ghost" onClick={() => removeItem(it.id)} disabled={items.length === 1}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <NumField label="Rate ₹/g (24k)" value={ratePerGram} onChange={setRatePerGram} />
            <NumField label="LTV %" value={ltv} onChange={setLtv} />
            <NumField label="Interest % p.a." value={interestRate} onChange={setInterestRate} />
            <NumField label="Tenure (months)" value={tenureMonths} onChange={setTenureMonths} />
          </div>

          <div className="bg-muted/40 rounded-md p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Stat label="Net Weight" value={`${weights.net.toFixed(2)}g`} />
            <Stat label="Avg Purity" value={`${avgPurity}k`} />
            <Stat label="Valuation" value={formatINR(valuation)} />
            <Stat label="Eligible" value={formatINR(eligible)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <NumField label="Loan Amount *" value={loanAmount} onChange={setLoanAmount} />
            <Stat label="Monthly EMI" value={formatINR(emi)} />
            <Stat label="Total Payable" value={formatINR(payable)} />
          </div>

          <div>
            <Label className="text-xs">Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Create Loan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// REPAYMENTS
// ──────────────────────────────────────────────────────────────────────────
function RepaymentsTab({
  retailerId,
  loans,
  customers,
  settings,
  collectedBy,
}: {
  retailerId: string;
  loans: FinanceLoan[];
  customers: FinanceCustomer[];
  settings: FinanceSettings | null;
  collectedBy: string;
}) {
  const activeLoans = loans.filter((l) => l.status === "Active");
  const [selectedLoan, setSelectedLoan] = useState<FinanceLoan | null>(null);

  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-muted-foreground">Collect EMI, partial payment, or full settlement.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {activeLoans.map((l) => {
          const due = computeOutstanding(l);
          return (
            <Card key={l.id}>
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold">{l.loanNo}</p>
                    <p className="text-sm">{l.customerName}</p>
                  </div>
                  {due.isOverdue && <Badge variant="outline" className="bg-red-100 text-red-800">OVERDUE</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                  <Stat label="Outstanding" value={formatINR(due.principal)} />
                  <Stat label="Interest" value={formatINR(due.interest)} />
                  <Stat label="Penalty" value={formatINR(due.penalty)} />
                  <Stat label="Total Due" value={formatINR(due.totalDue)} />
                </div>
                <Button size="sm" className="mt-3 w-full" onClick={() => setSelectedLoan(l)}>
                  <Wallet className="w-4 h-4 mr-1" /> Collect Payment
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {activeLoans.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted-foreground py-8">No active loans.</p>
        )}
      </div>

      {selectedLoan && (
        <CollectPaymentDialog
          loan={selectedLoan}
          customer={customers.find((c) => c.id === selectedLoan.customerId)}
          settings={settings}
          retailerId={retailerId}
          collectedBy={collectedBy}
          onClose={() => setSelectedLoan(null)}
        />
      )}
    </div>
  );
}

function CollectPaymentDialog({
  loan,
  customer,
  settings,
  retailerId,
  collectedBy,
  onClose,
}: {
  loan: FinanceLoan;
  customer?: FinanceCustomer;
  settings: FinanceSettings | null;
  retailerId: string;
  collectedBy: string;
  onClose: () => void;
}) {
  const { appUser: authUser } = useAuth();
  const branchId = authUser?.financeBranchId ?? null;
  const [type, setType] = useState<PaymentType>("EMI");
  const [amount, setAmount] = useState(loan.monthlyEmi);
  const [mode, setMode] = useState<"Cash" | "UPI" | "Bank">("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const due = computeOutstanding(loan);

  useEffect(() => {
    if (type === "Settlement") setAmount(due.totalDue);
    else if (type === "EMI") setAmount(loan.monthlyEmi);
  }, [type, loan.monthlyEmi, due.totalDue]);

  async function submit() {
    if (amount <= 0) return toast.error("Amount must be positive");
    setSaving(true);
    try {
      const receiptNo = await getNextReceiptNo(retailerId);
      // simple split: penalty first, then interest, rest principal
      const penaltyComponent = Math.min(amount, due.penalty);
      const remainingAfterPenalty = amount - penaltyComponent;
      const interestComponent = Math.min(remainingAfterPenalty, due.interest);
      const principalComponent = remainingAfterPenalty - interestComponent;

      const payment = {
        retailerId,
        branchId,
        loanId: loan.id,
        loanNo: loan.loanNo,
        customerId: loan.customerId,
        customerName: loan.customerName,
        receiptNo,
        type,
        amount,
        principalComponent,
        interestComponent,
        penaltyComponent,
        paymentMode: mode,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        collectedBy,
        collectedAt: new Date().toISOString(),
      };
      const result = await recordPayment(payment);
      toast.success(`Receipt ${receiptNo} · ${formatINR(amount)} collected`);

      if (settings && customer) {
        downloadPaymentReceipt(
          { ...payment, id: result.paymentId },
          { ...loan, outstandingPrincipal: result.newOutstanding, status: result.newStatus as any },
          settings,
        );
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collect Payment · {loan.loanNo}</DialogTitle>
          <DialogDescription>{loan.customerName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as PaymentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EMI">EMI</SelectItem>
                <SelectItem value="PartPayment">Part Payment</SelectItem>
                <SelectItem value="Settlement">Full Settlement</SelectItem>
                <SelectItem value="Renewal">Renewal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumField label="Amount" value={amount} onChange={setAmount} />
          <div>
            <Label className="text-xs">Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Field label="Reference (UPI ref, txn id)" value={reference} onChange={setReference} />
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            <Receipt className="w-4 h-4 mr-1" /> Save & Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// CLOSURE — Gold release
// ──────────────────────────────────────────────────────────────────────────
function ClosureTab({
  retailerId,
  loans,
  customers,
  settings,
}: {
  retailerId: string;
  loans: FinanceLoan[];
  customers: FinanceCustomer[];
  settings: FinanceSettings | null;
}) {
  const closableLoans = loans.filter((l) => l.status === "Active" && l.outstandingPrincipal === 0);
  const closedLoans = loans.filter((l) => l.status === "Closed");
  const [signing, setSigning] = useState<FinanceLoan | null>(null);
  const [showSigPad, setShowSigPad] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSign(dataUrl: string) {
    if (!signing) return;
    setBusy(true);
    try {
      await closeLoan(signing.id, dataUrl, retailerId);
      toast.success(`Loan ${signing.loanNo} closed & gold released`);
      setSigning(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to close");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Ready for Closure</CardTitle></CardHeader>
        <CardContent>
          {closableLoans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No loans ready. Settle outstanding first.</p>
          ) : (
            <div className="space-y-2">
              {closableLoans.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-semibold text-sm">{l.loanNo} · {l.customerName}</p>
                    <p className="text-xs text-muted-foreground">{l.totalNetWeight.toFixed(2)}g</p>
                  </div>
                  <Button size="sm" onClick={() => { setSigning(l); setShowSigPad(true); }}>
                    Release Gold
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Closed Loans</CardTitle></CardHeader>
        <CardContent>
          {closedLoans.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <div className="space-y-2">
              {closedLoans.map((l) => {
                const cust = customers.find((c) => c.id === l.customerId);
                return (
                  <div key={l.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-semibold text-sm">{l.loanNo} · {l.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        Closed: {l.releasedAt ? new Date(l.releasedAt).toLocaleDateString("en-IN") : "—"}
                      </p>
                    </div>
                    {settings && cust && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadClosureCertificate(l, cust, settings)}
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> Certificate
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SignaturePadDialog
        open={showSigPad && !!signing}
        onOpenChange={(o) => { setShowSigPad(o); if (!o) setSigning(null); }}
        onSign={handleSign}
        title={`Customer Signature · ${signing?.loanNo || ""}`}
      />
      {busy && <p className="text-xs text-muted-foreground">Closing loan...</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// CASH BOOK
// ──────────────────────────────────────────────────────────────────────────
function CashBookTab({
  retailerId,
  cashBook,
  payments,
  enteredBy,
}: {
  retailerId: string;
  cashBook: CashEntry[];
  payments: LoanPayment[];
  enteredBy: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const todayPayments = payments
    .filter((p) => p.collectedAt?.startsWith(today))
    .reduce((s, p) => s + p.amount, 0);
  const todayIncome = cashBook
    .filter((c) => c.type === "Income" && c.date?.startsWith(today))
    .reduce((s, c) => s + c.amount, 0);
  const todayExpense = cashBook
    .filter((c) => c.type === "Expense" && c.date?.startsWith(today))
    .reduce((s, c) => s + c.amount, 0);
  const todayBank = cashBook
    .filter((c) => c.type === "BankDeposit" && c.date?.startsWith(today))
    .reduce((s, c) => s + c.amount, 0);
  const balance = todayPayments + todayIncome - todayExpense - todayBank;

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard label="Loan Collection" value={formatINR(todayPayments)} />
        <StatCard label="Other Income" value={formatINR(todayIncome)} />
        <StatCard label="Expenses" value={formatINR(todayExpense)} />
        <StatCard label="Bank Deposit" value={formatINR(todayBank)} />
        <StatCard label="Cash Balance" value={formatINR(balance)} highlight />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Entry
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Entries</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {cashBook.slice(0, 30).map((e) => (
              <div key={e.id} className="flex justify-between text-sm border-b pb-1">
                <div>
                  <p className="font-medium">
                    <Badge variant="outline" className="text-[10px] mr-1">{e.type}</Badge>
                    {e.category}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.description}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${e.type === "Income" ? "text-green-600" : "text-red-600"}`}>
                    {e.type === "Income" ? "+" : "−"} {formatINR(e.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
            ))}
            {cashBook.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No entries yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <AddCashEntryDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        retailerId={retailerId}
        enteredBy={enteredBy}
      />
    </div>
  );
}

function AddCashEntryDialog({
  open,
  onOpenChange,
  retailerId,
  enteredBy,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  retailerId: string;
  enteredBy: string;
}) {
  const { appUser: authUser } = useAuth();
  const branchId = authUser?.financeBranchId ?? null;
  const [type, setType] = useState<"Income" | "Expense" | "BankDeposit">("Expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!category.trim() || amount <= 0) return toast.error("Category and amount required");
    setSaving(true);
    try {
      await addCashEntry({
        retailerId,
        branchId,
        type,
        category: category.trim(),
        amount,
        description: description.trim(),
        date: new Date(date).toISOString(),
        enteredBy,
        createdAt: new Date().toISOString(),
      });
      toast.success("Entry added");
      onOpenChange(false);
      setCategory(""); setAmount(0); setDescription("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cash Book Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Income">Income</SelectItem>
                <SelectItem value="Expense">Expense</SelectItem>
                <SelectItem value="BankDeposit">Bank Deposit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Category (Salary, Rent, Office...)" value={category} onChange={setCategory} />
          <NumField label="Amount" value={amount} onChange={setAmount} />
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// REPORTS
// ──────────────────────────────────────────────────────────────────────────
function ReportsTab({
  loans,
  payments,
  customers,
}: {
  loans: FinanceLoan[];
  payments: LoanPayment[];
  customers: FinanceCustomer[];
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const d = p.collectedAt;
      if (from && d < from) return false;
      if (to && d > to + "T23:59:59") return false;
      return true;
    });
  }, [payments, from, to]);

  function exportCSV() {
    const rows = [
      ["Receipt", "Date", "Loan", "Customer", "Type", "Amount", "Mode", "Collected By"],
      ...filteredPayments.map((p) => [
        p.receiptNo, p.collectedAt, p.loanNo, p.customerName, p.type,
        String(p.amount), p.paymentMode, p.collectedBy,
      ]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${(x || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportXLSX() {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const totalCollectedX = filteredPayments.reduce((s, p) => s + p.amount, 0);
      const summary = [
        ["Finance Report"],
        ["Generated", new Date().toLocaleString("en-IN")],
        ["Date Range", `${from || "All"} → ${to || "All"}`],
        [],
        ["Customers", customers.length],
        ["Total Loans", loans.length],
        ["Active Loans", loans.filter((l) => l.status === "Active").length],
        ["Closed Loans", loans.filter((l) => l.status === "Closed").length],
        ["Filtered Payments", filteredPayments.length],
        ["Total Collected (₹)", totalCollectedX],
        ["Total Disbursed (₹)", loans.reduce((s, l) => s + l.loanAmount, 0)],
        ["Outstanding (₹)", loans.filter((l) => l.status === "Active").reduce((s, l) => s + l.outstandingPrincipal, 0)],
        ["Gold Stock (g)", loans.filter((l) => l.status === "Active").reduce((s, l) => s + l.totalNetWeight, 0)],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summary);
      wsSummary["!cols"] = [{ wch: 22 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      const loansData = loans.map((l) => ({
        "Loan No": l.loanNo,
        "Customer": l.customerName,
        "Mobile": l.customerMobile,
        "Loan Date": l.loanDate?.split("T")[0] || "",
        "Due Date": l.dueDate?.split("T")[0] || "",
        "Net Weight (g)": l.totalNetWeight,
        "Gross Weight (g)": l.totalGrossWeight,
        "Avg Purity": l.averagePurity,
        "Gold Rate (Rs/g)": l.marketRatePerGram,
        "Valuation": l.goldValuation,
        "LTV %": l.ltvPercent,
        "Loan Amount": l.loanAmount,
        "Interest %": l.interestRate,
        "Tenure (mo)": l.tenureMonths,
        "Monthly EMI": l.monthlyEmi,
        "Total Payable": l.totalPayable,
        "Total Paid": l.totalPaid,
        "Outstanding": l.outstandingPrincipal,
        "Status": l.status,
        "Remarks": l.remarks || "",
      }));
      const wsLoans = XLSX.utils.json_to_sheet(loansData.length ? loansData : [{ "No data": "" }]);
      wsLoans["!cols"] = Object.keys(loansData[0] || { x: 1 }).map(() => ({ wch: 16 }));
      XLSX.utils.book_append_sheet(wb, wsLoans, "Loans");

      const paymentsData = filteredPayments.map((p) => ({
        "Receipt No": p.receiptNo,
        "Date": p.collectedAt?.split("T")[0] || "",
        "Loan No": p.loanNo,
        "Customer": p.customerName,
        "Type": p.type,
        "Amount": p.amount,
        "Principal": p.principalComponent,
        "Interest": p.interestComponent,
        "Penalty": p.penaltyComponent,
        "Mode": p.paymentMode,
        "Reference": p.reference || "",
        "Notes": p.notes || "",
        "Collected By": p.collectedBy,
      }));
      const wsPayments = XLSX.utils.json_to_sheet(paymentsData.length ? paymentsData : [{ "No data": "" }]);
      wsPayments["!cols"] = Object.keys(paymentsData[0] || { x: 1 }).map(() => ({ wch: 16 }));
      XLSX.utils.book_append_sheet(wb, wsPayments, "Payments");

      const customersData = customers.map((c) => ({
        "Code": c.customerCode,
        "Full Name": c.fullName,
        "Mobile": c.mobile,
        "Alt Mobile": c.altMobile || "",
        "Address": c.address,
        "Aadhaar": c.aadhaarNo,
        "PAN": c.panNo || "",
        "KYC Status": c.kycStatus,
        "Created": c.createdAt?.split("T")[0] || "",
        "Notes": c.notes || "",
      }));
      const wsCustomers = XLSX.utils.json_to_sheet(customersData.length ? customersData : [{ "No data": "" }]);
      wsCustomers["!cols"] = Object.keys(customersData[0] || { x: 1 }).map(() => ({ wch: 18 }));
      XLSX.utils.book_append_sheet(wb, wsCustomers, "Customers");

      const stamp = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `finance_report_${stamp}.xlsx`);
      toast.success("Excel report downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Excel export failed");
    }
  }

  const totalCollected = filteredPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Date Filter & Export</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={exportCSV} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            </div>
            <div className="flex items-end">
              <Button
                onClick={exportXLSX}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white shadow-md"
              >
                <FileText className="w-4 h-4 mr-1" /> Export to Excel
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Excel includes 4 sheets: Summary · Loans · Payments (date-filtered) · Customers.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Filtered Payments" value={String(filteredPayments.length)} />
        <StatCard label="Total Collected" value={formatINR(totalCollected)} highlight />
        <StatCard label="Active Loans" value={String(loans.filter((l) => l.status === "Active").length)} />
        <StatCard label="Customers" value={String(customers.length)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Payment Log</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {filteredPayments.map((p) => (
              <div key={p.id} className="flex justify-between text-xs border-b py-1">
                <div>
                  <p className="font-medium">{p.receiptNo} · {p.customerName}</p>
                  <p className="text-muted-foreground">{p.loanNo} · {p.type} · {p.paymentMode}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatINR(p.amount)}</p>
                  <p className="text-muted-foreground">{new Date(p.collectedAt).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
            ))}
            {filteredPayments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No payments in this range.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────────────────────────────────
function SettingsTab({
  retailerId,
  settings,
}: {
  retailerId: string;
  settings: FinanceSettings | null;
}) {
  const [form, setForm] = useState<FinanceSettings | null>(settings);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showSigPad, setShowSigPad] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  if (!form) return <p className="text-sm text-muted-foreground mt-4">Loading...</p>;

  async function uploadAsset(kind: "logo" | "ownerPhoto" | "signature", file: File) {
    setUploading(kind);
    try {
      const url = await uploadSettingsAsset(retailerId, kind, file);
      const key = (kind + "Url") as keyof FinanceSettings;
      setForm((f) => f ? { ...f, [key]: url } : f);
      toast.success(`${kind} uploaded`);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function saveSignature(dataUrl: string) {
    setUploading("signature");
    try {
      // convert dataURL to File
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "signature.png", { type: "image/png" });
      const url = await uploadSettingsAsset(retailerId, "signature", file);
      setForm((f) => f ? { ...f, signatureUrl: url } : f);
      toast.success("Signature saved");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      await saveFinanceSettings(form);
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Company Branding</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(["logo", "ownerPhoto", "signature"] as const).map((kind) => {
              const url = (form as any)[`${kind}Url`];
              return (
                <div key={kind} className="border rounded-md p-2 text-center">
                  <p className="text-xs font-semibold mb-1 capitalize">{kind}</p>
                  {url ? (
                    <img src={url} alt={kind} className="w-24 h-24 object-contain mx-auto bg-white border rounded" />
                  ) : (
                    <div className="w-24 h-24 mx-auto bg-muted rounded flex items-center justify-center">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="mt-2 flex flex-col gap-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadAsset(kind, e.target.files[0])}
                      />
                      <span className="text-xs text-blue-600 underline">
                        {uploading === kind ? "Uploading..." : "Upload"}
                      </span>
                    </label>
                    {kind === "signature" && (
                      <button className="text-xs text-blue-600 underline" onClick={() => setShowSigPad(true)}>
                        Draw Signature
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Field label="Company Name" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} />
            <Field label="Branch Name" value={form.branchName} onChange={(v) => setForm({ ...form, branchName: v })} />
            <Field label="Owner Name" value={form.ownerName || ""} onChange={(v) => setForm({ ...form, ownerName: v })} />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
            <Field label="Email" value={form.email || ""} onChange={(v) => setForm({ ...form, email: v })} />
          </div>
          <div>
            <Label className="text-xs">Address</Label>
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
          </div>
          <div>
            <Label className="text-xs">Receipt Footer Message</Label>
            <Input value={form.receiptFooter} onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Loan Defaults</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <NumField label="Gold ₹/g (24k)" value={form.defaultGoldRatePerGram} onChange={(v) => setForm({ ...form, defaultGoldRatePerGram: v })} />
          <NumField label="LTV %" value={form.defaultLtvPercent} onChange={(v) => setForm({ ...form, defaultLtvPercent: v })} />
          <NumField label="Interest % p.a." value={form.defaultInterestRate} onChange={(v) => setForm({ ...form, defaultInterestRate: v })} />
          <NumField label="Penalty %/day" value={form.penaltyRatePerDay} onChange={(v) => setForm({ ...form, penaltyRatePerDay: v })} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          Save Settings
        </Button>
      </div>

      <SignaturePadDialog
        open={showSigPad}
        onOpenChange={setShowSigPad}
        onSign={saveSignature}
        title="Authorized Signature"
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Small helpers
// ──────────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step="0.01" value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-gov-blue bg-gov-blue/5" : ""}>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

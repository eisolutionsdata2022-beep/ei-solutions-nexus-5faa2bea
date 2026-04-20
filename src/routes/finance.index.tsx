import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  LogOut,
  Users as UsersIcon,
  Banknote,
  Receipt,
  Wallet,
  TrendingUp,
  Settings as SettingsIcon,
  LayoutDashboard,
} from "lucide-react";
import { useFinanceAuth } from "@/lib/finance-auth-context";
import {
  subscribeCustomers,
  subscribeLoans,
  subscribePayments,
  subscribeCashBook,
  subscribeFinanceSettings,
} from "@/lib/finance-firebase";
import type {
  FinanceCustomer,
  FinanceLoan,
  LoanPayment,
  CashEntry,
  FinanceSettings,
} from "@/lib/finance-types";
import { CustomersTab } from "@/components/finance-portal/CustomersTab";
import { LoansTab } from "@/components/finance-portal/LoansTab";
import { PaymentsTab } from "@/components/finance-portal/PaymentsTab";
import { CashBookTab } from "@/components/finance-portal/CashBookTab";
import { SettingsTab } from "@/components/finance-portal/SettingsTab";
import { GoldRateBanner } from "@/components/finance-portal/GoldRateBanner";

export const Route = createFileRoute("/finance/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Finance Dashboard — EI Solutions" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FinanceDashboard,
});

type TabKey = "dashboard" | "customers" | "loans" | "payments" | "cashbook" | "settings";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "customers", label: "Customers", icon: UsersIcon },
  { key: "loans", label: "Loans", icon: Banknote },
  { key: "payments", label: "Payments", icon: Receipt },
  { key: "cashbook", label: "Cash Book", icon: Wallet },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

function FinanceDashboard() {
  const { user, signOut } = useFinanceAuth();
  const ownerId = user?.uid ?? "";
  const ownerEmail = user?.username ?? "";

  const [customers, setCustomers] = useState<FinanceCustomer[]>([]);
  const [loans, setLoans] = useState<FinanceLoan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [cash, setCash] = useState<CashEntry[]>([]);
  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [tab, setTab] = useState<TabKey>("dashboard");

  useEffect(() => {
    if (!ownerId) return;
    const u1 = subscribeCustomers(ownerId, setCustomers);
    const u2 = subscribeLoans(ownerId, setLoans);
    const u3 = subscribePayments(ownerId, setPayments);
    const u4 = subscribeCashBook(ownerId, setCash);
    const u5 = subscribeFinanceSettings(ownerId, setSettings);
    return () => {
      u1(); u2(); u3(); u4(); u5();
    };
  }, [ownerId]);

  const stats = useMemo(() => {
    const activeLoans = loans.filter((l) => l.status === "Active");
    const outstanding = activeLoans.reduce((s, l) => s + (l.outstandingPrincipal || 0), 0);
    const today = new Date().toISOString().slice(0, 10);
    const collectedToday = payments
      .filter((p) => (p.collectedAt || "").slice(0, 10) === today)
      .reduce((s, p) => s + (p.amount || 0), 0);
    const cashIn = cash.filter((c) => c.type === "Income").reduce((s, c) => s + (c.amount || 0), 0);
    const cashOut = cash
      .filter((c) => c.type === "Expense" || c.type === "BankDeposit")
      .reduce((s, c) => s + (c.amount || 0), 0);
    return {
      customers: customers.length,
      activeLoans: activeLoans.length,
      outstanding,
      collectedToday,
      cashBalance: cashIn - cashOut,
    };
  }, [customers, loans, payments, cash]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 shadow-md shadow-cyan-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                Finance Portal
              </p>
              <h1 className="text-sm font-bold leading-tight">{user.displayName}</h1>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>

        {/* Tabs */}
        <nav className="mx-auto max-w-7xl overflow-x-auto px-2 sm:px-4">
          <div className="flex min-w-max gap-1 py-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-200 ring-1 ring-cyan-400/30"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {tab === "dashboard" && (
          <>
            <div className="mb-6">
              <GoldRateBanner ownerId={ownerId} />
            </div>
            <DashboardView
              user={user}
              stats={stats}
              loans={loans}
              onJump={setTab}
            />
          </>
        )}
        {tab === "customers" && (
          <CustomersTab ownerId={ownerId} ownerEmail={ownerEmail} customers={customers} />
        )}
        {tab === "loans" && (
          <LoansTab
            ownerId={ownerId}
            ownerEmail={ownerEmail}
            customers={customers}
            loans={loans}
            settings={settings}
          />
        )}
        {tab === "payments" && (
          <PaymentsTab
            ownerId={ownerId}
            ownerEmail={ownerEmail}
            customers={customers}
            loans={loans}
            payments={payments}
          />
        )}
        {tab === "cashbook" && (
          <CashBookTab ownerId={ownerId} ownerEmail={ownerEmail} cashBook={cash} />
        )}
        {tab === "settings" && <SettingsTab ownerId={ownerId} settings={settings} />}
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-[11px] text-slate-600">
        © {new Date().getFullYear()} EI Solutions Finance · Restricted access
      </footer>
    </div>
  );
}

function DashboardView({
  user,
  stats,
  loans,
  onJump,
}: {
  user: { displayName: string; username: string };
  stats: {
    customers: number;
    activeLoans: number;
    outstanding: number;
    collectedToday: number;
    cashBalance: number;
  };
  loans: FinanceLoan[];
  onJump: (tab: TabKey) => void;
}) {
  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">
          Welcome back
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{user.displayName}</h2>
        <p className="mt-1 text-sm text-slate-400">
          Username: <span className="font-mono text-slate-300">{user.username}</span>
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard icon={UsersIcon} label="Customers" value={stats.customers.toString()} tint="from-sky-400 to-cyan-500" onClick={() => onJump("customers")} />
        <StatCard icon={Banknote} label="Active Loans" value={stats.activeLoans.toString()} tint="from-violet-400 to-fuchsia-500" onClick={() => onJump("loans")} />
        <StatCard icon={TrendingUp} label="Outstanding" value={`₹${stats.outstanding.toLocaleString("en-IN")}`} tint="from-amber-400 to-orange-500" onClick={() => onJump("loans")} />
        <StatCard icon={Receipt} label="Today's Collection" value={`₹${stats.collectedToday.toLocaleString("en-IN")}`} tint="from-emerald-400 to-teal-500" onClick={() => onJump("payments")} />
        <StatCard icon={Wallet} label="Cash in Hand" value={`₹${stats.cashBalance.toLocaleString("en-IN")}`} tint="from-rose-400 to-pink-500" onClick={() => onJump("cashbook")} />
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent loans</h3>
          <span className="text-xs text-slate-500">{loans.length} total</span>
        </div>
        {loans.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No loans yet. Your workspace is fresh — start by adding a customer.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Loan #</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Outstanding</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loans.slice(0, 8).map((l) => (
                  <tr key={l.id}>
                    <td className="py-2 font-mono text-xs text-cyan-300">{l.loanNo}</td>
                    <td className="py-2">{l.customerName}</td>
                    <td className="py-2">₹{(l.loanAmount || 0).toLocaleString("en-IN")}</td>
                    <td className="py-2">₹{(l.outstandingPrincipal || 0).toLocaleString("en-IN")}</td>
                    <td className="py-2">
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tint: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
    >
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${tint} shadow-md`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold tracking-tight">{value}</p>
    </button>
  );
}

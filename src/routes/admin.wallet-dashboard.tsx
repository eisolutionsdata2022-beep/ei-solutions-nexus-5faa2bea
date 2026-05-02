import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet, IndianRupee, CreditCard, Ticket, Banknote, CheckCircle2,
  TrendingUp, ArrowDownCircle, ArrowUpCircle, Filter, BarChart3, Users,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export const Route = createFileRoute("/admin/wallet-dashboard")({
  ssr: false,
  component: AdminWalletDashboard,
});

type Tx = {
  id: string;
  userId?: string;
  amount?: number;
  type?: "credit" | "debit";
  source?: string;
  description?: string;
  createdAt?: string;
};

type Period = "today" | "month" | "all";

// Map raw `source` → friendly service label
const SERVICE_MAP: Record<string, string> = {
  "pan-portal": "PAN Card",
  "edis_application": "Aadhaar / e-District",
  "edis_refund": "Aadhaar / e-District",
  "cv_builder": "CV Creation",
  "ippb_account_opening": "IPPB / Loan Services",
  "ippb_commission": "IPPB / Loan Services",
  "bbps": "Bill Payments (BBPS)",
  "ei-pay": "EI Pay (CSC)",
  "ei-pay-refund": "EI Pay (CSC)",
  "dmt_transfer": "Money Transfer",
  "dmt_commission": "Money Transfer",
  "dmt_refund": "Money Transfer",
  "horoscope": "Horoscope",
  "horoscope-refund": "Horoscope",
  "training": "Trainings",
  "training_commission": "Trainings",
  "virtual_trainer": "Virtual Trainer",
  "matrimony": "Matrimony",
  "service_activation": "Service Activations",
  "account_activation": "Account Activations",
  "referral_bonus": "Referral",
  "referral_welcome": "Referral",
  "job-payment": "Jobs Marketplace",
  "job-commission": "Jobs Marketplace",
  "job-escrow": "Jobs Marketplace",
  "job-security-fee": "Jobs Marketplace",
  "job-dispute-payout": "Jobs Marketplace",
  "job-refund": "Jobs Marketplace",
};

const REVENUE_SOURCES = new Set(Object.keys(SERVICE_MAP));
const FUND_REQUEST_SOURCES = new Set(["wallet_topup", "Paytm Gateway", "admin_manual"]);

function inPeriod(iso: string | undefined, period: Period): boolean {
  if (!iso) return false;
  if (period === "all") return true;
  const d = new Date(iso);
  const now = new Date();
  if (period === "today") {
    return d.toDateString() === now.toDateString();
  }
  if (period === "month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
}

function AdminWalletDashboard() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [walletTotal, setWalletTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("all");

  useEffect(() => {
    (async () => {
      try {
        const [txSnap, walletSnap] = await Promise.all([
          getDocs(collection(db, "transactions")),
          getDocs(collection(db, "wallets")),
        ]);
        const list: Tx[] = txSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => (a.createdAt || "") < (b.createdAt || "") ? 1 : -1);
        setTxs(list);
        const total = walletSnap.docs.reduce((sum, d) => sum + (d.data().balance || 0), 0);
        setWalletTotal(total);
      } catch (e) {
        console.error("wallet dashboard load failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => txs.filter((t) => inPeriod(t.createdAt, period)), [txs, period]);

  const stats = useMemo(() => {
    let totalCredit = 0, totalDebit = 0, openingBalance = 0;
    let panTotal = 0, fundReqTotal = 0, revenue = 0, completed = 0;

    // Opening balance = sum of credits BEFORE the selected period
    if (period !== "all") {
      txs.forEach((t) => {
        if (!inPeriod(t.createdAt, period) && t.createdAt) {
          const d = new Date(t.createdAt);
          const cutoff = period === "today" ? new Date(new Date().setHours(0, 0, 0, 0))
            : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
          if (d < cutoff) {
            const amt = t.amount || 0;
            if (t.type === "credit") openingBalance += amt;
            else if (t.type === "debit") openingBalance -= amt;
          }
        }
      });
    }

    filtered.forEach((t) => {
      const amt = t.amount || 0;
      if (t.type === "credit") totalCredit += amt;
      if (t.type === "debit") totalDebit += amt;
      if (t.source === "pan-portal") panTotal += amt;
      if (FUND_REQUEST_SOURCES.has(t.source || "") && t.type === "credit") fundReqTotal += amt;
      if (REVENUE_SOURCES.has(t.source || "") && t.type === "debit") {
        revenue += amt;
        completed += 1;
      }
    });

    const closingBalance = period === "all" ? walletTotal : openingBalance + (totalCredit - totalDebit);

    return { openingBalance, closingBalance, totalCredit, totalDebit, panTotal, fundReqTotal, revenue, completed };
  }, [filtered, txs, period, walletTotal]);

  // Service-wise breakdown
  const serviceRows = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    filtered.forEach((t) => {
      const label = SERVICE_MAP[t.source || ""];
      if (!label || t.type !== "debit") return;
      if (!map[label]) map[label] = { count: 0, revenue: 0 };
      map[label].count += 1;
      map[label].revenue += t.amount || 0;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const chartData = serviceRows.slice(0, 8).map((r) => ({ name: r.name, Revenue: r.revenue }));
  const recentTx = filtered.slice(0, 12);

  const cards = [
    { label: "Opening Balance", value: stats.openingBalance, icon: Wallet, grad: "from-slate-500 to-slate-700" },
    { label: "Closing Balance", value: stats.closingBalance, icon: IndianRupee, grad: "from-emerald-500 to-teal-600" },
    { label: "Total Revenue", value: stats.revenue, icon: TrendingUp, grad: "from-blue-500 to-indigo-600" },
    { label: "PAN Coupon Total", value: stats.panTotal, icon: Ticket, grad: "from-amber-500 to-orange-600" },
    { label: "Fund Requests", value: stats.fundReqTotal, icon: Banknote, grad: "from-violet-500 to-purple-600" },
    { label: "Services Completed", value: stats.completed, icon: CheckCircle2, grad: "from-rose-500 to-pink-600", isCount: true },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/80 font-semibold">Admin · Finance</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold">Wallet Dashboard</h1>
            <p className="text-sm text-white/80 mt-1">Real-time revenue, balances & service-wise breakdown</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/70" />
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-40 h-10 bg-white/15 border-white/20 text-white backdrop-blur">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">Overall</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${c.grad} opacity-[0.08] group-hover:opacity-[0.14] transition-opacity`} />
              <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${c.grad} opacity-30 blur-3xl`} />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{c.label}</p>
                  {loading ? (
                    <Skeleton className="h-9 w-32 mt-2" />
                  ) : (
                    <p className="mt-2 text-3xl font-extrabold tabular-nums text-foreground">
                      {c.isCount ? c.value.toLocaleString("en-IN") : `₹${Math.round(c.value).toLocaleString("en-IN")}`}
                    </p>
                  )}
                </div>
                <div className={`shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${c.grad} flex items-center justify-center text-white shadow-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Wallet Actions */}
      <Card className="border-border/60">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">System-wide Wallet Balance</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">₹{Math.round(walletTotal).toLocaleString("en-IN")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/wallets"><Users className="w-4 h-4 mr-1" /> User Wallets</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/wallet-requests"><Banknote className="w-4 h-4 mr-1" /> Fund Requests</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90">
              <Link to="/admin/commission-center"><BarChart3 className="w-4 h-4 mr-1" /> Commission Center</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chart + Service breakdown */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Revenue by Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No revenue in selected period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={10} angle={-25} textAnchor="end" height={70} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`} />
                  <Legend />
                  <Bar dataKey="Revenue" fill="url(#revGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Service-wise Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Service</th>
                    <th className="px-2 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right">Count</th>
                    <th className="px-4 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} className="px-4 py-6"><Skeleton className="h-20 w-full" /></td></tr>
                  ) : serviceRows.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No data</td></tr>
                  ) : serviceRows.map((r) => (
                    <tr key={r.name} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium text-foreground">{r.name}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{r.count}</td>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums text-emerald-600">
                        ₹{Math.round(r.revenue).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-primary" /> Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Date</th>
                  <th className="px-4 py-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Source</th>
                  <th className="px-4 py-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Description</th>
                  <th className="px-4 py-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Type</th>
                  <th className="px-4 py-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-6"><Skeleton className="h-20 w-full" /></td></tr>
                ) : recentTx.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No transactions</td></tr>
                ) : recentTx.map((t) => (
                  <tr key={t.id} className="border-t border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-muted font-medium">{t.source || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">{t.description || "—"}</td>
                    <td className="px-4 py-2.5">
                      {t.type === "credit" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <ArrowDownCircle className="w-3.5 h-3.5" /> Credit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                          <ArrowUpCircle className="w-3.5 h-3.5" /> Debit
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${t.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                      {t.type === "credit" ? "+" : "−"}₹{Math.round(t.amount || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

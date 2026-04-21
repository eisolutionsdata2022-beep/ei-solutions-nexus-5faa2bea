import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Users,
  Wallet,
  ShoppingBag,
  TrendingUp,
  ShieldCheck,
  UserPlus,
  Sparkles,
  ArrowRight,
  Activity,
  IndianRupee,
  CreditCard,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserSearchPanel } from "@/components/admin/UserSearchPanel";
import { LegacyCleanupCard } from "@/components/admin/LegacyCleanupCard";
import { StatsCard } from "@/components/StatsCard";
import {
  RevenueChart,
  UserGrowthChart,
  TransactionsChart,
} from "@/components/admin/AdminCharts";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminDashboard,
});

type Txn = {
  id: string;
  type?: string;
  amount?: number;
  createdAt?: any;
};

type UserDoc = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  kycStatus?: string;
  createdAt?: any;
};

function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    revenue: 0,
    services: 0,
    transactions: 0,
    todayRevenue: 0,
    pendingKyc: 0,
    activeRetailers: 0,
  });
  const [recentUsers, setRecentUsers] = useState<UserDoc[]>([]);
  const [allUsers, setAllUsers] = useState<UserDoc[]>([]);
  const [allTxns, setAllTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersSnap, transSnap, servSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "transactions")),
          getDocs(collection(db, "services")),
        ]);

        const users: UserDoc[] = [];
        usersSnap.forEach((d) =>
          users.push({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) }),
        );

        const txns: Txn[] = [];
        transSnap.forEach((d) =>
          txns.push({ id: d.id, ...(d.data() as Omit<Txn, "id">) }),
        );

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        let totalRevenue = 0;
        let todayRevenue = 0;
        txns.forEach((t) => {
          if (t.type !== "debit") return;
          totalRevenue += t.amount || 0;
          const ts =
            t.createdAt instanceof Date
              ? t.createdAt
              : t.createdAt?.seconds
                ? new Date(t.createdAt.seconds * 1000)
                : t.createdAt
                  ? new Date(t.createdAt)
                  : null;
          if (ts && ts >= startOfDay) todayRevenue += t.amount || 0;
        });

        const pendingKyc = users.filter((u) => u.kycStatus === "pending").length;
        const activeRetailers = users.filter(
          (u) => u.role === "retailer" && u.kycStatus === "approved",
        ).length;

        setStats({
          users: users.length,
          revenue: totalRevenue,
          services: servSnap.size,
          transactions: txns.length,
          todayRevenue,
          pendingKyc,
          activeRetailers,
        });
        setAllUsers(users);
        setAllTxns(txns);
        setRecentUsers(users.slice(-5).reverse());
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Premium Greeting Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-premium-gradient p-7 text-white shadow-premium">
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/15 blur-3xl animate-blob" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl animate-blob [animation-delay:2s]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">
                Admin Control Center
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold">Platform Overview</h1>
              <p className="text-sm text-white/80 mt-1">
                Real-time monitoring of users, revenue and live activity.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/create-user">
              <Button
                size="lg"
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 shadow-lg"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Create User
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* User Search Panel */}
      <div className="glass-card-v2 rounded-2xl p-1">
        <UserSearchPanel />
      </div>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Total Users"
              value={stats.users.toLocaleString("en-IN")}
              icon={Users}
              tone="primary"
              delay={0}
              description={`${stats.activeRetailers} active retailers`}
            />
            <StatsCard
              title="Total Revenue"
              value={`₹${stats.revenue.toLocaleString("en-IN")}`}
              icon={IndianRupee}
              tone="success"
              delay={1}
              description={`Today: ₹${stats.todayRevenue.toLocaleString("en-IN")}`}
            />
            <StatsCard
              title="Transactions"
              value={stats.transactions.toLocaleString("en-IN")}
              icon={CreditCard}
              tone="violet"
              delay={2}
            />
            <StatsCard
              title="Pending KYC"
              value={stats.pendingKyc}
              icon={ShieldCheck}
              tone={stats.pendingKyc > 0 ? "warning" : "cyan"}
              delay={3}
              description="Awaiting review"
            />
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartPanel
          title="Revenue (last 14 days)"
          subtitle="Daily debit volume across all retailers"
          icon={TrendingUp}
          tone="from-blue-500 to-indigo-600"
        >
          {loading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <RevenueChart transactions={allTxns} />
          )}
        </ChartPanel>

        <ChartPanel
          title="User Growth"
          subtitle="New signups & cumulative total"
          icon={Users}
          tone="from-emerald-500 to-teal-600"
        >
          {loading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <UserGrowthChart users={allUsers} />
          )}
        </ChartPanel>
      </div>

      <ChartPanel
        title="Transactions Activity"
        subtitle="Daily credit vs debit count"
        icon={Activity}
        tone="from-violet-500 to-purple-600"
      >
        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : (
          <TransactionsChart transactions={allTxns} />
        )}
      </ChartPanel>

      {/* Recent Users — Glass Panel */}
      <div className="glass-card-v2 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-premium-gradient" />
            <h2 className="text-lg font-bold text-foreground">Recent Users</h2>
          </div>
          <Link to="/admin/users">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                <th className="text-left px-5 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-5 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">
                  Email
                </th>
                <th className="text-left px-5 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">
                  Role
                </th>
                <th className="text-left px-5 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">
                  KYC
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                  </tr>
                ))
              ) : recentUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                recentUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border/30 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">{u.name || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className="capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.kycStatus === "approved"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : u.kycStatus === "rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {u.kycStatus || "N/A"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions + Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card-v2 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40">
            <div className="w-1 h-6 rounded-full bg-premium-gradient" />
            <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <QuickLink to="/admin/create-user" label="Create User" icon={UserPlus} primary />
            <QuickLink to="/admin/crm-leads" label="CRM Leads" icon={Users} />
            <QuickLink to="/admin/crm-reports" label="CRM Reports" icon={Activity} />
            <QuickLink to="/admin/kyc" label="Review KYC" icon={ShieldCheck} />
            <QuickLink to="/admin/wallet-requests" label="Wallet Requests" icon={Wallet} />
            <QuickLink to="/admin/services" label="Services" icon={ShoppingBag} />
          </div>
        </div>

        <div className="glass-card-v2 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40">
            <div className="w-1 h-6 rounded-full bg-premium-gradient" />
            <h2 className="text-lg font-bold text-foreground">Live Status</h2>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              All Systems Operational
            </span>
          </div>
          <div className="p-6 space-y-4">
            <OverviewRow label="Active Services" value={stats.services.toString()} />
            <OverviewRow label="Total Transactions" value={stats.transactions.toString()} />
            <OverviewRow
              label="Total Revenue"
              value={`₹${stats.revenue.toLocaleString("en-IN")}`}
              accent
            />
            <OverviewRow
              label="Today's Revenue"
              value={`₹${stats.todayRevenue.toLocaleString("en-IN")}`}
            />
            <OverviewRow
              label="Active Retailers"
              value={stats.activeRetailers.toString()}
            />
          </div>
        </div>
      </div>

      {/* Legacy Cleanup */}
      <LegacyCleanupCard />
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: any;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card-v2 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40">
        <div
          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tone} flex items-center justify-center text-white shadow-lg`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Zap className="ml-auto w-4 h-4 text-muted-foreground/60" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function QuickLink({
  to,
  label,
  icon: Icon,
  primary,
}: {
  to: string;
  label: string;
  icon: any;
  primary?: boolean;
}) {
  return (
    <Link to={to as any}>
      <Button
        variant={primary ? "default" : "outline"}
        className={`w-full justify-start gap-2 ${
          primary
            ? "bg-premium-gradient text-white border-0 shadow-premium hover:opacity-90"
            : "bg-background/50 backdrop-blur-sm hover:bg-muted"
        }`}
      >
        <Icon className="w-4 h-4" /> {label}
      </Button>
    </Link>
  );
}

function OverviewRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-lg font-bold tabular-nums ${
          accent ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

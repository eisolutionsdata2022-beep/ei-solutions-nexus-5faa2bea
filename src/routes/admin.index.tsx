import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, Wallet, ShoppingBag, TrendingUp, ShieldCheck, UserPlus, Sparkles, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserSearchPanel } from "@/components/admin/UserSearchPanel";
import { LegacyCleanupCard } from "@/components/admin/LegacyCleanupCard";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, revenue: 0, services: 0, transactions: 0 });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const transSnap = await getDocs(collection(db, "transactions"));
        const servSnap = await getDocs(collection(db, "services"));

        let totalRevenue = 0;
        transSnap.forEach((doc) => {
          const d = doc.data();
          if (d.type === "debit") totalRevenue += d.amount || 0;
        });

        const users: any[] = [];
        usersSnap.forEach((doc) => users.push({ id: doc.id, ...doc.data() }));

        setStats({
          users: usersSnap.size,
          revenue: totalRevenue,
          services: servSnap.size,
          transactions: transSnap.size,
        });
        setRecentUsers(users.slice(0, 5));
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Premium Greeting Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-premium-gradient p-6 text-white shadow-premium">
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/15 blur-3xl animate-blob" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl animate-blob [animation-delay:2s]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">Admin Console</p>
              <h1 className="text-2xl sm:text-3xl font-bold">Platform Overview</h1>
              <p className="text-sm text-white/80 mt-1">Monitor users, revenue and live activity in real-time.</p>
            </div>
          </div>
          <Link to="/admin/create-user">
            <Button size="lg" className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 shadow-lg">
              <UserPlus className="w-4 h-4 mr-2" /> Create User
            </Button>
          </Link>
        </div>
      </div>

      {/* User Search Panel */}
      <div className="glass-card rounded-2xl p-1">
        <UserSearchPanel />
      </div>

      {/* Premium Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumStat icon={Users} label="Total Users" value={stats.users} gradient="from-blue-500 to-indigo-600" />
        <PremiumStat icon={TrendingUp} label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} gradient="from-emerald-500 to-teal-600" />
        <PremiumStat icon={ShoppingBag} label="Services" value={stats.services} gradient="from-amber-500 to-orange-600" />
        <PremiumStat icon={Wallet} label="Transactions" value={stats.transactions} gradient="from-fuchsia-500 to-purple-600" />
      </div>

      {/* Recent Users — Glass Panel */}
      <div className="glass-card rounded-2xl overflow-hidden">
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
                <th className="text-left px-5 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">KYC</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No users found.</td></tr>
              ) : (
                recentUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border/30 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 font-medium">{u.name || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className="capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{u.role}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.kycStatus === "approved" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                        u.kycStatus === "rejected" ? "bg-destructive/10 text-destructive" :
                        "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}>{u.kycStatus || "N/A"}</span>
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
        <div className="glass-card rounded-2xl overflow-hidden">
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

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40">
            <div className="w-1 h-6 rounded-full bg-premium-gradient" />
            <h2 className="text-lg font-bold text-foreground">Platform Overview</h2>
          </div>
          <div className="p-6 space-y-4">
            <OverviewRow label="Active Services" value={stats.services.toString()} />
            <OverviewRow label="Total Transactions" value={stats.transactions.toString()} />
            <OverviewRow label="Total Revenue" value={`₹${stats.revenue.toLocaleString()}`} accent />
          </div>
        </div>
      </div>

      {/* Legacy Cleanup */}
      <LegacyCleanupCard />
    </div>
  );
}

function PremiumStat({ icon: Icon, label, value, gradient }: { icon: any; label: string; value: number | string; gradient: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl glass-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-premium">
      <div className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${gradient} opacity-25 blur-2xl group-hover:opacity-40 transition-opacity`} />
      <div className="relative flex items-start justify-between mb-3">
        <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">{label}</p>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="relative text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function QuickLink({ to, label, icon: Icon, primary }: { to: string; label: string; icon: any; primary?: boolean }) {
  return (
    <Link to={to}>
      <Button
        variant={primary ? "default" : "outline"}
        className={`w-full justify-start gap-2 ${primary ? "bg-premium-gradient text-white border-0 shadow-premium hover:opacity-90" : "bg-background/50 backdrop-blur-sm hover:bg-muted"}`}
      >
        <Icon className="w-4 h-4" /> {label}
      </Button>
    </Link>
  );
}

function OverviewRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-lg font-bold ${accent ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

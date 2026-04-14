import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, Wallet, ShoppingBag, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Users" value={stats.users} borderColor="border-gov-blue" bgColor="bg-gov-blue/10" textColor="text-gov-blue" />
        <StatCard icon={TrendingUp} label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} borderColor="border-success" bgColor="bg-success/10" textColor="text-success" />
        <StatCard icon={ShoppingBag} label="Services" value={stats.services} borderColor="border-gov-saffron" bgColor="bg-gov-saffron/10" textColor="text-gov-saffron" />
        <StatCard icon={Wallet} label="Transactions" value={stats.transactions} borderColor="border-warning" bgColor="bg-warning/10" textColor="text-warning" />
      </div>

      {/* Recent Users Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="bg-gov-blue-light border-b border-border px-5 py-3">
          <h2 className="text-base font-bold text-gov-blue">Recent Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2.5 font-semibold text-gov-blue text-xs">Name</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gov-blue text-xs">Email</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gov-blue text-xs">Role</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gov-blue text-xs">KYC Status</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>
              ) : (
                recentUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="px-4 py-2.5">{u.name || "—"}</td>
                    <td className="px-4 py-2.5">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span className="capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gov-blue/10 text-gov-blue">{u.role}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.kycStatus === "approved" ? "bg-success/10 text-success" :
                        u.kycStatus === "rejected" ? "bg-destructive/10 text-destructive" :
                        "bg-warning/10 text-warning"
                      }`}>{u.kycStatus || "N/A"}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="text-center py-3 border-t border-border">
          <Link to="/admin/users">
            <Button variant="outline" size="sm" className="text-xs border-gov-blue text-gov-blue">View All Users</Button>
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="bg-gov-blue-light border-b border-border px-5 py-3">
            <h2 className="text-base font-bold text-gov-blue">Quick Actions</h2>
          </div>
          <div className="p-5 space-y-3">
            <Link to="/admin/create-user"><Button className="w-full bg-gov-blue hover:opacity-90 text-white font-bold">+ Create New User</Button></Link>
            <Link to="/admin/kyc"><Button variant="outline" className="w-full border-gov-blue text-gov-blue font-bold">Review KYC Requests</Button></Link>
            <Link to="/admin/wallet-requests"><Button variant="outline" className="w-full border-gov-blue text-gov-blue font-bold">Wallet Requests</Button></Link>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="bg-gov-blue-light border-b border-border px-5 py-3">
            <h2 className="text-base font-bold text-gov-blue">Platform Overview</h2>
          </div>
          <div className="p-5 space-y-3 text-sm text-muted-foreground">
            <div className="flex justify-between"><span>Active Services</span><span className="font-bold text-foreground">{stats.services}</span></div>
            <div className="flex justify-between border-t border-border/50 pt-3"><span>Total Transactions</span><span className="font-bold text-foreground">{stats.transactions}</span></div>
            <div className="flex justify-between border-t border-border/50 pt-3"><span>Total Revenue</span><span className="font-bold text-success">₹{stats.revenue.toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, borderColor, bgColor, textColor }: {
  icon: React.ElementType; label: string; value: number | string; borderColor: string; bgColor: string; textColor: string;
}) {
  return (
    <div className={`rounded-lg border-2 p-4 text-center ${borderColor} ${bgColor}`}>
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Icon className={`w-4 h-4 ${textColor}`} />
        <span className={`text-xs font-bold ${textColor}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

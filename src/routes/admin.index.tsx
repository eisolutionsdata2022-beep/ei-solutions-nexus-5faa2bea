import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { StatsCard } from "@/components/StatsCard";
import { Users, Wallet, ShoppingBag, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/admin/")({
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your platform overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={stats.users} icon={Users} description="Registered users" />
        <StatsCard title="Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon={TrendingUp} description="From services" />
        <StatsCard title="Services" value={stats.services} icon={ShoppingBag} description="Active services" />
        <StatsCard title="Transactions" value={stats.transactions} icon={Wallet} description="Total transactions" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
        </CardHeader>
        <CardContent>
          {recentUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No users found. Create the admin account first.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Email</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Role</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">KYC</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="py-3 px-2 text-foreground">{u.name || "—"}</td>
                      <td className="py-3 px-2 text-foreground">{u.email}</td>
                      <td className="py-3 px-2">
                        <span className="capitalize px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`capitalize px-2 py-1 rounded-full text-xs ${
                          u.kycStatus === "approved" ? "bg-success/10 text-success" :
                          u.kycStatus === "rejected" ? "bg-destructive/10 text-destructive" :
                          "bg-warning/10 text-warning"
                        }`}>
                          {u.kycStatus || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

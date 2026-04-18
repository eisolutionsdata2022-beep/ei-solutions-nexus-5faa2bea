import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { subscribeAllActivations, type ServiceActivation } from "@/lib/service-activation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { History, IndianRupee, Users } from "lucide-react";

export const Route = createFileRoute("/admin/service-activations")({
  ssr: false,
  component: AdminActivationsReport,
});

function AdminActivationsReport() {
  const [activations, setActivations] = useState<ServiceActivation[]>([]);
  const [users, setUsers] = useState<Record<string, { name?: string; email?: string }>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = subscribeAllActivations(setActivations);
    getDocs(collection(db, "users")).then((snap) => {
      const map: Record<string, { name?: string; email?: string }> = {};
      snap.forEach((d) => {
        const u = d.data();
        map[d.id] = { name: u.name, email: u.email };
      });
      setUsers(map);
    });
    return unsub;
  }, []);

  const stats = useMemo(() => {
    const totalRevenue = activations.reduce((s, a) => s + (a.feePaid || 0), 0);
    const uniqueUsers = new Set(activations.map((a) => a.userId)).size;
    return { totalRevenue, uniqueUsers, total: activations.length };
  }, [activations]);

  const filtered = activations.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const u = users[a.userId];
    return (
      a.serviceName?.toLowerCase().includes(q) ||
      u?.email?.toLowerCase().includes(q) ||
      u?.name?.toLowerCase().includes(q) ||
      a.userId.includes(q)
    );
  });

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Service Activations</h1>
        <p className="text-muted-foreground">Full audit log of every retailer service activation.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={History} label="Total Activations" value={String(stats.total)} />
        <StatCard icon={Users} label="Unique Users" value={String(stats.uniqueUsers)} />
        <StatCard icon={IndianRupee} label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`} />
      </div>

      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-bold">Activation Log</CardTitle>
          <Input
            placeholder="Search by user, email, service…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2 h-8 text-xs"
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 font-semibold">Date / Time</th>
                  <th className="text-left px-3 py-2 font-semibold">User</th>
                  <th className="text-left px-3 py-2 font-semibold">Service</th>
                  <th className="text-left px-3 py-2 font-semibold">Amount</th>
                  <th className="text-left px-3 py-2 font-semibold">Validity</th>
                  <th className="text-left px-3 py-2 font-semibold">Expires</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No activations.</td></tr>
                ) : filtered.map((a) => {
                  const u = users[a.userId];
                  return (
                    <tr key={a.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmt(a.activatedAt)}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{u?.name || u?.email || a.userId.slice(0, 8)}</p>
                        {u?.email && u?.name && <p className="text-[10px] text-muted-foreground">{u.email}</p>}
                      </td>
                      <td className="px-3 py-2 font-medium">{a.serviceName}</td>
                      <td className="px-3 py-2 font-semibold">{a.feePaid > 0 ? `₹${a.feePaid}` : "Free"}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[10px] capitalize">{a.validity}</Badge></td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {a.expiresAt ? new Date(a.expiresAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-gov-blue/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gov-blue" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

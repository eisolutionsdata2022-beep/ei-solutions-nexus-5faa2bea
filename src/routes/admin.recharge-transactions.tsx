import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/admin/recharge-transactions")({
  ssr: false,
  component: AdminRechargeTransactions,
});

interface RechargeTx {
  id: string;
  userId: string;
  userEmail: string;
  serviceType: string;
  operator: string;
  mobileNumber: string;
  amount: number;
  serviceCharge: number;
  totalDebit: number;
  status: string;
  commission: {
    retailer: number;
    distributor: number;
    admin: number;
    serviceCharge: number;
    total: number;
  };
  createdAt: string;
}

function AdminRechargeTransactions() {
  const [transactions, setTransactions] = useState<RechargeTx[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "rechargeTransactions"), orderBy("createdAt", "desc"), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      const list: RechargeTx[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as RechargeTx));
      setTransactions(list);
    });
    return unsub;
  }, []);

  const filtered = transactions.filter((tx) =>
    !search ||
    tx.mobileNumber.includes(search) ||
    tx.operator.toLowerCase().includes(search.toLowerCase()) ||
    tx.userEmail.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.commission?.admin || 0) + (tx.commission?.serviceCharge || 0), 0);
  const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recharge Transactions</h1>
        <p className="text-muted-foreground">Full commission breakdown for all recharge/BBPS transactions.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-bold">₹{totalVolume.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Admin Revenue</p>
            <p className="text-2xl font-bold text-green-600">₹{totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="text-2xl font-bold">{transactions.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by number, operator, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: "hsl(var(--gov-blue) / 0.05)" }}>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Service</th>
                  <th className="text-left p-3">Number</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-right p-3">Ret. Comm.</th>
                  <th className="text-right p-3">Dist. Comm.</th>
                  <th className="text-right p-3">Admin Comm.</th>
                  <th className="text-right p-3">Svc Charge</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-xs">{new Date(tx.createdAt).toLocaleString()}</td>
                    <td className="p-3 text-xs">{tx.userEmail}</td>
                    <td className="p-3 capitalize">{tx.operator}</td>
                    <td className="p-3">{tx.mobileNumber}</td>
                    <td className="p-3 text-right font-medium">₹{tx.amount}</td>
                    <td className="p-3 text-right text-green-600">₹{tx.commission?.retailer?.toFixed(2) || "0"}</td>
                    <td className="p-3 text-right text-blue-600">₹{tx.commission?.distributor?.toFixed(2) || "0"}</td>
                    <td className="p-3 text-right text-purple-600">₹{tx.commission?.admin?.toFixed(2) || "0"}</td>
                    <td className="p-3 text-right">₹{tx.serviceCharge || 0}</td>
                    <td className="p-3 text-center">
                      <Badge variant={tx.status === "success" ? "default" : tx.status === "processing" ? "secondary" : "destructive"} className="text-xs capitalize">
                        {tx.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Wallet, GraduationCap, ClipboardList, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/retailer/")({
  component: RetailerDashboard,
});

interface Transaction {
  id: string;
  amount: number;
  type: string;
  source: string;
  description?: string;
  createdAt: string;
}

function RetailerDashboard() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [servicesUsed, setServicesUsed] = useState(0);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!appUser) return;

    // Real-time wallet balance
    const unsub = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });

    // Fetch services used count
    getDocs(query(collection(db, "serviceRequests"), where("userId", "==", appUser.uid)))
      .then((snap) => setServicesUsed(snap.size));

    // Fetch recent transactions
    getDocs(query(
      collection(db, "transactions"),
      where("userId", "==", appUser.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    )).then((snap) => {
      const list: Transaction[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Transaction));
      setRecentTx(list);
    });

    return unsub;
  }, [appUser]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Retailer Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {appUser?.name || appUser?.email}!</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Wallet Balance" value={`₹${balance.toFixed(2)}`} icon={Wallet} />
        <StatsCard title="Services Used" value={servicesUsed} icon={ShoppingBag} />
        <StatsCard title="KYC Status" value={appUser?.kycStatus || "Pending"} icon={ClipboardList} />
        <StatsCard title="Trainings" value={0} icon={GraduationCap} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTx.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {recentTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    {tx.type === "credit" ? (
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <ArrowDownLeft className="w-4 h-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4 text-red-600" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.description || tx.source}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${tx.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "credit" ? "+" : "-"}₹{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft } from "lucide-react";

export const Route = createFileRoute("/distributor/earnings")({
  component: DistributorEarnings,
});

interface CommissionTx {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
  retailerId?: string;
}

function DistributorEarnings() {
  const { appUser } = useAuth();
  const [earnings, setEarnings] = useState<CommissionTx[]>([]);

  useEffect(() => {
    if (!appUser) return;
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", appUser.uid),
      where("source", "==", "commission"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: CommissionTx[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as CommissionTx));
      setEarnings(list);
    });
    return unsub;
  }, [appUser]);

  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Earnings</h1>
        <p className="text-muted-foreground">Commission earned from retailer transactions.</p>
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Total Earnings</p>
          <p className="text-3xl font-bold" style={{ color: "hsl(var(--gov-blue))" }}>₹{totalEarnings.toFixed(2)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Commission History</CardTitle></CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commission earnings yet.</p>
          ) : (
            <div className="space-y-2">
              {earnings.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <ArrowDownLeft className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{e.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600">+₹{e.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

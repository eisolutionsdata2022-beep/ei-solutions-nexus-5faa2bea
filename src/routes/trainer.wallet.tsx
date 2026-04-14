import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/trainer/wallet")({
  ssr: false,
  component: TrainerWallet,
});

function TrainerWallet() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!appUser) return;
    const fetch = async () => {
      try {
        const walletSnap = await getDoc(doc(db, "wallets", appUser.uid));
        if (walletSnap.exists()) setBalance(walletSnap.data().balance || 0);

        const txSnap = await getDocs(collection(db, "transactions"));
        const txs: any[] = [];
        txSnap.forEach((d) => {
          const data = d.data();
          if (data.userId === appUser.uid) txs.push({ id: d.id, ...data });
        });
        txs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setTransactions(txs);
      } catch (err) {
        console.error(err);
      }
    };
    fetch();
  }, [appUser]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Wallet</h1>
        <p className="text-muted-foreground">View your earnings and transactions.</p>
      </div>

      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-3xl font-bold text-foreground">₹{balance.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === "credit" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      {tx.type === "credit" ? <ArrowDownLeft className="w-4 h-4 text-green-600" /> : <ArrowUpRight className="w-4 h-4 text-red-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.description || tx.source}</p>
                      <p className="text-xs text-muted-foreground">{tx.createdAt?.split("T")[0]}</p>
                    </div>
                  </div>
                  <span className={`font-semibold text-sm ${tx.type === "credit" ? "text-green-600" : "text-red-600"}`}>
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

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/retailer/transactions")({
  component: RetailerTransactions,
});

interface Transaction {
  id: string;
  amount: number;
  type: string;
  source: string;
  description?: string;
  createdAt: string;
}

function RetailerTransactions() {
  const { appUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(
      query(collection(db, "transactions"), where("userId", "==", appUser.uid), orderBy("createdAt", "desc")),
      (snap) => {
        const list: Transaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Transaction));
        setTransactions(list);
      }
    );
    return unsub;
  }, [appUser]);

  const credits = transactions.filter((t) => t.type === "credit");
  const debits = transactions.filter((t) => t.type === "debit");

  const TxList = ({ items }: { items: Transaction[] }) => (
    items.length === 0 ? (
      <p className="text-sm text-muted-foreground py-4">No transactions found.</p>
    ) : (
      <div className="space-y-2">
        {items.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-center gap-3">
              {tx.type === "credit" ? (
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4 text-green-600" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-red-600" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">{tx.description || tx.source}</p>
                <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`font-semibold ${tx.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                {tx.type === "credit" ? "+" : "-"}₹{tx.amount}
              </span>
              <Badge variant="outline" className="ml-2 text-[10px] capitalize">{tx.source}</Badge>
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
        <p className="text-muted-foreground">View all your wallet transactions in real-time.</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({transactions.length})</TabsTrigger>
              <TabsTrigger value="credit">Credits ({credits.length})</TabsTrigger>
              <TabsTrigger value="debit">Debits ({debits.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all"><TxList items={transactions} /></TabsContent>
            <TabsContent value="credit"><TxList items={credits} /></TabsContent>
            <TabsContent value="debit"><TxList items={debits} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/retailer/transactions")({
  ssr: false,
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
      query(collection(db, "transactions"), where("userId", "==", appUser.uid)),
      (snap) => {
        const list: Transaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Transaction));
        list.sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""));
        setTransactions(list);
      },
      (error) => {
        console.warn("[RetailerTransactions] listener skipped:", error.message);
        setTransactions([]);
      },
    );
    return unsub;
  }, [appUser]);

  const credits = transactions.filter((t) => t.type === "credit");
  const debits = transactions.filter((t) => t.type === "debit");
  const totalCredit = credits.reduce((s, t) => s + t.amount, 0);
  const totalDebit = debits.reduce((s, t) => s + t.amount, 0);

  const TxList = ({ items }: { items: Transaction[] }) => (
    items.length === 0 ? (
      <p className="text-sm text-muted-foreground py-10 text-center">No transactions found.</p>
    ) : (
      <div className="space-y-1 mt-3">
        {items.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              {tx.type === "credit" ? (
                <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{tx.description || tx.source}</p>
                <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className={`font-bold tabular-nums ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
              </span>
              <Badge variant="outline" className="ml-2 text-[10px] capitalize rounded-full backdrop-blur">{tx.source}</Badge>
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="space-y-6">
      {/* Premium hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-premium-gradient p-6 text-white shadow-premium">
        <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/15 blur-3xl animate-blob" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-white/10 blur-3xl animate-blob [animation-delay:-7s]" aria-hidden />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center shadow-md">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/80 font-semibold">Wallet Activity</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Transaction History</h1>
            <p className="mt-1 text-sm text-white/85">Live, real-time view of every credit and debit on your wallet.</p>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryTile
          icon={ArrowLeftRight}
          label="Total Transactions"
          value={transactions.length.toString()}
          gradient="from-indigo-500 to-purple-600"
        />
        <SummaryTile
          icon={TrendingUp}
          label="Total Credits"
          value={`+ ₹${totalCredit.toLocaleString("en-IN")}`}
          gradient="from-emerald-500 to-teal-500"
          accent="text-success"
        />
        <SummaryTile
          icon={TrendingDown}
          label="Total Debits"
          value={`− ₹${totalDebit.toLocaleString("en-IN")}`}
          gradient="from-rose-500 to-red-600"
          accent="text-destructive"
        />
      </div>

      {/* Transactions panel */}
      <div className="glass-card rounded-2xl p-5">
        <Tabs defaultValue="all">
          <TabsList className="bg-muted/50 backdrop-blur rounded-xl p-1">
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              All ({transactions.length})
            </TabsTrigger>
            <TabsTrigger value="credit" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Credits ({credits.length})
            </TabsTrigger>
            <TabsTrigger value="debit" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Debits ({debits.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all"><TxList items={transactions} /></TabsContent>
          <TabsContent value="credit"><TxList items={credits} /></TabsContent>
          <TabsContent value="debit"><TxList items={debits} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon, label, value, gradient, accent,
}: {
  icon: React.ElementType; label: string; value: string; gradient: string; accent?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl glass-card p-4 transition-all hover:-translate-y-0.5">
      <div
        className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-25 blur-2xl group-hover:opacity-40 transition-opacity`}
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
          <p className={`mt-1 text-2xl font-extrabold tracking-tight tabular-nums truncate ${accent ?? "text-foreground"}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md text-white shrink-0 ml-2`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

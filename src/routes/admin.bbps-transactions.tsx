import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowLeftRight } from "lucide-react";
import { subscribeAllTransactions } from "@/lib/bbps-firebase";
import type { BbpsTransaction, BbpsTxStatus } from "@/lib/bbps-types";

export const Route = createFileRoute("/admin/bbps-transactions")({
  ssr: false,
  component: AdminBbpsTxns,
});

const STATUS_COLOR: Record<BbpsTxStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  processing: "secondary",
  success: "default",
  failed: "destructive",
  refunded: "destructive",
};

function AdminBbpsTxns() {
  const [txs, setTxs] = useState<BbpsTransaction[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => subscribeAllTransactions(setTxs, 300), []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return txs;
    return txs.filter(
      (t) =>
        t.retailerEmail?.toLowerCase().includes(s) ||
        t.billerName?.toLowerCase().includes(s) ||
        t.categoryName?.toLowerCase().includes(s) ||
        String(t.providerReceipt ?? "").includes(s),
    );
  }, [txs, q]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Bill Payment Transactions</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All transactions ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by retailer, biller, receipt…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">When</th>
                  <th>Retailer</th>
                  <th>Category</th>
                  <th>Biller</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Fee</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="text-xs">{t.retailerEmail}</td>
                    <td>{t.categoryName}</td>
                    <td className="max-w-[180px] truncate">{t.billerName}</td>
                    <td className="text-right font-mono">₹{t.amount.toFixed(2)}</td>
                    <td className="text-right font-mono">₹{t.fee.toFixed(2)}</td>
                    <td>
                      <Badge variant={STATUS_COLOR[t.status] ?? "outline"}>{t.status}</Badge>
                    </td>
                    <td className="font-mono text-xs">{t.providerReceipt ?? "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No transactions yet.
                    </td>
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

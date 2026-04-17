/**
 * Live transaction monitoring dashboard for EI SOLUTIONS PAY (admin).
 * - Real-time stream of recent CSC transactions
 * - Success / failure / volume KPIs
 * - Service-wise revenue chart
 * - Top retailer leaderboard
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, TrendingUp, IndianRupee, Trophy, RefreshCw, Download } from "lucide-react";
import type { CscTransaction } from "@/lib/csc-types";
import { downloadCscReceipt } from "@/lib/csc-receipt-pdf";

export const Route = createFileRoute("/admin/csc-monitor")({
  ssr: false,
  component: CscMonitorPage,
});

function CscMonitorPage() {
  const [txs, setTxs] = useState<CscTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowH, setWindowH] = useState<24 | 168 | 720>(24);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "csc_transactions"), orderBy("createdAt", "desc"), limit(500)),
      (snap) => {
        const list: CscTransaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as CscTransaction) }));
        setTxs(list);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - windowH * 3600_000;
    return txs.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
  }, [txs, windowH]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const success = filtered.filter((t) => t.status === "success").length;
    const failed = filtered.filter((t) => t.status === "failed" || t.status === "refunded").length;
    const processing = filtered.filter((t) => t.status === "processing" || t.status === "pending").length;
    const volume = filtered.filter((t) => t.status === "success").reduce((s, t) => s + t.amount, 0);
    const fees = filtered.filter((t) => t.status === "success").reduce((s, t) => s + (t.fee || 0), 0);
    const successRate = total > 0 ? (success / total) * 100 : 0;
    return { total, success, failed, processing, volume, fees, successRate };
  }, [filtered]);

  const byService = useMemo(() => {
    const map = new Map<string, { name: string; count: number; volume: number }>();
    for (const t of filtered) {
      if (t.status !== "success") continue;
      const cur = map.get(t.serviceKey) ?? { name: t.serviceName, count: 0, volume: 0 };
      cur.count += 1;
      cur.volume += t.amount;
      map.set(t.serviceKey, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.volume - a.volume);
  }, [filtered]);

  const topRetailers = useMemo(() => {
    const map = new Map<string, { email: string; count: number; volume: number; fees: number }>();
    for (const t of filtered) {
      if (t.status !== "success") continue;
      const cur = map.get(t.retailerId) ?? { email: t.retailerEmail, count: 0, volume: 0, fees: 0 };
      cur.count += 1;
      cur.volume += t.amount;
      cur.fees += t.fee || 0;
      map.set(t.retailerId, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.volume - a.volume).slice(0, 10);
  }, [filtered]);

  const maxVolume = byService[0]?.volume || 1;

  const exportCsv = () => {
    const header = ["createdAt", "retailerEmail", "serviceName", "amount", "fee", "status", "bridgeRef", "errorMessage"];
    const rows = filtered.map((t) => [
      t.createdAt,
      t.retailerEmail,
      t.serviceName,
      String(t.amount),
      String(t.fee),
      t.status,
      t.bridgeRef ?? "",
      (t.errorMessage ?? "").replace(/[\r\n,]/g, " "),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `csc-transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">EI SOLUTIONS PAY · Live Monitor</h1>
          <p className="text-sm text-muted-foreground">
            Real-time stream of CSC transactions across all retailers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-card p-1">
            {([24, 168, 720] as const).map((h) => (
              <button
                key={h}
                onClick={() => setWindowH(h)}
                className={`rounded px-3 py-1 text-xs font-medium transition ${
                  windowH === h
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {h === 24 ? "24h" : h === 168 ? "7d" : "30d"}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={Activity} label="Transactions" value={kpis.total} hint={`${kpis.processing} in progress`} />
        <Kpi icon={TrendingUp} label="Success Rate" value={`${kpis.successRate.toFixed(1)}%`} hint={`${kpis.success} ok / ${kpis.failed} failed`} accent="text-success" />
        <Kpi icon={IndianRupee} label="GMV" value={`₹${kpis.volume.toLocaleString("en-IN")}`} hint="Successful transactions" />
        <Kpi icon={IndianRupee} label="Fee Revenue" value={`₹${kpis.fees.toLocaleString("en-IN")}`} hint="Convenience fees collected" accent="text-primary" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Service-wise revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Service</CardTitle>
          </CardHeader>
          <CardContent>
            {byService.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No data in this window.</p>
            ) : (
              <div className="space-y-3">
                {byService.map((s) => (
                  <div key={s.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="text-muted-foreground">
                        {s.count} txn · ₹{s.volume.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                        style={{ width: `${(s.volume / maxVolume) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top retailers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" /> Top Retailers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topRetailers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No data in this window.</p>
            ) : (
              <div className="space-y-2">
                {topRetailers.map((r, i) => (
                  <div
                    key={r.email}
                    className="flex items-center justify-between rounded-lg border bg-muted/20 p-2.5 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? "bg-amber-100 text-amber-700"
                        : i === 1 ? "bg-slate-200 text-slate-700"
                        : i === 2 ? "bg-orange-100 text-orange-700"
                        : "bg-muted text-muted-foreground"
                      }`}>{i + 1}</span>
                      <span className="truncate text-xs">{r.email}</span>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-semibold">₹{r.volume.toLocaleString("en-IN")}</div>
                      <div className="text-muted-foreground">{r.count} txn · ₹{r.fees} fee</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live stream */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4 animate-spin-slow" /> Live Transaction Stream
          </CardTitle>
          <span className="text-xs text-muted-foreground">{filtered.length} events</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No transactions in this window.</p>
          ) : (
            <div className="max-h-[480px] space-y-1.5 overflow-y-auto pr-1">
              {filtered.slice(0, 100).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{tx.serviceName}</p>
                      <Badge
                        variant={
                          tx.status === "success" ? "default"
                          : tx.status === "failed" || tx.status === "refunded" ? "destructive"
                          : "secondary"
                        }
                        className="text-[10px] capitalize"
                      >
                        {tx.status}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {tx.retailerEmail} · {new Date(tx.createdAt).toLocaleTimeString()} ·{" "}
                      {tx.bridgeRef || "—"}
                    </p>
                    {tx.errorMessage && (
                      <p className="truncate text-xs text-destructive">{tx.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">₹{tx.amount}</span>
                    {tx.status === "success" && (
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => downloadCscReceipt(tx)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <Icon className={`h-4 w-4 ${accent ?? "text-muted-foreground"}`} />
        </div>
        <p className={`mt-2 text-2xl font-bold ${accent ?? "text-foreground"}`}>{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

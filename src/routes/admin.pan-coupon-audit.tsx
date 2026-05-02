/**
 * Admin → PAN Coupon Audit
 * Cross-checks every pan_coupon_orders record against:
 *   1. Wallet debit transaction  (source = "pan-portal", type = "debit")
 *   2. Wallet refund transaction (source = "pan-portal", type = "credit", description starts with "Refund:")
 *   3. Current wallet balance
 *
 * Highlights any inconsistency:
 *   - Order PENDING but no debit
 *   - Order SUCCESS but money refunded (anomaly)
 *   - Order FAILED but NOT refunded (money lost)
 *   - Order refunded twice (over-credit)
 *   - Debit missing entirely
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  collection, getDocs, query, where, limit, doc, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import type { PanCouponOrder } from "@/lib/pan-portal-types";

export const Route = createFileRoute("/admin/pan-coupon-audit")({
  ssr: false,
  component: PanCouponAudit,
});

interface UserLite { id: string; name: string; email: string; }
interface WalletTx {
  id: string;
  userId: string;
  amount: number;
  type: "credit" | "debit";
  source: string;
  description?: string;
  createdAt: string;
}
interface AuditRow {
  order: PanCouponOrder;
  user?: UserLite;
  walletBalance: number;
  debits: WalletTx[];
  refunds: WalletTx[];
  netDebited: number;
  expected: number;
  diff: number;
  flags: string[];
  ok: boolean;
}

function dayKey(iso: string) { return iso?.slice(0, 10) || ""; }

function PanCouponAudit() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true); setErr("");
    try {
      // 1. All coupon orders (pull last 500, filter by date client-side — avoids composite index)
      const ordSnap = await getDocs(query(collection(db, "pan_coupon_orders"), limit(500)));
      const allOrders: PanCouponOrder[] = ordSnap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as PanCouponOrder) }),
      );
      const orders = allOrders
        .filter((o) => dayKey(o.createdAt) === date)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

      // 2. Pull pan-portal txns for these retailers (one query per retailer — small N)
      const retailerIds = Array.from(new Set(orders.map((o) => o.retailerId)));
      const txByUser = new Map<string, WalletTx[]>();
      const userById = new Map<string, UserLite>();
      const balanceById = new Map<string, number>();

      await Promise.all(retailerIds.map(async (uid) => {
        const [txSnap, userSnap, walletSnap] = await Promise.all([
          getDocs(query(
            collection(db, "transactions"),
            where("userId", "==", uid),
            where("source", "==", "pan-portal"),
            limit(200),
          )),
          getDoc(doc(db, "users", uid)),
          getDoc(doc(db, "wallets", uid)),
        ]);
        const txs: WalletTx[] = txSnap.docs.map((d) => ({ ...(d.data() as WalletTx), id: d.id }));
        txByUser.set(uid, txs);
        if (userSnap.exists()) {
          const u = userSnap.data() as any;
          userById.set(uid, { id: uid, name: u.name || "", email: u.email || "" });
        }
        balanceById.set(uid, walletSnap.exists() ? Number((walletSnap.data() as any).balance || 0) : 0);
      }));

      // 3. Build audit rows — match each order to its debit/refund txns
      const built: AuditRow[] = orders.map((o) => {
        const txs = txByUser.get(o.retailerId) || [];
        // Match window: ±3 minutes around order createdAt + same amount
        const orderTime = Date.parse(o.createdAt);
        const within = (t: WalletTx) =>
          Math.abs(Date.parse(t.createdAt) - orderTime) < 3 * 60 * 1000;

        const debits = txs.filter(
          (t) => t.type === "debit" && Number(t.amount) === Number(o.totalDebit) && within(t),
        );
        const refunds = txs.filter(
          (t) => t.type === "credit" && Number(t.amount) === Number(o.totalDebit) &&
                 (t.description || "").toLowerCase().startsWith("refund") &&
                 Date.parse(t.createdAt) >= orderTime - 60 * 1000,
        );

        const netDebited = debits.reduce((s, t) => s + Number(t.amount), 0)
                         - refunds.reduce((s, t) => s + Number(t.amount), 0);
        const expected = o.refunded || o.status === "FAILED" ? 0 : Number(o.totalDebit);
        const diff = netDebited - expected;

        const flags: string[] = [];
        if (debits.length === 0) flags.push("NO_DEBIT");
        if (debits.length > 1) flags.push(`MULTI_DEBIT(${debits.length})`);
        if (refunds.length > 1) flags.push(`MULTI_REFUND(${refunds.length})`);
        if (o.refunded && refunds.length === 0) flags.push("MARKED_REFUNDED_BUT_NO_CREDIT");
        if (!o.refunded && refunds.length > 0) flags.push("REFUNDED_BUT_NOT_MARKED");
        if (o.status === "FAILED" && refunds.length === 0) flags.push("FAILED_BUT_NOT_REFUNDED");
        if (o.status === "SUCCESS" && refunds.length > 0) flags.push("SUCCESS_BUT_REFUNDED");
        if (diff !== 0) flags.push(`DIFF_₹${diff}`);

        return {
          order: o,
          user: userById.get(o.retailerId),
          walletBalance: balanceById.get(o.retailerId) ?? 0,
          debits, refunds, netDebited, expected, diff,
          flags,
          ok: flags.length === 0,
        };
      });

      setRows(built);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  const summary = useMemo(() => {
    const totalOrders = rows.length;
    const success = rows.filter((r) => r.order.status === "SUCCESS").length;
    const refunded = rows.filter((r) => r.order.refunded).length;
    const totalDebited = rows.reduce((s, r) => s + r.netDebited, 0);
    const totalExpected = rows.reduce((s, r) => s + r.expected, 0);
    const issues = rows.filter((r) => !r.ok).length;
    return { totalOrders, success, refunded, totalDebited, totalExpected, issues };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PAN Coupon Audit</h1>
        <p className="text-muted-foreground">
          Verify every coupon order has a matching wallet debit (and refund where applicable).
        </p>
      </div>

      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-[170px]" />
        </div>
        <Button onClick={load} disabled={loading} variant="outline" className="h-9">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Reload
        </Button>
      </div>

      {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Orders" value={summary.totalOrders} />
        <SummaryCard label="Approved" value={summary.success} tone="ok" />
        <SummaryCard label="Refunded" value={summary.refunded} tone="warn" />
        <SummaryCard label="Net Debited" value={`₹${summary.totalDebited}`} />
        <SummaryCard label="Issues" value={summary.issues} tone={summary.issues ? "bad" : "ok"} />
      </div>

      <div className="space-y-3">
        {rows.length === 0 && !loading && (
          <Alert><AlertDescription>No coupon orders found for {date}.</AlertDescription></Alert>
        )}
        {rows.map((r) => (
          <Card key={r.order.id} className={r.ok ? "" : "border-destructive"}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {r.ok
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      : <AlertTriangle className="h-4 w-4 text-destructive" />}
                    {r.user?.name || r.order.retailerId}
                    <Badge variant="outline" className="ml-1 text-xs font-mono">{r.user?.email}</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {new Date(r.order.createdAt).toLocaleString()} · VLE <code>{r.order.vleId}</code> · Qty {r.order.qty}
                  </CardDescription>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <Badge variant={r.order.status === "SUCCESS" ? "default" : r.order.status === "FAILED" ? "destructive" : "secondary"}>
                    {r.order.status}{r.order.refunded ? " · refunded" : ""}
                  </Badge>
                  <p className="text-muted-foreground">Order ₹{r.order.totalDebit}</p>
                  <p className="text-muted-foreground">Wallet now ₹{r.walletBalance.toFixed(2)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label="Debits" value={`${r.debits.length} × ₹${r.order.totalDebit}`} />
                <Stat label="Refunds" value={`${r.refunds.length} × ₹${r.order.totalDebit}`} />
                <Stat label="Net charged" value={`₹${r.netDebited}`} />
                <Stat label="Expected" value={`₹${r.expected}`}
                      tone={r.diff === 0 ? "ok" : "bad"} />
              </div>
              {r.flags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {r.flags.map((f) => (
                    <Badge key={f} variant="destructive" className="text-[10px]">{f}</Badge>
                  ))}
                </div>
              )}
              {r.order.providerOrderId && (
                <p className="text-muted-foreground">Provider order: <code>{r.order.providerOrderId}</code></p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone?: "ok" | "warn" | "bad" }) {
  const color =
    tone === "ok" ? "text-emerald-600" :
    tone === "warn" ? "text-amber-600" :
    tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded border p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`font-semibold ${color}`}>{value}</p>
    </div>
  );
}

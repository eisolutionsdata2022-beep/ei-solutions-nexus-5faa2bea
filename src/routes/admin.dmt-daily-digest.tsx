import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listenAllTransfers, loadDmtConfig } from "@/lib/dmt-firebase";
import type { DmtTransfer, DmtConfig } from "@/lib/dmt-types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, Download, RefreshCw, TrendingUp, CheckCircle2, XCircle, Clock, IndianRupee, Users } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/admin/dmt-daily-digest")({
  ssr: false,
  component: AdminDmtDailyDigest,
});

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function AdminDmtDailyDigest() {
  const [transfers, setTransfers] = useState<DmtTransfer[]>([]);
  const [cfg, setCfg] = useState<DmtConfig | null>(null);
  const [date, setDate] = useState<string>(yesterdayISO());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDmtConfig().then(setCfg);
    const unsub = listenAllTransfers((list) => {
      setTransfers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const dayTx = useMemo(
    () => transfers.filter((t) => t.createdAt.startsWith(date)),
    [transfers, date]
  );

  const stats = useMemo(() => {
    const success = dayTx.filter((t) => t.status === "success");
    const failed = dayTx.filter((t) => t.status === "failed" || t.status === "refunded");
    const pending = dayTx.filter((t) => t.status === "pending" || t.status === "processing");
    const totalAmount = success.reduce((s, t) => s + (t.amount || 0), 0);
    const totalCharges = success.reduce((s, t) => s + (t.charge || 0), 0);
    const totalGst = success.reduce((s, t) => s + (t.gst || 0), 0);
    const totalCommission = success.reduce((s, t) => s + (t.retailerCommission || 0), 0);
    const platformNet = totalCharges - totalCommission;
    return {
      total: dayTx.length,
      success: success.length,
      failed: failed.length,
      pending: pending.length,
      totalAmount,
      totalCharges,
      totalGst,
      totalCommission,
      platformNet,
      successRate: dayTx.length ? (success.length / dayTx.length) * 100 : 0,
    };
  }, [dayTx]);

  const perRetailer = useMemo(() => {
    const map = new Map<string, {
      retailerId: string;
      retailerEmail: string;
      total: number;
      success: number;
      failed: number;
      amount: number;
      charges: number;
      commission: number;
    }>();
    for (const t of dayTx) {
      const key = t.retailerId;
      const cur = map.get(key) || {
        retailerId: t.retailerId,
        retailerEmail: t.retailerEmail,
        total: 0, success: 0, failed: 0, amount: 0, charges: 0, commission: 0,
      };
      cur.total += 1;
      if (t.status === "success") {
        cur.success += 1;
        cur.amount += t.amount || 0;
        cur.charges += t.charge || 0;
        cur.commission += t.retailerCommission || 0;
      } else if (t.status === "failed" || t.status === "refunded") {
        cur.failed += 1;
      }
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [dayTx]);

  const downloadExcel = () => {
    if (!dayTx.length) {
      toast.error("No transactions for this date");
      return;
    }
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summary = [
      ["DMT Daily Settlement Report"],
      ["Date", date],
      ["Generated", new Date().toLocaleString("en-IN")],
      [],
      ["Total Transactions", stats.total],
      ["Successful", stats.success],
      ["Failed / Refunded", stats.failed],
      ["Pending", stats.pending],
      ["Success Rate %", stats.successRate.toFixed(2)],
      [],
      ["Total Amount Transferred (₹)", stats.totalAmount],
      ["Total Base Charges (₹)", stats.totalCharges],
      ["Total GST Collected (₹)", stats.totalGst],
      ["Retailer Commission Paid (₹)", stats.totalCommission],
      ["Platform Net Earnings (₹)", stats.platformNet],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    // Per-retailer sheet
    const retailerRows = [
      ["Retailer Email", "Retailer ID", "Total Txns", "Success", "Failed", "Amount (₹)", "Charges Earned (₹)", "Commission Paid (₹)"],
      ...perRetailer.map((r) => [r.retailerEmail, r.retailerId, r.total, r.success, r.failed, r.amount, r.charges, r.commission]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(retailerRows);
    XLSX.utils.book_append_sheet(wb, ws2, "Per Retailer");

    // All transactions
    const txRows = [
      ["Time", "Status", "Retailer", "Customer", "Mobile", "Beneficiary", "Account", "IFSC", "Bank", "Mode", "Amount", "Charge", "GST", "Total Debit", "UTR", "Commission"],
      ...dayTx.map((t) => [
        new Date(t.createdAt).toLocaleTimeString("en-IN"),
        t.status,
        t.retailerEmail,
        t.customerName,
        t.customerMobile,
        t.beneficiaryName,
        t.beneficiaryAccount,
        t.beneficiaryIfsc,
        t.beneficiaryBank,
        t.mode,
        t.amount,
        t.charge,
        t.gst,
        t.totalDebit,
        t.utr || "",
        t.retailerCommission || 0,
      ]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(txRows);
    XLSX.utils.book_append_sheet(wb, ws3, "Transactions");

    XLSX.writeFile(wb, `DMT-Settlement-${date}.xlsx`);
    toast.success("Excel downloaded");
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" /> DMT Daily Digest
          </h1>
          <p className="text-muted-foreground text-sm">
            Finance settlement report — yesterday's transfers, charges earned, retailer commissions paid, and platform net.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs">Report date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </div>
          <Button variant="outline" onClick={() => setDate(yesterdayISO())}>
            <RefreshCw className="w-4 h-4 mr-1" /> Yesterday
          </Button>
          <Button onClick={downloadExcel}>
            <Download className="w-4 h-4 mr-1" /> Download Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading transactions…</p>
      ) : (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={TrendingUp} label="Total Transactions" value={stats.total} tone="default" />
            <StatCard icon={CheckCircle2} label="Successful" value={stats.success} tone="success" sub={`${stats.successRate.toFixed(1)}% success rate`} />
            <StatCard icon={XCircle} label="Failed / Refunded" value={stats.failed} tone="danger" />
            <StatCard icon={Clock} label="Pending" value={stats.pending} tone="warning" />
          </div>

          {/* Money */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="w-4 h-4" /> Settlement Summary
              </CardTitle>
              <CardDescription>All amounts in INR. Based on successful transfers only.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Money label="Amount transferred" value={stats.totalAmount} />
              <Money label="Base charges" value={stats.totalCharges} c="text-blue-700" />
              <Money label="GST collected" value={stats.totalGst} c="text-purple-700" />
              <Money label="Commission paid to retailers" value={stats.totalCommission} c="text-amber-700" />
              <Money label="Platform net earnings" value={stats.platformNet} c="text-green-700" />
            </CardContent>
          </Card>

          {/* Per retailer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" /> Per-Retailer Breakdown
              </CardTitle>
              <CardDescription>{perRetailer.length} retailers active on {date}</CardDescription>
            </CardHeader>
            <CardContent>
              {perRetailer.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No transactions on this date.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Retailer</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Success</TableHead>
                        <TableHead className="text-right">Failed</TableHead>
                        <TableHead className="text-right">Amount (₹)</TableHead>
                        <TableHead className="text-right">Charges (₹)</TableHead>
                        <TableHead className="text-right">Commission (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {perRetailer.map((r) => (
                        <TableRow key={r.retailerId}>
                          <TableCell className="font-medium">{r.retailerEmail}</TableCell>
                          <TableCell className="text-right">{r.total}</TableCell>
                          <TableCell className="text-right text-green-700">{r.success}</TableCell>
                          <TableCell className="text-right text-red-700">{r.failed}</TableCell>
                          <TableCell className="text-right">₹{r.amount.toFixed(0)}</TableCell>
                          <TableCell className="text-right">₹{r.charges.toFixed(0)}</TableCell>
                          <TableCell className="text-right text-amber-700">₹{r.commission.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent txns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transactions ({dayTx.length})</CardTitle>
              <CardDescription>All transfers on {date}, newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              {dayTx.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No transactions.</p>
              ) : (
                <div className="overflow-x-auto max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead>UTR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayTx.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">{new Date(t.createdAt).toLocaleTimeString("en-IN")}</TableCell>
                          <TableCell><StatusBadge status={t.status} /></TableCell>
                          <TableCell className="text-xs">{t.customerName}<br /><span className="text-muted-foreground">{t.customerMobile}</span></TableCell>
                          <TableCell className="text-xs">{t.beneficiaryName}<br /><span className="text-muted-foreground">{t.beneficiaryBank}</span></TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{t.mode}</Badge></TableCell>
                          <TableCell className="text-right">₹{t.amount.toFixed(0)}</TableCell>
                          <TableCell className="text-right">₹{t.totalDebit.toFixed(0)}</TableCell>
                          <TableCell className="text-xs font-mono">{t.utr || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {cfg && (
            <p className="text-xs text-muted-foreground text-center">
              Commission rate: {cfg.retailerCommissionPercent}% of base charge · GST: {cfg.gstPercent}%
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone, sub }: {
  icon: React.ElementType; label: string; value: number; tone: "default" | "success" | "danger" | "warning"; sub?: string;
}) {
  const toneCls = {
    default: "text-foreground",
    success: "text-green-700",
    danger: "text-red-700",
    warning: "text-amber-700",
  }[tone];
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={`w-4 h-4 ${toneCls}`} />
      </div>
      <p className={`text-2xl font-bold mt-1 ${toneCls}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function Money({ label, value, c }: { label: string; value: number; c?: string }) {
  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${c || ""}`}>₹{value.toFixed(2)}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    success: { cls: "bg-green-100 text-green-800 border-green-200", label: "Success" },
    failed: { cls: "bg-red-100 text-red-800 border-red-200", label: "Failed" },
    refunded: { cls: "bg-orange-100 text-orange-800 border-orange-200", label: "Refunded" },
    pending: { cls: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Pending" },
    processing: { cls: "bg-blue-100 text-blue-800 border-blue-200", label: "Processing" },
  };
  const m = map[status] || { cls: "", label: status };
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/lib/auth-context";
import {
  listenAllTransfers,
  markTransferProcessing,
  markTransferSuccess,
  markTransferFailedAndRefund,
} from "@/lib/dmt-firebase";
import type { DmtTransfer } from "@/lib/dmt-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, CheckCircle2, XCircle, Clock, RefreshCcw, Send, Copy, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/dmt")({
  ssr: false,
  component: StaffDmtQueue,
});

function StaffDmtQueue() {
  const { appUser } = useAuth();
  const [all, setAll] = useState<DmtTransfer[]>([]);
  const [active, setActive] = useState<DmtTransfer | null>(null);
  const [utr, setUtr] = useState("");
  const [reason, setReason] = useState("");
  const [tab, setTab] = useState("queue");
  const [busy, setBusy] = useState(false);

  useEffect(() => listenAllTransfers(setAll), []);

  const queue = useMemo(() => all.filter((t) => t.status === "pending" || t.status === "processing"), [all]);
  const done = useMemo(() => all.filter((t) => ["success", "failed", "refunded"].includes(t.status)), [all]);

  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const t = all.filter((x) => new Date(x.createdAt).toDateString() === today);
    return {
      total: t.length,
      success: t.filter((x) => x.status === "success").length,
      pending: t.filter((x) => x.status === "pending" || x.status === "processing").length,
      failed: t.filter((x) => x.status === "failed" || x.status === "refunded").length,
      amount: t.filter((x) => x.status === "success").reduce((s, x) => s + x.amount, 0),
    };
  }, [all]);

  const startProcess = async (t: DmtTransfer) => {
    if (!appUser || !t.id) return;
    if (t.status === "pending") {
      await markTransferProcessing(t.id, appUser.uid, appUser.name || appUser.email);
    }
    setActive(t); setUtr(""); setReason("");
  };

  const finishSuccess = async () => {
    if (!active?.id || !utr.trim()) { toast.error("Enter UTR"); return; }
    setBusy(true);
    try {
      await markTransferSuccess(active.id, utr.trim());
      toast.success("Marked success");
      setActive(null);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const finishFail = async () => {
    if (!active?.id || !reason.trim()) { toast.error("Enter reason"); return; }
    setBusy(true);
    try {
      await markTransferFailedAndRefund(active.id, reason.trim());
      toast.success("Marked failed · wallet refunded");
      setActive(null);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="w-6 h-6 text-primary" /> DMT Processing Queue
          </h1>
          <p className="text-muted-foreground text-sm">
            Manually transfer funds from your bank, then mark each request as success (with UTR) or failed (auto-refund).
          </p>
        </div>
        <ExportPanel transfers={all} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Tile label="Today total" value={todayStats.total} />
        <Tile label="Success" value={todayStats.success} c="text-green-700" />
        <Tile label="Pending" value={todayStats.pending} c="text-amber-700" />
        <Tile label="Failed" value={todayStats.failed} c="text-red-700" />
        <Tile label="Amount" value={`₹${todayStats.amount.toFixed(0)}`} c="text-primary" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="queue">Pending ({queue.length})</TabsTrigger>
          <TabsTrigger value="done">Completed ({done.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4 space-y-2">
          {queue.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No pending transfers</CardContent></Card>
          ) : queue.map((t) => <QueueRow key={t.id} t={t} onClick={() => startProcess(t)} />)}
        </TabsContent>

        <TabsContent value="done" className="mt-4 space-y-2">
          {done.slice(0, 100).map((t) => <QueueRow key={t.id} t={t} onClick={() => setActive(t)} compact />)}
        </TabsContent>
      </Tabs>

      {/* Process dialog */}
      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Process Transfer</DialogTitle>
            <DialogDescription>Verify details, then transfer funds and mark status.</DialogDescription>
          </DialogHeader>

          {active && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <RowKV k="Customer" v={`${active.customerName} (${active.customerMobile})`} />
                <RowKV k="Beneficiary" v={active.beneficiaryName} />
                <RowKV k="Account" v={active.beneficiaryAccount} copyable />
                <RowKV k="IFSC" v={active.beneficiaryIfsc} copyable />
                <RowKV k="Bank" v={active.beneficiaryBank} />
                <RowKV k="Mode" v={active.mode} />
                <RowKV k="Amount" v={`₹${active.amount.toFixed(2)}`} />
                <RowKV k="Charge + GST" v={`₹${(active.charge + active.gst).toFixed(2)}`} />
                <RowKV k="Total debited" v={`₹${active.totalDebit.toFixed(2)}`} />
                {active.purpose && <RowKV k="Purpose" v={active.purpose} />}
                {active.utr && <RowKV k="UTR" v={active.utr} />}
                {active.failureReason && <RowKV k="Failure" v={active.failureReason} />}
              </div>

              {(active.status === "pending" || active.status === "processing") && (
                <>
                  <div>
                    <Label>UTR / Reference Number</Label>
                    <Input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 123456789012" />
                  </div>
                  <div>
                    <Label>Failure reason (if failed)</Label>
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Invalid account" />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="destructive" disabled={busy} onClick={finishFail}>
                      <XCircle className="w-4 h-4 mr-1" /> Failed + Refund
                    </Button>
                    <Button disabled={busy} onClick={finishSuccess}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Success
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tile({ label, value, c }: { label: string; value: string | number; c?: string }) {
  return (
    <Card><CardContent className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${c || ""}`}>{value}</p>
    </CardContent></Card>
  );
}

function RowKV({ k, v, copyable }: { k: string; v: string; copyable?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium flex items-center gap-1">
        {v}
        {copyable && (
          <button onClick={() => { navigator.clipboard.writeText(v); toast.success("Copied"); }}>
            <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </span>
    </div>
  );
}

function QueueRow({ t, onClick, compact }: { t: DmtTransfer; onClick: () => void; compact?: boolean }) {
  const sMap = {
    pending: { c: "bg-amber-500/10 text-amber-700", I: Clock, t: "Pending" },
    processing: { c: "bg-blue-500/10 text-blue-700", I: RefreshCcw, t: "Processing" },
    success: { c: "bg-green-500/10 text-green-700", I: CheckCircle2, t: "Success" },
    failed: { c: "bg-red-500/10 text-red-700", I: XCircle, t: "Failed" },
    refunded: { c: "bg-violet-500/10 text-violet-700", I: RefreshCcw, t: "Refunded" },
  } as const;
  const s = sMap[t.status];
  return (
    <Card className="cursor-pointer hover:border-primary transition" onClick={onClick}>
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-base">₹{t.amount.toFixed(2)}</p>
              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold ${s.c}`}>
                <s.I className="w-3 h-3" /> {s.t}
              </span>
              <Badge variant="outline" className="text-[10px]">{t.mode}</Badge>
            </div>
            <p className="text-sm font-medium mt-1">{t.beneficiaryName} · {t.beneficiaryBank}</p>
            <p className="text-xs text-muted-foreground">A/C {t.beneficiaryAccount} · IFSC {t.beneficiaryIfsc}</p>
            <p className="text-xs text-muted-foreground">
              Cust: {t.customerName} ({t.customerMobile}) · By: {t.retailerEmail}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(t.createdAt).toLocaleString()}
              {t.utr && ` · UTR ${t.utr}`}
              {t.refundRef && ` · Refund ${t.refundRef}`}
            </p>
          </div>
          {(t.status === "pending" || t.status === "processing") && (
            <Button size="sm"><Send className="w-3.5 h-3.5 mr-1" /> Process</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Export Panel ──────────────────────────────────────────────────────
function ExportPanel({ transfers }: { transfers: DmtTransfer[] }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [retailerFilter, setRetailerFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"none" | "retailer">("none");

  const retailers = useMemo(() => {
    const set = new Map<string, string>();
    transfers.forEach((t) => set.set(t.retailerId, t.retailerEmail));
    return Array.from(set.entries()).map(([id, email]) => ({ id, email }));
  }, [transfers]);

  const filtered = useMemo(() => {
    const fromDt = new Date(`${from}T00:00:00`).getTime();
    const toDt = new Date(`${to}T23:59:59`).getTime();
    return transfers.filter((t) => {
      const ts = new Date(t.createdAt).getTime();
      if (ts < fromDt || ts > toDt) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (retailerFilter !== "all" && t.retailerId !== retailerFilter) return false;
      return true;
    });
  }, [transfers, from, to, statusFilter, retailerFilter]);

  const buildRows = () =>
    filtered.map((t) => ({
      "Txn ID": t.id ?? "",
      Date: new Date(t.createdAt).toLocaleString(),
      Retailer: t.retailerEmail,
      Customer: t.customerName,
      "Customer Mobile": t.customerMobile,
      Beneficiary: t.beneficiaryName,
      Account: t.beneficiaryAccount,
      IFSC: t.beneficiaryIfsc,
      Bank: t.beneficiaryBank,
      Mode: t.mode,
      "Amount (₹)": t.amount,
      "Charge (₹)": t.charge,
      "GST (₹)": t.gst,
      "Total Debit (₹)": t.totalDebit,
      "Retailer Commission (₹)": t.retailerCommission ?? 0,
      Status: t.status,
      UTR: t.utr ?? "",
      "Failure Reason": t.failureReason ?? "",
      "Refund Ref": t.refundRef ?? "",
      "Processed By": t.staffName ?? "",
      Purpose: t.purpose ?? "",
    }));

  const downloadXlsx = () => {
    if (filtered.length === 0) { toast.error("No transfers in selected range"); return; }
    const wb = XLSX.utils.book_new();
    const rows = buildRows();

    if (groupBy === "retailer") {
      const grouped = new Map<string, typeof rows>();
      rows.forEach((r) => {
        const list = grouped.get(r.Retailer) || [];
        list.push(r);
        grouped.set(r.Retailer, list);
      });
      // Summary sheet
      const summary = Array.from(grouped.entries()).map(([retailer, rs]) => {
        const success = rs.filter((r) => r.Status === "success");
        return {
          Retailer: retailer,
          "Total Txns": rs.length,
          Success: success.length,
          Failed: rs.filter((r) => r.Status === "failed" || r.Status === "refunded").length,
          Pending: rs.filter((r) => r.Status === "pending" || r.Status === "processing").length,
          "Amount Transferred (₹)": success.reduce((s, r) => s + (r["Amount (₹)"] as number), 0),
          "Charges Earned (₹)": success.reduce(
            (s, r) => s + (r["Charge (₹)"] as number) + (r["GST (₹)"] as number), 0
          ),
          "Retailer Commission Paid (₹)": success.reduce(
            (s, r) => s + (r["Retailer Commission (₹)"] as number), 0
          ),
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
      grouped.forEach((rs, retailer) => {
        const safe = retailer.replace(/[^A-Za-z0-9]/g, "_").slice(0, 25) || "retailer";
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rs), safe);
      });
    } else {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Transfers");
    }

    const fname = `DMT_Settlement_${from}_to_${to}.xlsx`;
    XLSX.writeFile(wb, fname);
    toast.success(`Exported ${filtered.length} txns`);
  };

  const downloadCsv = () => {
    if (filtered.length === 0) { toast.error("No transfers in selected range"); return; }
    const ws = XLSX.utils.json_to_sheet(buildRows());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DMT_Settlement_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} txns`);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="w-4 h-4 mr-1" /> Export Settlement
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settlement Report Export</DialogTitle>
            <DialogDescription>Filter by date, status, and retailer for finance reconciliation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="success">Success only</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Retailer</Label>
              <Select value={retailerFilter} onValueChange={setRetailerFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All retailers</SelectItem>
                  {retailers.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Group by</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Single sheet</SelectItem>
                  <SelectItem value="retailer">Per-retailer sheets + summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
              {filtered.length} transfer{filtered.length === 1 ? "" : "s"} match.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={downloadCsv}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button onClick={downloadXlsx}>
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel (.xlsx)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

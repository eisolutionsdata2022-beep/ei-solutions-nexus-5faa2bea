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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="w-6 h-6 text-primary" /> DMT Processing Queue
        </h1>
        <p className="text-muted-foreground text-sm">
          Manually transfer funds from your bank, then mark each request as success (with UTR) or failed (auto-refund).
        </p>
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

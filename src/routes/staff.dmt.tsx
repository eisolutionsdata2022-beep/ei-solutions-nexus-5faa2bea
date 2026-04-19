import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  listenAllTransfers,
  markTransferProcessing,
  markTransferSuccess,
  markTransferFailedAndRefund,
  updateTransferRemark,
  deleteTransfer,
} from "@/lib/dmt-firebase";
import {
  type DmtTransfer,
  DMT_STATUS_OPTIONS,
  formatDmtDate,
  getDmtStatusColor,
  generateUtr,
  type DmtStatus,
} from "@/lib/dmt-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Banknote, Search, CheckCircle2, XCircle, Send, RefreshCcw,
  Trash2, Eye, FileSpreadsheet, MessageSquare, Copy,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/staff/dmt")({
  ssr: false,
  component: StaffDmtPage,
});

function StaffDmtPage() {
  const { appUser } = useAuth();
  const [transfers, setTransfers] = useState<DmtTransfer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DmtStatus>("all");
  const [selected, setSelected] = useState<DmtTransfer | null>(null);

  useEffect(() => listenAllTransfers(setTransfers), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transfers.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      return [t.id, t.beneficiaryName, t.beneficiaryAccount, t.beneficiaryIfsc, t.customerName, t.customerMobile, t.retailerEmail, t.utr].some((v) => (v || "").toString().toLowerCase().includes(q));
    });
  }, [transfers, search, statusFilter]);

  const stats = useMemo(() => ({
    total: transfers.length,
    pending: transfers.filter((t) => t.status === "pending").length,
    processing: transfers.filter((t) => t.status === "processing").length,
    success: transfers.filter((t) => t.status === "success").length,
    failed: transfers.filter((t) => t.status === "failed" || t.status === "refunded").length,
  }), [transfers]);

  const exportExcel = () => {
    const rows = filtered.map((t) => ({
      ID: t.id, Status: t.status, "Created": t.createdAt,
      Customer: t.customerName, "Customer Mobile": t.customerMobile,
      Beneficiary: t.beneficiaryName, Bank: t.beneficiaryBank, IFSC: t.beneficiaryIfsc, Account: t.beneficiaryAccount,
      Mode: t.mode, Amount: t.amount, Charge: t.charge, GST: t.gst, "Total Debit": t.totalDebit,
      UTR: t.utr, Retailer: t.retailerEmail, Remark: t.staffRemark, Failure: t.failureReason,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DMT Transfers");
    XLSX.writeFile(wb, `dmt-${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-premium-gradient p-6 text-white shadow-premium">
        <div className="pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full bg-white/15 blur-3xl animate-blob" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/75 font-bold">Staff Console</p>
              <h1 className="text-2xl font-bold">DMT Queue</h1>
            </div>
          </div>
          <Button variant="secondary" onClick={exportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatBox label="Total" value={stats.total} color="from-blue-500 to-indigo-600" />
        <StatBox label="Pending" value={stats.pending} color="from-amber-500 to-orange-600" />
        <StatBox label="Processing" value={stats.processing} color="from-cyan-500 to-blue-600" />
        <StatBox label="Success" value={stats.success} color="from-emerald-500 to-teal-600" />
        <StatBox label="Failed" value={stats.failed} color="from-rose-500 to-pink-600" />
      </div>

      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, account, IFSC, UTR, retailer..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {DMT_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No transfers match.</div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((t) => (
              <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getDmtStatusColor(t.status)}`}>{t.status}</span>
                    <span className="text-xs text-muted-foreground">{formatDmtDate(t.createdAt)}</span>
                    <span className="text-xs font-mono">{t.mode}</span>
                  </div>
                  <p className="font-semibold text-sm">{t.beneficiaryName} — {t.beneficiaryBank}</p>
                  <p className="text-xs text-muted-foreground">A/C {t.beneficiaryAccount} · {t.beneficiaryIfsc} · From: {t.customerName} ({t.customerMobile}) · Retailer: {t.retailerEmail}</p>
                  {t.utr && <p className="text-xs font-mono text-emerald-700">UTR: {t.utr}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="font-bold tabular-nums text-foreground">₹{t.amount.toLocaleString("en-IN")}</p>
                  <Button size="sm" variant="outline" onClick={() => setSelected(t)}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ManageDmtDialog
          tx={selected}
          staffId={appUser?.uid || ""}
          staffName={appUser?.name || appUser?.email || "Staff"}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl glass-card p-4">
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${color} opacity-25 blur-2xl`} />
      <p className="relative text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{label}</p>
      <p className="relative text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function ManageDmtDialog({ tx, staffId, staffName, onClose }: { tx: DmtTransfer; staffId: string; staffName: string; onClose: () => void }) {
  const [remark, setRemark] = useState(tx.staffRemark || "");
  const [utr, setUtr] = useState(tx.utr || "");
  const [reason, setReason] = useState(tx.failureReason || "");
  const [busy, setBusy] = useState(false);

  const wrap = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); onClose(); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Transfer</DialogTitle>
          <DialogDescription>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getDmtStatusColor(tx.status)}`}>{tx.status}</span>
            <span className="ml-2 text-xs">{formatDmtDate(tx.createdAt)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 text-sm">
          <Row label="From Customer" value={`${tx.customerName} (${tx.customerMobile})`} />
          <Row label="Beneficiary" value={tx.beneficiaryName} />
          <Row label="Bank / IFSC" value={`${tx.beneficiaryBank} · ${tx.beneficiaryIfsc}`} />
          <Row label="Account" value={tx.beneficiaryAccount} copy />
          <Row label="Mode" value={tx.mode} />
          <Row label="Amount" value={`₹${tx.amount.toFixed(2)}`} />
          <Row label="Total Debit" value={`₹${tx.totalDebit.toFixed(2)}`} />
          <Row label="Retailer" value={tx.retailerEmail} />
          {tx.purpose && <Row label="Purpose" value={tx.purpose} />}
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff Remark</Label>
          <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Notes visible to retailer" />
          <div className="flex gap-2">
            <Input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="UTR (on success)" />
            <Button variant="outline" size="sm" onClick={() => setUtr(generateUtr())}>Gen</Button>
          </div>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Failure reason (on fail)" />
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => wrap(() => updateTransferRemark(tx.id!, remark), "Remark saved")} disabled={busy}>
            <MessageSquare className="w-4 h-4 mr-1" /> Save Remark
          </Button>
          <Button variant="outline" size="sm" className="text-blue-700 border-blue-300" onClick={() => wrap(() => markTransferProcessing(tx.id!, staffId, staffName), "Marked processing")} disabled={busy}>
            <Send className="w-4 h-4 mr-1" /> Processing
          </Button>
          <Button variant="outline" size="sm" className="text-emerald-700 border-emerald-300" onClick={() => {
            if (!utr.trim()) { toast.error("UTR required for success"); return; }
            wrap(() => markTransferSuccess(tx.id!, utr.trim(), remark), "Marked success");
          }} disabled={busy}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Success
          </Button>
          <Button variant="outline" size="sm" className="text-rose-700 border-rose-300" onClick={() => {
            if (!reason.trim()) { toast.error("Failure reason required"); return; }
            wrap(() => markTransferFailedAndRefund(tx.id!, reason.trim()), "Failed & refunded");
          }} disabled={busy}>
            <XCircle className="w-4 h-4 mr-1" /> Fail + Refund
          </Button>
          <Button variant="destructive" size="sm" onClick={() => {
            if (!confirm("Permanently delete?")) return;
            wrap(() => deleteTransfer(tx.id!), "Deleted");
          }} disabled={busy}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/40 items-center">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="col-span-2 text-foreground break-words flex items-center gap-1">
        {value}
        {copy && (
          <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }} className="text-muted-foreground hover:text-primary">
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}

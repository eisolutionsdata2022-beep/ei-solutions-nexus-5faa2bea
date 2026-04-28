import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  listenAllApplications,
  approveEdisApplication,
  completeEdisApplication,
  rejectEdisApplicationAndRefund,
  setPendingEdisApplication,
  updateEdisRemark,
  deleteEdisApplication,
  type EdisApplication,
} from "@/lib/edis-firebase";
import { EDIS_STATUS_OPTIONS, formatEdisDate, getEdisStatusColor, type EdisStatus } from "@/lib/edis-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardList, Search, CheckCircle2, XCircle, Clock, Eye, Trash2, Download,
  ExternalLink, FileSpreadsheet, MessageSquare, RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/staff/services")({
  ssr: false,
  component: StaffServicesPage,
});

function StaffServicesPage() {
  const { appUser } = useAuth();
  const [apps, setApps] = useState<EdisApplication[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EdisStatus>("all");
  const [selected, setSelected] = useState<EdisApplication | null>(null);

  useEffect(() => listenAllApplications(setApps), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return [a.applicationNo, a.serviceName, a.fullName, a.mobile, a.aadhaar, a.retailerEmail].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [apps, search, statusFilter]);

  const stats = useMemo(() => ({
    total: apps.length,
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved" || a.status === "completed").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  }), [apps]);

  const exportExcel = () => {
    const rows = filtered.map((a) => ({
      "App No": a.applicationNo, Service: a.serviceName, Status: a.status, Fee: a.fee,
      Name: a.fullName, Mobile: a.mobile, Email: a.email, Aadhaar: a.aadhaar,
      Address: a.address, District: a.district, Pincode: a.pincode, Purpose: a.purpose,
      Retailer: a.retailerEmail, "Submitted": a.createdAt,
      "Gov Receipt": a.govReceiptNo, "Staff Remark": a.staffRemark, "Rejection": a.rejectionReason,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "E-dis Applications");
    XLSX.writeFile(wb, `edis-${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-premium-gradient p-6 text-white shadow-premium">
        <div className="pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full bg-white/15 blur-3xl animate-blob" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/75 font-bold">Staff Console</p>
              <h1 className="text-2xl font-bold">E-dis Applications</h1>
            </div>
          </div>
          <Button variant="secondary" onClick={exportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Total" value={stats.total} color="from-blue-500 to-indigo-600" />
        <StatBox label="Pending" value={stats.pending} color="from-amber-500 to-orange-600" />
        <StatBox label="Approved" value={stats.approved} color="from-emerald-500 to-teal-600" />
        <StatBox label="Rejected" value={stats.rejected} color="from-rose-500 to-pink-600" />
      </div>

      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by app no, name, mobile, retailer..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {EDIS_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No applications match.</div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((a) => (
              <div key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{a.applicationNo}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getEdisStatusColor(a.status)}`}>{a.status}</span>
                    <span className="text-xs text-muted-foreground">{formatEdisDate(a.createdAt)}</span>
                  </div>
                  <p className="font-semibold text-sm">{a.serviceName} — {a.fullName}</p>
                  <p className="text-xs text-muted-foreground">{a.mobile} · {a.district} · ₹{a.fee} · By: {a.retailerEmail}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelected(a)}>
                  <Eye className="w-3.5 h-3.5 mr-1" /> Manage
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ManageEdisDialog
          app={selected}
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

async function downloadDoc(d: { name: string; url: string; fileName: string }, app: EdisApplication) {
  try {
    const res = await fetch(d.url);
    const blob = await res.blob();
    const ext = (d.fileName.split(".").pop() || "bin").toLowerCase();
    const safeName = `${app.applicationNo}_${app.fullName}_${d.name}`.replace(/[^a-zA-Z0-9_-]+/g, "_");
    const a = document.createElement("a");
    const objUrl = URL.createObjectURL(blob);
    a.href = objUrl;
    a.download = `${safeName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  } catch (e: any) {
    toast.error(`Download failed: ${d.name}`);
  }
}

function ManageEdisDialog({ app, staffName, onClose }: { app: EdisApplication; staffName: string; onClose: () => void }) {
  const [remark, setRemark] = useState(app.staffRemark || "");
  const [govNo, setGovNo] = useState(app.govReceiptNo || "");
  const [rejectReason, setRejectReason] = useState(app.rejectionReason || "");
  const [busy, setBusy] = useState(false);

  const wrap = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); onClose(); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{app.serviceName}</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{app.applicationNo}</span> ·{" "}
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getEdisStatusColor(app.status)}`}>{app.status}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Row label="Applicant" value={`${app.fullName} (${app.gender}, DOB ${app.dob})`} />
          <Row label="Contact" value={`${app.mobile}${app.email ? ` · ${app.email}` : ""}`} />
          <Row label="Aadhaar" value={app.aadhaar} />
          <Row label="Address" value={`${app.address}, ${app.district} - ${app.pincode}`} />
          <Row label="Purpose" value={app.purpose} />
          <Row label="Fee" value={`₹${app.fee} ${app.walletDebited ? "(debited)" : ""}`} />
          <Row label="Retailer" value={app.retailerEmail} />

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents ({app.documents.length})</p>
              {app.documents.length > 0 && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => {
                  for (const d of app.documents) {
                    await downloadDoc(d, app);
                  }
                  toast.success("All documents downloaded");
                }}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Download All
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              {app.documents.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted/40">
                  <span className="font-medium flex-1 min-w-0 truncate">{d.name}</span>
                  <span className="text-xs text-muted-foreground truncate hidden sm:inline">{d.fileName}</span>
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => downloadDoc(d, app)} title="Download">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border hover:bg-muted" title="Open in new tab">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
              {app.documents.length === 0 && <p className="text-xs text-muted-foreground">No documents.</p>}
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff Remark</Label>
            <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Notes visible to retailer" />
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gov Receipt No (on Approve/Complete)</Label>
            <Input value={govNo} onChange={(e) => setGovNo(e.target.value)} placeholder="e.g. KER-2025-XXXX" />
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rejection Reason (on Reject)</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason if rejecting" />
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => wrap(() => updateEdisRemark(app.id!, remark), "Remark saved")} disabled={busy}>
            <MessageSquare className="w-4 h-4 mr-1" /> Save Remark
          </Button>
          <Button variant="outline" size="sm" onClick={() => wrap(() => setPendingEdisApplication(app.id!, remark), "Set to pending")} disabled={busy}>
            <Clock className="w-4 h-4 mr-1" /> Pending
          </Button>
          <Button variant="outline" size="sm" className="text-emerald-700 border-emerald-300" onClick={() => wrap(() => approveEdisApplication(app.id!, { reviewedBy: staffName, staffRemark: remark, govReceiptNo: govNo }), "Approved")} disabled={busy}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
          </Button>
          <Button variant="outline" size="sm" className="text-blue-700 border-blue-300" onClick={() => wrap(() => completeEdisApplication(app.id!, { reviewedBy: staffName, staffRemark: remark, govReceiptNo: govNo }), "Completed")} disabled={busy}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Complete
          </Button>
          <Button variant="outline" size="sm" className="text-rose-700 border-rose-300" onClick={() => {
            if (!rejectReason.trim()) { toast.error("Add rejection reason"); return; }
            wrap(() => rejectEdisApplicationAndRefund(app.id!, { reviewedBy: staffName, rejectionReason: rejectReason }), "Rejected & refunded");
          }} disabled={busy}>
            <XCircle className="w-4 h-4 mr-1" /> Reject + Refund
          </Button>
          <Button variant="destructive" size="sm" onClick={() => {
            if (!confirm("Permanently delete this application?")) return;
            wrap(() => deleteEdisApplication(app.id!), "Deleted");
          }} disabled={busy}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/40">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="col-span-2 text-foreground break-words">{value}</span>
    </div>
  );
}

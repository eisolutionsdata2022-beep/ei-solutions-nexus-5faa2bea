import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Briefcase, Wallet, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  JOB_CATEGORIES,
  type CategoryCommissionDoc,
  type JobCategory,
  type JobDoc,
  type JobStatus,
} from "@/lib/job-marketplace-types";
import {
  setCategoryCommission,
  adminApproveAndPayout,
  calcCommission,
  calcSecurityFee,
} from "@/lib/job-marketplace";

export const Route = createFileRoute("/admin/job-marketplace")({
  ssr: false,
  component: AdminJobMarketplace,
});

const STATUS_FILTERS: { value: JobStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending_admin_approval", label: "🔔 Awaiting My Approval" },
  { value: "open", label: "Open (Bidding)" },
  { value: "assigned", label: "Assigned" },
  { value: "doc_requested", label: "Docs Requested" },
  { value: "submitted", label: "Submitted (Uploader Reviewing)" },
  { value: "disputed", label: "Disputed" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Cancelled" },
];

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "secondary",
  assigned: "secondary",
  doc_requested: "secondary",
  submitted: "outline",
  pending_admin_approval: "default",
  disputed: "destructive",
  completed: "default",
  rejected: "destructive",
  cancelled: "destructive",
};

function AdminJobMarketplace() {
  const { appUser } = useAuth();
  const [jobs, setJobs] = useState<JobDoc[]>([]);
  const [rules, setRules] = useState<Record<string, CategoryCommissionDoc>>({});
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<JobDoc | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);

  // commission rules drafts
  const [draft, setDraft] = useState<
    Record<string, { type: "percent" | "flat"; value: string; sec: string }>
  >({});
  const [savingCat, setSavingCat] = useState<string | null>(null);

  useEffect(() => {
    const unsubJobs = onSnapshot(collection(db, "jobs"), (snap) => {
      const list: JobDoc[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setJobs(list);
      setLoading(false);
    });
    const unsubRules = onSnapshot(collection(db, "jobCategoryCommissions"), (snap) => {
      const map: Record<string, CategoryCommissionDoc> = {};
      snap.forEach((d) => { map[d.id] = d.data() as CategoryCommissionDoc; });
      setRules(map);
    });
    return () => { unsubJobs(); unsubRules(); };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (!q) return true;
      return (
        j.title?.toLowerCase().includes(q) ||
        j.uploaderName?.toLowerCase().includes(q) ||
        j.assignedWorkerName?.toLowerCase().includes(q) ||
        j.category?.toLowerCase().includes(q)
      );
    });
  }, [jobs, statusFilter, search]);

  const stats = useMemo(() => {
    const s = {
      total: jobs.length,
      pendingApproval: 0,
      disputed: 0,
      completed: 0,
      escrowHeld: 0,
      commissionEarned: 0,
    };
    jobs.forEach((j) => {
      if (j.status === "pending_admin_approval") s.pendingApproval++;
      if (j.status === "disputed") s.disputed++;
      if (j.status === "completed") s.completed++;
      if (["assigned", "doc_requested", "submitted", "pending_admin_approval", "disputed"].includes(j.status)) {
        s.escrowHeld += j.budget || 0;
      }
      if (j.status === "completed") s.commissionEarned += j.adminCommission || 0;
    });
    return s;
  }, [jobs]);

  /* -------- approval -------- */
  const previewPayout = (j: JobDoc) => {
    const rule = rules[j.category] ?? {
      category: j.category,
      type: "percent" as const,
      value: 10,
      workerSecurityFeePercent: 5,
      updatedAt: "",
    };
    const bid = j.finalBidAmount || 0;
    const commission = calcCommission(bid, rule);
    const security = j.workerSecurityFee ?? calcSecurityFee(bid, rule);
    const workerNet = bid - commission;
    const workerCredit = workerNet + security;
    const uploaderRefund = Math.max(0, (j.budget || 0) - bid);
    return { commission, workerNet, workerCredit, uploaderRefund, security };
  };

  const handleApprove = async () => {
    if (!selected || !appUser || busy) return;
    setBusy(true);
    try {
      await adminApproveAndPayout(selected.id, appUser.uid, adminNote.trim());
      toast.success("Funds released to worker.");
      setSelected(null);
      setAdminNote("");
    } catch (err: any) {
      toast.error(err.message || "Failed to release payout");
    } finally { setBusy(false); }
  };

  /* -------- commission rules -------- */
  const getDraft = (cat: JobCategory) => {
    if (draft[cat]) return draft[cat];
    const r = rules[cat];
    return {
      type: r?.type ?? "percent",
      value: String(r?.value ?? 10),
      sec: String(r?.workerSecurityFeePercent ?? 5),
    };
  };
  const saveRule = async (cat: JobCategory) => {
    setSavingCat(cat);
    try {
      const d = getDraft(cat);
      await setCategoryCommission({
        category: cat, type: d.type, value: Number(d.value),
        workerSecurityFeePercent: Number(d.sec),
        updatedAt: new Date().toISOString(),
      });
      toast.success(`${cat} updated`);
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingCat(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Briefcase className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Job Marketplace</h1>
        {stats.pendingApproval > 0 && (
          <Badge className="bg-blue-600 text-white">
            {stats.pendingApproval} awaiting approval
          </Badge>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Jobs" value={stats.total} />
        <StatCard label="Awaiting Approval" value={stats.pendingApproval} highlight />
        <StatCard label="Disputed" value={stats.disputed} danger />
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="Commission Earned" value={`₹${stats.commissionEarned.toLocaleString()}`} />
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">All Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="rules">Commission Rules</TabsTrigger>
        </TabsList>

        {/* ============ JOBS LIST ============ */}
        <TabsContent value="jobs" className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search title / uploader / worker / category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Badge variant="outline">{filtered.length} shown</Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
              ) : filtered.length === 0 ? (
                <p className="p-8 text-center text-muted-foreground text-sm">No jobs match this filter.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead>Uploader</TableHead>
                        <TableHead>Worker</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Budget / Bid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Posted</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((j) => (
                        <TableRow
                          key={j.id}
                          className={j.status === "pending_admin_approval" ? "bg-blue-50/40" : undefined}
                        >
                          <TableCell className="max-w-[260px]">
                            <p className="font-semibold truncate">{j.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{j.description}</p>
                          </TableCell>
                          <TableCell className="text-xs">{j.uploaderName}</TableCell>
                          <TableCell className="text-xs">
                            {j.assignedWorkerId ? (
                              <Link
                                to="/worker/$workerId"
                                params={{ workerId: j.assignedWorkerId }}
                                className="text-primary underline"
                              >
                                {j.assignedWorkerName}
                              </Link>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs">{j.category}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            ₹{j.budget}
                            {j.finalBidAmount ? <span className="text-primary font-semibold"> / ₹{j.finalBidAmount}</span> : null}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_BADGE[j.status] || "secondary"} className="text-[10px]">
                              {j.status === "pending_admin_approval" ? "awaiting approval" : j.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(j.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            {j.status === "pending_admin_approval" && (
                              <Button size="sm" onClick={() => { setSelected(j); setAdminNote(""); }}>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Review & Pay
                              </Button>
                            )}
                            {j.status === "disputed" && (
                              <Button size="sm" variant="destructive" asChild>
                                <Link to="/admin/job-disputes"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Resolve</Link>
                              </Button>
                            )}
                            <Button size="sm" variant="outline" asChild>
                              <Link to="/retailer/jobs/$jobId" params={{ jobId: j.id }}>
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ RULES ============ */}
        <TabsContent value="rules" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Per-Category Commission & Security Fee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {JOB_CATEGORIES.map((cat) => {
                const d = getDraft(cat);
                return (
                  <div key={cat} className="p-3 border rounded grid sm:grid-cols-5 gap-3 items-end">
                    <div className="sm:col-span-1"><p className="font-semibold text-sm">{cat}</p></div>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={d.type} onValueChange={(v) => setDraft((p) => ({ ...p, [cat]: { ...d, type: v as any } }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percent (%)</SelectItem>
                          <SelectItem value="flat">Flat (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Commission</Label>
                      <Input type="number" value={d.value} onChange={(e) => setDraft((p) => ({ ...p, [cat]: { ...d, value: e.target.value } }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Security Fee %</Label>
                      <Input type="number" value={d.sec} onChange={(e) => setDraft((p) => ({ ...p, [cat]: { ...d, sec: e.target.value } }))} />
                    </div>
                    <Button size="sm" onClick={() => saveRule(cat)} disabled={savingCat === cat}>
                      {savingCat === cat ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              <p><strong>Payout flow:</strong> Uploader posts a job → budget held in escrow. Worker bids → on accept, security fee debited from worker. After worker submits and uploader approves, the job moves to <strong>Awaiting Admin Approval</strong>. Funds are released to the worker only after an admin reviews and approves the payout here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============ APPROVAL DIALOG ============ */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review & Release Payout</DialogTitle>
          </DialogHeader>
          {selected && (() => {
            const p = previewPayout(selected);
            return (
              <div className="space-y-3 text-sm">
                <div className="border rounded p-3 bg-muted/30">
                  <p className="font-semibold">{selected.title}</p>
                  <p className="text-xs text-muted-foreground">{selected.category}</p>
                  <p className="text-xs mt-1">
                    <strong>Uploader:</strong> {selected.uploaderName}<br />
                    <strong>Worker:</strong>{" "}
                    {selected.assignedWorkerId ? (
                      <Link to="/worker/$workerId" params={{ workerId: selected.assignedWorkerId }} className="text-primary underline">
                        {selected.assignedWorkerName}
                      </Link>
                    ) : "—"}
                  </p>
                  {selected.uploaderApprovedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Uploader approved on {new Date(selected.uploaderApprovedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="border rounded p-3 space-y-1 text-xs">
                  <Row k="Budget held in escrow" v={`₹${selected.budget}`} />
                  <Row k="Final accepted bid" v={`₹${selected.finalBidAmount || 0}`} />
                  <Row k="Worker security held" v={`₹${p.security}`} />
                  <hr className="my-1" />
                  <Row k="Admin commission" v={`₹${p.commission}`} bold />
                  <Row k="Worker net (bid − commission)" v={`₹${p.workerNet}`} />
                  <Row k="Worker total credit (net + security back)" v={`₹${p.workerCredit}`} bold />
                  <Row k="Uploader refund (excess)" v={`₹${p.uploaderRefund}`} />
                </div>

                <div>
                  <Label className="text-xs">Admin note (optional, audit log)</Label>
                  <Textarea
                    rows={2}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="e.g. Verified deliverables. Releasing payout."
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleApprove} disabled={busy} className="flex-1">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Approve & Release Funds</>}
                  </Button>
                  <Button variant="outline" onClick={() => setSelected(null)} disabled={busy}>Cancel</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Need to investigate first?{" "}
                  <Link to="/retailer/jobs/$jobId" params={{ jobId: selected.id }} className="text-primary underline">
                    Open full job thread →
                  </Link>
                </p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, highlight, danger }: { label: string; value: string | number; highlight?: boolean; danger?: boolean }) {
  return (
    <Card className={highlight ? "border-blue-300 bg-blue-50/40" : danger ? "border-red-300 bg-red-50/40" : undefined}>
      <CardContent className="p-3">
        <p className="text-[11px] uppercase text-muted-foreground tracking-wide">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={bold ? "font-bold" : "font-semibold"}>{v}</span>
    </div>
  );
}

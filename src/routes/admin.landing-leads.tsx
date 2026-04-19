import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Phone, MessageCircle, Download, Search, Trash2, Mail,
  Users, Clock, CheckCircle2, TrendingUp, Pencil,
} from "lucide-react";

export const Route = createFileRoute("/admin/landing-leads")({
  ssr: false,
  component: AdminLandingLeads,
});

type LeadStatus = "new" | "contacted" | "converted" | "rejected";

interface LandingLead {
  id: string;
  name: string;
  mobile: string;
  district?: string;
  interest?: string;
  source?: string;
  status: LeadStatus;
  createdAt: string;
  notes?: string;
  contactedAt?: string;
  convertedAt?: string;
}

const STATUS_META: Record<LeadStatus, { label: string; color: string }> = {
  new:        { label: "New",       color: "bg-blue-500/15 text-blue-700 border-blue-300" },
  contacted:  { label: "Contacted", color: "bg-amber-500/15 text-amber-700 border-amber-300" },
  converted:  { label: "Converted", color: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
  rejected:   { label: "Rejected",  color: "bg-rose-500/15 text-rose-700 border-rose-300" },
};

function AdminLandingLeads() {
  const [leads, setLeads] = useState<LandingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [interestFilter, setInterestFilter] = useState<string>("all");
  const [editing, setEditing] = useState<LandingLead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "landingLeads"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: LandingLead[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setLeads(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error("Failed to load leads — check Firestore rules.");
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const districts = useMemo(() => {
    const s = new Set<string>();
    leads.forEach((l) => l.district && s.add(l.district));
    return Array.from(s).sort();
  }, [leads]);

  const interests = useMemo(() => {
    const s = new Set<string>();
    leads.forEach((l) => l.interest && s.add(l.interest));
    return Array.from(s).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (districtFilter !== "all" && (l.district || "") !== districtFilter) return false;
      if (interestFilter !== "all" && (l.interest || "") !== interestFilter) return false;
      if (s && !`${l.name} ${l.mobile} ${l.district || ""} ${l.interest || ""}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [leads, search, statusFilter, districtFilter, interestFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: leads.length,
      todayCount: leads.filter((l) => l.createdAt?.startsWith(today)).length,
      newCount: leads.filter((l) => l.status === "new").length,
      converted: leads.filter((l) => l.status === "converted").length,
    };
  }, [leads]);

  const updateStatus = async (id: string, status: LeadStatus) => {
    try {
      const patch: any = { status };
      if (status === "contacted") patch.contactedAt = new Date().toISOString();
      if (status === "converted") patch.convertedAt = new Date().toISOString();
      await updateDoc(doc(db, "landingLeads", id), patch);
      toast.success(`Marked as ${STATUS_META[status].label}`);
    } catch (e) {
      console.error(e);
      toast.error("Update failed");
    }
  };

  const saveNotes = async (id: string, notes: string) => {
    try {
      await updateDoc(doc(db, "landingLeads", id), { notes });
      toast.success("Notes saved");
      setEditing(null);
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    }
  };

  const removeLead = async (id: string) => {
    try {
      await deleteDoc(doc(db, "landingLeads", id));
      toast.success("Lead deleted");
      setDeleteId(null);
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    }
  };

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error("No leads to export");
      return;
    }
    const headers = ["Name", "Mobile", "District", "Interest", "Status", "Source", "Created", "Notes"];
    const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
    const rows = filtered.map((l) => [
      escape(l.name),
      escape(l.mobile),
      escape(l.district || ""),
      escape(l.interest || ""),
      escape(l.status),
      escape(l.source || ""),
      escape(l.createdAt || ""),
      escape(l.notes || ""),
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `landing-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} leads`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Landing Page Leads</h1>
          <p className="text-sm text-muted-foreground">Submissions from /welcome lead form</p>
        </div>
        <Button onClick={exportCsv} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Leads" value={stats.total} color="text-primary" />
        <StatCard icon={Clock} label="Today" value={stats.todayCount} color="text-blue-600" />
        <StatCard icon={TrendingUp} label="New / Pending" value={stats.newCount} color="text-amber-600" />
        <StatCard icon={CheckCircle2} label="Converted" value={stats.converted} color="text-emerald-600" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, mobile, district…"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="md:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={districtFilter} onValueChange={setDistrictFilter}>
            <SelectTrigger className="md:w-[180px]"><SelectValue placeholder="District" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {districts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={interestFilter} onValueChange={setInterestFilter}>
            <SelectTrigger className="md:w-[160px]"><SelectValue placeholder="Interest" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Interests</SelectItem>
              {interests.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Showing {filtered.length} of {leads.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No leads found</TableCell></TableRow>
                ) : (
                  filtered.map((l) => (
                    <TableRow key={l.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium">
                        {l.name}
                        {l.notes && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">📝 {l.notes}</p>}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{l.mobile}</TableCell>
                      <TableCell>{l.district || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{l.interest || "—"}</Badge></TableCell>
                      <TableCell>
                        <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v as LeadStatus)}>
                          <SelectTrigger className={`h-8 w-[130px] border ${STATUS_META[l.status]?.color || ""}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(l.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <a href={`tel:+91${l.mobile}`}>
                            <Button size="icon" variant="ghost" title="Call">
                              <Phone className="h-4 w-4 text-blue-600" />
                            </Button>
                          </a>
                          <a
                            href={`https://wa.me/91${l.mobile}?text=${encodeURIComponent(`Hello ${l.name}, this is EI Solutions team responding to your enquiry.`)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button size="icon" variant="ghost" title="WhatsApp">
                              <MessageCircle className="h-4 w-4 text-emerald-600" />
                            </Button>
                          </a>
                          <Button size="icon" variant="ghost" title="Notes" onClick={() => setEditing(l)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Delete" onClick={() => setDeleteId(l.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Notes dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes — {editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && <NotesEditor lead={editing} onSave={saveNotes} />}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && removeLead(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NotesEditor({ lead, onSave }: { lead: LandingLead; onSave: (id: string, notes: string) => void }) {
  const [notes, setNotes] = useState(lead.notes || "");
  return (
    <>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 text-sm">
          <div><span className="text-muted-foreground">Mobile:</span> <span className="font-mono">{lead.mobile}</span></div>
          <div><span className="text-muted-foreground">District:</span> {lead.district || "—"}</div>
          <div><span className="text-muted-foreground">Interest:</span> {lead.interest || "—"}</div>
          <div><span className="text-muted-foreground">Status:</span> {STATUS_META[lead.status].label}</div>
        </div>
        <div>
          <Label htmlFor="notes">Internal notes</Label>
          <Textarea id="notes" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call summary, next steps…" />
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button onClick={() => onSave(lead.id, notes)}>Save Notes</Button>
      </DialogFooter>
    </>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-muted ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

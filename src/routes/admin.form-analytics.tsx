import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CustomForm, FormSubmission } from "@/lib/custom-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Files,
  CheckCircle2,
  Clock3,
  XCircle,
  Download,
  IndianRupee,
  TrendingUp,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/form-analytics")({
  ssr: false,
  component: AdminFormAnalytics,
});

function AdminFormAnalytics() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [formFilter, setFormFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    const unsub1 = onSnapshot(query(collection(db, "formSubmissions")), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FormSubmission));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSubmissions(list);
    });
    const unsub2 = onSnapshot(query(collection(db, "customForms")), (snap) => {
      setForms(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomForm)));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const filtered = useMemo(() => {
    let list = submissions;
    if (formFilter !== "all") {
      list = list.filter((s) => s.formId === formFilter);
    }
    if (dateRange !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (dateRange === "today") cutoff.setHours(0, 0, 0, 0);
      else if (dateRange === "7days") cutoff.setDate(now.getDate() - 7);
      else if (dateRange === "30days") cutoff.setDate(now.getDate() - 30);
      list = list.filter((s) => new Date(s.createdAt) >= cutoff);
    }
    return list;
  }, [submissions, formFilter, dateRange]);

  const counts = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter((s) => s.status === "Pending").length,
    verified: filtered.filter((s) => s.status === "Verified").length,
    rejected: filtered.filter((s) => s.status === "Rejected").length,
  }), [filtered]);

  // Per-form breakdown
  const formBreakdown = useMemo(() => {
    const map = new Map<string, { title: string; total: number; pending: number; verified: number; rejected: number }>();
    for (const s of filtered) {
      if (!map.has(s.formId)) {
        map.set(s.formId, { title: s.formTitle, total: 0, pending: 0, verified: 0, rejected: 0 });
      }
      const entry = map.get(s.formId)!;
      entry.total++;
      if (s.status === "Pending") entry.pending++;
      else if (s.status === "Verified") entry.verified++;
      else if (s.status === "Rejected") entry.rejected++;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Daily submissions for the chart-like display (last 7 days)
  const dailyData = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const count = filtered.filter((s) => {
        const created = new Date(s.createdAt);
        return created >= dayStart && created <= dayEnd;
      }).length;
      days.push({ label: dateStr, count });
    }
    return days;
  }, [filtered]);

  const maxDaily = Math.max(...dailyData.map((d) => d.count), 1);

  // CSV Export
  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Form", "Applicant", "Email", "Status", "App No.", "Submitted", "Remark"];
    const rows = filtered.map((s) => [
      s.formTitle,
      s.userName,
      s.userEmail,
      s.status,
      s.applicationNo || "",
      new Date(s.createdAt).toLocaleString(),
      s.staffRemark || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Form Analytics</h1>
          <p className="text-muted-foreground">Submission reports & statistics for custom forms.</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={formFilter} onValueChange={setFormFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Forms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Forms</SelectItem>
            {forms.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Submissions" value={counts.total} icon={Files} />
        <StatCard title="Pending" value={counts.pending} icon={Clock3} />
        <StatCard title="Verified" value={counts.verified} icon={CheckCircle2} />
        <StatCard title="Rejected" value={counts.rejected} icon={XCircle} />
      </div>

      {/* Simple Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Last 7 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {dailyData.map((day) => (
              <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-foreground">{day.count}</span>
                <div
                  className="w-full bg-primary rounded-t-sm transition-all"
                  style={{ height: `${(day.count / maxDaily) * 100}%`, minHeight: day.count > 0 ? "4px" : "1px" }}
                />
                <span className="text-[10px] text-muted-foreground">{day.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per-Form Breakdown */}
      {formBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Form-wise Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-center">Verified</TableHead>
                    <TableHead className="text-center">Rejected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formBreakdown.map((fb, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{fb.title}</TableCell>
                      <TableCell className="text-center">{fb.total}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{fb.pending}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default">{fb.verified}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive">{fb.rejected}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Submissions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>App No.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 20).map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground text-sm">{sub.userName}</p>
                          <p className="text-xs text-muted-foreground">{sub.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{sub.formTitle}</TableCell>
                      <TableCell className="text-sm">{new Date(sub.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={sub.status === "Verified" ? "default" : sub.status === "Rejected" ? "destructive" : "secondary"}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{sub.applicationNo || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">No submissions found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: number; icon: typeof Files }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className="rounded-full border bg-background p-3">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

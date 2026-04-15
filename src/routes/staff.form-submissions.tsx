import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { CustomForm, FormSubmission } from "@/lib/custom-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  Files,
  CheckCircle2,
  Clock3,
  XCircle,
  Eye,
  Download,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/form-submissions")({
  ssr: false,
  component: StaffFormSubmissions,
});

function StaffFormSubmissions() {
  const { appUser } = useAuth();
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formFilter, setFormFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Review form state
  const [reviewStatus, setReviewStatus] = useState<"Pending" | "Verified" | "Rejected">("Pending");
  const [reviewAppNo, setReviewAppNo] = useState("");
  const [reviewRemark, setReviewRemark] = useState("");

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

  const selected = useMemo(
    () => submissions.find((s) => s.id === selectedId) ?? null,
    [submissions, selectedId]
  );

  const selectedFormDef = useMemo(
    () => (selected ? forms.find((f) => f.id === selected.formId) : null),
    [selected, forms]
  );

  // When selecting a submission, populate review fields
  useEffect(() => {
    if (selected) {
      setReviewStatus(selected.status as any);
      setReviewAppNo(selected.applicationNo || "");
      setReviewRemark(selected.staffRemark || "");
    }
  }, [selected]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return submissions.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (formFilter !== "all" && s.formId !== formFilter) return false;
      if (!term) return true;
      return [s.userName, s.userEmail, s.formTitle, s.applicationNo]
        .some((v) => (v || "").toLowerCase().includes(term));
    });
  }, [submissions, searchTerm, statusFilter, formFilter]);

  const counts = useMemo(() => ({
    total: submissions.length,
    pending: submissions.filter((s) => s.status === "Pending").length,
    verified: submissions.filter((s) => s.status === "Verified").length,
    rejected: submissions.filter((s) => s.status === "Rejected").length,
  }), [submissions]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "formSubmissions", selected.id), {
        status: reviewStatus,
        applicationNo: reviewAppNo,
        staffRemark: reviewRemark,
        reviewedBy: appUser?.email || "staff",
        reviewedAt: new Date().toISOString(),
      });
      toast.success("Submission updated");
      setSelectedId(null);
    } catch (err: any) {
      toast.error(err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const downloadFile = async (url: string, fileName: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Form Submissions</h1>
        <p className="text-sm text-muted-foreground">Review, verify, and manage retailer form submissions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total" value={counts.total} icon={Files} />
        <StatCard title="Pending" value={counts.pending} icon={Clock3} />
        <StatCard title="Verified" value={counts.verified} icon={CheckCircle2} />
        <StatCard title="Rejected" value={counts.rejected} icon={XCircle} />
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Name, email, app no..." className="pl-9" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Verified">Verified</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Form</label>
            <Select value={formFilter} onValueChange={setFormFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Forms</SelectItem>
                {forms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Submissions</CardTitle></CardHeader>
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
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{sub.userName}</p>
                          <p className="text-xs text-muted-foreground">{sub.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{sub.formTitle}</TableCell>
                      <TableCell className="text-sm">{new Date(sub.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={sub.status === "Verified" ? "default" : sub.status === "Rejected" ? "destructive" : "secondary"}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{sub.applicationNo || "—"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setSelectedId(sub.id)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> Review
                        </Button>
                      </TableCell>
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

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review: {selected?.formTitle}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Applicant:</span> <strong>{selected.userName}</strong></div>
                <div><span className="text-muted-foreground">Email:</span> {selected.userEmail}</div>
                <div><span className="text-muted-foreground">Submitted:</span> {new Date(selected.createdAt).toLocaleString()}</div>
              </div>

              {/* Submitted Data */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Submitted Data</h3>
                <div className="border rounded-md divide-y">
                  {selectedFormDef?.fields?.map((field) => (
                    <div key={field.id} className="flex justify-between px-3 py-2 text-sm">
                      <span className="text-muted-foreground">{field.label}</span>
                      <span className="text-foreground font-medium">
                        {field.type === "file"
                          ? (selected.fileUrls?.find((f) => f.fieldId === field.id)?.fileName || "—")
                          : (selected.data?.[field.id] || "—")}
                      </span>
                    </div>
                  )) || (
                    // Fallback: show raw data keys
                    Object.entries(selected.data || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between px-3 py-2 text-sm">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="text-foreground font-medium">{value || "—"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Files */}
              {selected.fileUrls && selected.fileUrls.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Uploaded Files</h3>
                  <div className="space-y-2">
                    {selected.fileUrls.map((file, i) => (
                      <div key={i} className="flex items-center justify-between border rounded-md px-3 py-2">
                        <span className="text-sm truncate">{file.fileName}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => window.open(file.url, "_blank")}>
                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => downloadFile(file.url, file.fileName)}>
                            <Download className="w-3.5 h-3.5 mr-1" /> Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Staff Actions */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold text-foreground">Staff Actions</h3>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={reviewStatus} onValueChange={(v) => setReviewStatus(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Verified">Verified</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Application Number</Label>
                  <Input value={reviewAppNo} onChange={(e) => setReviewAppNo(e.target.value)} placeholder="Enter government application number" />
                </div>
                <div className="space-y-2">
                  <Label>Remark {reviewStatus === "Rejected" && <span className="text-destructive">*</span>}</Label>
                  <Textarea value={reviewRemark} onChange={(e) => setReviewRemark(e.target.value)} placeholder="Add staff remark or rejection reason" rows={2} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedId(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardList, CheckCircle, XCircle, Clock, Eye, Search, Filter,
  Shield, User, FileText, MessageSquare, Download, ExternalLink, FileDown,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/service-applications")({
  ssr: false,
  component: StaffServiceApplications,
});

interface UploadedDoc {
  name: string;
  url: string;
  fileName: string;
}

interface AppRecord {
  id: string;
  applicationNo: string;
  serviceType: string;
  fullName: string;
  dob: string;
  gender: string;
  mobile: string;
  email: string;
  aadhaar: string;
  address: string;
  district: string;
  purpose: string;
  fee: number;
  status: "Pending" | "Approved" | "Rejected";
  staffRemark?: string;
  userId: string;
  userEmail: string;
  createdAt: string;
  uploadedDocuments?: UploadedDoc[];
}

function StaffServiceApplications() {
  const { appUser } = useAuth();
  const [applications, setApplications] = useState<AppRecord[]>([]);
  const [selected, setSelected] = useState<AppRecord | null>(null);
  const [remark, setRemark] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "serviceApplications"), orderBy("createdAt", "desc")),
      (snap) => {
        const list: AppRecord[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as AppRecord));
        setApplications(list);
      }
    );
    return unsub;
  }, []);

  const [govAppNo, setGovAppNo] = useState("");

  const updateStatus = async (id: string, status: "Approved" | "Rejected") => {
    if (!appUser) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, "serviceApplications", id), {
        status,
        staffRemark: remark || undefined,
        govApplicationNo: govAppNo || undefined,
        reviewedBy: appUser.email,
        reviewedAt: new Date().toISOString(),
      });
      toast.success(`Application ${status.toLowerCase()}.`);
      setSelected(null);
      setRemark("");
      setGovAppNo("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update.");
    } finally {
      setProcessing(false);
    }
  };

  const filtered = applications.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        a.applicationNo?.toLowerCase().includes(term) ||
        a.fullName?.toLowerCase().includes(term) ||
        a.serviceType?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const pending = applications.filter((a) => a.status === "Pending").length;

  const statusVariant = (s: string): "default" | "secondary" | "destructive" => {
    if (s === "Approved") return "default";
    if (s === "Rejected") return "destructive";
    return "secondary";
  };

  const statusIcon = (s: string) => {
    if (s === "Approved") return <CheckCircle className="w-3.5 h-3.5" />;
    if (s === "Rejected") return <XCircle className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Service Applications</h1>
        <p className="text-muted-foreground">Review and process service applications. <Badge variant="secondary">{pending} pending</Badge></p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <Label className="text-xs font-semibold flex items-center gap-1"><Search className="w-3 h-3" /> Search</Label>
            <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9" />
          </div>
          <div className="w-40 space-y-1">
            <Label className="text-xs font-semibold flex items-center gap-1"><Filter className="w-3 h-3" /> Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No applications found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold">App No</TableHead>
                    <TableHead className="text-xs font-bold">Applicant</TableHead>
                    <TableHead className="text-xs font-bold">Service</TableHead>
                    <TableHead className="text-xs font-bold">Date</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-xs font-bold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs font-mono">{a.applicationNo}</TableCell>
                      <TableCell className="text-xs font-medium">{a.fullName}</TableCell>
                      <TableCell className="text-xs">{a.serviceType}</TableCell>
                      <TableCell className="text-xs">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(a.status)} className="text-[10px] gap-1">
                          {statusIcon(a.status)} {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setSelected(a); setRemark(a.staffRemark || ""); }}>
                          <Eye className="w-3 h-3" /> Review
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

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) { setSelected(null); setRemark(""); setGovAppNo(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> {selected?.applicationNo}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-muted rounded border">
                <div><span className="text-muted-foreground">Name:</span> <strong>{selected.fullName}</strong></div>
                <div><span className="text-muted-foreground">Service:</span> <strong>{selected.serviceType}</strong></div>
                <div><span className="text-muted-foreground">Mobile:</span> <strong>{selected.mobile}</strong></div>
                <div><span className="text-muted-foreground">District:</span> <strong>{selected.district}</strong></div>
                <div><span className="text-muted-foreground">Fee:</span> <strong>₹{selected.fee}</strong></div>
                <div><span className="text-muted-foreground">Purpose:</span> <strong>{selected.purpose}</strong></div>
              </div>
              {/* Uploaded Documents */}
              {selected.uploadedDocuments && selected.uploadedDocuments.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1"><FileText className="w-3 h-3" /> Uploaded Documents</Label>
                  <div className="border rounded divide-y">
                    {selected.uploadedDocuments.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-2 text-xs">
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-muted-foreground">{doc.fileName}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3" /> View
                            </a>
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                            <a href={doc.url} download={doc.fileName}>
                              <Download className="w-3 h-3" /> Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Government Application Number</Label>
                <Input value={govAppNo} onChange={(e) => setGovAppNo(e.target.value)} placeholder="Enter govt application/tracking number" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Staff Remark</Label>
                <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add remark..." rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button className="bg-gov-gold hover:bg-gov-gold/90 text-white" onClick={() => updateStatus(selected.id, "Pending" as any)} disabled={processing || selected.status === "Pending"}>
                  <Clock className="w-4 h-4 mr-1" /> Pending
                </Button>
                <Button className="bg-gov-green hover:bg-gov-green/90" onClick={() => updateStatus(selected.id, "Approved")} disabled={processing}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button variant="destructive" onClick={() => updateStatus(selected.id, "Rejected")} disabled={processing}>
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
  Shield, User, Calendar, FileText, IndianRupee, MessageSquare, Download, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/service-applications")({
  ssr: false,
  component: AdminServiceApplications,
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

function AdminServiceApplications() {
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

  const updateStatus = async (id: string, status: "Approved" | "Rejected") => {
    setProcessing(true);
    try {
      await updateDoc(doc(db, "serviceApplications", id), {
        status,
        staffRemark: remark || undefined,
        reviewedAt: new Date().toISOString(),
      });
      toast.success(`Application ${status.toLowerCase()} successfully.`);
      setSelected(null);
      setRemark("");
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
        a.serviceType?.toLowerCase().includes(term) ||
        a.userEmail?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const pending = applications.filter((a) => a.status === "Pending").length;
  const approved = applications.filter((a) => a.status === "Approved").length;
  const rejected = applications.filter((a) => a.status === "Rejected").length;

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
      {/* Header */}
      <div className="bg-gov-blue text-white p-4 rounded-lg border-b-4 border-gov-saffron">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8" />
          <div>
            <h1 className="text-lg font-bold tracking-wide">SERVICE APPLICATIONS MANAGEMENT</h1>
            <p className="text-xs opacity-80">Review, Approve & Reject Applications</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-gov-blue">
          <CardContent className="p-4 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-gov-blue" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{applications.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gov-gold">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-gov-gold" />
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold">{pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gov-green">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-gov-green" />
            <div>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-xl font-bold">{approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Rejected</p>
              <p className="text-xl font-bold">{rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <Label className="text-xs font-semibold flex items-center gap-1"><Search className="w-3 h-3" /> Search</Label>
            <Input
              placeholder="Search by name, app no, service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
            />
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

      {/* Applications Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b bg-gov-blue-light">
          <CardTitle className="text-sm font-bold text-gov-blue flex items-center gap-2">
            <FileText className="w-4 h-4" /> Applications ({filtered.length})
          </CardTitle>
        </CardHeader>
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
                    <TableHead className="text-xs font-bold">District</TableHead>
                    <TableHead className="text-xs font-bold">Fee</TableHead>
                    <TableHead className="text-xs font-bold">Date</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-xs font-bold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs font-mono font-medium">{a.applicationNo}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs font-medium">{a.fullName}</p>
                          <p className="text-[10px] text-muted-foreground">{a.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{a.serviceType}</TableCell>
                      <TableCell className="text-xs">{a.district}</TableCell>
                      <TableCell className="text-xs font-semibold">₹{a.fee}</TableCell>
                      <TableCell className="text-xs">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(a.status)} className="text-[10px] gap-1">
                          {statusIcon(a.status)} {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setSelected(a); setRemark(a.staffRemark || ""); }}>
                          <Eye className="w-3 h-3" /> View
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

      {/* Application Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) { setSelected(null); setRemark(""); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gov-blue">
              <FileText className="w-5 h-5" />
              Application: {selected?.applicationNo}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* Applicant Info */}
              <Card className="border-gov-blue/20">
                <CardHeader className="bg-gov-blue-light py-2 px-4 border-b">
                  <CardTitle className="text-xs font-bold text-gov-blue flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Applicant Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Name:</span> <strong>{selected.fullName}</strong></div>
                  <div><span className="text-muted-foreground">DOB:</span> <strong>{selected.dob}</strong></div>
                  <div><span className="text-muted-foreground">Gender:</span> <strong>{selected.gender}</strong></div>
                  <div><span className="text-muted-foreground">Mobile:</span> <strong>{selected.mobile}</strong></div>
                  <div><span className="text-muted-foreground">Email:</span> <strong>{selected.email}</strong></div>
                  <div><span className="text-muted-foreground">Aadhaar:</span> <strong>{selected.aadhaar}</strong></div>
                  <div><span className="text-muted-foreground">District:</span> <strong>{selected.district}</strong></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <strong>{selected.address}</strong></div>
                </CardContent>
              </Card>

              {/* Service Info */}
              <Card className="border-gov-blue/20">
                <CardHeader className="bg-gov-blue-light py-2 px-4 border-b">
                  <CardTitle className="text-xs font-bold text-gov-blue flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Service Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Service:</span> <strong>{selected.serviceType}</strong></div>
                  <div><span className="text-muted-foreground">Purpose:</span> <strong>{selected.purpose}</strong></div>
                  <div><span className="text-muted-foreground">Fee:</span> <strong>₹{selected.fee}</strong></div>
                  <div><span className="text-muted-foreground">Date:</span> <strong>{new Date(selected.createdAt).toLocaleDateString()}</strong></div>
                </CardContent>
              </Card>

              {/* Uploaded Documents */}
              {selected.uploadedDocuments && selected.uploadedDocuments.length > 0 && (
                <Card className="border-gov-blue/20">
                  <CardHeader className="bg-gov-blue-light py-2 px-4 border-b">
                    <CardTitle className="text-xs font-bold text-gov-blue flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Uploaded Documents ({selected.uploadedDocuments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 divide-y">
                    {selected.uploadedDocuments.map((docItem, i) => (
                      <div key={i} className="flex items-center justify-between p-3 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{docItem.name}</p>
                          <p className="text-muted-foreground truncate">{docItem.fileName}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                            <a href={docItem.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3" /> View
                            </a>
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={async () => {
                            try {
                              const res = await fetch(docItem.url);
                              const blob = await res.blob();
                              const blobUrl = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = blobUrl;
                              a.download = docItem.fileName;
                              a.click();
                              URL.revokeObjectURL(blobUrl);
                            } catch {
                              window.open(docItem.url, "_blank");
                            }
                          }}>
                            <Download className="w-3 h-3" /> Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Current Status */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                <span className="text-xs font-semibold">Current Status:</span>
                <Badge variant={statusVariant(selected.status)} className="gap-1">
                  {statusIcon(selected.status)} {selected.status}
                </Badge>
                {selected.staffRemark && (
                  <span className="text-xs text-muted-foreground ml-2">Remark: {selected.staffRemark}</span>
                )}
              </div>

              {/* Action Section */}
              <Card className="border-gov-gold/30">
                <CardHeader className="bg-amber-50 py-2 px-4 border-b border-gov-gold/20">
                  <CardTitle className="text-xs font-bold text-gov-gold flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Review & Action
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Staff Remark</Label>
                    <Textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="Add remark for applicant (e.g., documents verified, missing info...)"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-gov-green hover:bg-gov-green/90"
                      onClick={() => updateStatus(selected.id, "Approved")}
                      disabled={processing || selected.status === "Approved"}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => updateStatus(selected.id, "Rejected")}
                      disabled={processing || selected.status === "Rejected"}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

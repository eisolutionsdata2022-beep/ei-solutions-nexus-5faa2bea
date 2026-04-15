import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc } from "firebase/firestore";
import { Search, Files, CheckCircle2, Clock3, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { StaffApplicationReviewDialog } from "@/components/services/StaffApplicationReviewDialog";
import { ApplicationStatusBadge } from "@/components/services/ApplicationStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  APPLICATION_STATUS_OPTIONS,
  ApplicationStatus,
  formatApplicationDate,
  getDocumentStatusLabel,
  mapServiceApplication,
  ServiceApplicationRecord,
} from "@/lib/e-district";

export function StaffApplicationsDashboard() {
  const { appUser } = useAuth();
  const [applications, setApplications] = useState<ServiceApplicationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "serviceApplications")),
      (snapshot) => {
        const nextApplications = snapshot.docs
          .map((document) => mapServiceApplication(document.id, document.data() as Partial<ServiceApplicationRecord>))
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

        setApplications(nextApplications);
      },
      (error) => {
        console.error("Failed to load service applications:", error);
        toast.error("Staff dashboard data load ചെയ്യാൻ കഴിഞ്ഞില്ല.");
        setApplications([]);
      },
    );

    return unsubscribe;
  }, []);

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === selectedId) ?? null,
    [applications, selectedId],
  );

  const filteredApplications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return applications.filter((application) => {
      if (statusFilter !== "all" && application.status !== statusFilter) return false;

      if (!normalizedSearch) return true;

      return [
        application.applicationNo,
        application.fullName,
        application.mobile,
        application.serviceType,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [applications, searchTerm, statusFilter]);

  const counts = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((application) => application.status === "Pending").length,
      approved: applications.filter((application) => application.status === "Approved").length,
      rejected: applications.filter((application) => application.status === "Rejected").length,
    }),
    [applications],
  );

  const handleSave = async ({
    id,
    status,
    govApplicationNo,
    staffRemark,
  }: {
    id: string;
    status: ApplicationStatus;
    govApplicationNo: string;
    staffRemark: string;
  }) => {
    setSaving(true);

    try {
      await updateDoc(doc(db, "serviceApplications", id), {
        status,
        govApplicationNo,
        staffRemark,
        rejectionReason: status === "Rejected" ? staffRemark : "",
        reviewedBy: appUser?.email ?? "staff",
        reviewedAt: new Date().toISOString(),
      });

      toast.success("Application status updated.");
      setSelectedId(null);
    } catch (error: any) {
      console.error("Failed to update application status:", error);
      toast.error(error?.message || "Status update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Staff e-District dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Retailer submissions, uploaded files, and status updates are synced here in real time.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total applications" value={counts.total} icon={Files} />
        <SummaryCard title="Pending" value={counts.pending} icon={Clock3} />
        <SummaryCard title="Approved" value={counts.approved} icon={CheckCircle2} />
        <SummaryCard title="Rejected" value={counts.rejected} icon={XCircle} />
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Search applications</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, phone, service, or app no"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Filter status</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | ApplicationStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {APPLICATION_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All submitted applications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredApplications.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead className="w-[110px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{application.fullName}</p>
                          <p className="text-xs text-muted-foreground">{application.applicationNo}</p>
                        </div>
                      </TableCell>
                      <TableCell>{application.mobile || "—"}</TableCell>
                      <TableCell>{application.serviceType}</TableCell>
                      <TableCell>{formatApplicationDate(application.createdAt)}</TableCell>
                      <TableCell>
                        <ApplicationStatusBadge status={application.status} />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {application.uploadedDocuments.length} file(s)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getDocumentStatusLabel(application.documentUploadStatus)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setSelectedId(application.id)}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">No applications found.</div>
          )}
        </CardContent>
      </Card>

      <StaffApplicationReviewDialog
        application={selectedApplication}
        open={!!selectedApplication}
        saving={saving}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: typeof Files;
}) {
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
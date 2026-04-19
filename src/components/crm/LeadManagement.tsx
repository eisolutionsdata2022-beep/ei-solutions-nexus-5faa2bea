import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Download, Phone as PhoneIcon, MessageSquare, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { subscribeLeads, subscribeStaffMembers, updateLead, deleteLead } from "@/lib/crm-firebase";
import { LEAD_STATUSES, STATUS_COLORS, type Lead, type StaffMember, type LeadStatus } from "@/lib/crm-types";
import { AddLeadDialog } from "./AddLeadDialog";
import { LeadDetailDialog } from "./LeadDetailDialog";
import { BulkUploadLeadsDialog } from "./BulkUploadLeadsDialog";
import * as XLSX from "xlsx";

export function LeadManagement() {
  const { appUser } = useAuth();
  const isStaffOnly = appUser?.role === "staff";
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    const unsub = subscribeLeads(
      setLeads,
      (err) => { console.error(err); toast.error("Leads load ചെയ്യാൻ കഴിഞ്ഞില്ല"); },
      isStaffOnly ? appUser?.uid : undefined
    );
    return unsub;
  }, [isStaffOnly, appUser?.uid]);

  useEffect(() => {
    const unsub = subscribeStaffMembers(setStaff);
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (staffFilter !== "all" && l.assignedStaffId !== staffFilter) return false;
      if (sourceFilter !== "all" && l.leadSource !== sourceFilter) return false;
      if (!s) return true;
      return [l.name, l.phone, l.leadId, l.courseInterested, l.location]
        .some((v) => v?.toLowerCase().includes(s));
    });
  }, [leads, search, statusFilter, staffFilter, sourceFilter]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => l.leadSource && set.add(l.leadSource));
    return Array.from(set).sort();
  }, [leads]);

  const exportToExcel = () => {
    const data = filtered.map((l) => ({
      "Lead ID": l.leadId,
      Name: l.name,
      Phone: l.phone,
      Location: l.location,
      "Course/Service": l.courseInterested,
      Source: l.leadSource,
      "Assigned To": l.assignedStaffName,
      Status: l.status,
      "Payment": l.paymentStatus,
      "Application": l.applicationStatus,
      "Follow-up": l.followUpDate,
      Remarks: l.remarks,
      "Created": l.createdAt,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `CRM_Leads_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Excel exported!");
  };

  const handleWhatsApp = (phone: string) => {
    window.open(`https://wa.me/91${phone.replace(/\D/g, "")}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Management</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} leads found</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Lead
          </Button>
          {!isStaffOnly && (
            <Button onClick={exportToExcel} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, ID..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger><SelectValue placeholder="All Sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {!isStaffOnly && (
            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger><SelectValue placeholder="All Staff" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staff.map((s) => <SelectItem key={s.uid} value={s.uid}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Course/Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => (
                    <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLead(lead)}>
                      <TableCell className="font-mono text-xs">{lead.leadId}</TableCell>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.phone}</TableCell>
                      <TableCell>{lead.courseInterested}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_COLORS[lead.status]}>{lead.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lead.paymentStatus === "Paid" ? "default" : "destructive"} className="text-xs">
                          {lead.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{lead.followUpDate || "—"}</TableCell>
                      <TableCell className="text-xs">{lead.assignedStaffName}</TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleWhatsApp(lead.phone)}>
                            <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(`tel:${lead.phone}`)}>
                            <PhoneIcon className="h-3.5 w-3.5 text-blue-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">No leads found.</div>
          )}
        </CardContent>
      </Card>

      <AddLeadDialog open={showAdd} onOpenChange={setShowAdd} staff={staff} />
      {selectedLead && (
        <LeadDetailDialog
          lead={selectedLead}
          open={!!selectedLead}
          onOpenChange={(open) => { if (!open) setSelectedLead(null); }}
          staff={staff}
        />
      )}
    </div>
  );
}

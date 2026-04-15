import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Phone, Clock, FileText, History, Upload, Download, Eye, Trash2, File } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { updateLead, addLeadHistory, addCallLog, subscribeCallLogs, subscribeLeadHistory, uploadLeadDocument, deleteLeadDocument } from "@/lib/crm-firebase";
import {
  LEAD_STATUSES, CALL_STATUSES, PAYMENT_STATUSES, APP_PROGRESS, STATUS_COLORS, CALL_STATUS_COLORS,
  type Lead, type CallLog, type LeadHistory, type StaffMember, type LeadStatus, type CallStatus,
} from "@/lib/crm-types";

interface Props {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember[];
}

export function LeadDetailDialog({ lead, open, onOpenChange, staff }: Props) {
  const { appUser } = useAuth();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [status, setStatus] = useState(lead.status);
  const [paymentStatus, setPaymentStatus] = useState(lead.paymentStatus);
  const [appStatus, setAppStatus] = useState(lead.applicationStatus);
  const [assignedStaffId, setAssignedStaffId] = useState(lead.assignedStaffId);
  const [remarks, setRemarks] = useState(lead.remarks);
  const [followUpDate, setFollowUpDate] = useState(lead.followUpDate);
  const [followUpTime, setFollowUpTime] = useState(lead.followUpTime);
  const [saving, setSaving] = useState(false);

  // Call log form
  const [callStatus, setCallStatus] = useState<CallStatus>("Answered");
  const [callDuration, setCallDuration] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const [savingCall, setSavingCall] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState(lead.documents || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub1 = subscribeCallLogs(lead.id, setCallLogs);
    const unsub2 = subscribeLeadHistory(lead.id, setHistory);
    return () => { unsub1(); unsub2(); };
  }, [lead.id]);

  useEffect(() => {
    setStatus(lead.status);
    setPaymentStatus(lead.paymentStatus);
    setAppStatus(lead.applicationStatus);
    setAssignedStaffId(lead.assignedStaffId);
    setRemarks(lead.remarks);
    setFollowUpDate(lead.followUpDate);
    setFollowUpTime(lead.followUpTime);
    setDocuments(lead.documents || []);
  }, [lead]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const assignedStaff = staff.find((s) => s.uid === assignedStaffId);
      const changes: { field: string; old: string; new: string }[] = [];
      if (status !== lead.status) changes.push({ field: "status", old: lead.status, new: status });
      if (paymentStatus !== lead.paymentStatus) changes.push({ field: "paymentStatus", old: lead.paymentStatus, new: paymentStatus });
      if (appStatus !== lead.applicationStatus) changes.push({ field: "applicationStatus", old: lead.applicationStatus, new: appStatus });
      if (assignedStaffId !== lead.assignedStaffId) changes.push({ field: "assignedStaff", old: lead.assignedStaffName, new: assignedStaff?.name || "" });

      await updateLead(lead.id, {
        status, paymentStatus, applicationStatus: appStatus,
        assignedStaffId, assignedStaffName: assignedStaff?.name || lead.assignedStaffName,
        remarks, followUpDate, followUpTime,
      });

      for (const c of changes) {
        await addLeadHistory({
          leadId: lead.id, action: "Updated", field: c.field,
          oldValue: c.old, newValue: c.new,
          updatedBy: appUser?.uid || "", updatedByName: appUser?.name || appUser?.email || "",
          createdAt: new Date().toISOString(),
        });
      }
      toast.success("Lead updated!");
    } catch (err: any) {
      toast.error(err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCall = async () => {
    setSavingCall(true);
    try {
      await addCallLog({
        leadId: lead.id, staffId: appUser?.uid || "", staffName: appUser?.name || appUser?.email || "",
        callStatus, callDuration, callNotes, createdAt: new Date().toISOString(),
      });
      await addLeadHistory({
        leadId: lead.id, action: "Call Logged", field: "callLog",
        oldValue: "", newValue: `${callStatus} - ${callDuration} - ${callNotes}`,
        updatedBy: appUser?.uid || "", updatedByName: appUser?.name || appUser?.email || "",
        createdAt: new Date().toISOString(),
      });
      toast.success("Call log saved!");
      setCallStatus("Answered"); setCallDuration(""); setCallNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to log call");
    } finally {
      setSavingCall(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{lead.leadId}</span>
            <span>{lead.name}</span>
            <Badge className={STATUS_COLORS[lead.status]}>{lead.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Lead Info */}
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 text-sm bg-muted/50 rounded-lg p-3">
          <div><span className="text-muted-foreground">Phone:</span> <strong>{lead.phone}</strong></div>
          <div><span className="text-muted-foreground">Alt:</span> {lead.alternatePhone || "—"}</div>
          <div><span className="text-muted-foreground">Location:</span> {lead.location || "—"}</div>
          <div><span className="text-muted-foreground">Course:</span> {lead.courseInterested || "—"}</div>
          <div><span className="text-muted-foreground">Source:</span> {lead.leadSource}</div>
          <div><span className="text-muted-foreground">Created:</span> {new Date(lead.createdAt).toLocaleDateString()}</div>
          <div className="col-span-2 md:col-span-3 flex gap-2 mt-1">
            <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/91${lead.phone.replace(/\D/g, "")}`, "_blank")}>
              <MessageSquare className="h-3.5 w-3.5 mr-1 text-green-600" /> WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`tel:${lead.phone}`)}>
              <Phone className="h-3.5 w-3.5 mr-1 text-blue-600" /> Call
            </Button>
          </div>
        </div>

        <Tabs defaultValue="update" className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="update"><FileText className="h-3.5 w-3.5 mr-1" /> Update</TabsTrigger>
            <TabsTrigger value="docs"><File className="h-3.5 w-3.5 mr-1" /> Docs ({documents.length})</TabsTrigger>
            <TabsTrigger value="calls"><Phone className="h-3.5 w-3.5 mr-1" /> Calls ({callLogs.length})</TabsTrigger>
            <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1" /> History</TabsTrigger>
          </TabsList>

          <TabsContent value="update" className="space-y-4 mt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment</Label>
                <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Application</Label>
                <Select value={appStatus} onValueChange={(v) => setAppStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APP_PROGRESS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {appUser?.role !== "staff" && (
                <div className="space-y-1.5">
                  <Label>Assign Staff</Label>
                  <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => <SelectItem key={s.uid} value={s.uid}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Follow-up Date</Label>
                <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Follow-up Time</Label>
                <Input type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Remarks</Label>
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleUpdate} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Update Lead"}
            </Button>
          </TabsContent>

          <TabsContent value="calls" className="space-y-4 mt-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Call Status</Label>
                <Select value={callStatus} onValueChange={(v) => setCallStatus(v as CallStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Input value={callDuration} onChange={(e) => setCallDuration(e.target.value)} placeholder="e.g. 5 min" />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={callNotes} onChange={(e) => setCallNotes(e.target.value)} placeholder="Call notes..." />
              </div>
            </div>
            <Button onClick={handleAddCall} disabled={savingCall} size="sm">
              {savingCall ? "Saving..." : "Log Call"}
            </Button>

            {callLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell><Badge className={CALL_STATUS_COLORS[log.callStatus]}>{log.callStatus}</Badge></TableCell>
                      <TableCell>{log.callDuration}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.callNotes}</TableCell>
                      <TableCell>{log.staffName}</TableCell>
                      <TableCell className="text-xs">{new Date(log.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No call logs yet</p>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-3">
            {history.length > 0 ? (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 p-2 rounded bg-muted/50 text-sm">
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p><strong>{h.updatedByName}</strong> {h.action} <span className="text-muted-foreground">({h.field})</span></p>
                      {h.oldValue && <p className="text-xs text-muted-foreground">{h.oldValue} → {h.newValue}</p>}
                      {!h.oldValue && h.newValue && <p className="text-xs text-muted-foreground">{h.newValue}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No history yet</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

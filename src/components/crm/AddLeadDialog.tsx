import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { addLead, getNextLeadId, addLeadHistory } from "@/lib/crm-firebase";
import { LEAD_SOURCES, LEAD_STATUSES, PAYMENT_STATUSES, APP_PROGRESS, type StaffMember } from "@/lib/crm-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember[];
}

export function AddLeadDialog({ open, onOpenChange, staff }: Props) {
  const { appUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", alternatePhone: "", location: "",
    courseInterested: "", leadSource: "Facebook", assignedStaffId: "",
    status: "New" as const, followUpDate: "", followUpTime: "",
    remarks: "", paymentStatus: "Pending" as const, applicationStatus: "Not Started" as const,
  });

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name, Phone നിർബന്ധമാണ്");
      return;
    }
    setSaving(true);
    try {
      const leadId = await getNextLeadId();
      const assignedStaff = staff.find((s) => s.uid === form.assignedStaffId);
      await addLead({
        leadId,
        ...form,
        assignedStaffName: assignedStaff?.name || "Unassigned",
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: appUser?.email || "unknown",
      });
      await addLeadHistory({
        leadId,
        action: "Created",
        field: "lead",
        oldValue: "",
        newValue: `Lead ${leadId} created`,
        updatedBy: appUser?.uid || "",
        updatedByName: appUser?.name || appUser?.email || "",
        createdAt: new Date().toISOString(),
      });
      toast.success(`Lead ${leadId} add ചെയ്തു!`);
      onOpenChange(false);
      setForm({
        name: "", phone: "", alternatePhone: "", location: "",
        courseInterested: "", leadSource: "Facebook", assignedStaffId: "",
        status: "New", followUpDate: "", followUpTime: "",
        remarks: "", paymentStatus: "Pending", applicationStatus: "Not Started",
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to add lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Lead name" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone *</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Phone number" />
          </div>
          <div className="space-y-1.5">
            <Label>Alternate Phone</Label>
            <Input value={form.alternatePhone} onChange={(e) => update("alternatePhone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => update("location", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Course / Service</Label>
            <Input value={form.courseInterested} onChange={(e) => update("courseInterested", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Lead Source</Label>
            <Select value={form.leadSource} onValueChange={(v) => update("leadSource", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assign Staff</Label>
            <Select value={form.assignedStaffId} onValueChange={(v) => update("assignedStaffId", v)}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                {staff.map((s) => <SelectItem key={s.uid} value={s.uid}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Follow-up Date</Label>
            <Input type="date" value={form.followUpDate} onChange={(e) => update("followUpDate", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Follow-up Time</Label>
            <Input type="time" value={form.followUpTime} onChange={(e) => update("followUpTime", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Status</Label>
            <Select value={form.paymentStatus} onValueChange={(v) => update("paymentStatus", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Application Status</Label>
            <Select value={form.applicationStatus} onValueChange={(v) => update("applicationStatus", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {APP_PROGRESS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Remarks</Label>
            <Textarea value={form.remarks} onChange={(e) => update("remarks", e.target.value)} placeholder="Notes..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Add Lead"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

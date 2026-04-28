import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  COMMISSION_TABS,
  listCommissionConfigs,
  saveCommissionConfig,
  seedCommissionConfigs,
  type CommissionCategory,
  type CommissionConfig,
} from "@/lib/commission-config";
import { generateAdminPayout } from "@/lib/admin-payouts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IndianRupee, Save, Plus, Send, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/commission-center")({
  ssr: false,
  component: CommissionCenter,
});

interface UserLite {
  userId: string;
  email: string;
  name: string;
  role: string;
}

function CommissionCenter() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<CommissionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<CommissionCategory>("Customer Charges");
  const [editing, setEditing] = useState<CommissionConfig | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    let list = await listCommissionConfigs();
    if (list.length === 0 && user) {
      const added = await seedCommissionConfigs(user.email || user.uid);
      if (added > 0) toast.success(`Seeded ${added} default services`);
      list = await listCommissionConfigs();
    }
    setConfigs(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = useMemo(() => {
    return configs
      .filter((c) => c.category === tab)
      .filter((c) => !search || c.serviceName.toLowerCase().includes(search.toLowerCase()) || c.serviceKey.includes(search.toLowerCase()))
      .sort((a, b) => a.serviceName.localeCompare(b.serviceName));
  }, [configs, tab, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <IndianRupee className="w-6 h-6 text-primary" /> Commission Center
        </h1>
        <p className="text-muted-foreground text-sm">
          Unified fee, commission, and payout configuration for all services.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as CommissionCategory)}>
        <TabsList className="flex flex-wrap h-auto">
          {COMMISSION_TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs sm:text-sm">{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {COMMISSION_TABS.map((t) => (
          <TabsContent key={t.key} value={t.key} className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <p className="text-xs text-muted-foreground">{t.description}</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Search services…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full sm:w-64"
                />
                <Button size="sm" variant="outline" onClick={() => setEditing({
                  serviceKey: "",
                  serviceName: "",
                  category: t.key,
                  type: t.key === "Admin Payouts" ? "admin_payout" : t.key === "Operator-Based" ? "operator_based" : "customer_charge",
                  enabled: true,
                  mode: "fixed",
                })}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No services configured.</CardContent></Card>
            ) : t.key === "Admin Payouts" ? (
              <PayoutsSection configs={filtered} onEdit={setEditing} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((c) => (
                  <ServiceCard key={c.serviceKey} cfg={c} onEdit={() => setEditing(c)} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {editing && (
        <EditDialog
          cfg={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
          updatedBy={user?.email || user?.uid || "admin"}
        />
      )}
    </div>
  );
}

function ServiceCard({ cfg, onEdit }: { cfg: CommissionConfig; onEdit: () => void }) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition" onClick={onEdit}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex justify-between items-start gap-2">
          <span className="truncate">{cfg.serviceName}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.enabled ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
            {cfg.enabled ? "ON" : "OFF"}
          </span>
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">{cfg.serviceKey}</p>
      </CardHeader>
      <CardContent className="space-y-1.5 text-xs">
        {cfg.type === "customer_charge" && (
          <>
            <Row label="Customer Charge" val={`₹${cfg.customerCharge ?? 0}`} bold />
            {cfg.retailerCommission ? <Row label="Retailer" val={`₹${cfg.retailerCommission}`} /> : null}
            {cfg.staffCommission ? <Row label="Staff" val={`₹${cfg.staffCommission}`} /> : null}
            {cfg.trainerCommission ? <Row label="Trainer" val={`₹${cfg.trainerCommission}`} /> : null}
            {cfg.adminCommission ? <Row label="Admin" val={`₹${cfg.adminCommission}`} /> : null}
          </>
        )}
        {cfg.type === "admin_payout" && (
          <Row label="Default Payout" val={`₹${cfg.defaultPayoutAmount ?? 0}`} bold />
        )}
        {cfg.notes && <p className="text-[11px] text-muted-foreground italic pt-1">{cfg.notes}</p>}
      </CardContent>
    </Card>
  );
}

function Row({ label, val, bold }: { label: string; val: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold text-foreground" : "text-foreground"}>{val}</span>
    </div>
  );
}

function PayoutsSection({ configs, onEdit }: { configs: CommissionConfig[]; onEdit: (c: CommissionConfig) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((c) => (
          <PayoutCard key={c.serviceKey} cfg={c} onEdit={() => onEdit(c)} />
        ))}
      </div>
    </div>
  );
}

function PayoutCard({ cfg, onEdit }: { cfg: CommissionConfig; onEdit: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState(String(cfg.defaultPayoutAmount ?? ""));
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || users.length) return;
    (async () => {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map((d) => {
        const u = d.data() as any;
        return { userId: d.id, email: u.email || "", name: u.name || "", role: u.role || "" };
      }));
    })();
  }, [open]);

  const filteredUsers = useMemo(() => {
    if (!search) return users.slice(0, 20);
    const q = search.toLowerCase();
    return users.filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)).slice(0, 30);
  }, [users, search]);

  const recipient = users.find((u) => u.userId === recipientId);

  const handleGenerate = async () => {
    if (!recipient) return toast.error("Select a recipient");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter valid amount");
    if (!reason.trim()) return toast.error("Enter a reason");
    setSubmitting(true);
    try {
      await generateAdminPayout({
        recipientUserId: recipient.userId,
        recipientEmail: recipient.email,
        recipientRole: recipient.role,
        amount: amt,
        serviceKey: cfg.serviceKey,
        serviceName: cfg.serviceName,
        reason: reason.trim(),
        adminUserId: user?.uid || "",
        adminEmail: user?.email || "",
      });
      toast.success(`₹${amt} sent to ${recipient.email}`);
      setOpen(false);
      setRecipientId(""); setReason(""); setSearch("");
    } catch (e: any) {
      toast.error(e?.message || "Payout failed");
    }
    setSubmitting(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{cfg.serviceName}</CardTitle>
          <p className="text-[11px] text-muted-foreground">{cfg.serviceKey}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row label="Default Payout" val={`₹${cfg.defaultPayoutAmount ?? 0}`} bold />
          {cfg.notes && <p className="text-[11px] text-muted-foreground italic">{cfg.notes}</p>}
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1" onClick={() => setOpen(true)}>
              <Send className="w-4 h-4 mr-1" /> Generate Payment
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Generate Payment — {cfg.serviceName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Search recipient (email/name)</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search…" className="h-9" />
            </div>
            <div className="max-h-40 overflow-y-auto border rounded">
              {filteredUsers.map((u) => (
                <button
                  key={u.userId}
                  onClick={() => setRecipientId(u.userId)}
                  className={`w-full text-left px-2 py-1.5 text-xs hover:bg-muted flex justify-between ${recipientId === u.userId ? "bg-primary/10" : ""}`}
                >
                  <span className="truncate">{u.name || u.email}</span>
                  <span className="text-muted-foreground capitalize">{u.role}</span>
                </button>
              ))}
              {filteredUsers.length === 0 && <p className="text-xs text-muted-foreground p-2">No users found</p>}
            </div>
            {recipient && <p className="text-xs text-green-600">✓ {recipient.email}</p>}
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Reason / Description</Label>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Job ID, task name, etc." />
            </div>
            <Button className="w-full" onClick={handleGenerate} disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Sending…</> : <><Send className="w-4 h-4 mr-1" /> Send Payment</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditDialog({ cfg, onClose, onSaved, updatedBy }: { cfg: CommissionConfig; onClose: () => void; onSaved: () => void; updatedBy: string }) {
  const [form, setForm] = useState<CommissionConfig>(cfg);
  const [saving, setSaving] = useState(false);
  const isNew = !cfg.serviceKey;

  const update = <K extends keyof CommissionConfig>(k: K, v: CommissionConfig[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.serviceKey.trim()) return toast.error("Service key is required");
    if (!form.serviceName.trim()) return toast.error("Service name is required");
    setSaving(true);
    try {
      await saveCommissionConfig(form, updatedBy);
      toast.success("Saved!");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
    setSaving(false);
  };

  const splitTotal =
    (form.retailerCommission ?? 0) + (form.staffCommission ?? 0) +
    (form.trainerCommission ?? 0) + (form.adminCommission ?? 0);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isNew ? "Add Service" : "Edit Service"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Service Key {isNew && "*"}</Label>
              <Input value={form.serviceKey} onChange={(e) => update("serviceKey", e.target.value)} disabled={!isNew} className="h-9 font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs">Service Name *</Label>
              <Input value={form.serviceName} onChange={(e) => update("serviceName", e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={(v: any) => update("type", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_charge">Customer Charge</SelectItem>
                  <SelectItem value="admin_payout">Admin Payout</SelectItem>
                  <SelectItem value="operator_based">Operator-Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Mode</Label>
              <Select value={form.mode || "fixed"} onValueChange={(v: any) => update("mode", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed (₹)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <Label className="text-xs">Enabled</Label>
            <Switch checked={form.enabled} onCheckedChange={(v) => update("enabled", v)} />
          </div>

          {form.type === "customer_charge" && (
            <>
              <div>
                <Label className="text-xs">Customer Charge (₹)</Label>
                <Input type="number" min={0} value={form.customerCharge ?? 0} onChange={(e) => update("customerCharge", Number(e.target.value))} className="h-9" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Retailer</Label><Input type="number" min={0} value={form.retailerCommission ?? 0} onChange={(e) => update("retailerCommission", Number(e.target.value))} className="h-9" /></div>
                <div><Label className="text-xs">Staff</Label><Input type="number" min={0} value={form.staffCommission ?? 0} onChange={(e) => update("staffCommission", Number(e.target.value))} className="h-9" /></div>
                <div><Label className="text-xs">Trainer</Label><Input type="number" min={0} value={form.trainerCommission ?? 0} onChange={(e) => update("trainerCommission", Number(e.target.value))} className="h-9" /></div>
                <div><Label className="text-xs">Admin</Label><Input type="number" min={0} value={form.adminCommission ?? 0} onChange={(e) => update("adminCommission", Number(e.target.value))} className="h-9" /></div>
              </div>
              <p className={`text-xs ${splitTotal > (form.customerCharge ?? 0) ? "text-destructive" : "text-muted-foreground"}`}>
                Splits total: ₹{splitTotal} / ₹{form.customerCharge ?? 0}
              </p>
            </>
          )}

          {form.type === "admin_payout" && (
            <div>
              <Label className="text-xs">Default Payout Amount (₹)</Label>
              <Input type="number" min={0} value={form.defaultPayoutAmount ?? 0} onChange={(e) => update("defaultPayoutAmount", Number(e.target.value))} className="h-9" />
            </div>
          )}

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…</> : <><Save className="w-4 h-4 mr-1" /> Save</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

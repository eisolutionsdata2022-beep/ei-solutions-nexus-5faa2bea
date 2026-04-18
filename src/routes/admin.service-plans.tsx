import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  PLATFORM_SERVICES,
  PLATFORM_SERVICE_CATEGORIES,
} from "@/lib/platform-services";
import {
  emptyPlan,
  listServicePlans,
  saveServicePlan,
  type ServicePlan,
} from "@/lib/user-permissions";

export const Route = createFileRoute("/admin/service-plans")({
  ssr: false,
  component: AdminServicePlans,
});

function AdminServicePlans() {
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [editing, setEditing] = useState<ServicePlan | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try { setPlans(await listServicePlans()); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const startNew = () => setEditing(emptyPlan("New Plan"));

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error("Plan name required"); return; }
    setLoading(true);
    try {
      await saveServicePlan({ ...editing, updatedAt: new Date().toISOString() });
      toast.success("Plan saved");
      setEditing(null);
      await refresh();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this plan? Users assigned to it will fall back to global settings.")) return;
    try {
      await deleteDoc(doc(db, "servicePlans", id));
      toast.success("Plan deleted");
      refresh();
    } catch { toast.error("Delete failed"); }
  };

  const toggleService = (key: string) => {
    if (!editing) return;
    const has = editing.enabledServices.includes(key);
    setEditing({
      ...editing,
      enabledServices: has
        ? editing.enabledServices.filter((k) => k !== key)
        : [...editing.enabledServices, key],
    });
  };

  const toggleCategory = (cat: string, enable: boolean) => {
    if (!editing) return;
    const catKeys = PLATFORM_SERVICES.filter((s) => s.category === cat).map((s) => s.key);
    const next = enable
      ? Array.from(new Set([...editing.enabledServices, ...catKeys]))
      : editing.enabledServices.filter((k) => !catKeys.includes(k));
    setEditing({ ...editing, enabledServices: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> Service Plans
          </h1>
          <p className="text-muted-foreground text-sm">
            Bundle services into reusable plans (Basic / Premium / Pro). Assign plans to users from the Users page.
          </p>
        </div>
        <Button onClick={startNew}>
          <Plus className="w-4 h-4 mr-2" /> New Plan
        </Button>
      </div>

      {loading && plans.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No plans yet. Create your first plan to start grouping services.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {plans.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{p.name}</p>
                    {p.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                    <Badge variant="outline" className="text-[10px]">
                      {p.enabledServices.length} / {PLATFORM_SERVICES.length} services
                    </Badge>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id.startsWith("plan-") && !plans.find((p) => p.id === editing?.id) ? "New Plan" : "Edit Plan"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Plan Name</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Optional" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={!!editing.isDefault}
                  onCheckedChange={(v) => setEditing({ ...editing, isDefault: v })}
                />
                <Label className="text-xs">Use as default plan for new retailers</Label>
              </div>

              <div className="border rounded-md">
                {PLATFORM_SERVICE_CATEGORIES.map((cat) => {
                  const items = PLATFORM_SERVICES.filter((s) => s.category === cat);
                  const allOn = items.every((s) => editing.enabledServices.includes(s.key));
                  return (
                    <div key={cat} className="border-b last:border-b-0">
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                        <p className="text-xs font-bold">{cat}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px]"
                          onClick={() => toggleCategory(cat, !allOn)}
                        >
                          {allOn ? "Disable all" : "Enable all"}
                        </Button>
                      </div>
                      <div className="divide-y">
                        {items.map((s) => {
                          const on = editing.enabledServices.includes(s.key);
                          return (
                            <div key={s.key} className="flex items-center justify-between px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-xs font-medium">{s.name}</p>
                                <p className="text-[10px] text-muted-foreground">{s.description}</p>
                              </div>
                              <Switch checked={on} onCheckedChange={() => toggleService(s.key)} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

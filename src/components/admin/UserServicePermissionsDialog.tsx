import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  PLATFORM_SERVICES,
  PLATFORM_SERVICE_CATEGORIES,
} from "@/lib/platform-services";
import {
  getUserPermission,
  listServicePlans,
  saveUserPermission,
  type ServicePlan,
  type UserPermissionDoc,
} from "@/lib/user-permissions";

interface Props {
  open: boolean;
  onClose: () => void;
  user: { id: string; name?: string; email?: string };
}

/**
 * Per-user permission dialog: pick a Plan + per-service overrides.
 * Override === true/false beats the plan; absent = follow the plan;
 * no plan + no override = follow global platformServices toggle.
 */
export function UserServicePermissionsDialog({ open, onClose, user }: Props) {
  const { appUser } = useAuth();
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [perm, setPerm] = useState<UserPermissionDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([listServicePlans(), getUserPermission(user.id)])
      .then(([pl, p]) => {
        setPlans(pl);
        setPerm(
          p ?? {
            userId: user.id,
            planId: pl.find((x) => x.isDefault)?.id,
            overrides: {},
            updatedAt: new Date().toISOString(),
          },
        );
      })
      .finally(() => setLoading(false));
  }, [open, user.id]);

  const activePlan = plans.find((p) => p.id === perm?.planId);

  const setOverride = (key: string, value: boolean | "inherit") => {
    if (!perm) return;
    const next = { ...(perm.overrides ?? {}) };
    if (value === "inherit") delete next[key];
    else next[key] = value;
    setPerm({ ...perm, overrides: next });
  };

  const resolveEnabled = (key: string): boolean => {
    if (!perm) return true;
    if (perm.overrides && key in perm.overrides) return perm.overrides[key];
    if (activePlan) return activePlan.enabledServices.includes(key);
    return true;
  };

  const save = async () => {
    if (!perm) return;
    setSaving(true);
    try {
      await saveUserPermission({
        ...perm,
        updatedAt: new Date().toISOString(),
        updatedBy: appUser?.uid,
      });
      toast.success("Permissions saved");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" /> Manage Services — {user.name || user.email}
          </DialogTitle>
        </DialogHeader>

        {loading || !perm ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Assigned Plan</Label>
              <Select
                value={perm.planId ?? "__none__"}
                onValueChange={(v) =>
                  setPerm({ ...perm, planId: v === "__none__" ? undefined : v })
                }
              >
                <SelectTrigger><SelectValue placeholder="No plan (follow global)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No plan (use global toggles)</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.enabledServices.length} services)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Overrides below take priority over the plan and global settings.
              </p>
            </div>

            <div className="border rounded-md">
              {PLATFORM_SERVICE_CATEGORIES.map((cat) => {
                const items = PLATFORM_SERVICES.filter((s) => s.category === cat);
                return (
                  <div key={cat} className="border-b last:border-b-0">
                    <div className="px-3 py-2 bg-muted/40">
                      <p className="text-xs font-bold">{cat}</p>
                    </div>
                    <div className="divide-y">
                      {items.map((s) => {
                        const enabled = resolveEnabled(s.key);
                        const overridden = perm.overrides && s.key in perm.overrides;
                        return (
                          <div key={s.key} className="flex items-center justify-between px-3 py-2 gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-medium truncate">{s.name}</p>
                                {overridden && (
                                  <Badge variant="secondary" className="text-[9px]">override</Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">{s.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={enabled}
                                onCheckedChange={(v) => setOverride(s.key, v)}
                              />
                              {overridden && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] px-2"
                                  onClick={() => setOverride(s.key, "inherit")}
                                >
                                  Reset
                                </Button>
                              )}
                            </div>
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
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

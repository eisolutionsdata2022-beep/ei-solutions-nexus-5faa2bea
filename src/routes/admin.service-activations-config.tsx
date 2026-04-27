import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import {
  getActivatableServices,
  listActivationConfigs,
  saveActivationConfig,
  type ActivationConfig,
  type ActivationValidity,
} from "@/lib/service-activation";
import {
  subscribeMinBalanceConfig,
  saveMinBalanceDefault,
  saveRetailerMinBalanceOverride,
  type MinBalanceConfig,
} from "@/lib/min-balance-config";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Save, Wallet, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/service-activations-config")({
  ssr: false,
  component: AdminActivationsConfig,
});

function AdminActivationsConfig() {
  const { appUser } = useAuth();
  const services = getActivatableServices();
  const [configs, setConfigs] = useState<Record<string, ActivationConfig>>({});
  const [drafts, setDrafts] = useState<Record<string, { fee: string; validity: ActivationValidity; enabled: boolean }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    listActivationConfigs().then((map) => {
      setConfigs(map);
      const d: typeof drafts = {};
      services.forEach((s) => {
        const cfg = map[s.key];
        d[s.key] = {
          fee: String(cfg?.fee ?? s.defaultFee ?? 0),
          validity: (cfg?.validity ?? "lifetime") as ActivationValidity,
          enabled: cfg?.enabled ?? false,
        };
      });
      setDrafts(d);
    });
  }, []);

  const update = (key: string, patch: Partial<typeof drafts[string]>) => {
    setDrafts((p) => ({ ...p, [key]: { ...p[key], ...patch } }));
  };

  const save = async (key: string, name: string) => {
    const d = drafts[key];
    const fee = parseFloat(d.fee);
    if (isNaN(fee) || fee < 0) { toast.error("Invalid fee"); return; }
    setSavingKey(key);
    try {
      const cfg: ActivationConfig = {
        serviceKey: key,
        fee, validity: d.validity, enabled: d.enabled,
        updatedAt: new Date().toISOString(),
        updatedBy: appUser?.uid,
      };
      await saveActivationConfig(cfg);
      setConfigs((p) => ({ ...p, [key]: cfg }));
      toast.success(`Saved: ${name}`);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSavingKey(null);
    }
  };

  // ───── Min-Balance config + retailers ─────
  const [minCfg, setMinCfg] = useState<MinBalanceConfig | null>(null);
  const [defaultDraft, setDefaultDraft] = useState<string>("");
  const [savingDefault, setSavingDefault] = useState(false);
  const [retailers, setRetailers] = useState<Array<{ uid: string; name?: string; email: string; phone?: string }>>([]);
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, string>>({});
  const [savingOverrideUid, setSavingOverrideUid] = useState<string | null>(null);
  const [retailerSearch, setRetailerSearch] = useState("");

  useEffect(() => {
    const unsub = subscribeMinBalanceConfig((cfg) => {
      setMinCfg(cfg);
      setDefaultDraft(String(cfg.defaultMinBalance ?? 100));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "retailer"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Array<{ uid: string; name?: string; email: string; phone?: string }> = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        list.push({ uid: d.id, name: data.name, email: data.email, phone: data.phone });
      });
      list.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
      setRetailers(list);
    });
    return unsub;
  }, []);

  const filteredRetailers = useMemo(() => {
    const t = retailerSearch.trim().toLowerCase();
    if (!t) return retailers;
    return retailers.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(t) ||
        r.email.toLowerCase().includes(t) ||
        (r.phone || "").toLowerCase().includes(t),
    );
  }, [retailers, retailerSearch]);

  const saveDefault = async () => {
    const v = parseFloat(defaultDraft);
    if (isNaN(v) || v < 0) { toast.error("Invalid amount"); return; }
    setSavingDefault(true);
    try {
      await saveMinBalanceDefault(v, appUser?.uid);
      toast.success("Default minimum balance saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSavingDefault(false);
    }
  };

  const saveOverride = async (uid: string) => {
    const raw = overrideDrafts[uid] ?? "";
    const v = raw.trim() === "" ? null : parseFloat(raw);
    if (v !== null && (isNaN(v) || v < 0)) { toast.error("Invalid amount"); return; }
    setSavingOverrideUid(uid);
    try {
      await saveRetailerMinBalanceOverride(uid, v, appUser?.uid);
      toast.success(v === null ? "Override removed" : "Override saved");
      setOverrideDrafts((p) => ({ ...p, [uid]: v === null ? "" : String(v) }));
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSavingOverrideUid(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Service Activation Charges</h1>
        <p className="text-muted-foreground">
          Set the activation fee, validity, and enable Activate Now for each service.
        </p>
      </div>

      {/* ───── Minimum Wallet Balance ───── */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-gov-blue" />
            Retailer Minimum Wallet Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-5">
          {/* Default */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 p-3 rounded-lg bg-muted/40 border">
            <div className="flex-1">
              <label className="text-xs font-bold text-foreground">Default Minimum Balance (₹)</label>
              <p className="text-[11px] text-muted-foreground">
                Applies to all retailers unless overridden below. Retailers below this balance are blocked from using services.
              </p>
            </div>
            <Input
              type="number" min="0" step="1"
              value={defaultDraft}
              onChange={(e) => setDefaultDraft(e.target.value)}
              className="h-8 w-32 text-sm"
            />
            <Button size="sm" className="h-8 text-xs" disabled={savingDefault} onClick={saveDefault}>
              <Save className="w-3 h-3 mr-1" />
              {savingDefault ? "Saving…" : "Save Default"}
            </Button>
          </div>

          {/* Per-retailer overrides */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-foreground">Per-Retailer Override</h3>
              <Input
                placeholder="Search by name, email, phone…"
                value={retailerSearch}
                onChange={(e) => setRetailerSearch(e.target.value)}
                className="h-8 w-64 text-xs"
              />
            </div>

            <div className="max-h-80 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/70 backdrop-blur">
                  <tr className="border-b">
                    <th className="text-left px-3 py-2 text-[11px] font-bold">Retailer</th>
                    <th className="text-left px-3 py-2 text-[11px] font-bold">Email / Phone</th>
                    <th className="text-left px-3 py-2 text-[11px] font-bold">Override (₹)</th>
                    <th className="text-left px-3 py-2 text-[11px] font-bold">Effective</th>
                    <th className="text-left px-3 py-2 text-[11px] font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRetailers.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-xs text-muted-foreground py-6">No retailers found.</td></tr>
                  ) : (
                    filteredRetailers.map((r) => {
                      const currentOverride = minCfg?.overrides?.[r.uid];
                      const draft = overrideDrafts[r.uid] ?? (currentOverride !== undefined ? String(currentOverride) : "");
                      const effective = currentOverride !== undefined ? currentOverride : (minCfg?.defaultMinBalance ?? 100);
                      return (
                        <tr key={r.uid} className="border-b">
                          <td className="px-3 py-2 text-xs font-medium">{r.name || "—"}</td>
                          <td className="px-3 py-2 text-[11px] text-muted-foreground">
                            <div>{r.email}</div>
                            {r.phone && <div>{r.phone}</div>}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number" min="0" step="1"
                              placeholder="(default)"
                              value={draft}
                              onChange={(e) => setOverrideDrafts((p) => ({ ...p, [r.uid]: e.target.value }))}
                              className="h-7 w-24 text-xs"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-[10px]">₹{effective}</Badge>
                            {currentOverride !== undefined && (
                              <span className="ml-1 text-[10px] text-gov-blue font-bold">overridden</span>
                            )}
                          </td>
                          <td className="px-3 py-2 flex gap-1">
                            <Button
                              size="sm" className="h-7 text-xs"
                              disabled={savingOverrideUid === r.uid}
                              onClick={() => saveOverride(r.uid)}
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                            {currentOverride !== undefined && (
                              <Button
                                size="sm" variant="outline" className="h-7 text-xs"
                                disabled={savingOverrideUid === r.uid}
                                onClick={() => {
                                  setOverrideDrafts((p) => ({ ...p, [r.uid]: "" }));
                                  saveRetailerMinBalanceOverride(r.uid, null, appUser?.uid)
                                    .then(() => toast.success("Override removed"))
                                    .catch((e) => toast.error(e.message || "Failed"));
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-bold">All Activatable Services</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 text-xs font-bold">Service</th>
                  <th className="text-left px-4 py-2 text-xs font-bold">Category</th>
                  <th className="text-left px-4 py-2 text-xs font-bold">Fee (₹)</th>
                  <th className="text-left px-4 py-2 text-xs font-bold">Validity</th>
                  <th className="text-left px-4 py-2 text-xs font-bold">Activation Enabled</th>
                  <th className="text-left px-4 py-2 text-xs font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => {
                  const d = drafts[s.key];
                  if (!d) return null;
                  return (
                    <tr key={s.key} className="border-b">
                      <td className="px-4 py-2 text-xs font-medium">{s.name}</td>
                      <td className="px-4 py-2"><Badge variant="outline" className="text-[10px]">{s.category}</Badge></td>
                      <td className="px-4 py-2">
                        <Input
                          type="number" step="1" min="0"
                          value={d.fee}
                          onChange={(e) => update(s.key, { fee: e.target.value })}
                          className="h-7 w-24 text-xs"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Select
                          value={d.validity}
                          onValueChange={(v) => update(s.key, { validity: v as ActivationValidity })}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lifetime">Lifetime</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2">
                        <Switch
                          checked={d.enabled}
                          onCheckedChange={(v) => update(s.key, { enabled: v })}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Button
                          size="sm" className="h-7 text-xs"
                          onClick={() => save(s.key, s.name)}
                          disabled={savingKey === s.key}
                        >
                          <Save className="w-3 h-3 mr-1" />
                          {savingKey === s.key ? "Saving…" : "Save"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Tip: When <strong>Activation Enabled</strong> is on, retailers see this service under "Available to Activate"
        in My Services and must pay the configured fee before they can use it.
      </p>
    </div>
  );
}

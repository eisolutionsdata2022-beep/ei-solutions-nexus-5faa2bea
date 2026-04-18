import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Save } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Service Activation Charges</h1>
        <p className="text-muted-foreground">
          Set the activation fee, validity, and enable Activate Now for each service.
        </p>
      </div>

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

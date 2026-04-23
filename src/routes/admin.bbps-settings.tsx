import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Banknote, Save } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getBbpsConfig, saveBbpsConfig } from "@/lib/bbps-firebase";
import { DEFAULT_BBPS_CONFIG, type BbpsMasterConfig } from "@/lib/bbps-types";

export const Route = createFileRoute("/admin/bbps-settings")({
  ssr: false,
  component: AdminBbpsSettings,
});

function AdminBbpsSettings() {
  const { appUser } = useAuth();
  const [cfg, setCfg] = useState<BbpsMasterConfig>(DEFAULT_BBPS_CONFIG);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBbpsConfig().then(setCfg);
  }, []);

  async function save() {
    if (!appUser) return;
    setSaving(true);
    try {
      await saveBbpsConfig(
        {
          baseUrl: cfg.baseUrl,
          agentId: cfg.agentId,
          defaultFee: Number(cfg.defaultFee) || 0,
          brandingEnabled: cfg.brandingEnabled,
        },
        appUser.email ?? appUser.uid,
      );
      toast.success("Bharat Connect settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Banknote className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Bill Payment Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider — Radiant AceMoney (Bharat Connect)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>API Base URL</Label>
            <Input value={cfg.baseUrl} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Agent ID</Label>
            <Input value={cfg.agentId} onChange={(e) => setCfg({ ...cfg, agentId: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Default Service Fee (₹)</Label>
            <Input
              type="number"
              value={cfg.defaultFee}
              onChange={(e) => setCfg({ ...cfg, defaultFee: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="text-sm">
              <div className="font-medium">Bharat Connect Branding</div>
              <div className="text-xs text-muted-foreground">Show MOGO and play sonic on success</div>
            </div>
            <Switch
              checked={cfg.brandingEnabled}
              onCheckedChange={(v) => setCfg({ ...cfg, brandingEnabled: v })}
            />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Required Secrets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="font-medium">Bridge (route through static IP)</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Provider requires IP whitelisting; the app routes calls via a small VPS proxy.
              Deploy <code>native/bbps-bridge-vps/</code> and add these secrets:
            </div>
            <ul className="mt-2 list-inside list-disc space-y-0.5 font-mono text-xs">
              <li>BBPS_BRIDGE_BASE_URL — e.g. https://bbps-bridge.eisoluions.xyz</li>
              <li>BBPS_BRIDGE_HMAC_SECRET — 32-byte hex (matches VPS .env)</li>
            </ul>
          </div>
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="font-medium">Provider credentials</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Add these once UAT credentials arrive after IP whitelisting is approved:
            </div>
            <ul className="mt-2 list-inside list-disc space-y-0.5 font-mono text-xs">
              <li>BBPS_CLIENT_ID</li>
              <li>BBPS_CLIENT_SECRET</li>
              <li>BBPS_AES_KEY</li>
              <li>BBPS_AES_IV (optional)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

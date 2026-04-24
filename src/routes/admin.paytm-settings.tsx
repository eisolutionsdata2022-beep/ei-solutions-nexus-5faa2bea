import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, Save, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPaytmConfig, savePaytmConfig } from "@/lib/paytm-firebase";
import { DEFAULT_PAYTM_CONFIG, type PaytmMasterConfig } from "@/lib/paytm-types";

export const Route = createFileRoute("/admin/paytm-settings")({
  ssr: false,
  component: AdminPaytmSettings,
});

function AdminPaytmSettings() {
  const { appUser } = useAuth();
  const [cfg, setCfg] = useState<PaytmMasterConfig>(DEFAULT_PAYTM_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPaytmConfig()
      .then(setCfg)
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!appUser) return;
    setSaving(true);
    try {
      await savePaytmConfig(
        {
          environment: cfg.environment,
          pgChargesPercent: Number(cfg.pgChargesPercent) || 0,
          minAmount: Number(cfg.minAmount) || 10,
          enabled: cfg.enabled,
          checkoutEnabled: cfg.checkoutEnabled,
          qrEnabled: cfg.qrEnabled,
          qrPollIntervalSec: Number(cfg.qrPollIntervalSec) || 5,
          qrExpiryMinutes: Number(cfg.qrExpiryMinutes) || 10,
        },
        appUser.email ?? appUser.uid,
      );
      toast.success("Paytm settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <CreditCard className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Paytm Gateway Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Provider — Paytm v2 (Wallet Add Money)</span>
            <Badge variant={cfg.enabled ? "default" : "secondary"}>
              {cfg.enabled ? "Live" : "Disabled"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="text-sm">
              <div className="font-medium">Master Switch</div>
              <div className="text-xs text-muted-foreground">
                Disable to hide both Checkout and QR options from retailers.
              </div>
            </div>
            <Switch
              checked={cfg.enabled}
              onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })}
            />
          </div>

          <div className="space-y-1">
            <Label>Environment</Label>
            <Select
              value={cfg.environment}
              onValueChange={(v) => setCfg({ ...cfg, environment: v as "PROD" | "STAGE" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROD">PROD (Live — securegw.paytm.in)</SelectItem>
                <SelectItem value="STAGE">STAGE (Test — securegw-stage.paytm.in)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              PROD uses real money. Make sure your MID/Key match the selected environment.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>PG Charges (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={cfg.pgChargesPercent}
                onChange={(e) =>
                  setCfg({ ...cfg, pgChargesPercent: Number(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Deducted from credit. e.g. 2% → ₹100 paid → ₹98 in wallet.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Minimum Amount (₹)</Label>
              <Input
                type="number"
                value={cfg.minAmount}
                onChange={(e) => setCfg({ ...cfg, minAmount: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Below this, retailers see an error.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Modes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="text-sm">
              <div className="font-medium">Paytm Checkout (Redirect)</div>
              <div className="text-xs text-muted-foreground">
                User redirected to Paytm — pays via card, UPI, netbanking, wallet.
              </div>
            </div>
            <Switch
              checked={cfg.checkoutEnabled}
              onCheckedChange={(v) => setCfg({ ...cfg, checkoutEnabled: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="text-sm">
              <div className="font-medium">Dynamic UPI QR</div>
              <div className="text-xs text-muted-foreground">
                Per-transaction QR — user scans with any UPI app and pays.
              </div>
            </div>
            <Switch
              checked={cfg.qrEnabled}
              onCheckedChange={(v) => setCfg({ ...cfg, qrEnabled: v })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>QR Poll Interval (sec)</Label>
              <Input
                type="number"
                min={3}
                max={30}
                value={cfg.qrPollIntervalSec}
                onChange={(e) =>
                  setCfg({ ...cfg, qrPollIntervalSec: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>QR Expiry (minutes)</Label>
              <Input
                type="number"
                min={2}
                max={30}
                value={cfg.qrExpiryMinutes}
                onChange={(e) =>
                  setCfg({ ...cfg, qrExpiryMinutes: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving…" : "Save Settings"}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Required Secrets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">
            Credentials are stored as Lovable secrets — never in the database. They are read
            on every server-side Paytm call.
          </p>
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="font-medium">Paytm Merchant Credentials</div>
            <ul className="mt-2 list-inside list-disc space-y-0.5 font-mono text-xs">
              <li>PAYTM_MERCHANT_MID — Merchant ID from Paytm dashboard</li>
              <li>PAYTM_MERCHANT_KEY — Merchant Key (16-char AES key)</li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Get these from{" "}
              <a
                className="underline"
                href="https://dashboard.paytm.com/next/apikeys"
                target="_blank"
                rel="noreferrer"
              >
                dashboard.paytm.com → Developer Settings → API Keys
              </a>
              . Use Production keys when Environment is set to PROD.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="font-medium">Callback URL (configure in Paytm dashboard)</div>
            <code className="mt-1 block break-all text-xs">
              https://&lt;your-domain&gt;/api/public/paytm-callback
            </code>
            <p className="mt-2 text-xs text-muted-foreground">
              Add this URL under <strong>Website Info → Callback URL</strong> in your Paytm
              merchant dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

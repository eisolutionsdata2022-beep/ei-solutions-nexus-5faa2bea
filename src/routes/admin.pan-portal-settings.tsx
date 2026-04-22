import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getPanConfig,
  savePanConfigPublic,
  savePanCredentials,
  subscribePanConfig,
  subscribeAllOrders,
} from "@/lib/pan-portal-firebase";
import {
  encryptPanCredentials,
  testPanConnection,
} from "@/lib/pan-portal.functions";
import type { PanMasterConfig, PanOrder } from "@/lib/pan-portal-types";
import { PAN_DEFAULT_FEES, PAN_DEFAULT_URLS } from "@/lib/pan-portal-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, KeyRound, Activity, ShieldCheck, Link2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pan-portal-settings")({
  ssr: false,
  component: AdminPanPortalSettings,
});

function AdminPanPortalSettings() {
  const { appUser } = useAuth();
  const [config, setConfig] = useState<PanMasterConfig | null>(null);
  const [orders, setOrders] = useState<PanOrder[]>([]);

  // Credential form
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [savingCreds, setSavingCreds] = useState(false);

  // URLs + fees form
  const [urls, setUrls] = useState({
    nsdlAuthUrl: "",
    nsdlGetAuthorizationUrl: "",
    psaCreateUrl: "",
    psaPasswordUrl: "",
    ssoRedirectUrl: "",
  });
  const [fees, setFees] = useState({
    nsdlIdCharge: 0,
    panRetailerFee: 0,
    panProviderCost: 0,
    psaRegistrationFee: 0,
  });
  const [webhookSecret, setWebhookSecret] = useState("");
  const [allowedIps, setAllowedIps] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [savingUrls, setSavingUrls] = useState(false);
  const [savingFees, setSavingFees] = useState(false);

  // Test connection state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    return subscribePanConfig((cfg) => {
      setConfig(cfg);
      setUrls({
        nsdlAuthUrl: cfg.nsdlAuthUrl || PAN_DEFAULT_URLS.nsdlAuthUrl,
        nsdlGetAuthorizationUrl: cfg.nsdlGetAuthorizationUrl || PAN_DEFAULT_URLS.nsdlGetAuthorizationUrl,
        psaCreateUrl: cfg.psaCreateUrl || PAN_DEFAULT_URLS.psaCreateUrl,
        psaPasswordUrl: cfg.psaPasswordUrl || PAN_DEFAULT_URLS.psaPasswordUrl,
        ssoRedirectUrl: cfg.ssoRedirectUrl || PAN_DEFAULT_URLS.ssoRedirectUrl,
      });
      setFees({
        nsdlIdCharge: cfg.nsdlIdCharge ?? PAN_DEFAULT_FEES.nsdlIdCharge,
        panRetailerFee: cfg.panRetailerFee ?? PAN_DEFAULT_FEES.panRetailerFee,
        panProviderCost: cfg.panProviderCost ?? PAN_DEFAULT_FEES.panProviderCost,
        psaRegistrationFee: cfg.psaRegistrationFee ?? PAN_DEFAULT_FEES.psaRegistrationFee,
      });
      setWebhookSecret(cfg.webhookSecret || "");
      setAllowedIps(cfg.allowedIps || "");
      setEnabled(cfg.enabled ?? true);
    });
  }, []);

  useEffect(() => {
    return subscribeAllOrders((list) => setOrders(list.slice(0, 50)));
  }, []);

  const isAdmin = appUser?.role === "admin";

  async function handleSaveCreds(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin || !appUser) return;
    if (apiKey.trim().length < 8 || secret.trim().length < 8) {
      toast.error("API key and secret must each be at least 8 characters");
      return;
    }
    setSavingCreds(true);
    try {
      const res = await encryptPanCredentials({
        data: { apiKey: apiKey.trim(), secret: secret.trim() },
      });
      if (!res.success) throw new Error(res.error);
      await savePanCredentials(res.cipher, appUser.uid);
      toast.success(`Credentials saved (${res.apiKeyHint})`);
      setApiKey("");
      setSecret("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save credentials");
    } finally {
      setSavingCreds(false);
    }
  }

  async function handleSaveUrls(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin || !appUser) return;
    setSavingUrls(true);
    try {
      await savePanConfigPublic({ ...urls, webhookSecret, allowedIps, enabled }, appUser.uid);
      toast.success("Provider URLs saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingUrls(false);
    }
  }

  async function handleSaveFees(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin || !appUser) return;
    setSavingFees(true);
    try {
      await savePanConfigPublic(fees, appUser.uid);
      toast.success("Fees saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingFees(false);
    }
  }

  async function handleTest() {
    if (!config?.cipher) {
      toast.error("Save credentials first");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const cfg = await getPanConfig();
      const res = await testPanConnection({
        data: {
          url: cfg.nsdlAuthUrl || PAN_DEFAULT_URLS.nsdlAuthUrl,
          cipher: config.cipher,
        },
      });
      if (res.ok) {
        setTestResult(`✓ HTTP ${res.status} in ${res.elapsed}ms\n${res.snippet}`);
        toast.success("Provider reachable");
      } else {
        setTestResult(`✗ ${res.error}`);
        toast.error("Test failed");
      }
    } finally {
      setTesting(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Admin access required.
      </div>
    );
  }

  const margin = (fees.panRetailerFee || 0) - (fees.panProviderCost || 0);

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PAN Portal Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure PSA Auto-ID + NSDL eKYC PAN provider credentials, URLs, and fees.
          </p>
        </div>
        <Badge variant={config?.hasCredentials ? "default" : "destructive"}>
          {config?.hasCredentials ? "Configured" : "Credentials missing"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Provider Credentials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCreds} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="b4b599-bc1eb9-7891de-cd0953-a0d8fb"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label>Secret</Label>
                <Input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="wS4othL5rDlYmOMHJk7L"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={savingCreds}>
                {savingCreds ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save (encrypted)
              </Button>
              <Button type="button" variant="outline" onClick={handleTest} disabled={testing || !config?.hasCredentials}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
                Test Connection
              </Button>
            </div>
            {testResult && (
              <pre className="text-xs bg-muted p-3 rounded whitespace-pre-wrap break-all">{testResult}</pre>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Provider URLs & Webhook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveUrls} className="space-y-4">
            {(Object.keys(urls) as Array<keyof typeof urls>).map((k) => (
              <div key={k}>
                <Label className="text-xs uppercase">{k}</Label>
                <Input
                  value={urls[k]}
                  onChange={(e) => setUrls({ ...urls, [k]: e.target.value })}
                  placeholder={PAN_DEFAULT_URLS[k as keyof typeof PAN_DEFAULT_URLS]}
                />
              </div>
            ))}
            <Separator />
            <div>
              <Label>Webhook HMAC Secret (optional)</Label>
              <Input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Leave empty to disable signature check"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Webhook URL: <code>/api/public/pan-portal/nsdl-webhook</code>
              </p>
            </div>
            <div>
              <Label>Allowed IP Addresses (provider whitelist)</Label>
              <Textarea
                value={allowedIps}
                onChange={(e) => setAllowedIps(e.target.value)}
                placeholder="One IP per line, e.g.&#10;103.21.45.10&#10;103.21.45.11"
                rows={3}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Register these IPs with the upstream provider (NSDL/UTI). Used as a reference — outbound calls originate from the server's static egress IP.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <Label>Service enabled</Label>
            </div>
            <Button type="submit" disabled={savingUrls}>
              {savingUrls ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Fees & Margin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveFees} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>NSDL Service Activation Charge (₹)</Label>
                <Input
                  type="number"
                  value={fees.nsdlIdCharge}
                  onChange={(e) => setFees({ ...fees, nsdlIdCharge: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>PSA Registration Fee (₹)</Label>
                <Input
                  type="number"
                  value={fees.psaRegistrationFee}
                  onChange={(e) => setFees({ ...fees, psaRegistrationFee: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Per-PAN Retailer Fee (₹)</Label>
                <Input
                  type="number"
                  value={fees.panRetailerFee}
                  onChange={(e) => setFees({ ...fees, panRetailerFee: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Per-PAN Provider Cost (₹)</Label>
                <Input
                  type="number"
                  value={fees.panProviderCost}
                  onChange={(e) => setFees({ ...fees, panProviderCost: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Admin margin per PAN:</span>{" "}
              <span className={margin >= 0 ? "text-primary font-bold" : "text-destructive font-bold"}>
                ₹{margin}
              </span>
            </div>
            <Button type="submit" disabled={savingFees}>
              {savingFees ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Fees
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="py-2">Order ID</th>
                    <th>Retailer</th>
                    <th>Applicant</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.orderId} className="border-b">
                      <td className="py-2 font-mono text-xs">{o.orderId}</td>
                      <td>{o.retailerUsername}</td>
                      <td>{o.name}</td>
                      <td>₹{o.amount}</td>
                      <td>
                        <Badge
                          variant={
                            o.status === "success"
                              ? "default"
                              : o.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {o.status}
                        </Badge>
                      </td>
                      <td className="text-xs">{new Date(o.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

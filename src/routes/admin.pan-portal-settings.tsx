import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, KeyRound, Settings, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { loadPanConfig, savePanConfig } from "@/lib/pan-portal-firebase";
import { encryptPanCredentials } from "@/lib/pan-portal.functions";
import { DEFAULT_PAN_CONFIG, type PanPortalConfig } from "@/lib/pan-portal-types";

export const Route = createFileRoute("/admin/pan-portal-settings")({
  ssr: false,
  component: PanPortalSettings,
});

function PanPortalSettings() {
  const { appUser } = useAuth();
  const [cfg, setCfg] = useState<PanPortalConfig>(DEFAULT_PAN_CONFIG);
  const [loading, setLoading] = useState(true);
  const [savingFees, setSavingFees] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");

  useEffect(() => {
    loadPanConfig()
      .then(setCfg)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (appUser?.role !== "admin") {
    return <div className="p-6 text-center text-destructive">Admin access required.</div>;
  }

  async function handleFeesSave(e: FormEvent) {
    e.preventDefault();
    if (!appUser) return;
    setSavingFees(true);
    try {
      await savePanConfig({
        providerBaseUrl: cfg.providerBaseUrl.trim(),
        couponRetailerFee: Number(cfg.couponRetailerFee),
        couponProviderCost: Number(cfg.couponProviderCost),
      }, appUser.uid);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingFees(false);
    }
  }

  async function handleCredsSave(e: FormEvent) {
    e.preventDefault();
    if (!appUser) return;
    if (!apiKey.trim() || !secret.trim()) {
      toast.error("Enter both API key and secret");
      return;
    }
    setSavingCreds(true);
    try {
      const res = await encryptPanCredentials({ data: { apiKey: apiKey.trim(), secret: secret.trim() } });
      if (!res.success) throw new Error(res.error);
      await savePanConfig({ credCipher: res.cipher, apiKeyHint: res.apiKeyHint }, appUser.uid);
      setCfg((c) => ({ ...c, credCipher: res.cipher, apiKeyHint: res.apiKeyHint }));
      setApiKey(""); setSecret("");
      toast.success("Provider credentials saved (encrypted)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingCreds(false);
    }
  }

  if (loading) return <div className="p-6 flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" />Loading…</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" />PAN Portal Settings</h1>
        <p className="text-muted-foreground text-sm">UTI PSA registration & coupon purchase via mallikacyberzone.com</p>
      </div>

      {/* Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />Provider Credentials</CardTitle>
          <CardDescription>Stored encrypted (AES-GCM) at rest. Re-enter to rotate.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            {cfg.credCipher
              ? <Badge variant="default" className="gap-1"><ShieldCheck className="h-3 w-3" />Configured · ends ••••{cfg.apiKeyHint || "????"}</Badge>
              : <Badge variant="destructive">Not configured</Badge>}
          </div>
          <form onSubmit={handleCredsSave} className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="b4b599-bc1eb9-..." className="font-mono" />
            </div>
            <div>
              <Label htmlFor="secret">Secret</Label>
              <Input id="secret" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="wS4othL5..." type="password" className="font-mono" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={savingCreds}>
                {savingCreds ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Encrypting…</> : "Save Credentials"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Fees + URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><IndianRupee className="h-5 w-5" />Fees & Provider URL</CardTitle>
          <CardDescription>Per-coupon retailer charge and admin margin tracking.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFeesSave} className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label htmlFor="baseUrl">Provider Base URL</Label>
              <Input id="baseUrl" value={cfg.providerBaseUrl} onChange={(e) => setCfg({ ...cfg, providerBaseUrl: e.target.value })} className="font-mono" />
              <p className="text-xs text-muted-foreground mt-1">Default: https://mallikacyberzone.com/api</p>
            </div>
            <div>
              <Label htmlFor="fee">Retailer Charge / coupon (₹)</Label>
              <Input id="fee" type="number" min={1} value={cfg.couponRetailerFee} onChange={(e) => setCfg({ ...cfg, couponRetailerFee: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="cost">Provider Cost / coupon (₹)</Label>
              <Input id="cost" type="number" min={0} value={cfg.couponProviderCost} onChange={(e) => setCfg({ ...cfg, couponProviderCost: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground mt-1">
                Margin: ₹{Math.max(0, cfg.couponRetailerFee - cfg.couponProviderCost)} / coupon
              </p>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={savingFees}>
                {savingFees ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

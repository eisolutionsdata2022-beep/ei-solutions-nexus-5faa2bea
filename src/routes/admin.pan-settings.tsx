import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { RouteGuard } from "@/components/RouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Shield, KeyRound, Activity, Link2, Lock, Server } from "lucide-react";
import { toast } from "sonner";
import { PAN_SERVICES } from "@/lib/pan-services";
import { PAN_DEFAULT_URLS, type PanMasterConfig, type PanTransaction } from "@/lib/pan-types";
import {
  encryptPanApiKey,
  encryptPanApiSecret,
  encryptPanBridgeSecret,
} from "@/lib/pan.functions";

export const Route = createFileRoute("/admin/pan-settings")({
  ssr: false,
  component: () => (
    <RouteGuard allowedRoles={["admin"]}>
      <AdminPanSettings />
    </RouteGuard>
  ),
});

const URL_FIELDS: { key: keyof PanMasterConfig["urls"]; label: string; hint?: string }[] = [
  { key: "psaCreate", label: "PSA Create URL" },
  { key: "couponBuy", label: "Coupon Buy URL" },
  { key: "couponStatus", label: "Coupon Status URL" },
  { key: "passwordReset", label: "Password Reset URL" },
  { key: "nsdlAuth", label: "NSDL Authorization URL", hint: "POST endpoint for eKYC/eSign" },
  { key: "nsdlTxnStatus", label: "NSDL Txn Status URL" },
  { key: "nsdlPanStatus", label: "NSDL PAN Status URL" },
  { key: "panStatus", label: "PAN Status URL (Track / ePAN)" },
];

function AdminPanSettings() {
  const { appUser } = useAuth();
  const [config, setConfig] = useState<PanMasterConfig | null>(null);
  const [transactions, setTransactions] = useState<PanTransaction[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [bridgeSecret, setBridgeSecret] = useState("");
  const [urls, setUrls] = useState<PanMasterConfig["urls"]>(PAN_DEFAULT_URLS);
  const [savingKey, setSavingKey] = useState(false);
  const [savingSecret, setSavingSecret] = useState(false);
  const [savingBridge, setSavingBridge] = useState(false);
  const [savingUrls, setSavingUrls] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "pan_config", "master"), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as PanMasterConfig;
        setConfig(data);
        if (data.urls) setUrls({ ...PAN_DEFAULT_URLS, ...data.urls });
        if (data.vpsBridgeUrl) setBridgeUrl(data.vpsBridgeUrl);
      } else {
        setConfig(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "pan_transactions"), orderBy("createdAt", "desc")),
      (snap) => {
        const list: PanTransaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as PanTransaction) }));
        setTransactions(list.slice(0, 50));
      },
    );
    return unsub;
  }, []);

  const stats = useMemo(() => {
    const total = transactions.length;
    const success = transactions.filter((t) => t.status === "success").length;
    const failed = transactions.filter((t) => t.status === "failed" || t.status === "refunded").length;
    const volume = transactions
      .filter((t) => t.status === "success")
      .reduce((s, t) => s + (t.amount || 0) + (t.fee || 0), 0);
    return { total, success, failed, volume };
  }, [transactions]);

  const saveApiKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    if (!apiKey || apiKey.length < 8) {
      toast.error("API key must be at least 8 characters");
      return;
    }
    setSavingKey(true);
    try {
      const res = await encryptPanApiKey({ data: { apiKey } });
      if (!res.success) throw new Error(res.error);
      const next: Partial<PanMasterConfig> = {
        apiKeyCipher: res.cipher,
        apiKeyHint: res.apiKeyHint,
        urls: config?.urls ?? PAN_DEFAULT_URLS,
        disabledServices: config?.disabledServices ?? [],
        feeOverrides: config?.feeOverrides ?? {},
        updatedAt: new Date().toISOString(),
        updatedBy: appUser.email,
      };
      await setDoc(doc(db, "pan_config", "master"), next, { merge: true });
      toast.success("PAN API key encrypted and saved");
      setApiKey("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setSavingKey(false);
    }
  };

  const saveApiSecret = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    if (!apiSecret || apiSecret.length < 8) {
      toast.error("API secret must be at least 8 characters");
      return;
    }
    setSavingSecret(true);
    try {
      const res = await encryptPanApiSecret({ data: { apiSecret } });
      if (!res.success) throw new Error(res.error);
      await setDoc(
        doc(db, "pan_config", "master"),
        {
          apiSecretCipher: res.cipher,
          apiSecretHint: res.apiSecretHint,
          updatedAt: new Date().toISOString(),
          updatedBy: appUser.email,
        },
        { merge: true },
      );
      toast.success("PAN API secret encrypted and saved");
      setApiSecret("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save secret");
    } finally {
      setSavingSecret(false);
    }
  };

  const saveBridge = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    setSavingBridge(true);
    try {
      const update: Partial<PanMasterConfig> = {
        vpsBridgeUrl: bridgeUrl.trim() || undefined,
        updatedAt: new Date().toISOString(),
        updatedBy: appUser.email,
      };
      if (bridgeSecret) {
        if (bridgeSecret.length < 16) {
          toast.error("Bridge secret must be at least 16 characters");
          setSavingBridge(false);
          return;
        }
        const res = await encryptPanBridgeSecret({ data: { bridgeSecret } });
        if (!res.success) throw new Error(res.error);
        update.vpsBridgeSecretCipher = res.cipher;
        update.vpsBridgeSecretHint = res.vpsBridgeSecretHint;
      }
      await setDoc(doc(db, "pan_config", "master"), update, { merge: true });
      toast.success("VPS bridge config saved");
      setBridgeSecret("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save bridge");
    } finally {
      setSavingBridge(false);
    }
  };

  const saveUrls = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    setSavingUrls(true);
    try {
      await setDoc(
        doc(db, "pan_config", "master"),
        {
          urls,
          updatedAt: new Date().toISOString(),
          updatedBy: appUser.email,
        },
        { merge: true },
      );
      toast.success("Endpoint URLs saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save URLs");
    } finally {
      setSavingUrls(false);
    }
  };

  const toggleService = async (key: string, enabled: boolean) => {
    const current = new Set(config?.disabledServices ?? []);
    if (enabled) current.delete(key);
    else current.add(key);
    await setDoc(
      doc(db, "pan_config", "master"),
      { disabledServices: Array.from(current), updatedAt: new Date().toISOString() },
      { merge: true },
    );
  };

  const setFee = async (key: string, fee: number) => {
    const overrides = { ...(config?.feeOverrides ?? {}), [key]: fee };
    await setDoc(
      doc(db, "pan_config", "master"),
      { feeOverrides: overrides, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  };

  const disabled = new Set(config?.disabledServices ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">PAN PORTAL · Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage the encrypted mallikacyberzone API key, endpoint URLs, and per-service fees.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Transactions" value={stats.total} />
        <StatTile label="Success" value={stats.success} accent="text-success" />
        <StatTile label="Failed/Refund" value={stats.failed} accent="text-destructive" />
        <StatTile label="Wallet Volume" value={`₹${stats.volume.toFixed(0)}`} />
      </div>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5" /> Master PAN API Key
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config?.apiKeyCipher && (
            <div className="mb-4 rounded-lg border bg-success/5 p-3 text-sm">
              <div className="flex items-center gap-2 text-success">
                <Shield className="h-4 w-4" />
                <span className="font-medium">Encrypted API key on file</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Stored key: <code className="font-mono">{config.apiKeyHint}</code> · last updated{" "}
                {new Date(config.updatedAt).toLocaleString()} by {config.updatedBy}
              </p>
            </div>
          )}
          <form onSubmit={saveApiKey} className="space-y-3">
            <div className="space-y-1.5">
              <Label>PAN API Key (mallikacyberzone)</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="30c2a7-50ca6a-c7f201-..."
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={savingKey}>
              {savingKey ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Encrypting…</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Encrypt & Save</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Encrypted with AES-GCM server-side. Plaintext is never persisted or returned to the
              browser. Used as the <code className="font-mono">api_key</code> query/body param.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Endpoint URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5" /> Endpoint URLs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveUrls} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {URL_FIELDS.map((u) => (
                <div key={u.key} className="space-y-1.5">
                  <Label>{u.label}</Label>
                  <Input
                    type="url"
                    value={urls[u.key]}
                    onChange={(e) => setUrls({ ...urls, [u.key]: e.target.value })}
                    placeholder={PAN_DEFAULT_URLS[u.key]}
                  />
                  {u.hint && <p className="text-xs text-muted-foreground">{u.hint}</p>}
                </div>
              ))}
            </div>
            <Button type="submit" disabled={savingUrls}>
              {savingUrls ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save URLs</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Service Fees */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Availability & Fees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {PAN_SERVICES.map((svc) => {
            const enabled = !disabled.has(svc.key);
            const fee = config?.feeOverrides?.[svc.key] ?? svc.defaultFee;
            return (
              <div
                key={svc.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{svc.name}</p>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {svc.method}
                    </Badge>
                    {svc.expectsRedirect && (
                      <Badge variant="default" className="text-[10px]">eKYC redirect</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{svc.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">Fee ₹</span>
                    <Input
                      type="number"
                      value={fee}
                      onChange={(e) => setFee(svc.key, Number(e.target.value) || 0)}
                      className="h-8 w-20"
                    />
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => toggleService(svc.key, v)}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" /> Recent PAN Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/20 p-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{tx.serviceName}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.retailerEmail} · {new Date(tx.createdAt).toLocaleString()} ·{" "}
                      {tx.providerRef || "—"}
                    </p>
                    {tx.errorMessage && (
                      <p className="mt-0.5 truncate text-xs text-destructive">{tx.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-xs font-semibold">₹{tx.totalDebited}</span>
                    <Badge
                      variant={
                        tx.status === "success"
                          ? "default"
                          : tx.status === "failed" || tx.status === "refunded"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[10px] capitalize"
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Bulk user migration tool will be added in a future update.
      </p>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

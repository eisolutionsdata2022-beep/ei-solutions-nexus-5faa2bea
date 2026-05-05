import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Shield, ServerCog, KeyRound, Activity } from "lucide-react";
import { toast } from "sonner";
import { CSC_SERVICES } from "@/lib/csc-services";
import type { CscMasterConfig, CscTransaction } from "@/lib/csc-types";
import { encryptCscCredentials } from "@/lib/csc-bridge.functions";

export const Route = createFileRoute("/admin/csc-settings")({
  ssr: false,
  component: AdminCscSettings,
});

interface ExtendedConfig extends CscMasterConfig {
  bridgeUrl?: string;
  hmacSecret?: string;
}

function AdminCscSettings() {
  const { appUser } = useAuth();
  const [config, setConfig] = useState<ExtendedConfig | null>(null);
  const [transactions, setTransactions] = useState<CscTransaction[]>([]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [hmacSecret, setHmacSecret] = useState("");
  const [savingCreds, setSavingCreds] = useState(false);
  const [savingBridge, setSavingBridge] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "csc_config", "master"), (snap) => {
      const data = snap.exists() ? (snap.data() as ExtendedConfig) : null;
      setConfig(data);
      if (data?.bridgeUrl) setBridgeUrl(data.bridgeUrl);
      // hmacSecret deliberately not pre-filled — stored as write-only.
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "csc_transactions"), orderBy("createdAt", "desc")),
      (snap) => {
        const list: CscTransaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as CscTransaction) }));
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
      .reduce((s, t) => s + (t.amount || 0), 0);
    return { total, success, failed, volume };
  }, [transactions]);

  const saveCreds = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    if (!username || !password) {
      toast.error("Username and password are required");
      return;
    }
    setSavingCreds(true);
    try {
      const res = await encryptCscCredentials({ data: { username, password } });
      if (!res.success) throw new Error(res.error);
      const next: Partial<ExtendedConfig> = {
        cipher: res.cipher,
        usernameHint: res.usernameHint,
        updatedAt: new Date().toISOString(),
        updatedBy: appUser.email,
        disabledServices: config?.disabledServices ?? [],
        feeOverrides: config?.feeOverrides ?? {},
      };
      await setDoc(doc(db, "csc_config", "master"), next, { merge: true });
      toast.success("CSC credentials encrypted and saved");
      setUsername("");
      setPassword("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save credentials");
    } finally {
      setSavingCreds(false);
    }
  };

  const saveBridge = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    if (!bridgeUrl) {
      toast.error("Bridge URL is required");
      return;
    }
    setSavingBridge(true);
    try {
      // Strip any legacy plaintext hmacSecret previously stored
      await setDoc(
        doc(db, "csc_config", "master"),
        {
          bridgeUrl,
          hmacSecret: null,
          updatedAt: new Date().toISOString(),
          updatedBy: appUser.email,
        },
        { merge: true },
      );
      toast.success("Bridge URL saved");
      setHmacSecret("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save bridge config");
    } finally {
      setSavingBridge(false);
    }
  };

  const toggleService = async (key: string, enabled: boolean) => {
    const current = new Set(config?.disabledServices ?? []);
    if (enabled) current.delete(key);
    else current.add(key);
    await setDoc(
      doc(db, "csc_config", "master"),
      { disabledServices: Array.from(current), updatedAt: new Date().toISOString() },
      { merge: true },
    );
  };

  const setFee = async (key: string, fee: number) => {
    const overrides = { ...(config?.feeOverrides ?? {}), [key]: fee };
    await setDoc(
      doc(db, "csc_config", "master"),
      { feeOverrides: overrides, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  };

  const setMode = async (key: string, mode: "bridge" | "redirect") => {
    const overrides = { ...(config?.modeOverrides ?? {}), [key]: mode };
    await setDoc(
      doc(db, "csc_config", "master"),
      { modeOverrides: overrides, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    toast.success(`Mode updated → ${mode}`);
  };

  const disabled = new Set(config?.disabledServices ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">EI SOLUTIONS PAY · Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage master CSC credentials, the secure VPS bridge, and per-service availability.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Transactions" value={stats.total} />
        <StatTile label="Success" value={stats.success} accent="text-success" />
        <StatTile label="Failed/Refund" value={stats.failed} accent="text-destructive" />
        <StatTile label="Volume" value={`₹${stats.volume.toFixed(0)}`} />
      </div>

      {/* Master credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5" /> Master CSC Credentials
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config?.cipher && (
            <div className="mb-4 rounded-lg border bg-success/5 p-3 text-sm">
              <div className="flex items-center gap-2 text-success">
                <Shield className="h-4 w-4" />
                <span className="font-medium">Encrypted credentials on file</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Stored username: <code className="font-mono">{config.usernameHint}</code> · last
                updated {new Date(config.updatedAt).toLocaleString()} by {config.updatedBy}
              </p>
            </div>
          )}
          <form onSubmit={saveCreds} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>CSC Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="CSC Connect username"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label>CSC Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button type="submit" disabled={savingCreds}>
              {savingCreds ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Encrypting…</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Encrypt & Save</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Credentials are encrypted with AES-GCM server-side before storage. The plaintext
              is never persisted or returned to the browser.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Bridge config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ServerCog className="h-5 w-5" /> VPS Bridge Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveBridge} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Bridge URL</Label>
              <Input
                type="url"
                value={bridgeUrl}
                onChange={(e) => setBridgeUrl(e.target.value)}
                placeholder="https://your-vps.example.com/csc/execute"
              />
              <p className="text-xs text-muted-foreground">
                Endpoint of the VPS scraper (Puppeteer/Playwright). It must accept POST with an
                <code className="mx-1 font-mono">X-Signature</code>HMAC-SHA256 header.
              </p>
            </div>
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              🔒 The HMAC signing secret is now stored as the server environment variable
              <code className="mx-1 font-mono">CSC_BRIDGE_HMAC_SECRET</code> for security.
              To rotate it, update the secret in Lovable + the VPS <code className="font-mono">.env</code> together.
            </div>
            <Button type="submit" disabled={savingBridge}>
              {savingBridge ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Save Bridge Config</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Service toggles + fees */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Availability & Fees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {CSC_SERVICES.map((svc) => {
            const enabled = !disabled.has(svc.key);
            const fee = config?.feeOverrides?.[svc.key] ?? svc.defaultFee;
            const effectiveMode = config?.modeOverrides?.[svc.key] ?? svc.mode;
            return (
              <div
                key={svc.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{svc.name}</p>
                    <Badge
                      variant={effectiveMode === "bridge" ? "default" : "secondary"}
                      className="text-[10px] uppercase"
                    >
                      {effectiveMode}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{svc.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 rounded-md border p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={effectiveMode === "bridge" ? "default" : "ghost"}
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setMode(svc.key, "bridge")}
                    >
                      Bridge
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={effectiveMode === "redirect" ? "default" : "ghost"}
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setMode(svc.key, "redirect")}
                    >
                      Redirect
                    </Button>
                  </div>
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

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" /> Recent Activity
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
                      {tx.retailerEmail} · {new Date(tx.createdAt).toLocaleString()}
                    </p>
                    {tx.errorMessage && (
                      <p className="mt-0.5 truncate text-xs text-destructive">
                        {tx.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-xs font-semibold">₹{tx.amount}</span>
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
        ⚠️ The CSC portal does not officially support automation. Operating an unofficial VPS
        bridge may violate CSC terms and result in account suspension. Use at your own risk.
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

// Mark unused vars as used to avoid TS warnings.
void updateDoc;

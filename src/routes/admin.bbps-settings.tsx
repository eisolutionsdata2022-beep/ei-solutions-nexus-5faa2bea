import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Banknote, Save, Stethoscope, Loader2, CheckCircle2, XCircle, Copy, Radar, Square } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { getBbpsConfig, saveBbpsConfig } from "@/lib/bbps-firebase";
import { DEFAULT_BBPS_CONFIG, type BbpsMasterConfig } from "@/lib/bbps-types";
import { bbpsTestConnection } from "@/lib/bbps-api.functions";

type TestResult = Awaited<ReturnType<typeof bbpsTestConnection>>;

export const Route = createFileRoute("/admin/bbps-settings")({
  ssr: false,
  component: AdminBbpsSettings,
});

function AdminBbpsSettings() {
  const { appUser } = useAuth();
  const [cfg, setCfg] = useState<BbpsMasterConfig>(DEFAULT_BBPS_CONFIG);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Auto re-test (whitelist watcher)
  const [autoOn, setAutoOn] = useState(false);
  const [autoIntervalSec, setAutoIntervalSec] = useState(30);
  const [autoAttempts, setAutoAttempts] = useState(0);
  const [autoNextInSec, setAutoNextInSec] = useState(0);
  const autoStopRef = useRef(false);
  const MAX_ATTEMPTS = 240; // safety cap (e.g. 30s × 240 = 2 hrs)

  useEffect(() => {
    getBbpsConfig().then(setCfg);
  }, []);

  async function runTest(silent = false): Promise<TestResult | null> {
    setTesting(true);
    if (!silent) setTestResult(null);
    try {
      const res = await bbpsTestConnection();
      setTestResult(res);
      if (!silent) {
        if (res.ok) toast.success("✅ Provider responded successfully");
        else toast.error(res.error || `Test failed at: ${res.stage}`);
      }
      return res;
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : "Test failed");
      return null;
    } finally {
      setTesting(false);
    }
  }

  // Auto re-test loop — polls until success OR provider stops returning 403
  useEffect(() => {
    if (!autoOn) return;
    autoStopRef.current = false;
    let cancelled = false;
    let countdownTimer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      let attempts = 0;
      let lastHttp: number | undefined;

      while (!cancelled && !autoStopRef.current && attempts < MAX_ATTEMPTS) {
        attempts++;
        setAutoAttempts(attempts);
        const res = await runTest(true);
        if (cancelled || autoStopRef.current) break;

        // Stop conditions
        if (res?.ok) {
          toast.success(`🎉 Provider whitelisted! Success on attempt #${attempts}`);
          setAutoOn(false);
          break;
        }
        // If status changed away from 403, surface it (probably auth/payload error now)
        if (res && typeof res.httpStatus === "number" && res.httpStatus !== 403 && lastHttp === 403) {
          toast.info(`Status changed: 403 → ${res.httpStatus}. Whitelist likely active — check response.`);
          setAutoOn(false);
          break;
        }
        lastHttp = res?.httpStatus;

        // Countdown to next poll
        let remaining = autoIntervalSec;
        setAutoNextInSec(remaining);
        countdownTimer && clearInterval(countdownTimer);
        countdownTimer = setInterval(() => {
          remaining -= 1;
          setAutoNextInSec(Math.max(0, remaining));
        }, 1000);

        await new Promise((r) => setTimeout(r, autoIntervalSec * 1000));
        countdownTimer && clearInterval(countdownTimer);
      }

      if (attempts >= MAX_ATTEMPTS && !autoStopRef.current) {
        toast.warning(`Auto re-test stopped after ${MAX_ATTEMPTS} attempts. Restart manually if needed.`);
        setAutoOn(false);
      }
    })();

    return () => {
      cancelled = true;
      autoStopRef.current = true;
      if (countdownTimer) clearInterval(countdownTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOn]);

  function stopAuto() {
    autoStopRef.current = true;
    setAutoOn(false);
    toast.info("Auto re-test stopped");
  }


  function copyResult() {
    if (!testResult) return;
    const text = JSON.stringify(testResult, null, 2);
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard — paste in WhatsApp");
  }

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

      {/* Test Connection — fires real getAccessToken via VPS bridge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Test Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Sends a real <code>POST /getAccessToken</code> via the VPS bridge from your whitelisted IP.
            Use this to share exact request/response with the provider for debugging.
          </p>
          <Button onClick={() => runTest(false)} disabled={testing || autoOn} className="w-full">
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Stethoscope className="mr-2 h-4 w-4" />}
            {testing ? "Testing…" : "Run Test Now"}
          </Button>

          {/* Auto re-test (whitelist watcher) */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Radar className="h-4 w-4" />
                  Auto re-test (whitelist watcher)
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Polls the provider on a timer. Stops automatically when the response changes
                  (success, or HTTP status moves off 403 — meaning whitelist is active).
                </p>
              </div>
              <Switch checked={autoOn} onCheckedChange={setAutoOn} disabled={testing && !autoOn} />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Every</Label>
              <Input
                type="number"
                min={10}
                max={300}
                value={autoIntervalSec}
                onChange={(e) => setAutoIntervalSec(Math.max(10, Math.min(300, Number(e.target.value) || 30)))}
                disabled={autoOn}
                className="h-8 w-20"
              />
              <span className="text-xs text-muted-foreground">seconds (10–300)</span>
            </div>

            {autoOn && (
              <div className="flex items-center justify-between gap-2 rounded border border-dashed bg-background/50 p-2 text-xs">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>
                    Watching · attempt <strong>#{autoAttempts}</strong>
                    {!testing && autoNextInSec > 0 && <> · next in {autoNextInSec}s</>}
                    {testing && <> · testing now…</>}
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={stopAuto}>
                  <Square className="mr-1 h-3 w-3" /> Stop
                </Button>
              </div>
            )}
          </div>


          {testResult && (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {testResult.ok ? (
                    <Badge className="bg-emerald-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Success</Badge>
                  ) : (
                    <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Failed</Badge>
                  )}
                  <span className="font-mono text-[11px] text-muted-foreground">stage: {testResult.stage}</span>
                  {typeof testResult.elapsedMs === "number" && (
                    <span className="text-[11px] text-muted-foreground">· {testResult.elapsedMs}ms</span>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={copyResult}>
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </Button>
              </div>

              {testResult.bridgeUrl && (
                <Row k="Bridge" v={`${testResult.bridgeUrl} ${testResult.bridgeReachable ? "✅" : "❌"}`} />
              )}
              {testResult.providerUrl && <Row k="Provider URL" v={testResult.providerUrl} />}
              {typeof testResult.httpStatus === "number" && (
                <Row k="HTTP" v={`${testResult.httpStatus} ${testResult.httpStatusText ?? ""}`} />
              )}
              <Row k="Timestamp" v={testResult.timestamp} />

              {testResult.headersSent && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-medium">Headers sent</summary>
                  <pre className="mt-1 overflow-auto rounded bg-background p-2 font-mono text-[11px]">
                    {JSON.stringify(testResult.headersSent, null, 2)}
                  </pre>
                </details>
              )}
              {testResult.bodySent && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[11px] font-medium">Body sent (masked)</summary>
                  <pre className="mt-1 overflow-auto rounded bg-background p-2 font-mono text-[11px]">
                    {JSON.stringify(testResult.bodySent, null, 2)}
                  </pre>
                </details>
              )}
              {testResult.response && (
                <details className="mt-1" open>
                  <summary className="cursor-pointer text-[11px] font-medium">Provider response</summary>
                  <pre className="mt-1 max-h-64 overflow-auto rounded bg-background p-2 font-mono text-[11px] whitespace-pre-wrap break-all">
                    {testResult.response}
                  </pre>
                </details>
              )}
              {testResult.error && (
                <div className="mt-2 rounded border border-destructive/50 bg-destructive/10 p-2 text-[11px] text-destructive">
                  {testResult.error}
                </div>
              )}
            </div>
          )}
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
              Provider issues credentials in pre-encrypted form (long base64 strings with version prefix).
              Send them as-is — no client-side AES key needed.
            </div>
            <ul className="mt-2 list-inside list-disc space-y-0.5 font-mono text-xs">
              <li>BBPS_AGENT_ID</li>
              <li>BBPS_CLIENT_ID</li>
              <li>BBPS_CLIENT_SECRET</li>
              <li>BBPS_API_KEY</li>
              <li>BBPS_BRIDGE_BASE_URL</li>
              <li>BBPS_BRIDGE_HMAC_SECRET</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] font-medium text-muted-foreground">{k}</span>
      <span className="text-right font-mono text-[11px] break-all">{v}</span>
    </div>
  );
}

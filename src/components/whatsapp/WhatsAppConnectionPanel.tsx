import { useEffect, useState } from "react";
import { Loader2, RefreshCw, QrCode, Trash2, AlertTriangle, ShieldCheck, Wifi, WifiOff, Stethoscope, ServerCrash } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { subscribeSession } from "@/lib/whatsapp-firebase";
import type { WaSessionDoc } from "@/lib/whatsapp-types";
import { getWhatsAppStatus, restartWhatsApp, diagnoseWhatsAppBridge } from "@/lib/whatsapp-bridge.functions";

type Diagnosis = {
  ok: boolean;
  stage?: string;
  status?: number;
  baseUrl?: string;
  elapsedMs?: number;
  error?: string;
  hint?: string;
  body?: string;
};

export function WhatsAppConnectionPanel() {
  const [session, setSession] = useState<WaSessionDoc | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<{ ok: boolean; error?: string } | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [polling, setPolling] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => subscribeSession(setSession), []);

  // Poll bridge status every 10 s; auto-run /health diagnostic on first failure
  useEffect(() => {
    let alive = true;
    let ranDiag = false;
    const tick = async () => {
      try {
        const res = await getWhatsAppStatus();
        if (!alive) return;
        setBridgeStatus(res as any);
        if (!(res as any)?.ok && !ranDiag) {
          ranDiag = true;
          const d = await diagnoseWhatsAppBridge();
          if (alive) setDiagnosis(d as Diagnosis);
        }
      } catch (e: any) {
        if (alive) setBridgeStatus({ ok: false, error: e?.message || "Bridge unreachable" });
      }
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const refresh = async () => {
    setPolling(true);
    try {
      const res = await getWhatsAppStatus();
      setBridgeStatus(res as any);
      toast.success("Refreshed");
    } finally { setPolling(false); }
  };

  const runDiagnostic = async () => {
    setDiagnosing(true);
    try {
      const d = await diagnoseWhatsAppBridge();
      setDiagnosis(d as Diagnosis);
      if ((d as Diagnosis).ok) toast.success("Bridge /health is responding ✅");
      else toast.error((d as Diagnosis).error || "Bridge unreachable");
    } finally { setDiagnosing(false); }
  };

  const restart = async (purge = false) => {
    if (purge && !confirm("Purge session and force a NEW QR scan? You will lose the current WhatsApp link.")) return;
    setRestarting(true);
    try {
      const res = await restartWhatsApp({ data: { purgeSession: purge } });
      if ((res as any).ok) toast.success(purge ? "Session purged — scan new QR" : "Bridge restarted");
      else toast.error((res as any).error || "Restart failed");
    } finally { setRestarting(false); }
  };

  const ready = session?.ready === true;
  const qrUrl = session?.qrDataUrl;

  return (
    <div className="space-y-4">
      {/* Risk banner */}
      <Card className="border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
        <CardContent className="p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-amber-900 dark:text-amber-200">⚠️ Unofficial bridge — ban risk</p>
            <p className="text-amber-800/90 dark:text-amber-300/80 mt-1">
              This uses WhatsApp Web automation, which violates Meta's ToS. Use only a dedicated business number.
              Bulk sending dramatically increases ban risk. Hard caps: <b>5 msgs/min, 100/day</b>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Diagnostic banner — shown when bridge is unreachable */}
      {(diagnosis && !diagnosis.ok) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ServerCrash className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-destructive">
                  Bridge diagnostic — {diagnosis.stage?.toUpperCase() || "ERROR"}
                  {diagnosis.status ? ` (HTTP ${diagnosis.status})` : ""}
                </p>
                <p className="text-xs mt-1 font-medium">{diagnosis.error}</p>
                {diagnosis.baseUrl && (
                  <p className="text-[11px] text-muted-foreground mt-1 font-mono break-all">
                    Target: {diagnosis.baseUrl}/health
                    {typeof diagnosis.elapsedMs === "number" ? ` · ${diagnosis.elapsedMs}ms` : ""}
                  </p>
                )}
                {diagnosis.hint && (
                  <pre className="text-[11px] mt-2 p-2 bg-background border border-border rounded whitespace-pre-wrap font-mono leading-relaxed">
                    {diagnosis.hint}
                  </pre>
                )}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={runDiagnostic} disabled={diagnosing}>
              {diagnosing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Stethoscope className="h-3.5 w-3.5 mr-1" />}
              Re-run diagnostic
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Status card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {ready ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-amber-600" />}
              Connection status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="VPS bridge" value={bridgeStatus?.ok ? <Badge className="bg-emerald-600">Reachable</Badge> : <Badge variant="destructive">{bridgeStatus?.error || "Unreachable"}</Badge>} />
            <Row label="WA status" value={<span className="capitalize font-medium">{session?.status || "—"}</span>} />
            <Row label="Ready" value={ready ? <Badge className="bg-emerald-600">Yes</Badge> : <Badge variant="outline">No</Badge>} />
            <Row label="Linked number" value={session?.myPhone ? `+${session.myPhone}` : "—"} />
            <Row label="Device name" value={session?.pushname || "—"} />
            <Row label="Platform" value={session?.platform || "—"} />
            {session?.lastDisconnectReason && (
              <Row label="Last disconnect" value={<span className="text-xs text-muted-foreground">{session.lastDisconnectReason}</span>} />
            )}
            <div className="flex gap-2 pt-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={refresh} disabled={polling}>
                {polling ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Refresh
              </Button>
              <Button size="sm" variant="outline" onClick={runDiagnostic} disabled={diagnosing}>
                {diagnosing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Stethoscope className="h-3.5 w-3.5 mr-1" />}
                Diagnose
              </Button>
              <Button size="sm" variant="outline" onClick={() => restart(false)} disabled={restarting}>
                Restart bridge
              </Button>
              <Button size="sm" variant="destructive" onClick={() => restart(true)} disabled={restarting}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Purge & re-scan QR
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QR card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              {ready ? "Linked" : "Scan QR to link your WhatsApp"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[280px]">
            {ready ? (
              <div className="text-center">
                <ShieldCheck className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-medium">Connected as {session?.pushname}</p>
                <p className="text-xs text-muted-foreground">+{session?.myPhone}</p>
              </div>
            ) : qrUrl ? (
              <>
                <img src={qrUrl} alt="WhatsApp QR" className="w-56 h-56 border border-border rounded" />
                <p className="text-xs text-muted-foreground text-center mt-3 max-w-xs">
                  Open WhatsApp → <b>Settings → Linked Devices → Link a Device</b> → scan this code.
                </p>
              </>
            ) : (
              <div className="text-center">
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Waiting for QR from bridge…</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs">{value}</span>
    </div>
  );
}

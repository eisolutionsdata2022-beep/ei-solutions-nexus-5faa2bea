import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  DEFAULT_IPPB_FEE,
  getIPPBFeeConfig,
  type IPPBFeeConfig,
} from "@/lib/ippb-fee-config";
import {
  DEFAULT_IPPB_SOFTWARE,
  getIPPBSoftwareConfig,
  saveIPPBSoftwareConfig,
  type IPPBSoftwareConfig,
} from "@/lib/ippb-software-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Banknote, Loader2, Save, Info, AlertTriangle, Download, Wrench, CheckCircle2, Monitor, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { migrateLegacyIPPBRequests, type MigrationResult } from "@/lib/ippb-firebase";

export const Route = createFileRoute("/admin/ippb-settings")({
  ssr: false,
  component: AdminIPPBSettingsPage,
});

function AdminIPPBSettingsPage() {
  const { appUser } = useAuth();
  const [cfg, setCfg] = useState<IPPBFeeConfig>(DEFAULT_IPPB_FEE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [sw, setSw] = useState<IPPBSoftwareConfig>(DEFAULT_IPPB_SOFTWARE);
  const [savingSw, setSavingSw] = useState(false);

  useEffect(() => {
    Promise.all([getIPPBFeeConfig(), getIPPBSoftwareConfig()])
      .then(([f, s]) => {
        setCfg(f);
        setSw(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSw = async () => {
    if (!appUser) return;
    setSavingSw(true);
    try {
      await saveIPPBSoftwareConfig(
        { pcAgent: sw.pcAgent, staffApk: sw.staffApk },
        appUser.uid
      );
      toast.success("Software download links saved");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSavingSw(false);
    }
  };


  const handleMigrate = async () => {
    if (!appUser) return;
    if (!confirm("Auto-cancel all in-progress IPPB requests using the OLD schema? This cannot be undone. Terminal requests (success/failed/cancelled) will be skipped.")) return;
    setMigrating(true);
    setMigrationResult(null);
    try {
      const res = await migrateLegacyIPPBRequests(appUser.uid);
      setMigrationResult(res);
      toast.success(`Migration done: ${res.cancelled} cancelled, ${res.skipped} skipped, ${res.errors} errors`);
    } catch (e: any) {
      toast.error(e.message ?? "Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="w-6 h-6 text-gov-blue" />
          IPPB Account Opening – Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Software downloads, request workflow & legacy migration. Service charge / commission splits are now managed in the Commission Center.
        </p>
      </div>

      <Card className="border-gov-blue/30 bg-gov-blue/5">
        <CardContent className="pt-6 flex items-start gap-3 text-sm">
          <Info className="w-5 h-5 text-gov-blue mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-gov-blue">Commission moved to Commission Center</p>
            <p className="text-muted-foreground">
              IPPB customer charge & commission splits (Retailer / Staff / Admin) ഇപ്പോൾ{" "}
              <a href="/admin/commission-center" className="underline font-medium">/admin/commission-center</a>{" "}
              → <em>Customer Charges</em> tab → <strong>IPPB Account Opening</strong>-ൽ manage ചെയ്യാം.
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              Current values: ₹{cfg.serviceCharge} charge → Retailer ₹{cfg.retailerCommission} + Staff ₹{cfg.staffCommission} + Admin ₹{cfg.adminCommission}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gov-blue/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-gov-blue" />
            Native Software Downloads
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Retailer-ന്റെയും Staff-ന്റെയും IPPB pages-ൽ കാണിക്കുന്ന download links. URL ഉം version ഉം ഇവിടെ update ചെയ്യാം.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PC Agent (retailer) */}
          <div className="rounded-lg border p-4 space-y-3 bg-blue-50/50">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 font-semibold">
                <Monitor className="w-5 h-5 text-blue-600" />
                PC Agent (Windows) — Retailer
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="pc-enabled" className="text-xs">Show on /retailer/ippb</Label>
                <Switch
                  id="pc-enabled"
                  checked={sw.pcAgent.enabled}
                  onCheckedChange={(v) => setSw({ ...sw, pcAgent: { ...sw.pcAgent, enabled: v } })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Version</Label>
                <Input
                  value={sw.pcAgent.version}
                  onChange={(e) => setSw({ ...sw, pcAgent: { ...sw.pcAgent, version: e.target.value } })}
                  placeholder="1.0.0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Size (MB)</Label>
                <Input
                  type="number"
                  value={sw.pcAgent.sizeMB ?? 0}
                  onChange={(e) => setSw({ ...sw, pcAgent: { ...sw.pcAgent, sizeMB: Number(e.target.value) } })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Download URL (.exe / .zip)</Label>
                <Input
                  value={sw.pcAgent.url}
                  onChange={(e) => setSw({ ...sw, pcAgent: { ...sw.pcAgent, url: e.target.value } })}
                  placeholder="https://…/EISolutionsAgent-Setup.exe"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Release Notes</Label>
              <Textarea
                rows={2}
                value={sw.pcAgent.releaseNotes ?? ""}
                onChange={(e) => setSw({ ...sw, pcAgent: { ...sw.pcAgent, releaseNotes: e.target.value } })}
              />
            </div>
          </div>

          {/* Staff APK */}
          <div className="rounded-lg border p-4 space-y-3 bg-emerald-50/50">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 font-semibold">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                Staff APK (Android) — Tablet
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="apk-enabled" className="text-xs">Show on /staff/ippb</Label>
                <Switch
                  id="apk-enabled"
                  checked={sw.staffApk.enabled}
                  onCheckedChange={(v) => setSw({ ...sw, staffApk: { ...sw.staffApk, enabled: v } })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Version</Label>
                <Input
                  value={sw.staffApk.version}
                  onChange={(e) => setSw({ ...sw, staffApk: { ...sw.staffApk, version: e.target.value } })}
                  placeholder="1.0.0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Size (MB)</Label>
                <Input
                  type="number"
                  value={sw.staffApk.sizeMB ?? 0}
                  onChange={(e) => setSw({ ...sw, staffApk: { ...sw.staffApk, sizeMB: Number(e.target.value) } })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Download URL (.apk)</Label>
                <Input
                  value={sw.staffApk.url}
                  onChange={(e) => setSw({ ...sw, staffApk: { ...sw.staffApk, url: e.target.value } })}
                  placeholder="https://…/eisolutions-ippb-staff.apk"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Release Notes</Label>
              <Textarea
                rows={2}
                value={sw.staffApk.releaseNotes ?? ""}
                onChange={(e) => setSw({ ...sw, staffApk: { ...sw.staffApk, releaseNotes: e.target.value } })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSaveSw} disabled={savingSw}>
              {savingSw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Software Links
            </Button>
            {sw.updatedAt && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(sw.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-destructive" />
            Legacy Data Migration — One-Time
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            പഴയ 8-step schema-യിൽ create ചെയ്ത in-progress IPPB requests പുതിയ
            19-step UI-യിൽ break ചെയ്യും. ഈ button auto-cancel ചെയ്യും അവയെ —
            terminal requests (success / failed / cancelled) skip ചെയ്യും.
          </p>
          <Button variant="destructive" onClick={handleMigrate} disabled={migrating}>
            {migrating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Wrench className="w-4 h-4 mr-2" />
            )}
            Run Migration — Cancel Legacy Requests
          </Button>
          {migrationResult && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Migration complete
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>Scanned: <strong>{migrationResult.scanned}</strong></div>
                <div className="text-destructive">Cancelled: <strong>{migrationResult.cancelled}</strong></div>
                <div>Skipped: <strong>{migrationResult.skipped}</strong></div>
                <div className="text-warning">Errors: <strong>{migrationResult.errors}</strong></div>
              </div>
              {migrationResult.details.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Show {migrationResult.details.length} affected request{migrationResult.details.length === 1 ? "" : "s"}
                  </summary>
                  <ul className="mt-2 space-y-1 max-h-48 overflow-auto">
                    {migrationResult.details.map((d) => (
                      <li key={d.id} className="font-mono">
                        {d.requestNo ?? d.id.slice(0, 8)} — {d.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-warning/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <Download className="w-5 h-5 text-gov-blue" />
            Android Interceptor APK
            <Badge variant="outline" className="ml-2 border-warning text-warning-foreground bg-warning/10">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Beta — UIDAI signature mismatch വരാം
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p className="text-muted-foreground">
            Tablet-ൽ install ചെയ്ത real IPPB BCAS / CSC VLE app-ലെ "Capture Fingerprint"
            ബട്ടൺ intercept ചെയ്ത് retailer PC-യിലേക്ക് relay ചെയ്യുന്ന AccessibilityService APK.
          </p>
          <div className="rounded-md border border-warning/50 bg-warning/10 p-3 text-foreground text-xs leading-relaxed">
            <strong>⚠ Limitation:</strong> UIDAI RD Service-ന്റെ device-bound RSA signature + WADH binding
            കാരണം retailer device-ൽ scan ചെയ്ത PID XML tablet-ലെ IPPB app-ൽ inject ചെയ്താൽ
            UIDAI server reject ചെയ്യാൻ സാധ്യത 90%+. <strong>Detection-only mode</strong>
            (Firestore: <code>config/interceptor.detectionOnly = true</code>) recommended —
            retailer-ന് notification പോകും, injection skip ചെയ്യും. Full reliable flow-ന്
            <a href="/retailer/ippb" className="underline ml-1">own /retailer/ippb form</a> use ചെയ്യാൻ retailer-ന് പറയുക.
          </div>
          <p className="text-xs text-muted-foreground">
            Build steps: <code>native/android-interceptor/BUILD.md</code> · Tech docs:
            <code> native/docs/SECURITY.md §7</code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>എങ്ങനെ പ്രവർത്തിക്കും? (Workflow in Malayalam)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3 leading-relaxed">
          <ol className="list-decimal pl-5 space-y-2">
            <li>റീടെയിലർ /retailer/ippb-ൽ "New Request" ക്ലിക്ക് ചെയ്യും. <strong>Wallet-ൽ നിന്ന് ഈ stage-ൽ ഒന്നും കട്ട് ആകില്ല.</strong></li>
            <li>Staff /staff/ippb-ൽ request claim ചെയ്ത് customer mobile enter ചെയ്ത് OTP send ചെയ്യും.</li>
            <li>Customer-ന് OTP വരുമ്പോൾ retailer-ന് അത് കൊടുക്കും. Retailer dashboard-ൽ OTP enter ചെയ്യും.</li>
            <li>Staff OTP verify ചെയ്ത്, customer details + biometric (MFS110 / L1 sim) capture ചെയ്യും.</li>
            <li>Account number generate ആയി, staff "Mark Success" ക്ലിക്ക് ചെയ്യുമ്പോൾ <strong>only then</strong> retailer wallet-ൽ നിന്ന് <strong>₹{cfg.serviceCharge}</strong> debit ആകും.</li>
            <li>അതേ ട്രാൻസാക്ഷനിൽ commission auto-credit ആകും: Retailer ₹{cfg.retailerCommission}, Staff ₹{cfg.staffCommission}, Admin ₹{cfg.adminCommission}.</li>
            <li>Retailer-ന് net cost ₹{netRetailerCost(cfg)} matters; failed/cancelled ആയാൽ <strong>charge ഇല്ല</strong>.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

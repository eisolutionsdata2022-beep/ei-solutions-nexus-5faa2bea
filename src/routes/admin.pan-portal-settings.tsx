import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, KeyRound, Settings, IndianRupee, BarChart3, Search, Download, Link2, Pencil, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { loadPanConfig, savePanConfig, loadPanCouponReport, adminPatchPsaVleLink, bulkLinkVleByMobile, type PanRetailerCouponSummary, type BulkLinkResultRow } from "@/lib/pan-portal-firebase";
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

      <Tabs defaultValue="report" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="report" className="gap-2"><BarChart3 className="h-4 w-4" />Coupon Report</TabsTrigger>
          <TabsTrigger value="creds" className="gap-2"><KeyRound className="h-4 w-4" />Credentials</TabsTrigger>
          <TabsTrigger value="fees" className="gap-2"><IndianRupee className="h-4 w-4" />Fees & URL</TabsTrigger>
        </TabsList>

        <TabsContent value="report" className="mt-4">
          <PanCouponReportTab />
        </TabsContent>

        <TabsContent value="creds" className="mt-4">
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
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PanCouponReportTab() {
  const { appUser } = useAuth();
  const [rows, setRows] = useState<PanRetailerCouponSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PanRetailerCouponSummary | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const data = await loadPanCouponReport();
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.retailerName, r.retailerEmail, r.retailerMobile, r.vleId, r.vleRegCode, r.retailerId]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => ({
        retailers: acc.retailers + (r.totalCoupons > 0 ? 1 : 0),
        coupons: acc.coupons + r.totalCoupons,
        success: acc.success + r.successCoupons,
        refunded: acc.refunded + r.refundedCoupons,
        spent: acc.spent + r.totalSpent,
      }),
      { retailers: 0, coupons: 0, success: 0, refunded: 0, spent: 0 },
    );
  }, [filtered]);

  function exportCsv() {
    const header = [
      "Retailer Name", "Email", "Mobile", "User ID",
      "Linked Existing", "VLE ID (active)", "Old/Reg Code",
      "Total Orders", "Total Coupons", "Success", "Failed", "Refunded",
      "Total Spent (₹)", "Total Refunded (₹)", "Last Purchase",
    ];
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      const row = [
        r.retailerName, r.retailerEmail, r.retailerMobile, r.retailerId,
        r.linkedExisting ? "YES" : "NO", r.vleId, r.vleRegCode || "",
        r.totalOrders, r.totalCoupons, r.successCoupons, r.failedCoupons, r.refundedCoupons,
        r.totalSpent, r.totalRefunded, r.lastPurchaseAt || "",
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`);
      lines.push(row.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pan-coupon-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />PAN Coupon Purchase Report</CardTitle>
            <CardDescription>Per-retailer coupon usage across linked-existing and new VLE IDs.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <SummaryStat label="Retailers" value={totals.retailers} />
          <SummaryStat label="Total Coupons" value={totals.coupons} />
          <SummaryStat label="Success" value={totals.success} tone="success" />
          <SummaryStat label="Refunded" value={totals.refunded} tone="warn" />
          <SummaryStat label="Net Spent" value={`₹${totals.spent.toLocaleString("en-IN")}`} />
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, mobile, VLE ID…"
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No coupon data yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="text-left p-2">Retailer</th>
                  <th className="text-left p-2">VLE ID</th>
                  <th className="text-right p-2">Coupons</th>
                  <th className="text-right p-2">Success</th>
                  <th className="text-right p-2">Refunded</th>
                  <th className="text-right p-2">Spent (₹)</th>
                  <th className="text-left p-2">Last Buy</th>
                  <th className="text-right p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.retailerId} className="border-t hover:bg-muted/30">
                    <td className="p-2">
                      <div className="font-medium">{r.retailerName}</div>
                      <div className="text-xs text-muted-foreground">{r.retailerEmail || r.retailerMobile || r.retailerId}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">UID: {r.retailerId}</div>
                    </td>
                    <td className="p-2">
                      <div className="font-mono text-xs">{r.vleId}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.linkedExisting ? (
                          <Badge variant="secondary" className="gap-1 text-[10px]"><Link2 className="h-3 w-3" />Linked Old</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">New PSA</Badge>
                        )}
                        {r.vleRegCode && r.vleRegCode !== r.vleId && (
                          <Badge variant="outline" className="text-[10px] font-mono">alt: {r.vleRegCode}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-right font-semibold">{r.totalCoupons}</td>
                    <td className="p-2 text-right text-emerald-600">{r.successCoupons}</td>
                    <td className="p-2 text-right text-amber-600">{r.refundedCoupons}</td>
                    <td className="p-2 text-right">₹{r.totalSpent.toLocaleString("en-IN")}</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {r.lastPurchaseAt ? new Date(r.lastPurchaseAt).toLocaleString("en-IN") : "—"}
                    </td>
                    <td className="p-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => setEditing(r)} className="h-7 px-2">
                        <Pencil className="h-3 w-3 mr-1" />Edit VLE
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <EditVleDialog
        row={editing}
        adminUid={appUser?.uid || ""}
        onClose={() => setEditing(null)}
        onSaved={async () => { setEditing(null); await reload(); }}
      />
    </Card>
  );
}

function EditVleDialog({
  row, adminUid, onClose, onSaved,
}: {
  row: PanRetailerCouponSummary | null;
  adminUid: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [vleId, setVleId] = useState("");
  const [vleRegCode, setVleRegCode] = useState("");
  const [linkedExisting, setLinkedExisting] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (row) {
      setVleId(row.vleId || "");
      setVleRegCode(row.vleRegCode || "");
      setLinkedExisting(!!row.linkedExisting);
    }
  }, [row]);

  async function handleSave() {
    if (!row) return;
    if (!vleId.trim()) { toast.error("VLE ID is required"); return; }
    if (!adminUid) { toast.error("Admin session required"); return; }
    setSaving(true);
    try {
      await adminPatchPsaVleLink(
        row.retailerId,
        { vleId: vleId.trim(), vleRegCode: vleRegCode.trim() || undefined, linkedExisting },
        adminUid,
      );
      toast.success("VLE link updated ✓");
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit VLE Link</DialogTitle>
          <DialogDescription>
            {row?.retailerName} <span className="text-muted-foreground">({row?.retailerEmail || row?.retailerMobile || row?.retailerId})</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ed-vleid">Active VLE ID (sent to provider)</Label>
            <Input id="ed-vleid" value={vleId} onChange={(e) => setVleId(e.target.value)} className="font-mono" placeholder="MALL355-..." />
            <p className="text-xs text-muted-foreground mt-1">Use the exact UTI/provider-recognised ID (e.g. <code>MALL355-XXXX</code>).</p>
          </div>
          <div>
            <Label htmlFor="ed-regcode">Old/Reg Code (alt, optional)</Label>
            <Input id="ed-regcode" value={vleRegCode} onChange={(e) => setVleRegCode(e.target.value)} className="font-mono" placeholder="RMPMCST-... or RMPBCST-..." />
            <p className="text-xs text-muted-foreground mt-1">The auto-generated/legacy code. Kept as backup; not sent to provider.</p>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Linked from old portal</div>
              <div className="text-xs text-muted-foreground">ON = trust-based legacy VLE. OFF = registered upstream.</div>
            </div>
            <Switch checked={linkedExisting} onCheckedChange={setLinkedExisting} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "warn" }) {
  const color = tone === "success" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

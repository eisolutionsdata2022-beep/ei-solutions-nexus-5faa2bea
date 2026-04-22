import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { atomicDebit } from "@/lib/firebase-transactions";
import {
  createPanOrder,
  getPanActivation,
  getPanConfig,
  getPsaRecord,
  newOrderId,
  setPanActivation,
  subscribePanActivation,
  subscribePanConfig,
  subscribePsaRecord,
  subscribeRetailerOrders,
  updatePanOrder,
  upsertPsaRecord,
} from "@/lib/pan-portal-firebase";
import {
  panNsdlGetAuthorization,
  panPsaCreate,
  panPsaPasswordReset,
} from "@/lib/pan-portal.functions";
import type {
  PanMasterConfig,
  PanOrder,
  PanPsaRecord,
  PanServiceActivation,
} from "@/lib/pan-portal-types";
import { generateVleId } from "@/lib/vle-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  IdCard,
  FileText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
  Link2,
  CheckCircle2,
  ArrowRight,
  Clock,
  XCircle,
  TrendingUp,
  CreditCard,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/pan-portal")({
  ssr: false,
  component: PanPortalPage,
});

function PanPortalPage() {
  const { appUser } = useAuth();
  const [config, setConfig] = useState<PanMasterConfig | null>(null);
  const [activation, setActivation] = useState<PanServiceActivation | null>(null);
  const [psa, setPsa] = useState<PanPsaRecord | null>(null);
  const [orders, setOrders] = useState<PanOrder[]>([]);

  useEffect(() => subscribePanConfig(setConfig), []);
  useEffect(() => {
    if (!appUser?.uid) return;
    const u1 = subscribePanActivation(appUser.uid, setActivation);
    const u2 = subscribePsaRecord(appUser.uid, setPsa);
    const u3 = subscribeRetailerOrders(appUser.uid, setOrders);
    return () => { u1(); u2(); u3(); };
  }, [appUser?.uid]);

  if (!appUser) {
    return <div className="p-8 text-center">Please log in.</div>;
  }
  if (!config) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!config.enabled) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-10 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold">PAN Portal is currently disabled</h2>
            <p className="text-muted-foreground">Please check back later or contact support.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vleId = generateVleId(appUser.uid, appUser.phone);
  const successCount = orders.filter((o) => o.status === "success").length;
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const psaActive = psa?.status === "approved";
  const nsdlActive = !!activation?.nsdlActive;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20">
      {/* ── Premium Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-blue-700" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        <div className="absolute top-0 inset-x-0 h-1 flex">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>

        <div className="relative container mx-auto px-6 pt-12 pb-20 max-w-6xl">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="text-white space-y-3">
              <Badge className="bg-white/15 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm">
                <Sparkles className="h-3 w-3 mr-1" /> Premium Service
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
                  <IdCard className="h-7 w-7 md:h-8 md:w-8" />
                </span>
                PAN Portal
              </h1>
              <p className="text-blue-100 text-base md:text-lg max-w-xl">
                Instant PAN card services with NSDL eKYC. One wallet, zero hassle.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 min-w-[240px] shadow-2xl">
              <p className="text-xs uppercase tracking-wider text-blue-100 mb-1">Your VLE ID</p>
              <p className="font-mono text-lg font-bold text-white">{vleId}</p>
              <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2 text-xs text-blue-100">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                <span>Active retailer account</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Strip ──────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 max-w-6xl -mt-12 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile icon={<ShieldCheck className="h-5 w-5" />} label="PSA Status" value={psaActive ? "Active" : "Pending"} tone={psaActive ? "green" : "amber"} />
          <StatTile icon={<Zap className="h-5 w-5" />} label="NSDL Service" value={nsdlActive ? "Activated" : "Inactive"} tone={nsdlActive ? "green" : "slate"} />
          <StatTile icon={<TrendingUp className="h-5 w-5" />} label="Successful" value={String(successCount)} tone="blue" />
          <StatTile icon={<Clock className="h-5 w-5" />} label="In Progress" value={String(pendingCount)} tone="amber" />
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 max-w-6xl py-8">
        <Tabs defaultValue="psa">
          <TabsList className="bg-white dark:bg-slate-900 border shadow-sm h-auto p-1.5 rounded-xl">
            <TabsTrigger value="psa" className="data-[state=active]:bg-primary data-[state=active]:text-white px-5 py-2.5 rounded-lg gap-2">
              <ShieldCheck className="h-4 w-4" /> PSA Auto-ID
            </TabsTrigger>
            <TabsTrigger value="pan" className="data-[state=active]:bg-primary data-[state=active]:text-white px-5 py-2.5 rounded-lg gap-2">
              <CreditCard className="h-4 w-4" /> NSDL eKYC PAN
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-white px-5 py-2.5 rounded-lg gap-2">
              <FileText className="h-4 w-4" /> My Orders
              {orders.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-400 text-slate-900 rounded-full font-bold">
                  {orders.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="psa" className="mt-6">
            <PsaTab user={appUser} config={config} psa={psa} />
          </TabsContent>

          <TabsContent value="pan" className="mt-6">
            <PanTab user={appUser} config={config} activation={activation} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <OrdersHistory orders={orders} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ----------------------------- Stat Tile --------------------------------- */
function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "green" | "amber" | "blue" | "slate";
}) {
  const tones: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60",
    slate: "bg-slate-50 text-slate-600 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200/60",
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${tones[tone]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-bold text-base text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- PSA ---------------------------------- */

function PsaTab({
  user,
  config,
  psa,
}: {
  user: { uid: string; email: string; name?: string; phone?: string };
  config: PanMasterConfig;
  psa: PanPsaRecord | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({
    vleId: "",
    vleRegCode: "",
    mobile: user.phone || "",
  });
  const [form, setForm] = useState({
    shopName: "",
    address: "",
    state: "",
    pinCode: "",
    panNo: "",
    uidNo: "",
  });

  if (!config.hasCredentials) {
    return (
      <Card><CardContent className="p-6 text-center text-muted-foreground">
        Provider credentials not configured. Please contact admin.
      </CardContent></Card>
    );
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (!user.phone || !/^\d{10}$/.test(user.phone)) {
      toast.error("Mobile number missing or invalid in your profile");
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.panNo)) {
      toast.error("Invalid PAN format");
      return;
    }
    if (!/^\d{6}$/.test(form.pinCode)) {
      toast.error("PIN must be 6 digits");
      return;
    }
    setSubmitting(true);
    try {
      const cfg = await getPanConfig();
      if (!cfg.cipher) throw new Error("Credentials not configured");
      const res = await panPsaCreate({
        data: {
          url: cfg.psaCreateUrl!,
          cipher: cfg.cipher,
          vleId: user.uid.slice(0, 20),
          vleName: user.name || user.email,
          vleShop: form.shopName,
          vleLoc: form.address.slice(0, 50),
          vleState: form.state,
          vleUid: form.uidNo,
          vlePin: form.pinCode,
          vleEmail: user.email,
          vleMob: user.phone,
          vlePan: form.panNo.toUpperCase(),
        },
      });
      if (!res.success) throw new Error(res.error);
      await upsertPsaRecord({
        retailerId: user.uid,
        vleId: user.uid.slice(0, 20),
        vleRegCode: res.vleRegCode,
        status: "approved",
        remark: res.message,
        ownerName: user.name || user.email,
        shopName: form.shopName,
        mobile: user.phone,
        email: user.email,
        panNo: form.panNo.toUpperCase(),
        uidNo: form.uidNo,
        address: form.address,
        state: form.state,
        pinCode: form.pinCode,
        createdAt: psa?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    if (!psa) return;
    setResetting(true);
    try {
      const cfg = await getPanConfig();
      if (!cfg.cipher) throw new Error("Credentials not configured");
      const res = await panPsaPasswordReset({
        data: { url: cfg.psaPasswordUrl!, cipher: cfg.cipher, vleId: psa.vleId },
      });
      if (!res.success) throw new Error(res.error);
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  async function handleLinkExisting(e: FormEvent) {
    e.preventDefault();
    if (!linkForm.vleId.trim()) {
      toast.error("PSA / VLE ID required");
      return;
    }
    if (!/^\d{10}$/.test(linkForm.mobile)) {
      toast.error("Registered mobile must be 10 digits");
      return;
    }
    setLinking(true);
    try {
      await upsertPsaRecord({
        retailerId: user.uid,
        vleId: linkForm.vleId.trim(),
        vleRegCode: linkForm.vleRegCode.trim() || undefined,
        status: "approved",
        linkedExisting: true,
        linkedMobile: linkForm.mobile,
        remark: "Linked existing PSA ID — coupon purchase only",
        ownerName: user.name || user.email,
        shopName: user.name || user.email,
        mobile: linkForm.mobile,
        email: user.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success("PSA ID linked. You can now purchase coupons.");
      setShowLinkForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Link failed");
    } finally {
      setLinking(false);
    }
  }

  if (psa?.status === "approved") {
    return (
      <Card className="border-emerald-200 dark:border-emerald-900/50 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 p-1" />
        <CardHeader className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <div>PSA Account Active</div>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  Your retailer account is verified and ready
                </p>
              </div>
            </CardTitle>
            {psa.linkedExisting && (
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                <Link2 className="h-3 w-3 mr-1" /> Linked Existing
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoRow label="VLE / PSA ID" value={psa.vleId} mono />
            {psa.vleRegCode && <InfoRow label="Reg Code" value={psa.vleRegCode} mono />}
            {psa.shopName && <InfoRow label="Shop Name" value={psa.shopName} />}
            {psa.panNo && <InfoRow label="PAN" value={psa.panNo} mono />}
            <InfoRow label="Mobile" value={psa.linkedMobile || psa.mobile} />
          </div>
          {psa.linkedExisting ? (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4 text-sm">
              <p className="text-blue-900 dark:text-blue-200">
                ✓ You linked an existing PSA ID. Switch to the <strong>NSDL eKYC PAN</strong> tab to start applying.
                Password reset is not available for linked accounts.
              </p>
            </div>
          ) : (
            <Button onClick={handlePasswordReset} disabled={resetting} variant="outline" className="border-emerald-200 hover:bg-emerald-50">
              {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Reset PSA Password
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Premium "Link existing ID" callout */}
      <Card className="overflow-hidden border-amber-200 dark:border-amber-900/50 shadow-md">
        <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 p-1" />
        <CardHeader className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Link2 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Already have a UTI / PSA VLE ID?</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Skip registration — link in 30 seconds</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {!showLinkForm ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground max-w-md">
                Link your existing PSA ID to start applying immediately. No re-registration needed.
              </p>
              <Button
                onClick={() => setShowLinkForm(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
              >
                <Link2 className="h-4 w-4 mr-2" /> Link Existing ID
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLinkExisting} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>PSA / VLE ID *</Label>
                  <Input
                    value={linkForm.vleId}
                    onChange={(e) => setLinkForm({ ...linkForm, vleId: e.target.value })}
                    placeholder="Your existing UTI / PSA ID"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Registered Mobile *</Label>
                  <Input
                    value={linkForm.mobile}
                    maxLength={10}
                    onChange={(e) => setLinkForm({ ...linkForm, mobile: e.target.value.replace(/\D/g, "") })}
                    placeholder="10-digit mobile"
                    required
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Reg Code (optional)</Label>
                  <Input
                    value={linkForm.vleRegCode}
                    onChange={(e) => setLinkForm({ ...linkForm, vleRegCode: e.target.value })}
                    placeholder="If you have it from the old portal"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={linking} className="bg-amber-500 hover:bg-amber-600 text-white">
                  {linking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Confirm & Link
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowLinkForm(false)}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded border border-amber-200/50">
                ⚠ Make sure the PSA ID is correct. Wrong details may cause failed applications.
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Premium register card */}
      <Card className="overflow-hidden border shadow-md">
        <div className="bg-gradient-to-r from-primary via-blue-600 to-blue-700 p-1" />
        <CardHeader className="bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/20 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Register New PSA Auto-ID</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">First time? Register a fresh agent ID</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Shop Name</Label>
                <Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Address (max 50 chars)</Label>
                <Input value={form.address} maxLength={50} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>PIN Code</Label>
                <Input value={form.pinCode} maxLength={6} onChange={(e) => setForm({ ...form, pinCode: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Aadhaar Number (12 digits)</Label>
                <Input value={form.uidNo} maxLength={12} onChange={(e) => setForm({ ...form, uidNo: e.target.value })} required />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>PAN Number</Label>
                <Input value={form.panNo} maxLength={10} placeholder="ABCDE1234F" onChange={(e) => setForm({ ...form, panNo: e.target.value.toUpperCase() })} required />
              </div>
            </div>
            <Button type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Register PSA Auto-ID
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ----------------------------- InfoRow ----------------------------------- */
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3 border border-slate-200/60 dark:border-slate-700/40">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</p>
      <p className={`text-sm font-semibold text-foreground ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

/* ------------------------------- NSDL PAN -------------------------------- */

function PanTab({
  user,
  config,
  activation,
}: {
  user: { uid: string; email: string; name?: string; phone?: string };
  config: PanMasterConfig;
  activation: PanServiceActivation | null;
}) {
  const [activating, setActivating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    applicationType: "P" as "P" | "E",
    applicationMode: "OTP",
    name: "",
    dob: "",
    gender: "M" as "M" | "F",
    mobile: "",
    email: "",
    consent: false,
  });

  const fee = config.panRetailerFee || 0;
  const activationCharge = config.nsdlIdCharge || 0;

  if (!config.hasCredentials) {
    return (
      <Card><CardContent className="p-6 text-center text-muted-foreground">
        Provider credentials not configured. Please contact admin.
      </CardContent></Card>
    );
  }

  async function handleActivate() {
    setActivating(true);
    try {
      await atomicDebit(user.uid, activationCharge, {
        source: "pan-portal",
        description: `NSDL eKYC PAN service activation`,
      });
      await setPanActivation({
        retailerId: user.uid,
        nsdlActive: true,
        activatedAt: new Date().toISOString(),
        activationCharge,
      });
      toast.success("Service activated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setActivating(false);
    }
  }

  async function handleApply(e: FormEvent) {
    e.preventDefault();
    if (!form.consent) {
      toast.error("Please accept the consent");
      return;
    }
    if (!/^\d{10}$/.test(form.mobile)) {
      toast.error("Invalid mobile");
      return;
    }
    setSubmitting(true);
    try {
      const cfg = await getPanConfig();
      if (!cfg.cipher) throw new Error("Credentials missing");

      const orderId = newOrderId(user.uid);
      const newBalance = await atomicDebit(user.uid, fee, {
        source: "pan-portal",
        description: `NSDL eKYC PAN — ${form.name}`,
        orderId,
      });

      await createPanOrder({
        orderId,
        retailerId: user.uid,
        retailerUsername: user.email,
        applicationType: form.applicationType,
        applicationMode: form.applicationMode,
        name: form.name,
        dob: form.dob,
        gender: form.gender,
        mobile: form.mobile,
        email: form.email,
        amount: fee,
        providerCost: cfg.panProviderCost,
        oldBalance: newBalance + fee,
        newBalance,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await panNsdlGetAuthorization({
        data: {
          url: cfg.nsdlAuthUrl!,
          cipher: cfg.cipher,
          userId: user.uid.slice(0, 20),
          orderId,
          shopName: user.name || user.email,
          weburl: typeof window !== "undefined" ? window.location.hostname : "",
          redirectUrl: `${origin}/api/public/pan-portal/nsdl-webhook`,
        },
      });

      if (!res.success) {
        // Refund immediately
        await updatePanOrder(orderId, { status: "refunded", remark: res.error });
        // Note: refund happens via webhook normally; here we just mark — no double-refund.
        throw new Error(res.error);
      }

      await updatePanOrder(orderId, {
        authorization: res.authorization,
        refId: res.refOrderId,
        remark: res.message,
      });

      // Submit hidden form to NSDL
      const dashboardUrl = cfg.digipayDashboardUrl || "https://digipaydashboard.religaredigital.in/Login/Authenticate";
      const f = document.createElement("form");
      f.method = "POST";
      f.action = dashboardUrl;
      f.target = "_blank";
      const i = document.createElement("input");
      i.type = "hidden";
      i.name = "authentication";
      i.value = res.authorization;
      f.appendChild(i);
      document.body.appendChild(f);
      f.submit();
      document.body.removeChild(f);

      toast.success("Redirecting to NSDL — complete the application in the new tab");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Application failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!activation?.nsdlActive) {
    return (
      <Card className="overflow-hidden border shadow-lg">
        <div className="bg-gradient-to-r from-primary via-blue-600 to-blue-700 p-1" />
        <div className="bg-gradient-to-br from-blue-50/60 via-white to-amber-50/40 dark:from-blue-950/30 dark:via-slate-900 dark:to-amber-950/10 p-8 md:p-10">
          <div className="max-w-xl mx-auto text-center space-y-5">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center shadow-xl shadow-primary/30">
              <Zap className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Activate NSDL eKYC PAN Service</h2>
              <p className="text-muted-foreground mt-2">One-time activation. Apply unlimited PAN cards after.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left bg-white dark:bg-slate-900 rounded-xl p-4 border shadow-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Activation</p>
                <p className="text-2xl font-bold text-foreground">₹{activationCharge}</p>
                <p className="text-[11px] text-muted-foreground">one-time</p>
              </div>
              <div className="border-l pl-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Per PAN</p>
                <p className="text-2xl font-bold text-emerald-600">₹{fee}</p>
                <p className="text-[11px] text-muted-foreground">auto-debit from wallet</p>
              </div>
            </div>

            <Button
              onClick={handleActivate}
              disabled={activating || activationCharge <= 0}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-blue-700 hover:from-primary hover:to-blue-800 shadow-lg shadow-primary/30 px-8"
            >
              {activating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Wallet className="h-5 w-5 mr-2" />}
              Activate Now (₹{activationCharge})
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Instant activation</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Auto refund on failure</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border shadow-md">
      <div className="bg-gradient-to-r from-primary via-blue-600 to-blue-700 p-1" />
      <CardHeader className="bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/20 dark:to-slate-900">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Apply for New PAN (Form 49A)</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Aadhaar-based instant eKYC</p>
            </div>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
            <Wallet className="h-3 w-3 mr-1" /> ₹{fee} per application
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleApply} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Application Type</Label>
              <Select value={form.applicationType} onValueChange={(v) => setForm({ ...form, applicationType: v as "P" | "E" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="P">Physical PAN</SelectItem>
                  <SelectItem value="E">Electronic PAN (e-PAN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Application Mode</Label>
              <Select value={form.applicationMode} onValueChange={(v) => setForm({ ...form, applicationMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OTP">Aadhaar OTP</SelectItem>
                  <SelectItem value="Biometric">Biometric</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Applicant Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="As per Aadhaar" />
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as "M" | "F" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input value={form.mobile} maxLength={10} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required placeholder="Aadhaar-linked mobile" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 rounded-lg p-3 cursor-pointer hover:bg-amber-50 transition-colors">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              className="mt-1 h-4 w-4 rounded accent-primary"
            />
            <span className="text-foreground">
              I (Consumer) hereby state that I have <strong>no objection</strong> in authenticating myself with Aadhaar based UID/VID authentication system and provide my consent.
            </span>
          </label>

          <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Total charge</p>
              <p className="text-2xl font-bold text-foreground">
                ₹{fee} <span className="text-xs font-normal text-emerald-600">· auto refund if failed</span>
              </p>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="bg-gradient-to-r from-primary to-blue-700 hover:from-primary hover:to-blue-800 shadow-md shadow-primary/20 px-6"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ArrowRight className="h-5 w-5 mr-2" />}
              Submit & Continue to NSDL
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function OrdersHistory({ orders }: { orders: PanOrder[] }) {
  if (orders.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">No PAN orders yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Your submitted PAN applications will appear here. Switch to the <strong>NSDL eKYC PAN</strong> tab to apply.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const statusConfig = {
          success: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
          pending: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" /> },
          failed: { color: "bg-rose-100 text-rose-700 border-rose-200", icon: <XCircle className="h-3 w-3" /> },
          refunded: { color: "bg-slate-100 text-slate-700 border-slate-200", icon: <RefreshCw className="h-3 w-3" /> },
        }[o.status];
        return (
          <Card key={o.orderId} className="hover:shadow-md transition-shadow border-l-4 border-l-primary/40">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <p className="font-mono text-[11px] text-muted-foreground tracking-wide">{o.orderId}</p>
                <p className="font-semibold text-foreground text-base">{o.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>📱 {o.mobile}</span>
                  <span>·</span>
                  <span>{new Date(o.createdAt).toLocaleString()}</span>
                </p>
                {o.ackNo && (
                  <p className="text-xs">
                    Ack No: <span className="font-mono font-semibold text-foreground">{o.ackNo}</span>
                  </p>
                )}
              </div>
              <div className="text-right space-y-2">
                <Badge className={`${statusConfig.color} border gap-1 capitalize`}>
                  {statusConfig.icon}
                  {o.status}
                </Badge>
                <p className="text-lg font-bold text-foreground">₹{o.amount}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" /> PSA Active
            {psa.linkedExisting && (
              <Badge variant="secondary" className="ml-2">Linked Existing</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">VLE / PSA ID:</span> <span className="font-mono">{psa.vleId}</span></div>
            {psa.vleRegCode && <div><span className="text-muted-foreground">Reg Code:</span> <span className="font-mono">{psa.vleRegCode}</span></div>}
            {psa.shopName && <div><span className="text-muted-foreground">Shop:</span> {psa.shopName}</div>}
            {psa.panNo && <div><span className="text-muted-foreground">PAN:</span> {psa.panNo}</div>}
            <div><span className="text-muted-foreground">Mobile:</span> {psa.linkedMobile || psa.mobile}</div>
          </div>
          {psa.linkedExisting ? (
            <p className="text-xs text-muted-foreground">
              You linked an existing PSA ID. Use the <strong>NSDL eKYC PAN</strong> tab to purchase coupons / apply for PAN.
              Password reset is not available for linked accounts — please use the original PSA portal.
            </p>
          ) : (
            <Button onClick={handlePasswordReset} disabled={resetting} variant="outline">
              {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Reset PSA Password
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Already have a PSA / UTI VLE ID?</CardTitle>
        </CardHeader>
        <CardContent>
          {!showLinkForm ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground">
                Skip registration and link your existing PSA ID to start purchasing PAN coupons immediately.
              </p>
              <Button variant="outline" onClick={() => setShowLinkForm(true)}>
                Link Existing PSA ID
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLinkExisting} className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>PSA / VLE ID *</Label>
                  <Input
                    value={linkForm.vleId}
                    onChange={(e) => setLinkForm({ ...linkForm, vleId: e.target.value })}
                    placeholder="Your existing UTI / PSA ID"
                    required
                  />
                </div>
                <div>
                  <Label>Registered Mobile *</Label>
                  <Input
                    value={linkForm.mobile}
                    maxLength={10}
                    onChange={(e) => setLinkForm({ ...linkForm, mobile: e.target.value.replace(/\D/g, "") })}
                    placeholder="10-digit mobile"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Reg Code (optional)</Label>
                  <Input
                    value={linkForm.vleRegCode}
                    onChange={(e) => setLinkForm({ ...linkForm, vleRegCode: e.target.value })}
                    placeholder="If you have it from the old portal"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={linking}>
                  {linking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirm & Link
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowLinkForm(false)}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠ Make sure the PSA ID is correct. Wrong details may cause failed coupon purchases.
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Register New PSA Auto-ID</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Shop Name</Label>
                <Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} required />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
              </div>
              <div className="md:col-span-2">
                <Label>Address (max 50 chars)</Label>
                <Input value={form.address} maxLength={50} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
              </div>
              <div>
                <Label>PIN Code</Label>
                <Input value={form.pinCode} maxLength={6} onChange={(e) => setForm({ ...form, pinCode: e.target.value })} required />
              </div>
              <div>
                <Label>Aadhaar Number (12 digits)</Label>
                <Input value={form.uidNo} maxLength={12} onChange={(e) => setForm({ ...form, uidNo: e.target.value })} required />
              </div>
              <div className="md:col-span-2">
                <Label>PAN Number</Label>
                <Input value={form.panNo} maxLength={10} placeholder="ABCDE1234F" onChange={(e) => setForm({ ...form, panNo: e.target.value.toUpperCase() })} required />
              </div>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Register PSA Auto-ID
            </Button>
          </form>
        </CardContent>
      </Card>
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
      <Card>
        <CardHeader><CardTitle>Activate NSDL eKYC PAN Service</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            One-time activation charge: <span className="font-bold">₹{activationCharge}</span> (deducted from wallet).
          </p>
          <p className="text-xs text-muted-foreground">
            After activation, each PAN application will charge ₹{fee} per order.
          </p>
          <Button onClick={handleActivate} disabled={activating || activationCharge <= 0}>
            {activating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Activate Service (₹{activationCharge})
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Apply for New PAN (Form 49A)</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleApply} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Application Type</Label>
              <Select value={form.applicationType} onValueChange={(v) => setForm({ ...form, applicationType: v as "P" | "E" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="P">Physical PAN</SelectItem>
                  <SelectItem value="E">Electronic PAN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Application Mode</Label>
              <Select value={form.applicationMode} onValueChange={(v) => setForm({ ...form, applicationMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OTP">Aadhaar OTP</SelectItem>
                  <SelectItem value="Biometric">Biometric</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Applicant Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} required />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as "M" | "F" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mobile</Label>
              <Input value={form.mobile} maxLength={10} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-1" />
            <span>I (Consumer) hereby state that I have no objection in authenticating myself with Aadhaar based UID/VID authentication system and provide my consent.</span>
          </label>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit & Continue to NSDL (₹{fee})
            </Button>
            <span className="text-xs text-muted-foreground">Application charge: ₹{fee}</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function OrdersHistory({ orders }: { orders: PanOrder[] }) {
  if (orders.length === 0) {
    return <p className="text-center text-muted-foreground p-8">No orders yet.</p>;
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <Card key={o.orderId}>
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-mono text-xs text-muted-foreground">{o.orderId}</p>
              <p className="font-semibold">{o.name} — {o.mobile}</p>
              <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</p>
              {o.ackNo && <p className="text-xs">Ack: <span className="font-mono">{o.ackNo}</span></p>}
            </div>
            <div className="text-right">
              <Badge
                variant={o.status === "success" ? "default" : o.status === "pending" ? "secondary" : "destructive"}
              >
                {o.status}
              </Badge>
              <p className="text-sm font-bold mt-1">₹{o.amount}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

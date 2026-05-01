import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2, IdCard, ShoppingCart, ShieldCheck, AlertTriangle, Link2,
  RefreshCcw, KeyRound, ExternalLink, Copy, History,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  loadPanConfig, loadPsaRecord, upsertPsaRecord, isVleIdTaken, getPsaPrimaryVleId,
  createCouponOrder, updateCouponOrder, listCouponOrders,
} from "@/lib/pan-portal-firebase";
import {
  panPsaCreate, panCouponBuy, panCouponStatus, panPsaPasswordReset,
} from "@/lib/pan-portal.functions";
import { atomicDebit, atomicCredit } from "@/lib/firebase-transactions";
import { generateVleId } from "@/lib/vle-id";
import { DEFAULT_PAN_CONFIG, type PanCouponOrder, type PanPortalConfig, type PanPsaRecord } from "@/lib/pan-portal-types";

function looksLikeMissingVleError(message: string | undefined) {
  const text = (message || "").toLowerCase();
  return text.includes("vle data not exist") || text.includes("vle not exist") || text.includes("vle does not exist");
}

async function trySilentLegacyVleSync({
  user,
  cfg,
  psa,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["appUser"]>;
  cfg: PanPortalConfig;
  psa: PanPsaRecord;
}) {
  if (!cfg.credCipher || !psa.linkedExisting) return { synced: false as const };

  const shopName = psa.shopName?.trim() || user.name || user.email;
  const mobile = (psa.linkedMobile || psa.mobile || user.phone || "").trim();
  const email = (psa.email || user.email || "").trim();
  const address = (psa.address || user.address || "").trim();
  const state = (psa.state || "").trim();
  const pinCode = (psa.pinCode || "").trim();
  const uidNo = (psa.uidNo || "").trim();
  const panNo = (psa.panNo || "").trim().toUpperCase();
  const vleId = getPsaPrimaryVleId(psa);

  if (!shopName || !/^\d{10}$/.test(mobile) || !email || !address || !state || !/^\d{6}$/.test(pinCode) || !/^\d{12}$/.test(uidNo) || !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(panNo)) {
    return { synced: false as const, reason: "missing_profile" as const };
  }

  const res = await panPsaCreate({
    data: {
      credCipher: cfg.credCipher,
      baseUrl: cfg.providerBaseUrl,
      vleId,
      vleName: psa.ownerName?.trim() || user.name || user.email,
      vleShop: shopName,
      vleLoc: address.slice(0, 50),
      vleState: state,
      vleUid: uidNo,
      vlePin: pinCode,
      vleEmail: email,
      vleMob: mobile,
      vlePan: panNo,
    },
  });

  if (!res.success) {
    return { synced: false as const, reason: "provider_failed" as const, error: res.error };
  }

  const now = new Date().toISOString();
  await upsertPsaRecord({
    ...psa,
    vleId,
    vleRegCode: vleId,
    linkedMobile: mobile,
    linkedExisting: false,
    status: res.vleStatus === "SUCCESS" ? "approved" : "pending",
    ownerName: psa.ownerName?.trim() || user.name || user.email,
    shopName,
    mobile,
    email,
    panNo,
    uidNo,
    address,
    state,
    pinCode,
    remark: res.message || "Legacy VLE synced automatically during coupon purchase",
    updatedAt: now,
  });

  return { synced: true as const, vleId };
}

export const Route = createFileRoute("/retailer/pan-portal")({
  ssr: false,
  component: PanPortalPage,
});

function PanPortalPage() {
  const { appUser } = useAuth();
  const [cfg, setCfg] = useState<PanPortalConfig>(DEFAULT_PAN_CONFIG);
  const [psa, setPsa] = useState<PanPsaRecord | null>(null);
  const [orders, setOrders] = useState<PanCouponOrder[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!appUser) return;
    const [c, p, o] = await Promise.all([
      loadPanConfig(),
      loadPsaRecord(appUser.uid),
      listCouponOrders(appUser.uid),
    ]);
    setCfg(c); setPsa(p); setOrders(o);
  }

  useEffect(() => {
    if (!appUser) return;
    setLoading(true);
    refresh().catch((e) => toast.error(e.message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.uid]);

  if (!appUser) return <div className="p-6">Loading…</div>;
  if (loading) return <div className="p-6 flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" />Loading PAN portal…</div>;

  const credsMissing = !cfg.credCipher;
  const hasPsa = psa && psa.status === "approved";

  return (
    <div className="max-w-5xl mx-auto p-3 md:p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <IdCard className="h-7 w-7 text-primary" /> PAN Portal (UTI)
        </h1>
        <p className="text-sm text-muted-foreground">
          PSA registration & coupon purchase via UTI authorised provider.
        </p>
      </header>

      {credsMissing && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Provider not configured</AlertTitle>
          <AlertDescription>Admin must add API credentials in PAN Portal Settings before this service works.</AlertDescription>
        </Alert>
      )}

      {/* PSA status banner */}
      <Card className={hasPsa ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}>
        <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            {hasPsa
              ? <ShieldCheck className="h-6 w-6 text-emerald-600" />
              : <AlertTriangle className="h-6 w-6 text-amber-600" />}
            <div>
              <div className="font-semibold">
                {hasPsa ? "PSA Active" : psa ? `PSA ${psa.status}` : "PSA not registered"}
              </div>
              <div className="text-xs text-muted-foreground">
                {psa
                  ? <>VLE ID: <code className="font-mono">{psa.vleId}</code>{psa.linkedExisting && " · linked from old portal"}</>
                  : "Register a new PSA or link your existing UTI VLE ID below."}
              </div>
            </div>
          </div>
          {psa && (
            <Badge variant={hasPsa ? "default" : "secondary"} className="capitalize">{psa.status}</Badge>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue={hasPsa ? "buy" : "psa"} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="psa"><IdCard className="h-4 w-4 mr-1" />PSA</TabsTrigger>
          <TabsTrigger value="buy" disabled={!hasPsa}><ShoppingCart className="h-4 w-4 mr-1" />Buy Coupons</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="psa">
          <PsaPanel user={appUser} cfg={cfg} psa={psa} onRefresh={refresh} />
        </TabsContent>
        <TabsContent value="buy">
          <CouponBuyPanel user={appUser} cfg={cfg} psa={psa} onChange={refresh} />
        </TabsContent>
        <TabsContent value="history">
          <CouponHistoryPanel orders={orders} cfg={cfg} onRefresh={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── PSA Panel: Create + Link Existing + Reset Password ────────────────
function PsaPanel({
  user, cfg, psa, onRefresh,
}: { user: NonNullable<ReturnType<typeof useAuth>["appUser"]>; cfg: PanPortalConfig; psa: PanPsaRecord | null; onRefresh: () => Promise<void>; }) {
  // Keep manual sync available, but do not force migrated users into it by default.
  const defaultMode: "create" | "link" | "sync" =
    "create";
  const [mode, setMode] = useState<"create" | "link" | "sync">(defaultMode);
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant={mode === "create" ? "default" : "outline"} onClick={() => setMode("create")} size="sm">
          <IdCard className="h-4 w-4 mr-1" />New PSA Registration
        </Button>
        <Button variant={mode === "link" ? "default" : "outline"} onClick={() => setMode("link")} size="sm">
          <Link2 className="h-4 w-4 mr-1" />Link Existing VLE
        </Button>
        {psa?.linkedExisting && (
          <Button variant={mode === "sync" ? "default" : "outline"} onClick={() => setMode("sync")} size="sm">
            <RefreshCcw className="h-4 w-4 mr-1" />Sync Linked VLE with UTI
          </Button>
        )}
      </div>
      {mode === "create" && <PsaCreateForm user={user} cfg={cfg} psa={psa} onRefresh={onRefresh} />}
      {mode === "link"   && <PsaLinkForm user={user} cfg={cfg} onRefresh={onRefresh} />}
      {mode === "sync" && psa && <PsaSyncForm user={user} cfg={cfg} psa={psa} onRefresh={onRefresh} />}
      {psa && <PsaPasswordResetCard cfg={cfg} psa={psa} />}
    </div>
  );
}

// ─── PSA Sync (register the linked-existing VLE ID upstream) ───────────
function PsaSyncForm({
  user, cfg, psa, onRefresh,
}: { user: NonNullable<ReturnType<typeof useAuth>["appUser"]>; cfg: PanPortalConfig; psa: PanPsaRecord; onRefresh: () => Promise<void>; }) {
  const [form, setForm] = useState({
    shopName: psa.shopName || user.name || "",
    panNo: (psa.panNo || "").toUpperCase(),
    uidNo: psa.uidNo || "",
    pinCode: psa.pinCode || "",
    state: psa.state || "Kerala",
    address: psa.address || user.address || "",
    mobile: psa.mobile || user.phone || "",
    email: psa.email || user.email,
  });
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cfg.credCipher) { toast.error("Provider not configured"); return; }
    if (!/^\d{10}$/.test(form.mobile)) { toast.error("Valid 10-digit mobile required"); return; }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.panNo)) { toast.error("Invalid PAN format"); return; }
    if (!/^\d{12}$/.test(form.uidNo)) { toast.error("Aadhaar must be 12 digits"); return; }
    if (!/^\d{6}$/.test(form.pinCode)) { toast.error("PIN must be 6 digits"); return; }
    if (!form.shopName.trim() || !form.address.trim() || !form.state.trim()) { toast.error("Shop name, address and state required"); return; }

    setBusy(true);
    try {
      const res = await panPsaCreate({
        data: {
          credCipher: cfg.credCipher!, baseUrl: cfg.providerBaseUrl,
          vleId: psa.vleId, // KEEP the existing linked ID
          vleName: user.name || user.email,
          vleShop: form.shopName.trim(), vleLoc: form.address.trim().slice(0, 50),
          vleState: form.state.trim(), vleUid: form.uidNo,
          vlePin: form.pinCode, vleEmail: form.email,
          vleMob: form.mobile, vlePan: form.panNo.toUpperCase(),
        },
      });
      if (!res.success) throw new Error(res.error);

      const now = new Date().toISOString();
      await upsertPsaRecord({
        ...psa,
        status: res.vleStatus === "SUCCESS" ? "approved" : "pending",
        linkedExisting: false, // now properly registered upstream
        ownerName: user.name || user.email,
        shopName: form.shopName.trim(), mobile: form.mobile, email: form.email,
        panNo: form.panNo.toUpperCase(), uidNo: form.uidNo,
        address: form.address.trim(), state: form.state.trim(), pinCode: form.pinCode,
        remark: res.message || "Synced linked VLE upstream",
        updatedAt: now,
      });
      toast.success(`VLE ${psa.vleId} synced with UTI ✓ — you can buy coupons now.`);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-amber-500/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCcw className="h-5 w-5 text-amber-600" />Sync Linked VLE with UTI
        </CardTitle>
        <CardDescription>
          Your VLE ID <code className="font-mono">{psa.vleId}</code> is linked locally but not yet
          registered in the UTI upstream system — that's why coupon purchases fail with
          "VLE Data Not Exist". Fill in the details below to register your existing VLE
          upstream <strong>without changing the ID</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
            VLE ID kept as: <code className="font-mono text-foreground">{psa.vleId}</code>
          </div>
          <div><Label>Shop Name</Label><Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} /></div>
          <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>Mobile (UTI registered)</Label><Input value={form.mobile} maxLength={10} inputMode="numeric" className="font-mono" onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })} /></div>
          <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>PAN No.</Label><Input value={form.panNo} maxLength={10} className="uppercase font-mono" onChange={(e) => setForm({ ...form, panNo: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" /></div>
          <div><Label>Aadhaar No.</Label><Input value={form.uidNo} maxLength={12} inputMode="numeric" className="font-mono" onChange={(e) => setForm({ ...form, uidNo: e.target.value.replace(/\D/g, "") })} placeholder="12-digit Aadhaar" /></div>
          <div><Label>PIN Code</Label><Input value={form.pinCode} maxLength={6} inputMode="numeric" className="font-mono" onChange={(e) => setForm({ ...form, pinCode: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy || !cfg.credCipher}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Syncing…</> : `Sync ${psa.vleId} with UTI`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── PSA Create ────────────────────────────────────────────────────────
function PsaCreateForm({
  user, cfg, psa, onRefresh,
}: { user: NonNullable<ReturnType<typeof useAuth>["appUser"]>; cfg: PanPortalConfig; psa: PanPsaRecord | null; onRefresh: () => Promise<void>; }) {
  const initial = useMemo(() => ({
    shopName: psa?.shopName || user.name || "",
    panNo: (psa?.panNo || "").toUpperCase(),
    uidNo: psa?.uidNo || "",
    pinCode: psa?.pinCode || "",
    state: psa?.state || "Kerala",
    address: psa?.address || user.address || "",
  }), [psa, user]);

  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cfg.credCipher) { toast.error("Provider not configured"); return; }
    if (!user.phone || !/^\d{10}$/.test(user.phone)) { toast.error("Valid 10-digit mobile required in profile"); return; }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.panNo)) { toast.error("Invalid PAN format"); return; }
    if (!/^\d{12}$/.test(form.uidNo)) { toast.error("Aadhaar must be 12 digits"); return; }
    if (!/^\d{6}$/.test(form.pinCode)) { toast.error("PIN must be 6 digits"); return; }
    if (!form.shopName.trim() || !form.address.trim() || !form.state.trim()) { toast.error("Shop name, address and state required"); return; }

    setSubmitting(true);
    try {
      const vleId = generateVleId(user.uid, user.phone);
      if (await isVleIdTaken(vleId, user.uid)) {
        throw new Error(`VLE ID ${vleId} is already linked to another retailer.`);
      }
      const res = await panPsaCreate({
        data: {
          credCipher: cfg.credCipher!, baseUrl: cfg.providerBaseUrl,
          vleId, vleName: user.name || user.email,
          vleShop: form.shopName.trim(), vleLoc: form.address.trim().slice(0, 50),
          vleState: form.state.trim(), vleUid: form.uidNo,
          vlePin: form.pinCode, vleEmail: user.email,
          vleMob: user.phone, vlePan: form.panNo.toUpperCase(),
        },
      });
      if (!res.success) throw new Error(res.error);

      const now = new Date().toISOString();
      await upsertPsaRecord({
        retailerId: user.uid, vleId,
        status: res.vleStatus === "SUCCESS" ? "approved" : "pending",
        linkedExisting: false,
        ownerName: user.name || user.email, shopName: form.shopName.trim(),
        mobile: user.phone, email: user.email,
        panNo: form.panNo.toUpperCase(), uidNo: form.uidNo,
        address: form.address.trim(), state: form.state.trim(), pinCode: form.pinCode,
        remark: res.message, createdAt: psa?.createdAt || now, updatedAt: now,
      });
      toast.success("PSA registered successfully ✓");
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><IdCard className="h-5 w-5" />New PSA Registration</CardTitle>
        <CardDescription>Register your shop with UTI as a Point of Sales Agent. VLE ID auto-generated from mobile.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
            VLE ID: <code className="font-mono text-foreground">{generateVleId(user.uid, user.phone || "")}</code>
            {" · "}Mobile: <code className="font-mono text-foreground">{user.phone || "—"}</code>
          </div>
          <div><Label>Shop Name</Label><Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} /></div>
          <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>PAN No.</Label><Input value={form.panNo} maxLength={10} className="uppercase font-mono" onChange={(e) => setForm({ ...form, panNo: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" /></div>
          <div><Label>Aadhaar No.</Label><Input value={form.uidNo} maxLength={12} inputMode="numeric" className="font-mono" onChange={(e) => setForm({ ...form, uidNo: e.target.value.replace(/\D/g, "") })} placeholder="12-digit Aadhaar" /></div>
          <div><Label>PIN Code</Label><Input value={form.pinCode} maxLength={6} inputMode="numeric" className="font-mono" onChange={(e) => setForm({ ...form, pinCode: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting || !cfg.credCipher}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registering…</> : "Register PSA"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── PSA Link Existing ─────────────────────────────────────────────────
function PsaLinkForm({
  user, cfg, onRefresh,
}: { user: NonNullable<ReturnType<typeof useAuth>["appUser"]>; cfg: PanPortalConfig; onRefresh: () => Promise<void>; }) {
  const [vleId, setVleId] = useState("");
  const [mobile, setMobile] = useState(user.phone || "");
  const [submitting, setSubmitting] = useState(false);

  async function handleLink(e: FormEvent) {
    e.preventDefault();
    if (!cfg.credCipher) { toast.error("Provider not configured"); return; }
    const id = vleId.trim().toUpperCase();
    if (id.length < 4) { toast.error("Enter your old VLE ID (e.g. PSA123456 or RMPMCST-9876543210)"); return; }
    if (!/^\d{10}$/.test(mobile)) { toast.error("Enter the 10-digit mobile registered with UTI"); return; }

    setSubmitting(true);
    try {
      if (await isVleIdTaken(id, user.uid)) {
        throw new Error(`VLE ID ${id} is already linked to another retailer.`);
      }

      // Verify VLE exists upstream by attempting a coupon_status call with a
      // dummy order id — provider returns "Vle Data Not Exist" / similar when
      // the VLE is not registered. Any provider response that doesn't say so
      // means the VLE is recognised (status of the dummy order doesn't matter).
      const probe = await panCouponStatus({
        data: {
          credCipher: cfg.credCipher!,
          baseUrl: cfg.providerBaseUrl,
          orderId: `PROBE-${Date.now()}`,
        },
      });
      const probeMsg = (probe.message || "").toLowerCase();
      // We can't directly probe the VLE from coupon_status (it queries an order).
      // So the safer probe is a 1-coupon coupon_buy with qty=1 — but that costs
      // money. Instead we just trust the user input here and validate at first
      // real purchase (provider will reject + we refund). This is the explicit
      // "linkedExisting" trade-off the team chose.
      void probeMsg;

      const now = new Date().toISOString();
      await upsertPsaRecord({
        retailerId: user.uid,
        vleId: id,
        vleRegCode: id,
        status: "approved",
        linkedExisting: true,
        ownerName: user.name || user.email,
        shopName: user.name || user.email,
        mobile,
        linkedMobile: mobile,
        email: user.email,
        remark: "Linked existing UTI VLE from old portal",
        createdAt: now,
        updatedAt: now,
      });
      toast.success(`Linked VLE ${id} ✓ — you can buy coupons now.`);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Link failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" />Link Existing UTI VLE</CardTitle>
        <CardDescription>
          For users migrating from the old portal — link your existing UTI VLE ID to start
          buying coupons immediately. No re-registration needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLink} className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Existing VLE ID</Label>
            <Input value={vleId} onChange={(e) => setVleId(e.target.value.toUpperCase())} placeholder="PSA123456 / RMPMCST-9876543210" className="font-mono uppercase" />
          </div>
          <div>
            <Label>UTI Registered Mobile</Label>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} maxLength={10} inputMode="numeric" className="font-mono" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Linking…</> : "Link VLE"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── PSA Password Reset ────────────────────────────────────────────────
function PsaPasswordResetCard({ cfg, psa }: { cfg: PanPortalConfig; psa: PanPsaRecord }) {
  const [busy, setBusy] = useState(false);
  async function reset() {
    if (!cfg.credCipher) { toast.error("Provider not configured"); return; }
    if (!confirm("Reset UTI portal password for " + psa.vleId + "?")) return;
    setBusy(true);
    try {
      const res = await panPsaPasswordReset({ data: { credCipher: cfg.credCipher, baseUrl: cfg.providerBaseUrl, vleId: psa.vleId } });
      if (!res.success) throw new Error(res.error);
      toast.success(res.message || "Password reset successfully");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" />Reset PSA Password</CardTitle>
        <CardDescription>New password will be sent to your UTI-registered mobile/email.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={reset} disabled={busy} variant="outline" size="sm">
          {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetting…</> : "Reset Password"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Coupon Buy ────────────────────────────────────────────────────────
function CouponBuyPanel({
  user, cfg, psa, onChange,
}: { user: NonNullable<ReturnType<typeof useAuth>["appUser"]>; cfg: PanPortalConfig; psa: PanPsaRecord | null; onChange: () => Promise<void>; }) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  if (!psa || psa.status !== "approved") {
    return <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>Register or link your PSA first.</AlertDescription></Alert>;
  }

  const total = qty * cfg.couponRetailerFee;

  async function buy() {
    if (!cfg.credCipher) { toast.error("Provider not configured"); return; }
    if (qty < 1 || qty > 50) { toast.error("Quantity must be 1-50"); return; }
    const currentPsa = psa;
    if (!currentPsa) { toast.error("Register or link your PSA first."); return; }
    if (!confirm(`Buy ${qty} coupon(s) for ₹${total}? This will be debited from your wallet.`)) return;
    setBusy(true);

    let orderId = "";
    let debited = false;
    try {
      let effectivePsa: PanPsaRecord = currentPsa;
      let effectiveVleId = getPsaPrimaryVleId(currentPsa);

      // 1. Debit wallet first
      await atomicDebit(user.uid, total, {
        source: "pan-portal",
        description: `UTI coupon × ${qty} (VLE ${effectiveVleId})`,
      });
      debited = true;

      // 2. Create local pending order
      const now = new Date().toISOString();
      orderId = await createCouponOrder({
        retailerId: user.uid, vleId: effectiveVleId,
        qty, couponType: 1,
        unitFee: cfg.couponRetailerFee, unitProviderCost: cfg.couponProviderCost,
        totalDebit: total,
        status: "PENDING", createdAt: now, updatedAt: now,
      });

      // 3. Call provider
      let res = await panCouponBuy({
        data: { credCipher: cfg.credCipher, baseUrl: cfg.providerBaseUrl, vleId: effectiveVleId, type: 1, qty },
      });

      if (!res.success && effectivePsa.linkedExisting && looksLikeMissingVleError(res.error)) {
        const syncResult = await trySilentLegacyVleSync({ user, cfg, psa: effectivePsa });

        if (syncResult.synced) {
          effectiveVleId = syncResult.vleId;
          effectivePsa = {
            ...effectivePsa,
            vleId: effectiveVleId,
            vleRegCode: effectiveVleId,
            linkedExisting: false,
          };
          await updateCouponOrder(orderId, {
            vleId: effectiveVleId,
            message: "Legacy VLE auto-synced with UTI. Retrying purchase…",
          });
          res = await panCouponBuy({
            data: { credCipher: cfg.credCipher, baseUrl: cfg.providerBaseUrl, vleId: effectiveVleId, type: 1, qty },
          });
        } else if (syncResult.reason === "missing_profile") {
          await atomicCredit(user.uid, total, { source: "pan-portal", description: "Refund: linked VLE needs PAN/Aadhaar/address details before sync" });
          await updateCouponOrder(orderId, {
            status: "FAILED",
            message: "Legacy VLE needs PAN, Aadhaar, address, PIN and email details before UTI sync can complete.",
            refunded: true,
          });
          throw new Error("ഈ പഴയ VLE upstream sync ചെയ്യാൻ PAN, Aadhaar, address, PIN, email details വേണം. PSA tab-ൽ details update ചെയ്ത ശേഷം വീണ്ടും try ചെയ്യൂ.");
        }
      }

      if (!res.success) {
        // Refund + mark failed
        await atomicCredit(user.uid, total, { source: "pan-portal", description: `Refund: coupon failed (${res.error})` });
        await updateCouponOrder(orderId, { status: "FAILED", message: res.error, refunded: true });
        throw new Error(res.error);
      }

      await updateCouponOrder(orderId, {
        status: res.status, providerOrderId: res.orderId, providerDate: res.date, message: res.message,
      });
      toast.success(`${qty} coupon(s) ${res.status.toLowerCase()} ✓`);
      await onChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Purchase failed";
      // If the provider call threw before we updated the order but after the debit,
      // ensure refund happened (avoid double refund).
      if (debited && !orderId) {
        try { await atomicCredit(user.uid, total, { source: "pan-portal", description: `Refund: ${msg}` }); } catch {}
      }
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Buy UTI PAN Coupons</CardTitle>
        <CardDescription>VLE ID: <code className="font-mono">{psa.vleId}</code></CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Quantity</Label>
            <Input type="number" min={1} max={50} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
          </div>
          <div>
            <Label>Per Coupon</Label>
            <Input value={`₹${cfg.couponRetailerFee}`} disabled />
          </div>
          <div>
            <Label>Total Debit</Label>
            <Input value={`₹${total}`} disabled className="font-bold" />
          </div>
        </div>
        <Button onClick={buy} disabled={busy} size="lg" className="w-full sm:w-auto">
          {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</> : <>Buy {qty} Coupon{qty > 1 ? "s" : ""} for ₹{total}</>}
        </Button>
        {psa.linkedExisting && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Your old VLE is linked from the previous portal. If UTI says <strong>"VLE Data Not Exist"</strong>,
              the system now tries a silent upstream sync and retries the purchase automatically.
              Only if your PAN/Aadhaar/address details are missing will the order be refunded and you’ll need
              the <strong>PSA → Sync Linked VLE with UTI</strong> form.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// ─── History ────────────────────────────────────────────────────────────
function CouponHistoryPanel({
  orders, cfg, onRefresh,
}: { orders: PanCouponOrder[]; cfg: PanPortalConfig; onRefresh: () => Promise<void>; }) {
  const [tracking, setTracking] = useState<string | null>(null);

  async function track(o: PanCouponOrder) {
    if (!o.providerOrderId || !cfg.credCipher) return;
    setTracking(o.id!);
    try {
      const res = await panCouponStatus({ data: { credCipher: cfg.credCipher, baseUrl: cfg.providerBaseUrl, orderId: o.providerOrderId } });
      await updateCouponOrder(o.id!, { status: res.status, message: res.message, providerDate: res.date || o.providerDate });
      toast.success(`Status: ${res.status}${res.message ? " — " + res.message : ""}`);
      await onRefresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Track failed"); }
    finally { setTracking(null); }
  }

  if (!orders.length) {
    return <Alert><AlertDescription>No coupon purchases yet.</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <Card key={o.id}>
          <CardContent className="p-3 flex flex-wrap items-center gap-3 justify-between text-sm">
            <div className="min-w-0">
              <div className="font-mono text-xs text-muted-foreground truncate">{o.providerOrderId || o.id}</div>
              <div className="font-medium">
                {o.qty} coupon{o.qty > 1 ? "s" : ""} · ₹{o.totalDebit}
                {o.refunded && <span className="text-emerald-600 ml-2">· refunded</span>}
              </div>
              <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={o.status === "SUCCESS" ? "default" : o.status === "PENDING" ? "secondary" : "destructive"}>
                {o.status}
              </Badge>
              {o.providerOrderId && (
                <>
                  <Button size="sm" variant="outline" onClick={() => track(o)} disabled={tracking === o.id}>
                    {tracking === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(o.providerOrderId!); toast.success("Order ID copied"); }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      <a href="https://www.psaonline.utiitsl.com" target="_blank" rel="noreferrer"
         className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2">
        Open UTI PSA Portal <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

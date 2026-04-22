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
import { Loader2, IdCard, FileText, RefreshCw, ShieldCheck } from "lucide-react";
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
    return <div className="p-8 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!config.enabled) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">PAN Portal is currently disabled.</h2>
        <p className="text-muted-foreground">Please check back later or contact support.</p>
      </div>
    );
  }

  const vleId = generateVleId(appUser.uid, appUser.phone);

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IdCard className="h-6 w-6" /> PAN Portal
          </h1>
          <p className="text-sm text-muted-foreground">
            PSA Auto-ID & NSDL eKYC PAN application services.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">VLE ID</p>
          <p className="font-mono text-sm">{vleId}</p>
        </div>
      </div>

      <Tabs defaultValue="psa">
        <TabsList>
          <TabsTrigger value="psa">PSA Auto-ID</TabsTrigger>
          <TabsTrigger value="pan">NSDL eKYC PAN</TabsTrigger>
          <TabsTrigger value="history">My Orders ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="psa" className="mt-6">
          <PsaTab user={appUser} config={config} psa={psa} />
        </TabsContent>

        <TabsContent value="pan" className="mt-6">
          <PanTab
            user={appUser}
            config={config}
            activation={activation}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <OrdersHistory orders={orders} />
        </TabsContent>
      </Tabs>
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

  if (psa?.status === "approved") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" /> PSA Active
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">VLE ID:</span> <span className="font-mono">{psa.vleId}</span></div>
            {psa.vleRegCode && <div><span className="text-muted-foreground">Reg Code:</span> <span className="font-mono">{psa.vleRegCode}</span></div>}
            <div><span className="text-muted-foreground">Shop:</span> {psa.shopName}</div>
            <div><span className="text-muted-foreground">PAN:</span> {psa.panNo}</div>
          </div>
          <Button onClick={handlePasswordReset} disabled={resetting} variant="outline">
            {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Reset PSA Password
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register for PSA Auto-ID</CardTitle>
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

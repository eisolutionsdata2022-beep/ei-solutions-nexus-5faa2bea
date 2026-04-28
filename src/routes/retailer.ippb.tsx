/**
 * Retailer IPPB page — strict turn-based flow mirroring the IPPB BC App.
 * Retailer fills data step-by-step. After each submit, control passes to
 * staff who must click "Next/Verify" before the retailer can fill the
 * subsequent step. The other side's actions appear locked.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  cancelIPPBRequest,
  createIPPBRequest,
  retailerSubmitAadhaar,
  retailerSubmitAdditional,
  retailerSubmitBasicDetails,
  retailerSubmitConsent,
  retailerSubmitNominee,
  retailerSubmitOTP,
  retailerSubmitPanAddress,
  retailerSubmitPersonalInfo,
  subscribeRetailerRequests,
} from "@/lib/ippb-firebase";
import {
  IPPB_STATUS_LABELS,
  STEP_LABELS,
  STEP_TURN,
  type IPPBRequest,
} from "@/lib/ippb-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StepIndicator } from "@/components/ippb/StepIndicator";
import { TurnLockCard } from "@/components/ippb/TurnLockCard";
import { CompletedStepsSummary } from "@/components/ippb/CompletedStepsSummary";
import { toast } from "sonner";
import {
  Banknote,
  Clock,
  Cpu,
  Download,
  Info,
  Loader2,
  Lock,
  PlayCircle,
  Plus,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { DEFAULT_IPPB_FEE, getIPPBFeeConfig, type IPPBFeeConfig } from "@/lib/ippb-fee-config";
import { applyForIPPBBadge, type IPPBBadgeApplicationDoc } from "@/lib/ippb-badge";
import { ServicePageShell } from "@/components/ServicePageShell";
import { SoftwareDownloadCard } from "@/components/ippb/SoftwareDownloadCard";

export const Route = createFileRoute("/retailer/ippb")({
  ssr: false,
  component: RetailerIPPBPage,
});

function statusVariant(s: IPPBRequest["status"]) {
  if (s === "success") return "default";
  if (s === "failed" || s === "cancelled") return "destructive";
  if (s === "in_progress") return "secondary";
  return "outline";
}

function RetailerIPPBPage() {
  const { appUser } = useAuth();
  const [rows, setRows] = useState<IPPBRequest[]>([]);
  const [creating, setCreating] = useState(false);
  const [fee, setFee] = useState<IPPBFeeConfig>(DEFAULT_IPPB_FEE);
  const [badgeApps, setBadgeApps] = useState<IPPBBadgeApplicationDoc[]>([]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyReason, setApplyReason] = useState("");
  const [applyAck, setApplyAck] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!appUser) return;
    return subscribeRetailerRequests(appUser.uid, setRows);
  }, [appUser]);

  useEffect(() => {
    getIPPBFeeConfig().then(setFee);
  }, []);

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(
      query(collection(db, "ippbBadgeApplications"), where("userId", "==", appUser.uid)),
      (snap) => {
        const list: IPPBBadgeApplicationDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setBadgeApps(list);
      }
    );
    return unsub;
  }, [appUser?.uid]);

  if (!appUser) return null;

  const hasBadge = !!appUser.ippbBadge;
  const pendingApp = badgeApps.find((a) => a.status === "pending");
  const lastRejected = !pendingApp && badgeApps.find((a) => a.status === "rejected");

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createIPPBRequest({
        retailerId: appUser.uid,
        retailerName: appUser.name || appUser.email,
        retailerEmail: appUser.email,
      });
      toast.success("New IPPB request created — start with Basic Details below.");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setCreating(false);
    }
  };

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    if (!applyReason.trim() || applyReason.trim().length < 10) {
      return toast.error("ദയവായി കാരണം detail-ആയി എഴുതുക (min 10 chars).");
    }
    if (!applyAck) return toast.error("Help page acknowledge ചെയ്യണം.");
    setApplying(true);
    try {
      await applyForIPPBBadge({
        userId: appUser.uid,
        userName: appUser.name || appUser.email,
        userEmail: appUser.email,
        userPhone: appUser.phone,
        reason: applyReason.trim(),
        acknowledgedHelp: applyAck,
      });
      toast.success("അപേക്ഷ submit ആയി. Admin review ചെയ്യും.");
      setApplyReason("");
      setApplyAck(false);
      setApplyOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setApplying(false);
    }
  };

  return (
    <ServicePageShell
      icon={Banknote}
      title="IPPB Account Opening"
      subtitle={hasBadge
        ? "Step-by-step IPPB Regular Savings Account opening — staff verifies & advances."
        : "IPPB badge ഇല്ലാത്തതിനാൽ ഇപ്പോൾ work ചെയ്യാൻ കഴിയില്ല."}
      eyebrow="India Post Payments Bank"
      gradient="from-amber-600 via-orange-600 to-red-600"
      headerAction={
        <div className="flex items-center gap-2 flex-wrap">
          {hasBadge && (
            <Badge className="bg-emerald-500/90 text-white gap-1 border-white/30">
              <ShieldCheck className="w-3 h-3" /> Badged
            </Badge>
          )}
          {(() => {
            const terminal = ["success", "failed", "cancelled"];
            const active = rows
              .filter((r) => !terminal.includes(r.status))
              .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
            const myTurn = active.find((r) => (r.turn ?? STEP_TURN[r.currentStep]) === "retailer");
            const resume = myTurn ?? active[0];
            if (!resume) return null;
            return (
              <Button variant="secondary" size="sm" className="bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-xl gap-1.5"
                onClick={() => { document.getElementById(`ippb-req-${resume.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                <PlayCircle className="w-3.5 h-3.5" />
                Resume
              </Button>
            );
          })()}
          <Button onClick={handleCreate} disabled={creating || !hasBadge} size="sm" className="bg-white text-orange-700 hover:bg-white/90 font-semibold shadow-lg gap-1.5">
            {!hasBadge ? <Lock className="w-3.5 h-3.5" /> : creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            New Request
          </Button>
        </div>
      }
      stats={[
        { icon: Banknote, label: "Total Requests", value: rows.length, accent: "from-amber-400 to-orange-400" },
        { icon: ShieldCheck, label: "Badge", value: hasBadge ? "Active" : "Pending", accent: hasBadge ? "from-emerald-400 to-teal-400" : "from-rose-400 to-pink-400" },
      ]}
    >
      <SoftwareDownloadCard variant="pcAgent" />

      {!hasBadge && (
        <Card className="border-amber-400 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900">
              <ShieldAlert className="w-5 h-5" /> IPPB Work Badge ആവശ്യമാണ്
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-amber-900">
            <p>
              IPPB account opening service ചെയ്യാൻ admin-ൽ നിന്ന് ഒരു{" "}
              <strong>IPPB Work Badge</strong> approve ആകേണ്ടതുണ്ട്.
            </p>
            {pendingApp && (
              <div className="rounded-md bg-white/70 border border-amber-300 p-3">
                ⏳ <strong>Pending review</strong> — Submitted {new Date(pendingApp.createdAt).toLocaleString()}.
              </div>
            )}
            {lastRejected && (
              <div className="rounded-md bg-red-50 border border-red-300 p-3 text-red-900">
                ❌ <strong>Last application rejected.</strong>
                {lastRejected.reviewNote && <p className="text-xs italic mt-1">"{lastRejected.reviewNote}"</p>}
              </div>
            )}
            {!pendingApp && (
              <Collapsible open={applyOpen} onOpenChange={setApplyOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="default" size="sm">
                    <ShieldCheck className="w-4 h-4 mr-1" />
                    {lastRejected ? "Re-apply" : "Request IPPB Badge"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <form onSubmit={handleApply} className="space-y-3 rounded-md bg-white p-3 border">
                    <Textarea
                      required rows={4}
                      placeholder="ഉദാ: 5 വർഷം banking field-ൽ. Customer base ~200…"
                      value={applyReason}
                      onChange={(e) => setApplyReason(e.target.value)}
                    />
                    <label className="flex items-start gap-2 text-xs cursor-pointer">
                      <Checkbox checked={applyAck} onCheckedChange={(v) => setApplyAck(!!v)} />
                      <span>
                        IPPB workflow + fee structure ഞാൻ വായിച്ചു മനസ്സിലാക്കി
                      </span>
                    </label>
                    <Button type="submit" disabled={applying} className="w-full">
                      {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Application"}
                    </Button>
                  </form>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}

      {/* PC Agent banner */}
      <div className="rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/50 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
          <Cpu className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-semibold text-amber-900">Real MFS110 LED activation വേണോ?</p>
          <p className="text-xs text-amber-800/80">PC Agent install ചെയ്താൽ real fingerprint device-ൽ നിന്ന് capture ചെയ്യാം.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
            <a
              href="https://github.com/eisolutionsdata2022-beep/ei-solutions-nexus-49a3c1e4/releases/latest/download/EISolutions.IppbAgent.Setup.exe"
              target="_blank" rel="noopener noreferrer"
              onClick={() => toast.success("PC Agent download തുടങ്ങി — ~161 MB")}
            >
              <Download className="w-4 h-4" /> Download .exe (161 MB)
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-amber-500 text-amber-900 hover:bg-amber-200">
            <Link to="/install"><Info className="w-4 h-4" /> Install Guide</Link>
          </Button>
        </div>
      </div>

      {rows.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No requests yet. Click "New Request" when a customer is in front of you.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {rows.map((req) => (
          <RequestCard key={req.id} req={req} retailerId={appUser.uid} fee={fee} />
        ))}
      </div>
    </ServicePageShell>
  );
}

/* ============ Per-request card with active step UI ============ */

function RequestCard({ req, retailerId, fee }: { req: IPPBRequest; retailerId: string; fee: IPPBFeeConfig }) {
  const expectedTurn = STEP_TURN[req.currentStep];
  const isMyTurn = req.turn === "retailer" && expectedTurn === "retailer";
  const terminal = ["success", "failed", "cancelled"].includes(req.status);

  return (
    <Card id={`ippb-req-${req.id}`} className="scroll-mt-20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-mono">{req.requestNo}</CardTitle>
          <Badge variant={statusVariant(req.status) as any}>
            {terminal ? IPPB_STATUS_LABELS[req.status] : STEP_LABELS[req.currentStep]}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Clock className="w-3 h-3" />
          {new Date(req.createdAt).toLocaleString()}
          {req.staffName && <span>• Staff: {req.staffName}</span>}
        </div>
        {!terminal && <StepIndicator current={req.currentStep} className="pt-2" />}
      </CardHeader>

      <CardContent className="space-y-4">
        <CompletedStepsSummary req={req} />

        {/* Terminal states */}
        {req.status === "success" && req.accountResult && (
          <div className="rounded-lg bg-green-50 border-2 border-green-300 p-4 text-center space-y-2">
            <div className="text-3xl">🎉</div>
            <p className="text-base font-bold text-green-900">Account Created Successfully</p>
            <div className="grid grid-cols-2 gap-2 text-sm pt-2">
              <div className="bg-white rounded p-2">
                <div className="text-xs text-muted-foreground">Account Number</div>
                <div className="font-mono font-bold">{req.accountResult.accountNumber}</div>
              </div>
              <div className="bg-white rounded p-2">
                <div className="text-xs text-muted-foreground">Customer ID</div>
                <div className="font-mono font-bold">{req.accountResult.customerId}</div>
              </div>
            </div>
          </div>
        )}
        {req.status === "failed" && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
            ❌ {req.failureReason || "Submission failed"}
          </div>
        )}

        {/* Active step UI */}
        {!terminal && (
          isMyTurn ? (
            <RetailerStepForm req={req} retailerId={retailerId} />
          ) : (
            <TurnLockCard
              waitingFor="staff"
              message={`Staff "${STEP_LABELS[req.currentStep]}" verify ചെയ്യാൻ കാത്തിരിക്കുന്നു. അവർ Next click ചെയ്താൽ നിങ്ങൾക്ക് അടുത്ത step open ആകും.`}
            />
          )
        )}

        {!terminal && (
          <Button
            variant="ghost" size="sm"
            onClick={async () => {
              try {
                await cancelIPPBRequest(req.id, retailerId);
                toast.success("Cancelled");
              } catch (e: any) {
                toast.error(e.message);
              }
            }}
          >
            <X className="w-4 h-4" /> Cancel Request
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ============ Retailer's step-specific forms ============ */

function RetailerStepForm({ req, retailerId }: { req: IPPBRequest; retailerId: string }) {
  switch (req.currentStep) {
    case "basic_details":
      return <BasicDetailsForm req={req} retailerId={retailerId} />;
    case "otp_verify":
      return <OTPForm req={req} retailerId={retailerId} />;
    case "aadhaar_auth":
      return <AadhaarForm req={req} retailerId={retailerId} />;
    case "personal_info":
      return <PersonalInfoForm req={req} retailerId={retailerId} />;
    case "pan_address":
      return <PanAddressForm req={req} retailerId={retailerId} />;
    case "nominee_details":
      return <NomineeForm req={req} retailerId={retailerId} />;
    case "additional_info":
      return <AdditionalForm req={req} retailerId={retailerId} />;
    case "final_consent":
      return <ConsentForm req={req} retailerId={retailerId} />;
    default:
      return <TurnLockCard waitingFor="staff" />;
  }
}

function useFormState<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const update = (patch: Partial<T>) => setState((s) => ({ ...s, ...patch }));
  return [state, update, setState] as const;
}

function StepShell({
  title, children, onSubmit, busy, submitLabel = "Submit",
}: { title: string; children: React.ReactNode; onSubmit: () => void; busy: boolean; submitLabel?: string }) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      className="rounded-lg border-2 border-gov-blue/30 bg-gov-blue/5 p-4 space-y-3"
    >
      <div className="text-sm font-bold text-gov-blue">{title}</div>
      {children}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
      </Button>
    </form>
  );
}

function BasicDetailsForm({ req, retailerId }: { req: IPPBRequest; retailerId: string }) {
  const [form, update] = useFormState({
    mobileNumber: req.basicDetails?.mobileNumber ?? "",
    productName: req.basicDetails?.productName ?? "Regular Savings Account",
    panNumber: req.basicDetails?.panNumber ?? "",
  });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!/^[6-9]\d{9}$/.test(form.mobileNumber)) return toast.error("10-digit Indian mobile required");
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.panNumber)) return toast.error("Invalid PAN format");
    setBusy(true);
    try {
      await retailerSubmitBasicDetails(req.id, retailerId, { ...form, panNumber: form.panNumber.toUpperCase() });
      toast.success("Submitted — staff will verify and click Next");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <StepShell title="Step 2 — Basic Details" onSubmit={submit} busy={busy}>
      <div>
        <Label>Customer Mobile Number</Label>
        <Input inputMode="numeric" maxLength={10} value={form.mobileNumber}
          onChange={(e) => update({ mobileNumber: e.target.value.replace(/\D/g, "") })} />
      </div>
      <div>
        <Label>Product Name</Label>
        <Input value={form.productName} onChange={(e) => update({ productName: e.target.value })} disabled />
      </div>
      <div>
        <Label>PAN Number</Label>
        <Input maxLength={10} value={form.panNumber}
          onChange={(e) => update({ panNumber: e.target.value.toUpperCase() })}
          className="font-mono uppercase" />
      </div>
    </StepShell>
  );
}

function OTPForm({ req, retailerId }: { req: IPPBRequest; retailerId: string }) {
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await retailerSubmitOTP(req.id, retailerId, otp);
      toast.success("OTP relayed to staff");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <StepShell title="Step 3 — OTP from Customer" onSubmit={submit} busy={busy} submitLabel="Send OTP to Staff">
      <p className="text-xs">Customer-ന്റെ phone-ൽ വന്ന OTP type ചെയ്യുക:</p>
      <Input
        inputMode="numeric" maxLength={8} value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        className="font-mono tracking-widest text-center text-xl"
        placeholder="------"
      />
    </StepShell>
  );
}

function AadhaarForm({ req, retailerId }: { req: IPPBRequest; retailerId: string }) {
  const [form, update] = useFormState({
    aadhaarNumber: req.aadhaar?.aadhaarNumber ?? "",
    consent: req.aadhaar?.consent ?? false,
  });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await retailerSubmitAadhaar(req.id, retailerId, form);
      toast.success("Aadhaar submitted — staff will trigger biometric");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <StepShell title="Step 4 — Aadhaar Authentication" onSubmit={submit} busy={busy}>
      <div>
        <Label>Aadhaar Number (12 digits)</Label>
        <Input inputMode="numeric" maxLength={12} value={form.aadhaarNumber}
          onChange={(e) => update({ aadhaarNumber: e.target.value.replace(/\D/g, "") })}
          className="font-mono tracking-wider" />
      </div>
      <label className="flex items-start gap-2 text-xs cursor-pointer">
        <Checkbox checked={form.consent} onCheckedChange={(v) => update({ consent: !!v })} />
        <span>
          Customer consent: IPPB account opening, biometric authentication, data sharing എന്നിവയ്ക്ക് customer
          സമ്മതിച്ചു.
        </span>
      </label>
    </StepShell>
  );
}

function PersonalInfoForm({ req, retailerId }: { req: IPPBRequest; retailerId: string }) {
  const [form, update] = useFormState({
    fullName: req.personalInfo?.fullName ?? "",
    fatherOrHusbandName: req.personalInfo?.fatherOrHusbandName ?? "",
    motherName: req.personalInfo?.motherName ?? "",
    email: req.personalInfo?.email ?? "",
  });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.fullName || !form.fatherOrHusbandName || !form.motherName) return toast.error("All required fields");
    setBusy(true);
    try {
      await retailerSubmitPersonalInfo(req.id, retailerId, form);
      toast.success("Saved — staff will verify");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <StepShell title="Step 7 — Personal Information" onSubmit={submit} busy={busy}>
      <div><Label>Full Name *</Label><Input value={form.fullName} onChange={(e) => update({ fullName: e.target.value })} /></div>
      <div><Label>Father / Husband Name *</Label><Input value={form.fatherOrHusbandName} onChange={(e) => update({ fatherOrHusbandName: e.target.value })} /></div>
      <div><Label>Mother Name *</Label><Input value={form.motherName} onChange={(e) => update({ motherName: e.target.value })} /></div>
      <div><Label>Email (optional)</Label><Input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} /></div>
    </StepShell>
  );
}

function PanAddressForm({ req, retailerId }: { req: IPPBRequest; retailerId: string }) {
  const [form, update] = useFormState({
    panNumber: req.panAddress?.panNumber ?? req.basicDetails?.panNumber ?? "",
    address: req.panAddress?.address ?? "",
    incomeType: (req.panAddress?.incomeType ?? "salaried") as "salaried" | "business" | "agriculture" | "other",
    annualIncome: req.panAddress?.annualIncome ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.address || form.annualIncome <= 0) return toast.error("Address & income required");
    setBusy(true);
    try {
      await retailerSubmitPanAddress(req.id, retailerId, form);
      toast.success("Saved");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <StepShell title="Step 8 — PAN & Communication Address" onSubmit={submit} busy={busy}>
      <div><Label>PAN Number (confirm)</Label><Input value={form.panNumber} disabled className="font-mono" /></div>
      <div><Label>Communication Address *</Label><Textarea rows={3} value={form.address} onChange={(e) => update({ address: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Income Type</Label>
          <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            value={form.incomeType}
            onChange={(e) => update({ incomeType: e.target.value as any })}>
            <option value="salaried">Salaried</option>
            <option value="business">Business</option>
            <option value="agriculture">Agriculture</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <Label>Annual Income (₹)</Label>
          <Input type="number" min={0} value={form.annualIncome || ""} onChange={(e) => update({ annualIncome: Number(e.target.value) })} />
        </div>
      </div>
    </StepShell>
  );
}

function NomineeForm({ req, retailerId }: { req: IPPBRequest; retailerId: string }) {
  const [form, update] = useFormState({
    nomineeName: req.nomineeDetails?.nomineeName ?? "",
    dob: req.nomineeDetails?.dob ?? "",
    relationship: req.nomineeDetails?.relationship ?? "",
  });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.nomineeName || !form.dob || !form.relationship) return toast.error("All fields required");
    setBusy(true);
    try {
      await retailerSubmitNominee(req.id, retailerId, form);
      toast.success("Saved");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <StepShell title="Step 9 — Nominee Details" onSubmit={submit} busy={busy}>
      <div><Label>Nominee Name *</Label><Input value={form.nomineeName} onChange={(e) => update({ nomineeName: e.target.value })} /></div>
      <div><Label>Nominee DOB *</Label><Input type="date" value={form.dob} onChange={(e) => update({ dob: e.target.value })} /></div>
      <div><Label>Relationship *</Label><Input placeholder="Spouse / Son / Daughter / Mother / Father" value={form.relationship} onChange={(e) => update({ relationship: e.target.value })} /></div>
    </StepShell>
  );
}

function AdditionalForm({ req, retailerId }: { req: IPPBRequest; retailerId: string }) {
  const [form, update] = useFormState({
    maritalStatus: (req.additionalInfo?.maritalStatus ?? "single") as "single" | "married" | "divorced" | "widowed",
    occupation: req.additionalInfo?.occupation ?? "",
    education: req.additionalInfo?.education ?? "",
    monthlyIncome: req.additionalInfo?.monthlyIncome ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.occupation || !form.education) return toast.error("Occupation & education required");
    setBusy(true);
    try {
      await retailerSubmitAdditional(req.id, retailerId, form);
      toast.success("Saved");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <StepShell title="Step 10 — Additional Information" onSubmit={submit} busy={busy}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Marital Status</Label>
          <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            value={form.maritalStatus}
            onChange={(e) => update({ maritalStatus: e.target.value as any })}>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>
        <div><Label>Occupation</Label><Input value={form.occupation} onChange={(e) => update({ occupation: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Education</Label><Input value={form.education} onChange={(e) => update({ education: e.target.value })} /></div>
        <div><Label>Monthly Income (₹)</Label><Input type="number" min={0} value={form.monthlyIncome || ""} onChange={(e) => update({ monthlyIncome: Number(e.target.value) })} /></div>
      </div>
    </StepShell>
  );
}

function ConsentForm({ req, retailerId }: { req: IPPBRequest; retailerId: string }) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!accepted) return toast.error("Customer-ന്റെ consent ആവശ്യമാണ്");
    setBusy(true);
    try {
      await retailerSubmitConsent(req.id, retailerId);
      toast.success("Consent recorded — staff will do final biometric & submit");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <StepShell title="Step 16 — Final Consent" onSubmit={submit} busy={busy} submitLabel="Confirm Consent">
      <div className="rounded-md bg-white border p-3 text-xs space-y-2">
        <p>"I hereby give my consent to IPPB to open a Regular Savings Account in my name and to share my Aadhaar information for KYC purposes."</p>
      </div>
      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} />
        <span className="font-medium">Customer has read and accepted the consent above</span>
      </label>
    </StepShell>
  );
}

// Memoize to prevent re-renders triggering dropdown re-mount
function _useMemo() { return useMemo(() => null, []); }

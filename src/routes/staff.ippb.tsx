/**
 * Staff IPPB page — IPPB BC App tablet operator's view.
 * Shows live queue. Open a request → see all completed sections + the
 * current step's action card. For retailer-turn steps, staff sees a
 * "Waiting for Retailer" lock. For staff-turn steps, staff fills/clicks Next.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  staffCaptureBiometric1,
  staffCaptureBiometric2,
  staffCaptureBiometricFinal,
  staffClaimRequest,
  staffNextOTP,
  staffNextPersonalInfo,
  staffSubmitAccountInfo,
  staffSubmitDBT,
  staffSubmitFinalAccount,
  staffSubmitWelcomeKit,
  subscribeStaffQueue,
} from "@/lib/ippb-firebase";
import {
  IPPB_STATUS_LABELS,
  STEP_LABELS,
  STEP_TURN,
  type IPPBRequest,
  type IPPBStep,
} from "@/lib/ippb-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StepIndicator } from "@/components/ippb/StepIndicator";
import { TurnLockCard } from "@/components/ippb/TurnLockCard";
import { CompletedStepsSummary } from "@/components/ippb/CompletedStepsSummary";
import { RemoteCapturePanel } from "@/components/ippb/RemoteCapturePanel";
import { toast } from "sonner";
import {
  Banknote, ChevronDown, CheckCircle2, Download, Fingerprint, Info, Loader2, PlayCircle, XCircle,
} from "lucide-react";
import { DEFAULT_IPPB_FEE, getIPPBFeeConfig, type IPPBFeeConfig } from "@/lib/ippb-fee-config";
import { useIPPBStaffNotifications } from "@/hooks/use-ippb-staff-notifications";
import { SoftwareDownloadCard } from "@/components/ippb/SoftwareDownloadCard";

export const Route = createFileRoute("/staff/ippb")({
  ssr: false,
  component: StaffIPPBPage,
});

const TABS = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
] as const;

function StaffIPPBPage() {
  const { appUser } = useAuth();
  const [rows, setRows] = useState<IPPBRequest[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("active");
  const [fee, setFee] = useState<IPPBFeeConfig>(DEFAULT_IPPB_FEE);

  useEffect(() => subscribeStaffQueue(setRows), []);
  useEffect(() => { getIPPBFeeConfig().then(setFee); }, []);

  // 🔔 Real-time toast + chime when a retailer advances a step → staff's turn.
  useIPPBStaffNotifications(rows, appUser?.uid);

  const filtered = useMemo(() => {
    const terminal = ["success", "failed", "cancelled"];
    return rows.filter((r) =>
      tab === "active" ? !terminal.includes(r.status) : terminal.includes(r.status)
    );
  }, [rows, tab]);

  // Most recent in-progress request that is on staff's turn (or unclaimed).
  const resumable = useMemo(() => {
    const terminal = ["success", "failed", "cancelled"];
    const active = rows
      .filter((r) => !terminal.includes(r.status))
      .filter((r) => !r.staffId || r.staffId === appUser?.uid)
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    // Prefer one where it's currently staff's turn
    const staffTurn = active.find(
      (r) => (r.turn ?? STEP_TURN[r.currentStep]) === "staff"
    );
    return staffTurn ?? active[0] ?? null;
  }, [rows, appUser?.uid]);

  const opened = rows.find((r) => r.id === openId) ?? null;
  if (!appUser) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="w-6 h-6 text-gov-blue" /> IPPB – Staff Tablet
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time queue of retailer-initiated IPPB Account Opening requests. Verify each step and click Next to advance.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="gap-2 border-gov-blue/40 text-gov-blue hover:bg-gov-blue/10"
          >
            <a
              href="/ippb-training-malayalam.pdf"
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              <Download className="w-4 h-4" />
              ട്രെയിനിങ് PDF (മലയാളം)
            </a>
          </Button>
          {resumable && (
            <Button
              size="sm"
              variant="default"
              className="gap-2 animate-in fade-in"
              onClick={() => setOpenId(resumable.id)}
            >
              <PlayCircle className="w-4 h-4" />
              Resume {resumable.requestNo}
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {STEP_LABELS[resumable.currentStep]}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      <Collapsible defaultOpen={false}>
        <Card className="border-gov-blue/30">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/40">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-gov-blue" />
                  Staff Workflow Guide (19 Steps)
                </span>
                <ChevronDown className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="text-xs space-y-2 leading-relaxed">
              <p>1. Retailer creates request → fills <strong>Basic Details</strong>.</p>
              <p>2. Staff Claim → verify mobile/PAN/product → click <strong>Next</strong> (sends OTP).</p>
              <p>3. Retailer relays OTP → Staff verifies in IPPB tablet → clicks <strong>Next</strong>.</p>
              <p>4. Retailer enters Aadhaar + consent → Staff triggers <strong>Biometric 1</strong> via PC Agent.</p>
              <p>5. Retailer fills 4 form sections (Personal, PAN/Address, Nominee, Additional). Staff verifies after each.</p>
              <p>6. Staff fills Account Info (Initial Deposit, Scheme) + DBT Mapping → triggers <strong>Biometric 2</strong>.</p>
              <p>7. Staff scans Welcome Kit → Retailer ticks final consent → Staff triggers <strong>Final Biometric</strong>.</p>
              <p>8. Staff enters Account Number + Customer ID → fee charges + commissions credit automatically.</p>
              <p className="text-amber-700 font-semibold pt-2">💰 Per success: ₹{fee.staffCommission} → your wallet</p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label} ({rows.filter((r) =>
                t.key === "active"
                  ? !["success", "failed", "cancelled"].includes(r.status)
                  : ["success", "failed", "cancelled"].includes(r.status)
              ).length})
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="space-y-3">
          {filtered.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No requests in this view.</CardContent></Card>
          )}
          {filtered.map((req) => {
            const turn = req.turn ?? STEP_TURN[req.currentStep];
            const waitingOnRetailer = turn === "retailer" && !["success", "failed", "cancelled"].includes(req.status);
            return (
              <Card
                key={req.id}
                className="cursor-pointer hover:border-gov-blue/50"
                onClick={() => setOpenId(req.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base font-mono">{req.requestNo}</CardTitle>
                    <div className="flex items-center gap-1.5">
                      {waitingOnRetailer && <Badge variant="secondary" className="text-xs">⏳ Retailer</Badge>}
                      {turn === "staff" && !["success", "failed", "cancelled"].includes(req.status) && (
                        <Badge variant="default" className="text-xs animate-pulse">▶ Your Turn</Badge>
                      )}
                      <Badge>{["success", "failed", "cancelled"].includes(req.status)
                        ? IPPB_STATUS_LABELS[req.status]
                        : STEP_LABELS[req.currentStep]}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div>Retailer: <span className="font-medium">{req.retailerName}</span></div>
                  {req.basicDetails?.mobileNumber && (
                    <div className="font-mono">📱 {req.basicDetails.mobileNumber}</div>
                  )}
                  {req.otp && req.currentStep === "otp_verify" && (
                    <div className="text-green-700 font-bold">🔑 OTP from retailer: {req.otp}</div>
                  )}
                  <div className="text-xs text-muted-foreground">{new Date(req.updatedAt).toLocaleString()}</div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={!!opened} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {opened && (
            <RequestProcessor
              req={opened}
              staffId={appUser.uid}
              staffName={appUser.name || appUser.email}
              onClose={() => setOpenId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============ Processing UI ============ */

function RequestProcessor({
  req, staffId, staffName, onClose,
}: { req: IPPBRequest; staffId: string; staffName: string; onClose: () => void }) {
  const claimed = req.staffId === staffId;
  const terminal = ["success", "failed", "cancelled"].includes(req.status);
  const turn = req.turn ?? STEP_TURN[req.currentStep];
  const isStaffTurn = turn === "staff" && !terminal;

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm">{req.requestNo}</span>
          <Badge>{terminal ? IPPB_STATUS_LABELS[req.status] : STEP_LABELS[req.currentStep]}</Badge>
        </DialogTitle>
      </DialogHeader>

      {!terminal && <StepIndicator current={req.currentStep} />}

      <CompletedStepsSummary req={req} />

      {req.status === "success" && req.accountResult && (
        <div className="rounded-lg bg-green-50 border-2 border-green-300 p-4 text-center space-y-2">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
          <p className="text-lg font-bold text-green-900">Account Created Successfully</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
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
          ❌ {req.failureReason}
        </div>
      )}

      {!claimed && !terminal && (
        <Button
          className="w-full"
          onClick={() => staffClaimRequest(req.id, staffId, staffName)
            .then(() => toast.success("Claimed"))
            .catch((e) => toast.error(e.message))}
        >
          Claim This Request
        </Button>
      )}

      {claimed && !terminal && (
        isStaffTurn ? (
          <StaffStepAction req={req} staffId={staffId} />
        ) : (
          <TurnLockCard
            waitingFor="retailer"
            message={`Retailer "${STEP_LABELS[req.currentStep]}" fill ചെയ്യാൻ കാത്തിരിക്കുന്നു. Auto-refresh ആകും — submit ചെയ്താൽ Next button enable ആകും.`}
          />
        )
      )}
    </div>
  );
}

/* ============ Per-step staff actions ============ */

function StaffStepAction({ req, staffId }: { req: IPPBRequest; staffId: string }) {
  switch (req.currentStep) {
    case "otp_verify":
      return <OTPVerifyAction req={req} staffId={staffId} />;
    case "biometric_1":
      return <BiometricAction req={req} staffId={staffId} step="biometric_1" title="Step 5 — Biometric 1 (Aadhaar Auth)" />;
    case "personal_info":
      return <SimpleNextAction req={req} staffId={staffId} title="Step 7 — Verify Personal Info" onNext={() => staffNextPersonalInfo(req.id, staffId)} />;
    case "pan_address":
    case "nominee_details":
    case "additional_info":
      // These are retailer-turn — never reaches here
      return <TurnLockCard waitingFor="retailer" />;
    case "account_info":
      return <AccountInfoAction req={req} staffId={staffId} />;
    case "dbt_mapping":
      return <DBTAction req={req} staffId={staffId} />;
    case "biometric_2":
      return <BiometricAction req={req} staffId={staffId} step="biometric_2" title="Step 13 — Biometric 2 (Data Match)" />;
    case "welcome_kit":
      return <WelcomeKitAction req={req} staffId={staffId} />;
    case "biometric_final":
      return <BiometricAction req={req} staffId={staffId} step="biometric_final" title="Step 17 — Final Biometric" />;
    case "account_created":
      return <AccountCreatedAction req={req} staffId={staffId} />;
    default:
      return <TurnLockCard waitingFor="retailer" />;
  }
}

function ActionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-gov-blue/40">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-gov-blue">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function OTPVerifyAction({ req, staffId }: { req: IPPBRequest; staffId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <ActionShell title="Step 3 — OTP Verification">
      <div className="text-3xl font-bold font-mono tracking-widest text-center bg-gov-blue/10 py-4 rounded-lg">
        {req.otp ?? "------"}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Type this OTP into your IPPB BC App. Once IPPB verifies, click <strong>OTP Verified — Next</strong>.
      </p>
      <Button
        className="w-full" disabled={busy}
        onClick={async () => {
          setBusy(true);
          try { await staffNextOTP(req.id, staffId); toast.success("Advanced"); }
          catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
        }}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "OTP Verified — Next"}
      </Button>
    </ActionShell>
  );
}

function SimpleNextAction({ req, staffId, title, onNext }: {
  req: IPPBRequest; staffId: string; title: string; onNext: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <ActionShell title={title}>
      <p className="text-xs text-muted-foreground">
        Customer details verify ചെയ്ത ശേഷം Next click ചെയ്യുക. Retailer അടുത്ത section fill ചെയ്യും.
      </p>
      <Button
        className="w-full" disabled={busy}
        onClick={async () => {
          setBusy(true);
          try { await onNext(); toast.success("Advanced"); }
          catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
        }}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Next"}
      </Button>
    </ActionShell>
  );
}

function BiometricAction({ req, staffId, step, title }: {
  req: IPPBRequest; staffId: string; step: "biometric_1" | "biometric_2" | "biometric_final"; title: string;
}) {
  const captured = step === "biometric_1" ? req.biometric1
    : step === "biometric_2" ? req.biometric2
    : req.biometricFinal;
  return (
    <ActionShell title={title}>
      <p className="text-xs text-muted-foreground">
        Customer-ന്റെ finger retailer-ന്റെ MFS110 device-ൽ വയ്ക്കാൻ പറയുക. PC Agent capture ചെയ്ത് PID hash automatic ആയി save ആകും.
      </p>
      <RemoteCapturePanel
        ippbRequestId={req.id}
        staffId={staffId}
        retailerId={req.retailerId}
        step={step}
        alreadyCaptured={!!captured}
      />
    </ActionShell>
  );
}

function AccountInfoAction({ req, staffId }: { req: IPPBRequest; staffId: string }) {
  const [initialDeposit, setInitialDeposit] = useState(req.accountInfo?.initialDeposit ?? 0);
  const [scheme, setScheme] = useState(req.accountInfo?.scheme ?? "Regular Savings");
  const [busy, setBusy] = useState(false);
  return (
    <ActionShell title="Step 11 — Account Information">
      <div><Label>Initial Deposit (₹)</Label><Input type="number" min={0} value={initialDeposit} onChange={(e) => setInitialDeposit(Number(e.target.value))} /></div>
      <div><Label>Scheme</Label><Input value={scheme} onChange={(e) => setScheme(e.target.value)} /></div>
      <Button className="w-full" disabled={busy}
        onClick={async () => {
          setBusy(true);
          try { await staffSubmitAccountInfo(req.id, staffId, { initialDeposit, scheme }); toast.success("Saved"); }
          catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
        }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Next"}
      </Button>
    </ActionShell>
  );
}

function DBTAction({ req, staffId }: { req: IPPBRequest; staffId: string }) {
  const [optIn, setOptIn] = useState(req.dbtMapping?.optIn ?? true);
  const [busy, setBusy] = useState(false);
  return (
    <ActionShell title="Step 12 — DBT Mapping">
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={optIn} onCheckedChange={(v) => setOptIn(!!v)} />
        <span className="text-sm">Customer agrees to receive DBT in IPPB account</span>
      </label>
      <Button className="w-full" disabled={busy}
        onClick={async () => {
          setBusy(true);
          try { await staffSubmitDBT(req.id, staffId, { optIn, verified: true }); toast.success("Verified"); }
          catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
        }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `${optIn ? "Verify & Next" : "Skip & Next"}`}
      </Button>
    </ActionShell>
  );
}

function WelcomeKitAction({ req, staffId }: { req: IPPBRequest; staffId: string }) {
  const [kitId, setKitId] = useState(req.welcomeKit?.kitId ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <ActionShell title="Step 14 — Welcome Kit">
      <p className="text-xs text-muted-foreground">Welcome Kit-ലെ QR scan ചെയ്യുക അല്ലെങ്കിൽ Kit ID type ചെയ്യുക.</p>
      <Input placeholder="Welcome Kit ID" value={kitId} onChange={(e) => setKitId(e.target.value)} className="font-mono" />
      <Button className="w-full" disabled={busy || !kitId}
        onClick={async () => {
          setBusy(true);
          try { await staffSubmitWelcomeKit(req.id, staffId, { kitId }); toast.success("Saved"); }
          catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
        }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Next"}
      </Button>
    </ActionShell>
  );
}

function AccountCreatedAction({ req, staffId }: { req: IPPBRequest; staffId: string }) {
  const [accountNumber, setAccountNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <ActionShell title="Step 18 — Final Result">
      <p className="text-xs text-muted-foreground">
        IPPB BC App-ൽ Submit ചെയ്തു result വന്ന ശേഷം Account Number + Customer ID ഇവിടെ enter ചെയ്യുക.
      </p>
      <div><Label>Account Number</Label><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="font-mono" /></div>
      <div><Label>Customer ID</Label><Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="font-mono" /></div>
      <Button className="w-full" disabled={busy || !accountNumber || !customerId}
        onClick={async () => {
          setBusy(true);
          try {
            await staffSubmitFinalAccount(req.id, staffId, {
              success: true, result: { accountNumber, customerId },
            });
            toast.success("✅ Account created — commissions credited!");
          } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
        }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Mark Success</>}
      </Button>

      <div className="border-t pt-3 space-y-2">
        <Label className="text-xs text-red-700">Failed? Provide reason:</Label>
        <Input placeholder="Failure reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button variant="destructive" className="w-full" disabled={busy || !reason}
          onClick={async () => {
            setBusy(true);
            try {
              await staffSubmitFinalAccount(req.id, staffId, { success: false, reason });
              toast.success("Marked failed");
            } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
          }}>
          <XCircle className="w-4 h-4" /> Mark Failed (No Commission)
        </Button>
      </div>
    </ActionShell>
  );
}

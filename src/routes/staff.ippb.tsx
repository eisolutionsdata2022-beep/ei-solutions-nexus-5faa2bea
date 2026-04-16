import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  staffCaptureBiometric,
  staffClaimRequest,
  staffEnterMobileAndSendOTP,
  staffMarkOTPVerified,
  staffSaveDetails,
  staffSubmitAccount,
  subscribeStaffQueue,
} from "@/lib/ippb-firebase";
import {
  IPPB_STATUS_LABELS,
  type IPPBCustomerDetails,
  type IPPBRequest,
} from "@/lib/ippb-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RemoteCapturePanel } from "@/components/ippb/RemoteCapturePanel";
import { toast } from "sonner";
import {
  Banknote,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Loader2,
  Smartphone,
  XCircle,
} from "lucide-react";

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

  useEffect(() => {
    return subscribeStaffQueue(setRows);
  }, []);

  const filtered = useMemo(() => {
    const terminal = ["success", "failed", "cancelled"];
    return rows.filter((r) =>
      tab === "active" ? !terminal.includes(r.status) : terminal.includes(r.status)
    );
  }, [rows, tab]);

  const opened = rows.find((r) => r.id === openId) ?? null;

  if (!appUser) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="w-6 h-6 text-gov-blue" /> IPPB – Staff Tablet
        </h1>
        <p className="text-sm text-muted-foreground">
          Live queue of retailer-initiated IPPB Account Opening requests.
        </p>
      </div>

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
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No requests in this view.
              </CardContent>
            </Card>
          )}
          {filtered.map((req) => (
            <Card
              key={req.id}
              className="cursor-pointer hover:border-gov-blue/50 transition-colors"
              onClick={() => setOpenId(req.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base font-mono">{req.requestNo}</CardTitle>
                  <Badge>{IPPB_STATUS_LABELS[req.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div>Retailer: <span className="font-medium">{req.retailerName}</span></div>
                {req.mobileNumber && (
                  <div className="font-mono">📱 {req.mobileNumber}</div>
                )}
                {req.status === "otp_relayed" && req.otpRelayed && (
                  <div className="text-green-700 font-bold">
                    🔑 OTP from retailer: {req.otpRelayed}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {new Date(req.updatedAt).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
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

/* ------------ Processing UI ------------ */

function RequestProcessor({
  req,
  staffId,
  staffName,
  onClose,
}: {
  req: IPPBRequest;
  staffId: string;
  staffName: string;
  onClose: () => void;
}) {
  const [mobile, setMobile] = useState(req.mobileNumber ?? "");
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState<IPPBCustomerDetails>(
    req.customerDetails ?? {
      fullName: "",
      dob: "",
      address: "",
      aadhaar: "",
      pan: "",
    }
  );
  const [accountNo, setAccountNo] = useState("");

  const claimed = req.staffId === staffId;
  const wrapped = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span className="font-mono text-sm">{req.requestNo}</span>
          <Badge>{IPPB_STATUS_LABELS[req.status]}</Badge>
        </DialogTitle>
      </DialogHeader>

      {/* Step 1: Claim */}
      {!claimed && req.status !== "success" && (
        <Button
          className="w-full"
          disabled={busy}
          onClick={() => wrapped(() => staffClaimRequest(req.id, staffId, staffName), "Claimed")}
        >
          Claim This Request
        </Button>
      )}

      {claimed && (
        <>
          {/* Step 2: Mobile + OTP send */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> 1. Customer Mobile (enter in IPPB tablet)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                />
                <Button
                  disabled={busy || mobile.length !== 10}
                  onClick={() =>
                    wrapped(
                      () => staffEnterMobileAndSendOTP(req.id, staffId, mobile),
                      "OTP request sent. Ask retailer to enter the OTP from customer."
                    )
                  }
                >
                  Send OTP
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                IPPB will SMS the OTP to customer. The retailer will enter it on their dashboard.
              </p>
            </CardContent>
          </Card>

          {/* Step 3: OTP from retailer */}
          {(req.status === "mobile_entered" || req.status === "otp_relayed") && (
            <Card className="border-gov-blue/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <KeyRound className="w-4 h-4" /> 2. OTP relayed by Retailer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {req.otpRelayed ? (
                  <div className="space-y-3">
                    <div className="text-3xl font-bold font-mono tracking-widest text-center bg-gov-blue/10 py-4 rounded-lg">
                      {req.otpRelayed}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Type this OTP into the IPPB tablet app, then confirm result below.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        disabled={busy}
                        onClick={() =>
                          wrapped(
                            () => staffMarkOTPVerified(req.id, staffId, true),
                            "OTP verified"
                          )
                        }
                      >
                        <CheckCircle2 className="w-4 h-4" /> Verified
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={busy}
                        onClick={() =>
                          wrapped(
                            () => staffMarkOTPVerified(req.id, staffId, false),
                            "Asked retailer to retry"
                          )
                        }
                      >
                        <XCircle className="w-4 h-4" /> Wrong – Retry
                      </Button>
                    </div>
                    {req.retryCount > 0 && (
                      <p className="text-xs text-amber-600">Retries: {req.retryCount}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Waiting for retailer to enter OTP…
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Customer details */}
          {["otp_verified", "details_filled", "biometric_captured"].includes(
            req.status
          ) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">3. Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Field label="Full Name">
                  <Input
                    value={details.fullName}
                    onChange={(e) => setDetails({ ...details, fullName: e.target.value })}
                  />
                </Field>
                <Field label="DOB">
                  <Input
                    type="date"
                    value={details.dob}
                    onChange={(e) => setDetails({ ...details, dob: e.target.value })}
                  />
                </Field>
                <Field label="Aadhaar / VID" full>
                  <Input
                    value={details.aadhaar}
                    onChange={(e) => setDetails({ ...details, aadhaar: e.target.value })}
                  />
                </Field>
                <Field label="PAN">
                  <Input
                    value={details.pan}
                    onChange={(e) => setDetails({ ...details, pan: e.target.value.toUpperCase() })}
                  />
                </Field>
                <Field label="Initial Deposit (₹)">
                  <Input
                    type="number"
                    value={details.initialDeposit ?? 0}
                    onChange={(e) =>
                      setDetails({ ...details, initialDeposit: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Address" full>
                  <Input
                    value={details.address}
                    onChange={(e) => setDetails({ ...details, address: e.target.value })}
                  />
                </Field>
                <Field label="Nominee Name">
                  <Input
                    value={details.nomineeName ?? ""}
                    onChange={(e) => setDetails({ ...details, nomineeName: e.target.value })}
                  />
                </Field>
                <Field label="Nominee Relation">
                  <Input
                    value={details.nomineeRelation ?? ""}
                    onChange={(e) =>
                      setDetails({ ...details, nomineeRelation: e.target.value })
                    }
                  />
                </Field>
                <div className="col-span-2">
                  <Button
                    className="w-full"
                    disabled={
                      busy ||
                      !details.fullName ||
                      !details.dob ||
                      !details.aadhaar ||
                      !details.pan ||
                      !details.address
                    }
                    onClick={() =>
                      wrapped(
                        () => staffSaveDetails(req.id, staffId, details),
                        "Details saved"
                      )
                    }
                  >
                    Save Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Biometric */}
          {["details_filled", "biometric_captured"].includes(req.status) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Fingerprint className="w-4 h-4" /> 4. Biometric Capture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {req.biometric ? (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
                    ✅ Captured ({req.biometric.mode}) at{" "}
                    {new Date(req.biometric.capturedAt).toLocaleTimeString()}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    L1: simulated capture. L2 (future): retailer-side fingerprint device.
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <RemoteCapturePanel
                    ippbRequestId={req.id}
                    staffId={staffId}
                    retailerId={req.retailerId}
                    alreadyCaptured={!!req.biometric}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      wrapped(
                        () =>
                          staffCaptureBiometric(req.id, staffId, {
                            mode: "L1_SIMULATION",
                            capturedAt: new Date().toISOString(),
                            hash: "sim-" + Math.random().toString(36).slice(2, 10),
                            staffConfirmed: true,
                          }),
                        "Biometric captured (L1 simulation)"
                      )
                    }
                  >
                    <Fingerprint className="w-4 h-4" /> Fallback: L1 Tablet Sim
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Submit */}
          {req.status === "biometric_captured" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">5. Submit to IPPB</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Field label="Account Number (after IPPB confirms)">
                  <Input
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    placeholder="e.g. 5xxxxxxxxxx"
                  />
                </Field>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={busy || !accountNo}
                    onClick={() =>
                      wrapped(
                        () =>
                          staffSubmitAccount(req.id, staffId, {
                            success: true,
                            accountNumber: accountNo,
                          }),
                        "Account submitted"
                      ).then(onClose)
                    }
                  >
                    Mark Success
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={busy}
                    onClick={() =>
                      wrapped(
                        () =>
                          staffSubmitAccount(req.id, staffId, {
                            success: false,
                            reason: "Submission rejected by IPPB",
                          }),
                        "Marked failed"
                      ).then(onClose)
                    }
                  >
                    Mark Failed
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* History */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Workflow history</summary>
        <ul className="mt-2 space-y-1">
          {req.history?.map((h, i) => (
            <li key={i}>
              {new Date(h.at).toLocaleTimeString()} – {IPPB_STATUS_LABELS[h.status]}
              {h.note ? ` (${h.note})` : ""}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

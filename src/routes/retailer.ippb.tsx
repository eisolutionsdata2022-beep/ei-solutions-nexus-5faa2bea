import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  cancelIPPBRequest,
  createIPPBRequest,
  retailerSubmitOTP,
  subscribeRetailerRequests,
} from "@/lib/ippb-firebase";
import { IPPB_STATUS_LABELS, type IPPBRequest } from "@/lib/ippb-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Banknote, Clock, KeyRound, Loader2, Plus, X, Cpu, Download, Info, ChevronDown, ShieldAlert, ShieldCheck, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getIPPBFeeConfig, netRetailerCost, DEFAULT_IPPB_FEE, type IPPBFeeConfig } from "@/lib/ippb-fee-config";
import { applyForIPPBBadge, type IPPBBadgeApplicationDoc } from "@/lib/ippb-badge";

export const Route = createFileRoute("/retailer/ippb")({
  ssr: false,
  component: RetailerIPPBPage,
});

function statusVariant(s: IPPBRequest["status"]) {
  if (s === "success") return "default";
  if (s === "failed" || s === "cancelled") return "destructive";
  if (s === "otp_relayed" || s === "mobile_entered") return "secondary";
  return "outline";
}

function RetailerIPPBPage() {
  const { appUser } = useAuth();
  const [rows, setRows] = useState<IPPBRequest[]>([]);
  const [creating, setCreating] = useState(false);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
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

  useEffect(() => { getIPPBFeeConfig().then(setFee); }, []);

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
      toast.success("New IPPB request created. Notify staff to pick it up.");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitOTP = async (req: IPPBRequest) => {
    const otp = (otpInputs[req.id] ?? "").trim();
    if (!otp) return toast.error("Enter the OTP from customer");
    setSubmitting(req.id);
    try {
      await retailerSubmitOTP(req.id, appUser.uid, otp);
      toast.success("OTP relayed to staff");
      setOtpInputs((p) => ({ ...p, [req.id]: "" }));
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSubmitting(null);
    }
  };

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    if (!applyReason.trim() || applyReason.trim().length < 10) {
      return toast.error("ദയവായി കാരണം detail-ആയി എഴുതുക (min 10 chars).");
    }
    if (!applyAck) {
      return toast.error("Help page acknowledge ചെയ്യണം.");
    }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="w-6 h-6 text-gov-blue" /> IPPB Account Opening
            {hasBadge && (
              <Badge variant="default" className="ml-2 gap-1">
                <ShieldCheck className="w-3 h-3" /> Badged
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {hasBadge
              ? "Create a request, then relay the OTP from the customer to the staff in real time."
              : "IPPB badge ഇല്ലാത്തതിനാൽ ഇപ്പോൾ work ചെയ്യാൻ കഴിയില്ല. താഴെ apply ചെയ്യുക."}
          </p>
        </div>
        <Button
          onClick={handleCreate}
          disabled={creating || !hasBadge}
          title={!hasBadge ? "IPPB badge required" : undefined}
        >
          {!hasBadge ? (
            <Lock className="w-4 h-4" />
          ) : creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          New Request
        </Button>
      </div>

      {/* Badge gate — block creation but show preview below */}
      {!hasBadge && (
        <Card className="border-amber-400 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900">
              <ShieldAlert className="w-5 h-5" />
              IPPB Work Badge ആവശ്യമാണ്
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-amber-900">
            <p>
              IPPB account opening service ചെയ്യാൻ admin-ൽ നിന്ന് ഒരു{" "}
              <strong>IPPB Work Badge</strong> approve ആകേണ്ടതുണ്ട്. താഴെയുള്ള form
              fill ചെയ്ത് request അയക്കുക. Admin verify ചെയ്ത ശേഷം badge grant ആകും
              — അതിനു ശേഷം മാത്രം "New Request" enable ആകും.
            </p>

            {pendingApp && (
              <div className="rounded-md bg-white/70 border border-amber-300 p-3">
                ⏳ <strong>Pending review</strong> — Submitted{" "}
                {new Date(pendingApp.createdAt).toLocaleString()}.
                Admin approve ചെയ്യാൻ കാത്തിരിക്കുന്നു.
              </div>
            )}

            {lastRejected && (
              <div className="rounded-md bg-red-50 border border-red-300 p-3 text-red-900">
                ❌ <strong>Last application rejected.</strong>
                {lastRejected.reviewNote && (
                  <p className="text-xs italic mt-1">"{lastRejected.reviewNote}"</p>
                )}
                <p className="text-xs mt-1">
                  നിങ്ങൾക്ക് വീണ്ടും apply ചെയ്യാം.
                </p>
              </div>
            )}

            {!pendingApp && (
              <Collapsible open={applyOpen} onOpenChange={setApplyOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="default" size="sm">
                    <ShieldCheck className="w-4 h-4 mr-1" />
                    {lastRejected ? "Re-apply for IPPB Badge" : "Request IPPB Badge"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <form
                    onSubmit={handleApply}
                    className="space-y-3 rounded-md bg-white p-3 border"
                  >
                    <div>
                      <Label className="text-xs">
                        എന്തുകൊണ്ട് IPPB work ചെയ്യണം? (Experience, training, customer base) *
                      </Label>
                      <Textarea
                        required
                        rows={4}
                        placeholder="ഉദാ: 5 വർഷം banking field-ൽ. Customer base ~200. IPPB workflow help page വായിച്ചു…"
                        value={applyReason}
                        onChange={(e) => setApplyReason(e.target.value)}
                      />
                    </div>
                    <label className="flex items-start gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={applyAck}
                        onCheckedChange={(v) => setApplyAck(!!v)}
                      />
                      <span>
                        IPPB workflow + fee structure ഞാൻ വായിച്ചു മനസ്സിലാക്കി —{" "}
                        <Link
                          to="/help/ippb"
                          target="_blank"
                          className="text-gov-blue underline"
                        >
                          Help page തുറക്കുക
                        </Link>
                      </span>
                    </label>
                    <Button type="submit" disabled={applying} className="w-full">
                      {applying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Submit Application"
                      )}
                    </Button>
                  </form>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}


      {/* PC Agent upgrade banner — small, dismissable visual hint */}
      <div className="rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/50 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
          <Cpu className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-semibold text-amber-900">
            Real MFS110 LED activation വേണോ?
          </p>
          <p className="text-xs text-amber-800/80">
            PC Agent install ചെയ്താൽ browser-ന് പകരം real fingerprint device-ൽ നിന്ന് capture ചെയ്യാം.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            asChild
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <a
              href="https://github.com/eisolutionsdata2022-beep/ei-solutions-nexus-49a3c1e4/releases/latest/download/EISolutions.IppbAgent.Setup.exe"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => toast.success("PC Agent download തുടങ്ങി — ~161 MB")}
            >
              <Download className="w-4 h-4" />
              Download .exe (161 MB)
            </a>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-amber-500 text-amber-900 hover:bg-amber-200"
          >
            <Link to="/install">
              <Info className="w-4 h-4" />
              Install Guide
            </Link>
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
        {rows.map((req) => {
          const showOTPInput =
            req.status === "mobile_entered" || req.status === "otp_relayed";
          const showRelayed = req.status === "otp_relayed" && req.otpRelayed;
          return (
            <Card key={req.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base font-mono">{req.requestNo}</CardTitle>
                  <Badge variant={statusVariant(req.status) as any}>
                    {IPPB_STATUS_LABELS[req.status]}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  {new Date(req.createdAt).toLocaleString()}
                  {req.staffName && <span>• Staff: {req.staffName}</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {req.mobileNumber && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Mobile entered by staff:</span>{" "}
                    <span className="font-mono">
                      {req.mobileNumber.slice(0, 2)}******{req.mobileNumber.slice(-2)}
                    </span>
                  </div>
                )}

                {showOTPInput && (
                  <div className="rounded-lg border-2 border-gov-blue/30 bg-gov-blue/5 p-3 space-y-2">
                    <div className="text-sm font-semibold flex items-center gap-2 text-gov-blue">
                      <KeyRound className="w-4 h-4" />
                      Ask the customer for the OTP and enter it below
                    </div>
                    <div className="flex gap-2">
                      <Input
                        inputMode="numeric"
                        maxLength={8}
                        placeholder="Enter OTP"
                        value={otpInputs[req.id] ?? ""}
                        onChange={(e) =>
                          setOtpInputs((p) => ({
                            ...p,
                            [req.id]: e.target.value.replace(/\D/g, ""),
                          }))
                        }
                        className="font-mono tracking-widest text-center text-lg"
                      />
                      <Button
                        onClick={() => handleSubmitOTP(req)}
                        disabled={submitting === req.id}
                      >
                        {submitting === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Send to Staff"
                        )}
                      </Button>
                    </div>
                    {showRelayed && (
                      <div className="text-xs text-green-700">
                        OTP relayed: <span className="font-mono">{req.otpRelayed}</span>. Waiting for staff verification…
                      </div>
                    )}
                  </div>
                )}

                {req.status === "success" && req.accountNumber && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
                    ✅ Account created: <span className="font-mono font-bold">{req.accountNumber}</span>
                  </div>
                )}
                {req.status === "failed" && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
                    ❌ {req.failureReason || "Submission failed"}
                  </div>
                )}

                {!["success", "failed", "cancelled", "submitted", "biometric_captured"].includes(
                  req.status
                ) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await cancelIPPBRequest(req.id, appUser.uid);
                        toast.success("Cancelled");
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                  >
                    <X className="w-4 h-4" /> Cancel
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

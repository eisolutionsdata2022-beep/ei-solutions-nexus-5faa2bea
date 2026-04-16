import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Banknote, Clock, KeyRound, Loader2, Plus, X, Cpu, Download, Info, ChevronDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getIPPBFeeConfig, netRetailerCost, DEFAULT_IPPB_FEE, type IPPBFeeConfig } from "@/lib/ippb-fee-config";

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

  useEffect(() => {
    if (!appUser) return;
    return subscribeRetailerRequests(appUser.uid, setRows);
  }, [appUser]);

  useEffect(() => { getIPPBFeeConfig().then(setFee); }, []);

  if (!appUser) return null;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="w-6 h-6 text-gov-blue" /> IPPB Account Opening
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a request, then relay the OTP from the customer to the staff in real time.
          </p>
        </div>
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          New Request
        </Button>
      </div>

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
        <Button
          asChild
          size="sm"
          variant="outline"
          className="border-amber-500 text-amber-900 hover:bg-amber-200"
        >
          <Link to="/install">
            <Download className="w-4 h-4" />
            Download PC Agent
          </Link>
        </Button>
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

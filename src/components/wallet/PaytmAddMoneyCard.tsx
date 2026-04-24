/**
 * Paytm Add Money — instant wallet top-up via Paytm Gateway.
 *
 * Two flows (mirroring the legacy PHP portal):
 *   1. Checkout (redirect)   — POST hidden form to Paytm, full-page redirect
 *   2. Dynamic QR            — generate per-transaction QR, poll status, auto-credit
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Loader2,
  QrCode,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  Zap,
} from "lucide-react";
import QRCodeLib from "qrcode";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPaytmConfig, subscribeToTopup } from "@/lib/paytm-firebase";
import { DEFAULT_PAYTM_CONFIG, type PaytmMasterConfig, type PaytmTopupRequest } from "@/lib/paytm-types";
import { initiatePaytmCheckout, createPaytmQr, checkPaytmStatus } from "@/lib/paytm.functions";

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];

export function PaytmAddMoneyCard() {
  const { appUser } = useAuth();
  const [cfg, setCfg] = useState<PaytmMasterConfig>(DEFAULT_PAYTM_CONFIG);
  const [amount, setAmount] = useState<string>("100");

  useEffect(() => {
    getPaytmConfig().then(setCfg);
  }, []);

  const numericAmount = Number(amount) || 0;
  const charges = useMemo(
    () => Math.round(numericAmount * (cfg.pgChargesPercent / 100) * 100) / 100,
    [numericAmount, cfg.pgChargesPercent],
  );
  const credit = Math.max(0, Math.round((numericAmount - charges) * 100) / 100);

  if (!cfg.enabled) return null;

  const showCheckout = cfg.checkoutEnabled;
  const showQr = cfg.qrEnabled;
  if (!showCheckout && !showQr) return null;

  return (
    <Card className="border-2 border-primary/20 shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-5 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <div>
              <div className="text-sm font-bold">Instant Add Money</div>
              <div className="text-[11px] opacity-90">Powered by Paytm Gateway</div>
            </div>
          </div>
          <Badge className="bg-white/20 text-white hover:bg-white/30 border-white/30">
            Auto Credit
          </Badge>
        </div>
      </div>

      <CardContent className="space-y-4 p-5">
        {/* Amount input */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
            Amount (₹)
          </Label>
          <Input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={cfg.minAmount}
            className="h-12 text-2xl font-bold"
            placeholder={`Min ₹${cfg.minAmount}`}
          />
          <div className="flex flex-wrap gap-1.5">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(String(amt))}
                className={`px-3 py-1 text-xs font-semibold rounded-full border transition ${
                  amount === String(amt)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted"
                }`}
              >
                ₹{amt.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </div>

        {/* Fee breakdown */}
        {numericAmount > 0 && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">You pay</span>
              <span className="font-semibold">₹{numericAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">PG charges ({cfg.pgChargesPercent}%)</span>
              <span className="text-destructive">− ₹{charges.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-1.5 mt-1.5">
              <span className="font-semibold">Wallet credit</span>
              <span className="font-bold text-success">₹{credit.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Mode tabs */}
        <Tabs defaultValue={showCheckout ? "checkout" : "qr"}>
          <TabsList className="grid w-full grid-cols-2">
            {showCheckout && (
              <TabsTrigger value="checkout">
                <CreditCard className="mr-2 h-4 w-4" />
                Pay via Paytm
              </TabsTrigger>
            )}
            {showQr && (
              <TabsTrigger value="qr">
                <QrCode className="mr-2 h-4 w-4" />
                Scan UPI QR
              </TabsTrigger>
            )}
          </TabsList>

          {showCheckout && (
            <TabsContent value="checkout" className="mt-3">
              <CheckoutPanel
                amount={numericAmount}
                minAmount={cfg.minAmount}
                userMobile={(appUser as { mobile?: string } | null)?.mobile ?? ""}
                userEmail={appUser?.email ?? ""}
              />
            </TabsContent>
          )}

          {showQr && (
            <TabsContent value="qr" className="mt-3">
              <QrPanel
                amount={numericAmount}
                minAmount={cfg.minAmount}
                pollIntervalSec={cfg.qrPollIntervalSec}
                userMobile={(appUser as { mobile?: string } | null)?.mobile ?? ""}
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

/* ─────────────── Checkout panel ─────────────── */
function CheckoutPanel({
  amount,
  minAmount,
  userMobile,
  userEmail,
}: {
  amount: number;
  minAmount: number;
  userMobile: string;
  userEmail: string;
}) {
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<{
    txnUrl: string;
    params: Record<string, string>;
  } | null>(null);

  // Auto-submit form once data is ready
  useEffect(() => {
    if (formData && formRef.current) {
      formRef.current.submit();
    }
  }, [formData]);

  async function handlePay() {
    if (amount < minAmount) {
      toast.error(`Minimum amount is ₹${minAmount}`);
      return;
    }
    setLoading(true);
    try {
      const res = await initiatePaytmCheckout({
        data: { amount, mobile: userMobile, email: userEmail },
      });
      setFormData({ txnUrl: res.txnUrl, params: res.params });
      toast.info("Redirecting to Paytm…");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start payment");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        You'll be redirected to Paytm's secure page. Pay using UPI, card, netbanking, or wallet.
        Wallet is auto-credited after successful payment.
      </p>
      <Button onClick={handlePay} disabled={loading || amount < minAmount} className="w-full h-12">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="mr-2 h-4 w-4" />
        )}
        {loading ? "Redirecting…" : `Pay ₹${amount.toFixed(2)} via Paytm`}
        {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
      </Button>

      {/* Hidden auto-submit form for Paytm redirect */}
      {formData && (
        <form
          ref={formRef}
          method="POST"
          action={formData.txnUrl}
          style={{ display: "none" }}
        >
          {Object.entries(formData.params).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
    </div>
  );
}

/* ─────────────── QR panel (live polling) ─────────────── */
function QrPanel({
  amount,
  minAmount,
  pollIntervalSec,
  userMobile,
}: {
  amount: number;
  minAmount: number;
  pollIntervalSec: number;
  userMobile: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [status, setStatus] = useState<PaytmTopupRequest["status"] | "checking" | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // Generate QR
  async function handleGenerate() {
    if (amount < minAmount) {
      toast.error(`Minimum amount is ₹${minAmount}`);
      return;
    }
    setGenerating(true);
    setStatus(null);
    setQrImage(null);
    try {
      const res = await createPaytmQr({ data: { amount, mobile: userMobile } });
      setOrderId(res.orderId);
      setCreditAmount(res.creditAmount);
      setExpiresAt(res.expiresAt);
      setStatus("pending");
      const dataUrl = await QRCodeLib.toDataURL(res.qrData, {
        width: 280,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      setQrImage(dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate QR");
    } finally {
      setGenerating(false);
    }
  }

  // Live Firestore subscription — instant update when callback credits wallet
  useEffect(() => {
    if (!orderId) return;
    const unsub = subscribeToTopup(orderId, (req) => {
      if (!req) return;
      setStatus(req.status);
      if (req.status === "success") {
        toast.success(`✅ ₹${req.creditAmount} credited to wallet!`);
      } else if (req.status === "failed") {
        toast.error(req.message ?? "Payment failed");
      }
    });
    return unsub;
  }, [orderId]);

  // Active polling (defense — Paytm callback can be delayed)
  useEffect(() => {
    if (!orderId || status !== "pending") return;
    let cancelled = false;
    const id = setInterval(async () => {
      if (cancelled) return;
      try {
        await checkPaytmStatus({ data: { orderId } });
      } catch {
        /* swallow — next tick will retry */
      }
    }, Math.max(3, pollIntervalSec) * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [orderId, status, pollIntervalSec]);

  // Expiry countdown
  useEffect(() => {
    if (!expiresAt || status !== "pending") return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) setStatus("expired");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, status]);

  if (status === "success") {
    return (
      <div className="rounded-xl border-2 border-success bg-success/5 p-6 text-center space-y-2">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <div className="text-lg font-bold text-success">Payment Successful</div>
        <div className="text-sm text-muted-foreground">
          ₹{creditAmount.toFixed(2)} credited to your wallet.
        </div>
        <Button variant="outline" onClick={() => { setOrderId(null); setStatus(null); setQrImage(null); }}>
          Add More Money
        </Button>
      </div>
    );
  }

  if (status === "failed" || status === "expired") {
    return (
      <div className="rounded-xl border-2 border-destructive bg-destructive/5 p-6 text-center space-y-2">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <div className="text-lg font-bold text-destructive">
          {status === "expired" ? "QR Expired" : "Payment Failed"}
        </div>
        <Button onClick={() => { setOrderId(null); setStatus(null); setQrImage(null); }}>
          Try Again
        </Button>
      </div>
    );
  }

  if (qrImage && status === "pending") {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return (
      <div className="space-y-3">
        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-white p-4 flex flex-col items-center">
          <img src={qrImage} alt="Paytm UPI QR" className="w-64 h-64" />
          <div className="mt-3 text-center">
            <div className="text-xs text-muted-foreground">Scan with any UPI app</div>
            <div className="text-2xl font-bold mt-1">₹{amount.toFixed(2)}</div>
            <div className="text-xs text-success mt-1">
              ✓ ₹{creditAmount.toFixed(2)} will be credited
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-muted-foreground">Waiting for payment…</span>
          {secondsLeft > 0 && (
            <Badge variant="outline" className="font-mono">
              <Clock className="mr-1 h-3 w-3" />
              {mins}:{secs.toString().padStart(2, "0")}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setOrderId(null); setStatus(null); setQrImage(null); }}
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Generate a one-time UPI QR. Scan with any UPI app to pay. Wallet auto-credits within seconds.
      </p>
      <Button
        onClick={handleGenerate}
        disabled={generating || amount < minAmount}
        className="w-full h-12"
      >
        {generating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <QrCode className="mr-2 h-4 w-4" />
        )}
        {generating ? "Generating QR…" : `Generate QR for ₹${amount.toFixed(2)}`}
      </Button>
    </div>
  );
}

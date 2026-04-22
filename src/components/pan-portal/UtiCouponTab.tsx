/**
 * UTI Coupon Tab — purchase UTI PAN coupons + track applications.
 *
 * Gated on PSA approval (legacy logic): retailer must have an active PSA/VLE
 * ID before they can buy coupons. After purchase the coupon number is shown
 * — retailer logs into the UTI portal with their PSA credentials and uses
 * that coupon to file the customer's PAN application.
 */
import { useState, type FormEvent } from "react";
import { atomicDebit, atomicCredit } from "@/lib/firebase-transactions";
import {
  createUtiCoupon,
  getPanConfig,
  updateUtiCoupon,
} from "@/lib/pan-portal-firebase";
import {
  panUtiCouponPurchase,
  panUtiPanStatusTrack,
} from "@/lib/pan-portal.functions";
import type {
  PanMasterConfig,
  PanPsaRecord,
  PanUtiCoupon,
} from "@/lib/pan-portal-types";
import { newCouponOrderId } from "@/lib/pan-portal-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Ticket,
  ShoppingCart,
  Search,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { UtiCouponHistoryTable } from "./UtiCouponHistoryTable";

interface Props {
  user: { uid: string; email: string; name?: string; phone?: string };
  config: PanMasterConfig;
  psa: PanPsaRecord | null;
  coupons: PanUtiCoupon[];
}

export function UtiCouponTab({ user, config, psa, coupons }: Props) {
  const [purchasing, setPurchasing] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [trackInput, setTrackInput] = useState("");

  const utiEnabled = config.utiEnabled ?? true;
  const fee = config.utiPanRetailerFee ?? 107;
  const psaActive = psa?.status === "approved";

  if (!utiEnabled) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground">
        UTI Coupon service is currently disabled by admin.
      </CardContent></Card>
    );
  }

  if (!psaActive) {
    return (
      <Card className="border-amber-200 dark:border-amber-900/50">
        <CardContent className="p-8 text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold">PSA / VLE ID required</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            UTI coupons require an active PSA (UTI VLE) account. Switch to the
            <strong> PSA Auto-ID</strong> tab to register or link your existing UTI VLE ID first.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function handlePurchase(e: FormEvent) {
    e.preventDefault();
    if (!psa || !config.cipher) return;
    setPurchasing(true);
    const orderId = newCouponOrderId(user.uid);
    let oldBalance = 0;
    let newBalance = 0;
    try {
      newBalance = await atomicDebit(user.uid, fee, {
        source: "pan-portal",
        description: `UTI PAN coupon — ${orderId}`,
      });
      oldBalance = newBalance + fee;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wallet debit failed");
      setPurchasing(false);
      return;
    }
    try {
      const cfg = await getPanConfig();
      const res = await panUtiCouponPurchase({
        data: {
          url: cfg.utiCouponPurchaseUrl!,
          cipher: cfg.cipher!,
          vleId: psa.vleId,
          orderId,
          shopName: psa.shopName || user.name || user.email,
          weburl: typeof window !== "undefined" ? window.location.hostname : "ei-solutions",
        },
      });
      const nowIso = new Date().toISOString();
      if (!res.success) {
        await atomicCredit(user.uid, fee, {
          source: "pan-portal",
          description: `Refund — UTI coupon ${orderId}`,
        });
        await createUtiCoupon({
          couponId: orderId,
          retailerId: user.uid,
          retailerUsername: user.name || user.email,
          vleId: psa.vleId,
          amount: fee,
          providerCost: cfg.utiPanProviderCost,
          oldBalance,
          newBalance: oldBalance,
          status: "refunded",
          remark: res.error,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        toast.error(`Purchase failed: ${res.error}. Wallet refunded.`);
        return;
      }
      await createUtiCoupon({
        couponId: res.couponId,
        retailerId: user.uid,
        retailerUsername: user.name || user.email,
        vleId: psa.vleId,
        amount: fee,
        providerCost: cfg.utiPanProviderCost,
        oldBalance,
        newBalance,
        status: "purchased",
        ackNo: res.ackNo,
        remark: res.message,
        rawResponse: res.raw,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      toast.success(`Coupon ${res.couponId} purchased!`);
    } catch (err) {
      try {
        await atomicCredit(user.uid, fee, {
          source: "pan-portal",
          description: `Refund — UTI coupon ${orderId}`,
        });
      } catch { /* ignore */ }
      toast.error(err instanceof Error ? err.message : "Purchase failed — wallet refunded");
    } finally {
      setPurchasing(false);
    }
  }

  async function handleTrack(couponId: string, ackNo?: string) {
    if (!config.cipher) return;
    const tracker = ackNo || couponId;
    setTrackingId(couponId);
    try {
      const cfg = await getPanConfig();
      const res = await panUtiPanStatusTrack({
        data: { url: cfg.utiPanStatusUrl!, cipher: cfg.cipher!, ackNo: tracker },
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const consumed = !!res.panNumber;
      await updateUtiCoupon(couponId, {
        applicationStatus: res.applicationStatus,
        panNumber: res.panNumber,
        status: consumed ? "consumed" : "purchased",
        rawResponse: res.raw,
      });
      toast.success(`Status: ${res.applicationStatus}${res.panNumber ? ` — PAN ${res.panNumber}` : ""}`);
    } finally {
      setTrackingId(null);
    }
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    toast.success("Copied!");
  }

  const purchasedCount = coupons.filter((c) => c.status === "purchased").length;
  const consumedCount = coupons.filter((c) => c.status === "consumed").length;

  return (
    <div className="space-y-5">
      {/* Purchase card */}
      <Card className="border-primary/20 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 p-1" />
        <CardHeader className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Ticket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div>Buy UTI PAN Coupon</div>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                Each coupon = 1 customer PAN application via UTI portal
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground">Per coupon</p>
              <p className="text-2xl font-bold text-primary">₹{fee}</p>
            </div>
            <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 p-3 text-center">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Purchased</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{purchasedCount}</p>
            </div>
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
              <p className="text-xs text-blue-700 dark:text-blue-400">Consumed</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{consumedCount}</p>
            </div>
          </div>
          <form onSubmit={handlePurchase}>
            <Button type="submit" disabled={purchasing} size="lg" className="w-full">
              {purchasing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShoppingCart className="h-5 w-5 mr-2" />}
              Buy 1 Coupon for ₹{fee}
            </Button>
          </form>
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 space-y-1">
            <p>📌 After purchase, copy the coupon number and log into the UTI portal with your PSA ID <code className="font-mono">{psa?.vleId}</code> to fill the customer's PAN application form.</p>
            <p>📌 Failed purchases auto-refund your wallet.</p>
          </div>
        </CardContent>
      </Card>

      {/* Manual track */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" /> Track by Coupon / Ack No
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (trackInput.trim()) {
                const c = coupons.find((x) => x.couponId === trackInput.trim() || x.ackNo === trackInput.trim());
                if (c) handleTrack(c.couponId, c.ackNo);
                else handleTrack(trackInput.trim(), trackInput.trim());
              }
            }}
          >
            <Input
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value)}
              placeholder="Enter coupon or 15-digit ack number"
            />
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Premium history table with wallet transactions */}
      <UtiCouponHistoryTable retailerId={user.uid} coupons={coupons} />
    </div>
  );
}

function CouponRow({
  coupon,
  busy,
  onCopy,
  onTrack,
}: {
  coupon: PanUtiCoupon;
  busy: boolean;
  onCopy: (id: string) => void;
  onTrack: () => void;
}) {
  const tone =
    coupon.status === "consumed"
      ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30"
      : coupon.status === "purchased"
        ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30"
        : coupon.status === "refunded"
          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30"
          : "bg-rose-50 border-rose-200 dark:bg-rose-950/30";

  const Icon =
    coupon.status === "consumed" ? CheckCircle2 :
    coupon.status === "purchased" ? Clock :
    XCircle;

  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Icon className="h-5 w-5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="font-mono font-bold text-sm">{coupon.couponId}</code>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onCopy(coupon.couponId)}>
                <Copy className="h-3 w-3" />
              </Button>
              <Badge variant="outline" className="text-[10px]">{coupon.status.toUpperCase()}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {new Date(coupon.createdAt).toLocaleString()} • ₹{coupon.amount}
              {coupon.panNumber && <span className="ml-2 text-emerald-700 font-bold">PAN: {coupon.panNumber}</span>}
              {coupon.applicationStatus && !coupon.panNumber && <span className="ml-2">{coupon.applicationStatus}</span>}
            </div>
          </div>
        </div>
        {coupon.status !== "refunded" && coupon.status !== "failed" && (
          <Button size="sm" variant="outline" onClick={onTrack} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
            Track
          </Button>
        )}
      </div>
    </div>
  );
}

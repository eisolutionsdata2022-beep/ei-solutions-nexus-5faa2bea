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
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { UtiCouponHistoryTable } from "./UtiCouponHistoryTable";
import { UtiTrainingPdfCard } from "./UtiTrainingPdfCard";

interface Props {
  user: { uid: string; email: string; name?: string; phone?: string };
  config: PanMasterConfig;
  psa: PanPsaRecord | null;
  coupons: PanUtiCoupon[];
}

export function UtiCouponTab({ user, config, psa, coupons }: Props) {
  const [purchasing, setPurchasing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [quantity, setQuantity] = useState(2);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [trackInput, setTrackInput] = useState("");

  const utiEnabled = config.utiEnabled ?? true;
  const fee = config.utiPanRetailerFee ?? 107;
  const psaActive = psa?.status === "approved";
  const MIN_QTY = 2;
  const MAX_QTY = 100;
  const totalAmount = fee * quantity;

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

  async function purchaseSingle(): Promise<{ ok: boolean; couponId?: string; error?: string }> {
    if (!psa || !config.cipher) return { ok: false, error: "Missing PSA/config" };
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
      return { ok: false, error: err instanceof Error ? err.message : "Wallet debit failed" };
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
        return { ok: false, error: res.error };
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
      return { ok: true, couponId: res.couponId };
    } catch (err) {
      try {
        await atomicCredit(user.uid, fee, {
          source: "pan-portal",
          description: `Refund — UTI coupon ${orderId}`,
        });
      } catch { /* ignore */ }
      return { ok: false, error: err instanceof Error ? err.message : "Purchase failed" };
    }
  }

  async function handlePurchase(e: FormEvent) {
    e.preventDefault();
    if (!psa || !config.cipher) return;
    const qty = Math.max(MIN_QTY, Math.min(MAX_QTY, quantity));
    setPurchasing(true);
    setProgress({ done: 0, total: qty });
    let success = 0;
    let failed = 0;
    const failures: string[] = [];
    for (let i = 0; i < qty; i++) {
      const res = await purchaseSingle();
      if (res.ok) success++;
      else {
        failed++;
        if (res.error) failures.push(res.error);
      }
      setProgress({ done: i + 1, total: qty });
    }
    setPurchasing(false);
    setProgress(null);
    if (success > 0 && failed === 0) {
      toast.success(`✅ ${success} coupon${success > 1 ? "s" : ""} purchased successfully!`);
    } else if (success > 0 && failed > 0) {
      toast.warning(`⚠️ ${success} succeeded, ${failed} failed (refunded). ${failures[0] || ""}`);
    } else {
      toast.error(`❌ All ${failed} purchases failed. ${failures[0] || "Wallet refunded."}`);
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
      {/* Training PDF — quick access right above the purchase card */}
      <UtiTrainingPdfCard />
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
          <form onSubmit={handlePurchase} className="space-y-3">
            <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-blue-50 dark:from-primary/10 dark:to-blue-950/20 p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold">Quantity</p>
                  <p className="text-xs text-muted-foreground">Minimum 2 coupons per purchase</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={purchasing || quantity <= MIN_QTY}
                    onClick={() => setQuantity((q) => Math.max(MIN_QTY, q - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={MIN_QTY}
                    max={MAX_QTY}
                    value={quantity}
                    disabled={purchasing}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) setQuantity(Math.max(MIN_QTY, Math.min(MAX_QTY, v)));
                      else setQuantity(MIN_QTY);
                    }}
                    className="w-20 text-center text-lg font-bold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={purchasing || quantity >= MAX_QTY}
                    onClick={() => setQuantity((q) => Math.min(MAX_QTY, q + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                <span className="text-sm text-muted-foreground">Total amount</span>
                <span className="text-xl font-bold text-primary">₹{totalAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-xs text-muted-foreground self-center mr-1">Quick:</span>
                {[2, 5, 10, 25].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    size="sm"
                    variant={quantity === n ? "default" : "outline"}
                    className="h-7 text-xs"
                    disabled={purchasing}
                    onClick={() => setQuantity(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={purchasing} size="lg" className="w-full">
              {purchasing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  {progress ? `Purchasing ${progress.done + 1}/${progress.total}…` : "Processing…"}
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Buy {quantity} Coupon{quantity > 1 ? "s" : ""} for ₹{totalAmount.toLocaleString("en-IN")}
                </>
              )}
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


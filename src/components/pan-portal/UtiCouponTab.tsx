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
  updateUtiCoupon,
  upsertPsaRecord,
} from "@/lib/pan-portal-firebase";
import { generateVleId } from "@/lib/vle-id";
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
  // Effective VLE ID — provider ALWAYS expects `RMPMCST-<10-digit-mobile>`.
  // Older PSA records may have a stale / non-conforming vleId (e.g. raw uid
  // from a previous build), which causes the provider to reject every coupon
  // purchase with "Vle Data Not Exist". Always prefer the canonical mobile-
  // based ID, falling back to the stored vleId only if it's already in the
  // expected format.
  const canonicalVleId = generateVleId(user.uid, user.phone);
  const storedVleId = psa?.vleId?.trim() || "";
  const storedIsCanonical = /^RMPMCST-\d{10}$/i.test(storedVleId);
  const effectiveVleId = storedIsCanonical ? storedVleId.toUpperCase() : canonicalVleId;
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


  async function handlePurchase(e: FormEvent) {
    e.preventDefault();
    if (!config.hasCredentials) {
      toast.error("Provider credentials are not configured. Please contact admin.");
      return;
    }
    if (!user.phone || !/^\d{10}$/.test(user.phone)) {
      toast.error("Mobile number missing or invalid in your profile. Update profile first.");
      return;
    }
    // NOTE: PSA gate intentionally removed. New retailers MUST be able to buy
    // their first batch of 2 coupons — the upstream provider auto-creates the
    // VLE / PSA ID after the first 2-coupon purchase, and we mirror that
    // locally in step 4 below (`upsertPsaRecord`). Blocking on `!psaActive`
    // created a chicken-and-egg deadlock where new users could never bootstrap
    // their PSA. For first-time buyers we force qty ≥ 2.
    const isFirstTime = !psaActive;
    const minQty = isFirstTime ? 2 : MIN_QTY;
    const qty = Math.max(minQty, Math.min(MAX_QTY, quantity));
    const totalDebit = fee * qty;
    setPurchasing(true);
    setProgress({ done: 0, total: qty });

    // Single batch request — upstream PSACoupon endpoint requires qty ≥ 2 in
    // ONE call and returns multiple coupon numbers. Sending N single-coupon
    // requests in a loop would all be rejected as "minimum 2 coupons".
    const batchOrderId = newCouponOrderId(user.uid);
    let oldBalance = 0;
    let shouldAutoRefund = true;

    // 1. Atomic debit for the full batch up-front.
    try {
      const newBalance = await atomicDebit(user.uid, totalDebit, {
        source: "pan-portal",
        description: `UTI PAN coupons × ${qty} — ${batchOrderId}`,
        orderId: batchOrderId,
      });
      oldBalance = newBalance + totalDebit;
    } catch (err) {
      setPurchasing(false);
      setProgress(null);
      toast.error(err instanceof Error ? err.message : "Wallet debit failed");
      return;
    }

    // 2. Single upstream call.
    try {
      const res = await panUtiCouponPurchase({
        data: {
          vleId: effectiveVleId,
          orderId: batchOrderId,
          shopName: psa?.shopName || user.name || user.email,
          weburl: typeof window !== "undefined" ? window.location.hostname : "ei-solutions",
          qty,
        },
      });
      const nowIso = new Date().toISOString();

      if (!res.success) {
        // Refund full batch. Mark refund-done IMMEDIATELY so that if the
        // subsequent createUtiCoupon write throws, the outer catch does NOT
        // refund a second time (root cause of the "extra ₹214 in wallet" bug
        // — wallet was credited once here and again from the catch handler).
        await atomicCredit(user.uid, totalDebit, {
          source: "pan-portal",
          description: `Refund — UTI coupons × ${qty} ${batchOrderId}`,
          orderId: batchOrderId,
        });
        shouldAutoRefund = false;
        await createUtiCoupon({
          couponId: batchOrderId,
          orderId: batchOrderId,
          retailerId: user.uid,
          retailerUsername: user.name || user.email,
          vleId: effectiveVleId,
          amount: totalDebit,
            providerCost: config.utiPanProviderCost ? config.utiPanProviderCost * qty : undefined,
          oldBalance,
          newBalance: oldBalance,
          status: "refunded",
          remark: res.error,
          rawResponse: res.raw,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        toast.error(`❌ Purchase failed — ${res.error}. ₹${totalDebit} refunded.`);
        return;
      }
      shouldAutoRefund = false;

      // 3. Persist each returned coupon as its own row.
      const list = res.coupons.length > 0 ? res.coupons : [{ couponId: res.couponId, ackNo: res.ackNo }];
      const received = list.length;

      // If provider returned fewer coupons than paid for, refund the diff.
      if (received < qty) {
        const refundAmt = (qty - received) * fee;
        try {
          await atomicCredit(user.uid, refundAmt, {
            source: "pan-portal",
            description: `Partial refund — UTI batch ${batchOrderId} (${qty - received} short)`,
            orderId: batchOrderId,
          });
        } catch { /* ignore */ }
      }

      let runningBalance = oldBalance;
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const before = runningBalance;
        runningBalance = runningBalance - fee;
        await createUtiCoupon({
          couponId: c.couponId,
          orderId: batchOrderId,
          retailerId: user.uid,
          retailerUsername: user.name || user.email,
          vleId: effectiveVleId,
          amount: fee,
            providerCost: config.utiPanProviderCost,
          oldBalance: before,
          newBalance: runningBalance,
          status: "purchased",
          ackNo: c.ackNo,
          remark: i === 0 ? res.message : `Batch ${batchOrderId} (${i + 1}/${received})`,
          rawResponse: i === 0 ? res.raw : undefined,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        setProgress({ done: i + 1, total: qty });
      }

      // 4. Auto-activate PSA record if this is the first-ever purchase.
      // Provider generates / links the PSA ID upstream once 2 coupons are
      // bought, so we mirror that locally — the retailer can now log into the
      // UTI portal with this VLE ID.
      if (!psa && received >= 2) {
        try {
          await upsertPsaRecord({
            retailerId: user.uid,
            vleId: effectiveVleId,
            status: "approved",
            linkedExisting: false,
            ownerName: user.name || user.email,
            shopName: user.name || user.email,
            mobile: user.phone!,
            email: user.email,
            remark: "Auto-activated after first 2-coupon purchase",
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        } catch (e) {
          console.error("[PAN][UTI] PSA auto-activation failed", e);
        }
      }

      if (received === qty) {
        toast.success(`✅ ${received} coupon${received > 1 ? "s" : ""} purchased successfully!`);
      } else {
        toast.warning(`⚠️ Got ${received}/${qty} coupons — ₹${(qty - received) * fee} refunded.`);
      }
    } catch (err) {
      if (shouldAutoRefund) {
        try {
          await atomicCredit(user.uid, totalDebit, {
            source: "pan-portal",
            description: `Refund — UTI batch error ${batchOrderId}`,
            orderId: batchOrderId,
          });
        } catch { /* ignore */ }
        toast.error(err instanceof Error ? err.message : "Purchase failed — wallet refunded");
      } else {
        console.error("[PAN][UTI purchase] local persistence error after accepted provider response", err);
        toast.error("Provider accepted the request. Auto-refund skipped — check coupon history once it refreshes.");
      }
    } finally {
      setPurchasing(false);
      setProgress(null);
    }
  }

  async function handleTrack(couponId: string, ackNo?: string) {
    if (!config.hasCredentials) {
      toast.error("Provider credentials are not configured. Please contact admin.");
      return;
    }
    const tracker = ackNo || couponId;
    setTrackingId(couponId);
    try {
      const res = await panUtiPanStatusTrack({
        data: { ackNo: tracker },
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
      {!psaActive && (
        <Card className="border-blue-300 bg-blue-50/70 dark:bg-blue-950/20 dark:border-blue-900/60">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
              <Ticket className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div className="text-sm space-y-1">
              <p className="font-semibold text-blue-900 dark:text-blue-200">
                New here? Buy your first 2 coupons to activate your VLE ID
              </p>
              <p className="text-blue-800/90 dark:text-blue-200/80">
                Your VLE ID will be{" "}
                <code className="font-mono bg-white/70 dark:bg-black/30 px-1.5 py-0.5 rounded">{effectiveVleId}</code>.
                The UTI provider auto-creates your PSA account after the first
                2-coupon purchase. After that, buy any quantity (2 or more) anytime.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
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
              ) : !psaActive ? (
                <>
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Buy first 2 coupons & activate VLE ID — ₹{(fee * Math.max(2, quantity)).toLocaleString("en-IN")}
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
            <p>📌 After purchase, copy the coupon number and log into the UTI portal with your PSA ID <code className="font-mono">{effectiveVleId}</code> to fill the customer's PAN application form.</p>
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


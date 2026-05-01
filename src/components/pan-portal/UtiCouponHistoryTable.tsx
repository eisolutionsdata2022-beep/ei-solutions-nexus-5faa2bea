/**
 * UTI Coupon History Table — premium table view of all UTI coupon purchases
 * with status, timestamps, PAN result, and related wallet transactions
 * (debit at purchase + refund on failure).
 */
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PanUtiCoupon } from "@/lib/pan-portal-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Ticket,
  Search,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  Undo2,
  ChevronDown,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  History,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface WalletTxn {
  id: string;
  amount: number;
  type: "debit" | "credit";
  description: string;
  createdAt: string;
  orderId?: string;
}

interface Props {
  retailerId: string;
  coupons: PanUtiCoupon[];
}

export function UtiCouponHistoryTable({ retailerId, coupons }: Props) {
  const [walletTxns, setWalletTxns] = useState<WalletTxn[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  // Subscribe to retailer's pan-portal wallet transactions for cross-reference.
  useEffect(() => {
    if (!retailerId) return;
    const txQuery = query(
      collection(db, "transactions"),
      where("userId", "==", retailerId),
      where("source", "==", "pan-portal"),
    );
    const mapTxn = (data: Record<string, unknown>, id: string) => ({
      id,
      amount: Number(data.amount || 0),
      type: (data.type as "debit" | "credit") || "debit",
      description: String(data.description || ""),
      createdAt: String(data.createdAt || ""),
      orderId: data.orderId ? String(data.orderId) : undefined,
    });
    const unsubscribe = onSnapshot(
      txQuery,
      (snap) => {
        const txns = snap.docs
          .map((d) => mapTxn(d.data() as Record<string, unknown>, d.id))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setWalletTxns(txns);
      },
      (err) => {
        console.warn("[UtiCouponHistory] tx subscribe skipped:", err.message);
        setWalletTxns([]);
      },
    );
    return () => unsubscribe();
  }, [retailerId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return coupons.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!term) return true;
      return (
        c.couponId.toLowerCase().includes(term) ||
        (c.ackNo || "").toLowerCase().includes(term) ||
        (c.panNumber || "").toLowerCase().includes(term)
      );
    });
  }, [coupons, search, statusFilter]);

  const totals = useMemo(() => {
    return {
      total: coupons.length,
      purchased: coupons.filter((c) => c.status === "purchased").length,
      consumed: coupons.filter((c) => c.status === "consumed").length,
      refunded: coupons.filter((c) => c.status === "refunded").length,
      failed: coupons.filter((c) => c.status === "failed").length,
      spent: coupons
        .filter((c) => c.status !== "refunded")
        .reduce((s, c) => s + (c.amount || 0), 0),
    };
  }, [coupons]);

  function copy(v: string) {
    navigator.clipboard.writeText(v);
    toast.success("Copied!");
  }

  function relatedTxns(coupon: PanUtiCoupon): WalletTxn[] {
    return walletTxns.filter(
      (t) => t.orderId === coupon.orderId || t.orderId === coupon.couponId || t.description.includes(coupon.orderId || coupon.couponId),
    );
  }

  return (
    <Card className="border-primary/20 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 p-1" />
      <CardHeader className="bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/20 dark:to-slate-900">
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div>UTI Coupon History</div>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">
              All purchased coupons with statuses, timestamps & wallet transactions
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <StatChip label="Total" value={totals.total} tone="slate" />
          <StatChip label="Purchased" value={totals.purchased} tone="blue" />
          <StatChip label="Consumed" value={totals.consumed} tone="emerald" />
          <StatChip label="Refunded" value={totals.refunded} tone="amber" />
          <StatChip label="Spent" value={`₹${totals.spent}`} tone="primary" />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search coupon, Ack No, PAN..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "purchased", "consumed", "refunded", "failed"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {coupons.length === 0
                ? "No coupons purchased yet."
                : "No coupons match your filters."}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            {/* Header — desktop only */}
            <div className="hidden md:grid grid-cols-[1fr_120px_110px_120px_180px_40px] gap-3 px-4 py-2.5 bg-muted/40 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <div>Coupon / Ack No</div>
              <div>Status</div>
              <div className="text-right">Amount</div>
              <div>PAN Result</div>
              <div>Purchased</div>
              <div />
            </div>
            <div className="divide-y">
              {filtered.map((c) => {
                const isOpen = openId === c.couponId;
                const txns = relatedTxns(c);
                return (
                  <Collapsible
                    key={c.couponId}
                    open={isOpen}
                    onOpenChange={(o) => setOpenId(o ? c.couponId : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="md:grid md:grid-cols-[1fr_120px_110px_120px_180px_40px] gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer items-center transition-colors">
                        {/* Coupon */}
                        <div className="flex items-center gap-2 min-w-0">
                          <code className="font-mono text-sm font-bold truncate">
                            {c.couponId}
                          </code>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copy(c.couponId);
                            }}
                            className="opacity-60 hover:opacity-100 flex-shrink-0"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          {c.ackNo && (
                            <span className="text-xs text-muted-foreground truncate">
                              · Ack {c.ackNo.slice(0, 12)}…
                            </span>
                          )}
                        </div>

                        {/* Status */}
                        <div className="md:block mt-2 md:mt-0">
                          <StatusBadge status={c.status} />
                        </div>

                        {/* Amount */}
                        <div className="md:text-right font-semibold text-sm mt-2 md:mt-0">
                          ₹{c.amount}
                        </div>

                        {/* PAN */}
                        <div className="text-xs mt-2 md:mt-0">
                          {c.panNumber ? (
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {c.panNumber}
                            </span>
                          ) : c.applicationStatus ? (
                            <span className="text-muted-foreground">
                              {c.applicationStatus}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </div>

                        {/* Date */}
                        <div className="text-xs text-muted-foreground mt-2 md:mt-0">
                          {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
                        </div>

                        {/* Chevron */}
                        <div className="hidden md:flex justify-end">
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-1 bg-muted/20 border-t">
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Coupon details */}
                          <div className="space-y-2 text-sm">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Coupon Details
                            </h4>
                            <DetailRow label="Coupon ID" value={c.couponId} mono />
                            {c.ackNo && <DetailRow label="Ack No" value={c.ackNo} mono />}
                            <DetailRow label="VLE ID" value={c.vleId} mono />
                            {c.applicationStatus && (
                              <DetailRow label="Application" value={c.applicationStatus} />
                            )}
                            {c.remark && <DetailRow label="Remark" value={c.remark} />}
                            {c.status === "refunded" && c.rawResponse && (
                              <div className="mt-2 p-2 rounded border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/50">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300 mb-1">
                                  Provider Response (for diagnosis)
                                </p>
                                <pre className="text-[10px] font-mono whitespace-pre-wrap break-all max-h-40 overflow-auto text-rose-900 dark:text-rose-200">
                                  {c.rawResponse.slice(0, 2000)}
                                </pre>
                              </div>
                            )}
                            <DetailRow
                              label="Wallet Before"
                              value={`₹${c.oldBalance ?? 0}`}
                            />
                            <DetailRow
                              label="Wallet After"
                              value={`₹${c.newBalance ?? 0}`}
                            />
                            {c.updatedAt && c.updatedAt !== c.createdAt && (
                              <DetailRow
                                label="Last Updated"
                                value={new Date(c.updatedAt).toLocaleString()}
                              />
                            )}
                          </div>

                          {/* Wallet transactions */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <Wallet className="h-3.5 w-3.5" /> Wallet Transactions
                            </h4>
                            {txns.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">
                                No matching wallet entries found.
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {txns.map((t) => (
                                  <div
                                    key={t.id}
                                    className={`flex items-center gap-2 text-xs p-2 rounded border ${
                                      t.type === "credit"
                                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50"
                                        : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                                    }`}
                                  >
                                    {t.type === "credit" ? (
                                      <ArrowDownCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                    ) : (
                                      <ArrowUpCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">
                                        {t.description}
                                      </div>
                                      <div className="text-muted-foreground text-[10px]">
                                        {new Date(t.createdAt).toLocaleString()}
                                      </div>
                                    </div>
                                    <div
                                      className={`font-bold ${
                                        t.type === "credit"
                                          ? "text-emerald-700 dark:text-emerald-400"
                                          : "text-rose-700 dark:text-rose-400"
                                      }`}
                                    >
                                      {t.type === "credit" ? "+" : "−"}₹{t.amount}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ----- bits ----- */
function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "slate" | "blue" | "emerald" | "amber" | "primary";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300",
    blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300",
    emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <div className={`rounded-lg p-2.5 text-center border ${tones[tone]}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-80">{label}</p>
      <p className="font-bold text-base mt-0.5">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: PanUtiCoupon["status"] }) {
  const map: Record<string, { Icon: typeof CheckCircle2; cls: string; label: string }> = {
    consumed: {
      Icon: CheckCircle2,
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200",
      label: "Consumed",
    },
    purchased: {
      Icon: Clock,
      cls: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200",
      label: "Purchased",
    },
    refunded: {
      Icon: Undo2,
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200",
      label: "Refunded",
    },
    failed: {
      Icon: XCircle,
      cls: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200",
      label: "Failed",
    },
  };
  const conf = map[status] ?? map.purchased;
  const Icon = conf.Icon;
  return (
    <Badge variant="outline" className={`${conf.cls} gap-1 font-semibold`}>
      <Icon className="h-3 w-3" />
      {conf.label}
    </Badge>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono font-semibold text-right" : "font-medium text-right"}>
        {value}
      </span>
    </div>
  );
}

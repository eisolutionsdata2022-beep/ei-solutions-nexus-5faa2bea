/**
 * PAN PORTAL v2 — Premium SaaS frontend.
 * Backend reuse:
 *  - Same Firestore: pan_config/master, pan_transactions
 *  - Same server fn: executePanService
 *  - Same wallet: atomicDebit / atomicCredit
 *  - Same VLE ID + PSA auto-gen
 * No business logic changes — pure UI rewrite.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  addDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wallet,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Receipt,
  ExternalLink,
  IdCard,
  Download,
  Copy,
  Sparkles,
  Search,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { PAN_SERVICES, type PanService } from "@/lib/pan-services";
import type { PanMasterConfig, PanTransaction } from "@/lib/pan-types";
import { atomicDebit, atomicCredit } from "@/lib/firebase-transactions";
import { executePanService } from "@/lib/pan.functions";
import { downloadPanReceipt } from "@/lib/pan-receipt-pdf";
import { generateVleId } from "@/lib/pan-vle-id";
import { maybeGeneratePsaId } from "@/lib/psa-auto-id";

export const Route = createFileRoute("/retailer/pan-v2")({
  ssr: false,
  component: PanPortalV2,
});

function PanPortalV2() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [config, setConfig] = useState<PanMasterConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [transactions, setTransactions] = useState<PanTransaction[]>([]);
  const [active, setActive] = useState<(PanService & { fee: number }) | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });
    return unsub;
  }, [appUser]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "pan_config", "master"), (snap) => {
      setConfig(snap.exists() ? (snap.data() as PanMasterConfig) : null);
      setConfigLoaded(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(
      query(
        collection(db, "pan_transactions"),
        where("retailerId", "==", appUser.uid),
        orderBy("createdAt", "desc"),
      ),
      (snap) => {
        const list: PanTransaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as PanTransaction) }));
        setTransactions(list.slice(0, 30));
      },
    );
    return unsub;
  }, [appUser]);

  const services = useMemo(() => {
    const disabled = new Set(config?.disabledServices ?? []);
    return PAN_SERVICES.map((s) => ({
      ...s,
      disabled: disabled.has(s.key),
      fee: config?.feeOverrides?.[s.key] ?? s.defaultFee,
    }));
  }, [config]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [services, search]);

  const ready = !!(config?.apiKeyCipher && config.urls);
  const vleId = useMemo(
    () => generateVleId(appUser?.uid, appUser?.phone),
    [appUser?.uid, appUser?.phone],
  );

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayTxns = transactions.filter(
      (t) => new Date(t.createdAt).toDateString() === today,
    );
    const success = transactions.filter((t) => t.status === "success").length;
    const total = transactions.reduce((s, t) => s + (t.totalDebited || 0), 0);
    return {
      todayCount: todayTxns.length,
      successCount: success,
      totalSpend: total,
    };
  }, [transactions]);

  return (
    <div className="space-y-6 pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-premium-gradient p-8 text-white shadow-premium">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest backdrop-blur">
              <Sparkles className="h-3 w-3" /> PAN Portal · v2
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              File any PAN
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-pink-200 to-white bg-clip-text text-transparent">
                in under a minute.
              </span>
            </h1>
            <p className="mt-3 max-w-md text-sm text-white/80 md:text-base">
              NSDL · UTI · PSA · Coupons — one premium dashboard, instant eKYC, real-time wallet.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(vleId).then(
                  () => toast.success(`VLE ID copied: ${vleId}`),
                  () => toast.error("Could not copy VLE ID"),
                );
              }}
              className="group min-w-[200px] rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-left backdrop-blur-md transition hover:bg-white/20 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-white/70">
                <IdCard className="h-3.5 w-3.5" /> Your VLE ID
                <Copy className="ml-auto h-3 w-3 opacity-50 transition group-hover:opacity-100" />
              </div>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wider">{vleId}</p>
            </button>
            <div className="min-w-[180px] rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-white/70">
                <Wallet className="h-3.5 w-3.5" /> Wallet
              </div>
              <p className="mt-1 text-2xl font-bold">₹{balance.toFixed(2)}</p>
              <Link
                to="/retailer/wallet"
                className="mt-1 inline-flex items-center gap-1 text-xs text-white/80 hover:text-white"
              >
                Add money <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile
          icon={TrendingUp}
          label="Today"
          value={String(stats.todayCount)}
          tone="from-blue-500 to-indigo-600"
        />
        <StatTile
          icon={CheckCircle2}
          label="Success"
          value={String(stats.successCount)}
          tone="from-emerald-500 to-teal-600"
        />
        <StatTile
          icon={Receipt}
          label="Lifetime spend"
          value={`₹${stats.totalSpend.toFixed(0)}`}
          tone="from-fuchsia-500 to-pink-600"
        />
      </div>

      {configLoaded && !ready && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Service configuration pending
              </p>
              <p className="mt-1 text-amber-800/90 dark:text-amber-300/90">
                The admin needs to configure the PAN API credentials before you can submit.
                You can browse the catalog below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Service catalog */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">PAN services</h2>
            <p className="text-sm text-muted-foreground">
              Pick a service to start. All requests use your wallet.
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((svc) => {
            const Icon = svc.icon;
            return (
              <button
                key={svc.key}
                disabled={svc.disabled}
                onClick={() => setActive(svc)}
                className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 text-left shadow-sm transition-all ${
                  svc.disabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:-translate-y-1 hover:border-primary/40 hover:shadow-premium active:scale-[0.98]"
                }`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br opacity-10 transition-opacity group-hover:opacity-20 ${svc.gradient}`}
                  aria-hidden
                />
                <div
                  className={`relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${svc.gradient}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="relative text-base font-bold leading-tight text-foreground">
                  {svc.name}
                </h3>
                <p className="relative mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {svc.description}
                </p>
                <div className="relative mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Fee
                  </span>
                  <span className="text-base font-bold text-primary">
                    {svc.fee === 0 ? "Free" : `₹${svc.fee}`}
                  </span>
                </div>
                {svc.disabled && (
                  <Badge variant="secondary" className="absolute right-3 top-3 text-[10px]">
                    Disabled
                  </Badge>
                )}
                {svc.expectsRedirect && !svc.disabled && (
                  <ShieldCheck className="absolute right-3 top-3 h-4 w-4 text-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent transactions */}
      <section className="rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Recent activity</h2>
          </div>
          <Link
            to="/retailer/transactions"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="divide-y divide-border/60">
          {transactions.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No PAN transactions yet. Pick a service above to get started.
            </div>
          ) : (
            transactions.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {tx.serviceName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleString()}
                    {tx.providerRef && <> · {tx.providerRef}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums">
                    ₹{tx.totalDebited}
                  </span>
                  <PanStatusPill status={tx.status} />
                  {tx.status === "success" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 px-2"
                      onClick={() => {
                        try {
                          downloadPanReceipt(tx);
                        } catch (err) {
                          console.error("[PAN receipt]", err);
                          toast.error("Failed to generate receipt");
                        }
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <PanExecutionDialog
        service={active}
        onClose={() => setActive(null)}
        config={config}
        balance={balance}
        retailerId={appUser?.uid ?? ""}
        retailerEmail={appUser?.email ?? ""}
        retailerName={appUser?.name ?? null}
        retailerPhone={appUser?.phone ?? null}
        vleId={vleId}
        ready={ready}
      />
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div
        className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-15 ${tone}`}
        aria-hidden
      />
      <div
        className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${tone}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function PanStatusPill({ status }: { status: PanTransaction["status"] }) {
  const map = {
    pending: { tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock, label: "Pending" },
    processing: { tone: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", icon: Loader2, label: "Processing" },
    success: { tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2, label: "Success" },
    failed: { tone: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300", icon: XCircle, label: "Failed" },
    refunded: { tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: AlertTriangle, label: "Refunded" },
  } as const;
  const { tone, icon: Icon, label } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      <Icon className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}

function PanExecutionDialog({
  service,
  onClose,
  config,
  balance,
  retailerId,
  retailerEmail,
  retailerName,
  retailerPhone,
  vleId,
  ready,
}: {
  service: (PanService & { fee: number }) | null;
  onClose: () => void;
  config: PanMasterConfig | null;
  balance: number;
  retailerId: string;
  retailerEmail: string;
  retailerName: string | null;
  retailerPhone: string | null;
  vleId: string;
  ready: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (service) {
      const init: Record<string, string> = {};
      for (const f of service.fields) {
        if (f.defaultValue) init[f.key] = f.defaultValue;
        if (f.key === "vle_id") init[f.key] = vleId;
      }
      setValues(init);
    } else {
      setValues({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.key, vleId]);

  if (!service) return null;

  const fee = service.fee;
  const insufficient = fee > 0 && fee > balance;

  const submit = async () => {
    if (!ready || !config) {
      toast.error("PAN portal not configured. Contact admin.");
      return;
    }
    for (const f of service.fields) {
      if (f.required && !values[f.key]) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    if (insufficient) {
      toast.error("Insufficient wallet balance");
      return;
    }

    setSubmitting(true);
    let txDocId: string | null = null;
    try {
      if (fee > 0) {
        await atomicDebit(retailerId, fee, {
          source: "pan-portal",
          description: `${service.name} (fee)`,
          serviceKey: service.key,
        });
      }
      const txRef = await addDoc(collection(db, "pan_transactions"), {
        retailerId,
        retailerEmail,
        serviceKey: service.key,
        serviceName: service.name,
        fields: values,
        amount: 0,
        fee,
        totalDebited: fee,
        status: "processing",
        createdAt: new Date().toISOString(),
      } satisfies Omit<PanTransaction, "id">);
      txDocId = txRef.id;

      const cfgSnap = await getDoc(doc(db, "pan_config", "master"));
      const cfg = cfgSnap.data() as PanMasterConfig | undefined;
      if (!cfg?.apiKeyCipher || !cfg.urls?.[service.endpoint]) {
        throw new Error(`Endpoint not configured: ${service.endpoint}`);
      }

      const pOrderId = service.expectsRedirect
        ? `EISP${Date.now()}${Math.floor(Math.random() * 1000)}`
        : undefined;
      const redirectUrl = service.expectsRedirect
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/nsdl-callback?tx=${txDocId}`
        : undefined;

      const result = await executePanService({
        data: {
          serviceKey: service.key,
          serviceName: service.name,
          endpoint: service.endpoint,
          method: service.method,
          url: cfg.urls[service.endpoint],
          apiKeyCipher: cfg.apiKeyCipher,
          fields: values,
          extras: service.extras,
          expectsRedirect: !!service.expectsRedirect,
          pOrderId,
          redirectUrl,
        },
      });

      if (result.success) {
        await updateDoc(doc(db, "pan_transactions", txRef.id), {
          status: result.redirectUrl ? "pending" : "success",
          providerRef: result.providerRef,
          providerResponse: result.rawJson,
          ...(pOrderId ? { pOrderId } : {}),
          completedAt: new Date().toISOString(),
        });
        if (result.redirectUrl) {
          toast.success("Opening NSDL eKYC in new tab…");
          window.open(result.redirectUrl, "_blank", "noopener,noreferrer");
        } else {
          toast.success(`${service.name} successful · ${result.message}`);
        }

        if (service.key === "coupon-buy" && !result.redirectUrl) {
          try {
            const psa = await maybeGeneratePsaId({
              uid: retailerId,
              email: retailerEmail,
              name: retailerName,
              phone: retailerPhone,
            });
            if (psa.generated && psa.record) {
              toast.success(
                `🎉 PSA ID ${psa.record.psaId} generated successfully.`,
                { duration: 8000 },
              );
            }
          } catch (psaErr) {
            console.error("[PSA auto-gen]", psaErr);
          }
        }
        onClose();
      } else {
        if (fee > 0) {
          await atomicCredit(retailerId, fee, {
            source: "pan-portal-refund",
            description: `Refund: ${service.name} failed`,
            serviceKey: service.key,
          });
        }
        await updateDoc(doc(db, "pan_transactions", txRef.id), {
          status: "refunded",
          errorMessage: result.error,
          completedAt: new Date().toISOString(),
        });
        toast.error(`Failed: ${result.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      if (txDocId) {
        try {
          if (fee > 0) {
            await atomicCredit(retailerId, fee, {
              source: "pan-portal-refund",
              description: `Refund: ${service.name} error`,
              serviceKey: service.key,
            });
          }
          await updateDoc(doc(db, "pan_transactions", txDocId), {
            status: "refunded",
            errorMessage: msg,
            completedAt: new Date().toISOString(),
          });
        } catch {
          /* ignore */
        }
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = service.icon;
  return (
    <Dialog open={!!service} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className={`mb-2 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${service.gradient}`}>
            <Icon className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl">{service.name}</DialogTitle>
          <DialogDescription>{service.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {service.fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide">
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </Label>
              {f.type === "select" ? (
                <Select
                  value={values[f.key] ?? ""}
                  onValueChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.key === "vle_id" ? (
                <Input
                  type="text"
                  value={vleId}
                  readOnly
                  className="bg-muted/40 font-mono tracking-wider"
                />
              ) : (
                <Input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              )}
              {f.key === "vle_id" ? (
                <p className="text-[11px] text-muted-foreground">
                  Auto-generated and locked to your account.
                </p>
              ) : (
                f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>
              )}
            </div>
          ))}

          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 to-muted/20 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Convenience fee</span>
              <span className="font-semibold tabular-nums">₹{fee.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
              <span className="font-bold">Total debit</span>
              <span className={`text-lg font-bold tabular-nums ${insufficient ? "text-destructive" : "text-primary"}`}>
                ₹{fee.toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Wallet balance: ₹{balance.toFixed(2)}
            </p>
            {service.expectsRedirect && (
              <p className="mt-2 flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                <ExternalLink className="h-3 w-3" />
                NSDL eKYC will open in a new tab for Aadhaar verification.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || insufficient || !ready}
            className="bg-premium-gradient text-white shadow-premium hover:opacity-95"
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
            ) : (
              <>Submit · ₹{fee}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

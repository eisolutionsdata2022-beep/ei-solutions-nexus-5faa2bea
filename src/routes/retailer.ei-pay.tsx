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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, Receipt, Download, CreditCard, ExternalLink, Globe, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { ServicePageShell } from "@/components/ServicePageShell";
import { CSC_SERVICES, type CscService } from "@/lib/csc-services";
import type { CscMasterConfig, CscTransaction } from "@/lib/csc-types";
import { atomicDebit, atomicCredit } from "@/lib/firebase-transactions";
import { executeCscService, resolveCscSsoUrl } from "@/lib/csc-bridge.functions";
import { downloadCscReceipt } from "@/lib/csc-receipt-pdf";

export const Route = createFileRoute("/retailer/ei-pay")({
  ssr: false,
  component: EiPayPage,
});

function EiPayPage() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [config, setConfig] = useState<CscMasterConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [transactions, setTransactions] = useState<CscTransaction[]>([]);
  const [active, setActive] = useState<(CscService & { fee: number }) | null>(null);

  // Wallet
  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });
    return unsub;
  }, [appUser]);

  // Master config (read once + listen)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "csc_config", "master"), (snap) => {
      setConfig(snap.exists() ? (snap.data() as CscMasterConfig) : null);
      setConfigLoaded(true);
    });
    return unsub;
  }, []);

  // Transactions
  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(
      query(
        collection(db, "csc_transactions"),
        where("retailerId", "==", appUser.uid),
        orderBy("createdAt", "desc"),
      ),
      (snap) => {
        const list: CscTransaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as CscTransaction) }));
        setTransactions(list.slice(0, 25));
      },
    );
    return unsub;
  }, [appUser]);

  const services = useMemo(() => {
    const disabled = new Set(config?.disabledServices ?? []);
    const modeOv = config?.modeOverrides ?? {};
    return CSC_SERVICES.map((s) => ({
      ...s,
      mode: modeOv[s.key] ?? s.mode,
      disabled: disabled.has(s.key),
      fee: config?.feeOverrides?.[s.key] ?? s.defaultFee,
    }));
  }, [config]);

  const bridgeReady = !!(config?.cipher && (config as any)?.bridgeUrl && (config as any)?.hmacSecret);

  const [resolvingKey, setResolvingKey] = useState<string | null>(null);

  const handlePaidRedirect = async (svc: CscService & { fee: number; disabled?: boolean }) => {
    if (!appUser) return;
    if (svc.disabled) return;
    const fee = svc.fee;
    const cfg = config as (CscMasterConfig & { bridgeUrl?: string; hmacSecret?: string }) | null;
    const canAutoSso = !!(cfg?.cipher && cfg?.bridgeUrl && cfg?.hmacSecret);

    if (fee > 0 && balance < fee) {
      toast.error(`Insufficient balance. Need ₹${fee}, have ₹${balance.toFixed(2)}`);
      return;
    }
    const ok = window.confirm(
      fee > 0
        ? `Collect ₹${fee} from the customer for ${svc.name}.\n\n₹${fee} will be debited from your wallet and the Tax2win portal will open ${canAutoSso ? "automatically logged in" : "(you may need to log in)"}.\n\nProceed?`
        : `Open ${svc.name} now?`,
    );
    if (!ok) return;

    // Pre-open a tab synchronously (required so the popup blocker allows it
    // — async work happens after the user click).
    const newTab = window.open("about:blank", "_blank", "noopener,noreferrer");

    try {
      // 1. Resolve auto-login URL via VPS bridge (if configured).
      let finalUrl: string = svc.cscUrl ?? "https://digitalseva.csc.gov.in/";
      if (canAutoSso) {
        setResolvingKey(svc.key);
        const r = await resolveCscSsoUrl({
          data: {
            serviceKey: svc.key,
            targetUrl: finalUrl,
            credCipher: cfg!.cipher,
            bridgeUrl: cfg!.bridgeUrl!,
            hmacSecret: cfg!.hmacSecret!,
          },
        });
        if (r.success) {
          finalUrl = r.ssoUrl;
        } else {
          toast.warning(`Auto-login failed: ${r.error}. Opening normal portal — you'll need to log in.`);
        }
      } else {
        toast.message("Auto-login not configured. Opening CSC portal — log in manually.");
      }

      // 2. Debit wallet (only after we know we have a URL to send them to).
      if (fee > 0) {
        await atomicDebit(appUser.uid, fee, {
          source: "ei-pay",
          description: `${svc.name} (Tax2win customer fee)`,
          serviceKey: svc.key,
        });
        await addDoc(collection(db, "csc_transactions"), {
          retailerId: appUser.uid,
          retailerEmail: appUser.email ?? "",
          serviceKey: svc.key,
          serviceName: svc.name,
          fields: {},
          amount: fee,
          fee: 0,
          totalDebited: fee,
          status: "success",
          bridgeRef: `T2W${Date.now()}`,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        } satisfies Omit<CscTransaction, "id">);
        toast.success(`₹${fee} debited · Opening Tax2win portal…`);
      }

      // 3. Navigate the pre-opened tab.
      if (newTab) {
        newTab.location.href = finalUrl;
      } else {
        window.open(finalUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      toast.error(msg);
      if (newTab) newTab.close();
    } finally {
      setResolvingKey(null);
    }
  };

  return (
    <ServicePageShell
      icon={CreditCard}
      title="EI Solutions Pay"
      subtitle="All Common Service Center (CSC) services in one secure dashboard."
      eyebrow="CSC Bridge"
      gradient="from-cyan-600 via-sky-600 to-blue-700"
      stats={[
        { icon: CheckCircle2, label: "Auto-Pay", value: services.filter((s) => s.mode === "bridge" && !s.disabled).length, accent: "from-cyan-400 to-sky-400" },
        { icon: ScrollText, label: "Tax2win", value: services.filter((s) => s.mode === "paid-redirect" && !s.disabled).length, accent: "from-emerald-400 to-green-500" },
        { icon: Globe, label: "CSC Portal", value: services.filter((s) => s.mode === "redirect" && !s.disabled).length, accent: "from-violet-400 to-fuchsia-400" },
        { icon: Receipt, label: "Transactions", value: transactions.length, accent: "from-emerald-400 to-teal-400" },
      ]}
    >

      {/* Bridge readiness banner */}
      {configLoaded && !bridgeReady && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Service temporarily unavailable
              </p>
              <p className="mt-1 text-amber-800 dark:text-amber-300/90">
                Admin needs to configure CSC master credentials and the secure bridge before
                services can be executed. You can browse the catalog below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bridge services (auto-pay) */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-bold text-foreground">⚡ Auto-Pay Services</h2>
          <Badge variant="secondary" className="text-[10px]">No PIN required</Badge>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Paid directly from your EI Solutions wallet. Receipt generated instantly.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {services.filter((s) => s.mode === "bridge").map((svc) => {
            const Icon = svc.icon;
            return (
              <button
                key={svc.key}
                disabled={svc.disabled}
                onClick={() => setActive(svc)}
                className={`group relative overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-sm transition-all ${
                  svc.disabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                }`}
              >
                <div
                  className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${svc.gradient} text-white shadow`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold leading-tight text-foreground">{svc.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {svc.description}
                </p>
                <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                  Fee ₹{svc.fee}
                </p>
                {svc.disabled && (
                  <Badge variant="secondary" className="absolute right-2 top-2 text-[10px]">
                    Disabled
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>


      {/* Tax2win paid-redirect services */}
      {services.some((s) => s.mode === "paid-redirect") && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">📋 Tax2win Services</h2>
            <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-700">Customer fee debited</Badge>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Collect customer fee → wallet debited → Tax2win CSC portal opens in new tab to complete the application.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {services.filter((s) => s.mode === "paid-redirect").map((svc) => {
              const Icon = svc.icon;
              return (
                <button
                  key={svc.key}
                  disabled={svc.disabled || resolvingKey === svc.key}
                  onClick={() => handlePaidRedirect(svc)}
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-sm transition-all ${
                    svc.disabled
                      ? "cursor-not-allowed opacity-50"
                      : "hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                  }`}
                >
                  <div
                    className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${svc.gradient} text-white shadow`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold leading-tight text-foreground">{svc.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {svc.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">₹{svc.fee}</span>
                    <span className="flex items-center gap-1 text-[10px] text-primary">
                      {resolvingKey === svc.key ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> Logging in…</>
                      ) : (
                        <><ExternalLink className="h-3 w-3" /> Open</>
                      )}
                    </span>
                  </div>
                  {svc.disabled && (
                    <Badge variant="secondary" className="absolute right-2 top-2 text-[10px]">
                      Disabled
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}


      {services.some((s) => s.mode === "redirect") && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">🌐 CSC Portal Services</h2>
            <Badge variant="secondary" className="text-[10px]">PIN required · Opens new tab</Badge>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Opens the official CSC portal in a new tab. Enter your CSC Wallet PIN there. No EI Solutions wallet debit.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {services.filter((s) => s.mode === "redirect").map((svc) => {
              const Icon = svc.icon;
              const url = svc.cscUrl || "https://digitalseva.csc.gov.in/";
              return (
                <a
                  key={svc.key}
                  href={svc.disabled ? undefined : url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (svc.disabled) {
                      e.preventDefault();
                      return;
                    }
                    toast.success(`Opening ${svc.name} on CSC portal…`);
                  }}
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-sm transition-all ${
                    svc.disabled
                      ? "pointer-events-none cursor-not-allowed opacity-50"
                      : "hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                  }`}
                >
                  <div
                    className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${svc.gradient} text-white shadow`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold leading-tight text-foreground">{svc.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {svc.description}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary">
                    <ExternalLink className="h-3 w-3" /> Open CSC portal
                  </div>
                  {svc.disabled && (
                    <Badge variant="secondary" className="absolute right-2 top-2 text-[10px]">
                      Disabled
                    </Badge>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" /> Recent Transactions
          </CardTitle>
          <Link to="/retailer/transactions" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No CSC transactions yet.
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {tx.serviceName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString()} ·{" "}
                      {tx.bridgeRef || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">₹{tx.amount}</span>
                    <StatusBadge status={tx.status} />
                    {tx.status === "success" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => downloadCscReceipt(tx)}
                        title="Download receipt"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution dialog */}
      <ServiceExecutionDialog
        service={active}
        onClose={() => setActive(null)}
        config={config}
        balance={balance}
        retailerId={appUser?.uid ?? ""}
        retailerEmail={appUser?.email ?? ""}
        bridgeReady={bridgeReady}
      />
    </ServicePageShell>
  );
}

function StatusBadge({ status }: { status: CscTransaction["status"] }) {
  const map = {
    pending: { v: "secondary", icon: Clock, label: "Pending" },
    processing: { v: "secondary", icon: Loader2, label: "Processing" },
    success: { v: "default", icon: CheckCircle2, label: "Success" },
    failed: { v: "destructive", icon: XCircle, label: "Failed" },
    refunded: { v: "outline", icon: AlertTriangle, label: "Refunded" },
  } as const;
  const { v, icon: Icon, label } = map[status];
  return (
    <Badge variant={v as any} className="gap-1 text-[10px]">
      <Icon className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`} />
      {label}
    </Badge>
  );
}

function ServiceExecutionDialog({
  service,
  onClose,
  config,
  balance,
  retailerId,
  retailerEmail,
  bridgeReady,
}: {
  service: (CscService & { fee: number }) | null;
  onClose: () => void;
  config: CscMasterConfig | null;
  balance: number;
  retailerId: string;
  retailerEmail: string;
  bridgeReady: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setValues({});
  }, [service?.key]);

  if (!service) return null;

  const amount = Number(values.amount || 0);
  const fee = service.fee;
  const total = amount + fee;
  const insufficient = amount > 0 && total > balance;

  const submit = async () => {
    if (!bridgeReady || !config) {
      toast.error("Service not configured. Contact admin.");
      return;
    }
    // Field validation
    for (const f of service.fields) {
      if (f.required && !values[f.key]) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    if (amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (insufficient) {
      toast.error("Insufficient wallet balance");
      return;
    }

    setSubmitting(true);
    let txDocId: string | null = null;
    try {
      // 1. Create transaction record (processing) — NO wallet debit yet.
      //    Wallet is only charged AFTER the CSC bridge confirms success.
      const txRef = await addDoc(collection(db, "csc_transactions"), {
        retailerId,
        retailerEmail,
        serviceKey: service.key,
        serviceName: service.name,
        fields: values,
        amount,
        fee,
        totalDebited: 0,
        status: "processing",
        createdAt: new Date().toISOString(),
      } satisfies Omit<CscTransaction, "id">);
      txDocId = txRef.id;

      // 2. Re-read config to get latest cipher/url/secret (admin may have updated)
      const cfgSnap = await getDoc(doc(db, "csc_config", "master"));
      const cfg = cfgSnap.data() as (CscMasterConfig & { bridgeUrl: string; hmacSecret: string }) | undefined;
      if (!cfg?.cipher || !cfg.bridgeUrl || !cfg.hmacSecret) {
        throw new Error("Bridge configuration missing");
      }

      // 3. Call bridge — login + submit on CSC portal.
      const result = await executeCscService({
        data: {
          serviceKey: service.key,
          serviceName: service.name,
          fields: values,
          amount,
          credCipher: cfg.cipher,
          bridgeUrl: cfg.bridgeUrl,
          hmacSecret: cfg.hmacSecret,
        },
      });

      if (result.success) {
        // 4. ONLY debit wallet now that CSC submission is confirmed complete.
        try {
          await atomicDebit(retailerId, total, {
            source: "ei-pay",
            description: `${service.name} (incl. ₹${fee} fee)`,
            serviceKey: service.key,
            bridgeRef: result.bridgeRef,
          });
        } catch (debitErr: unknown) {
          // Submission succeeded on CSC but wallet couldn't be charged
          // (e.g. balance dropped between check and debit). Mark for admin review.
          const dmsg = debitErr instanceof Error ? debitErr.message : "Debit failed";
          await updateDoc(doc(db, "csc_transactions", txRef.id), {
            status: "success",
            bridgeRef: result.bridgeRef,
            errorMessage: `Submitted on CSC but wallet debit failed: ${dmsg}`,
            completedAt: new Date().toISOString(),
          });
          toast.error(`Submitted on CSC but wallet debit failed: ${dmsg}. Contact admin.`);
          return;
        }

        await updateDoc(doc(db, "csc_transactions", txRef.id), {
          status: "success",
          bridgeRef: result.bridgeRef,
          totalDebited: total,
          completedAt: new Date().toISOString(),
        });
        toast.success(`${service.name} successful · ₹${total} debited · Ref ${result.bridgeRef}`);
        onClose();
      } else {
        // Failed on bridge — no debit happened, just mark failed. No refund needed.
        await updateDoc(doc(db, "csc_transactions", txRef.id), {
          status: "failed",
          errorMessage: result.error,
          completedAt: new Date().toISOString(),
        });
        toast.error(`Failed: ${result.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      if (txDocId) {
        try {
          await updateDoc(doc(db, "csc_transactions", txDocId), {
            status: "failed",
            errorMessage: msg,
            completedAt: new Date().toISOString(),
          });
        } catch {
          /* swallow */
        }
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!service} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <service.icon className="h-5 w-5" />
            {service.name}
          </DialogTitle>
          <DialogDescription>{service.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {service.fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>
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
              ) : (
                <Input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ""}
                  onChange={(e) =>
                    setValues((s) => ({ ...s, [f.key]: e.target.value }))
                  }
                />
              )}
              {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
            </div>
          ))}

          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bill amount</span>
              <span>₹{amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Convenience fee</span>
              <span>₹{fee.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold">
              <span>Total debit</span>
              <span className={insufficient ? "text-destructive" : ""}>
                ₹{total.toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Wallet balance: ₹{balance.toFixed(2)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || insufficient || !bridgeReady}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
              </>
            ) : (
              `Pay ₹${total.toFixed(2)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

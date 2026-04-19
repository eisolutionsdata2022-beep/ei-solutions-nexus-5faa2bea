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
} from "lucide-react";
import { toast } from "sonner";
import { PAN_SERVICES, type PanService } from "@/lib/pan-services";
import type { PanMasterConfig, PanTransaction } from "@/lib/pan-types";
import { atomicDebit, atomicCredit } from "@/lib/firebase-transactions";
import { executePanService } from "@/lib/pan.functions";
import { downloadPanReceipt } from "@/lib/pan-receipt-pdf";
import { generateVleId } from "@/lib/pan-vle-id";

export const Route = createFileRoute("/retailer/pan-portal")({
  ssr: false,
  component: PanPortalPage,
});

function PanPortalPage() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [config, setConfig] = useState<PanMasterConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [transactions, setTransactions] = useState<PanTransaction[]>([]);
  const [active, setActive] = useState<(PanService & { fee: number }) | null>(null);

  // Wallet
  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });
    return unsub;
  }, [appUser]);

  // Master config
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "pan_config", "master"), (snap) => {
      setConfig(snap.exists() ? (snap.data() as PanMasterConfig) : null);
      setConfigLoaded(true);
    });
    return unsub;
  }, []);

  // Transactions
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
        setTransactions(list.slice(0, 25));
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

  const ready = !!(config?.apiKeyCipher && config.urls);
  const vleId = useMemo(() => generateVleId(appUser?.uid), [appUser?.uid]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-700 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              EI SOLUTIONS
            </p>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <IdCard className="h-7 w-7" /> PAN PORTAL
            </h1>
            <p className="mt-1 text-sm text-white/80">
              EI SOLUTIONS PAN Services — NSDL · UTI · PSA · Coupons in one dashboard.
            </p>
          </div>
          <div className="rounded-xl bg-white/15 px-5 py-3 backdrop-blur">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/70">
              <Wallet className="h-4 w-4" /> Wallet
            </div>
            <p className="mt-1 text-2xl font-bold">₹{balance.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {configLoaded && !ready && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Service temporarily unavailable
              </p>
              <p className="mt-1 text-amber-800 dark:text-amber-300/90">
                The EI SOLUTIONS admin needs to configure the PAN service credentials and endpoint
                URLs before services can be executed. You can browse the catalog below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-lg font-bold text-foreground">PAN Services</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {services.map((svc) => {
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

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" /> Recent PAN Transactions
          </CardTitle>
          <Link to="/retailer/transactions" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No PAN transactions yet.
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
                      {new Date(tx.createdAt).toLocaleString()} · {tx.providerRef || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">₹{tx.totalDebited}</span>
                    <PanStatusBadge status={tx.status} />
                    {tx.status === "success" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => {
                          try {
                            downloadPanReceipt(tx);
                          } catch (err) {
                            console.error("[PAN receipt]", err);
                            toast.error("Failed to generate receipt");
                          }
                        }}
                      >
                        <Download className="h-3 w-3" />
                        Receipt
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PanExecutionDialog
        service={active}
        onClose={() => setActive(null)}
        config={config}
        balance={balance}
        retailerId={appUser?.uid ?? ""}
        retailerEmail={appUser?.email ?? ""}
        vleId={vleId}
        ready={ready}
      />
    </div>
  );
}

function PanStatusBadge({ status }: { status: PanTransaction["status"] }) {
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

function PanExecutionDialog({
  service,
  onClose,
  config,
  balance,
  retailerId,
  retailerEmail,
  vleId,
  ready,
}: {
  service: (PanService & { fee: number }) | null;
  onClose: () => void;
  config: PanMasterConfig | null;
  balance: number;
  retailerId: string;
  retailerEmail: string;
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
        // Auto-fill the user's stable VLE ID into any field keyed `vle_id`.
        if (f.key === "vle_id") init[f.key] = vleId;
      }
      setValues(init);
    } else {
      setValues({});
    }
  }, [service?.key, vleId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!service) return null;

  const fee = service.fee;
  const total = fee; // PAN services bill only the convenience fee from wallet
  const insufficient = total > 0 && total > balance;

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
      // 1. Debit fee from wallet (only if fee > 0)
      if (fee > 0) {
        await atomicDebit(retailerId, fee, {
          source: "pan-portal",
          description: `${service.name} (fee)`,
          serviceKey: service.key,
        });
      }

      // 2. Create tx record
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

      // 3. Re-read latest config (admin may have updated URLs / API key)
      const cfgSnap = await getDoc(doc(db, "pan_config", "master"));
      const cfg = cfgSnap.data() as PanMasterConfig | undefined;
      if (!cfg?.apiKeyCipher || !cfg.urls?.[service.endpoint]) {
        throw new Error(`Endpoint not configured: ${service.endpoint}`);
      }

      // 4. Build NSDL p_order_id + redirect URL when needed
      const pOrderId = service.expectsRedirect
        ? `EISP${Date.now()}${Math.floor(Math.random() * 1000)}`
        : undefined;
      const redirectUrl = service.expectsRedirect
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/nsdl-callback?tx=${txDocId}`
        : undefined;

      // 5. Call upstream via server fn
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
              {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
            </div>
          ))}

          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
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
            {service.expectsRedirect && (
              <p className="mt-2 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                <ExternalLink className="h-3 w-3" />
                NSDL eKYC will open in a new tab to complete Aadhaar verification.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || insufficient || !ready}>
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
            ) : (
              "Submit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * INSURANCE PORTAL v2 — Premium SaaS frontend.
 * Backend reuse:
 *  - Same server fn: callInsuranceApi (BusyWorld upstream, kept untouched)
 *  - Same wallet: atomicDebit / atomicCredit
 *  - Logs every attempt to Firestore: insurance_transactions
 * Pure UI rewrite — no business logic changes.
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Shield,
  Search,
  ArrowUpRight,
  TrendingUp,
  Heart,
  Car,
  Home,
  Plane,
  Briefcase,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { atomicDebit, atomicCredit } from "@/lib/firebase-transactions";
import { callInsuranceApi } from "@/lib/busyworld-insurance-api.functions";

export const Route = createFileRoute("/retailer/insurance-v2")({
  ssr: false,
  component: InsuranceV2,
});

type InsuranceCategory = {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  /** Operator ID passed to BusyWorld upstream. */
  operatorId: string;
  /** Suggested premium hint. */
  premiumHint: string;
};

const INSURANCE_CATEGORIES: InsuranceCategory[] = [
  {
    key: "health",
    name: "Health Insurance",
    description: "Hospitalisation cover for self & family",
    icon: Heart,
    gradient: "from-rose-500 to-pink-600",
    operatorId: "1",
    premiumHint: "from ₹500/mo",
  },
  {
    key: "motor",
    name: "Motor Insurance",
    description: "Two-wheeler, car, commercial vehicle",
    icon: Car,
    gradient: "from-blue-500 to-indigo-600",
    operatorId: "2",
    premiumHint: "from ₹800/yr",
  },
  {
    key: "life",
    name: "Life Insurance",
    description: "Term plans & ULIPs",
    icon: Shield,
    gradient: "from-emerald-500 to-teal-600",
    operatorId: "3",
    premiumHint: "from ₹300/mo",
  },
  {
    key: "home",
    name: "Home Insurance",
    description: "Structure, contents, theft cover",
    icon: Home,
    gradient: "from-amber-500 to-orange-600",
    operatorId: "4",
    premiumHint: "from ₹150/mo",
  },
  {
    key: "travel",
    name: "Travel Insurance",
    description: "Domestic & international trips",
    icon: Plane,
    gradient: "from-cyan-500 to-blue-600",
    operatorId: "5",
    premiumHint: "from ₹99/trip",
  },
  {
    key: "business",
    name: "Business Insurance",
    description: "Shop, fire, liability, group cover",
    icon: Briefcase,
    gradient: "from-violet-500 to-purple-600",
    operatorId: "6",
    premiumHint: "Custom quote",
  },
];

interface InsuranceTxn {
  id?: string;
  retailerId: string;
  retailerEmail: string;
  category: string;
  categoryName: string;
  operatorId: string;
  subscriberId: string;
  customerName: string;
  customerMobile: string;
  amount: number;
  status: "processing" | "success" | "pending" | "failed" | "refunded";
  providerRef?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

function InsuranceV2() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<InsuranceTxn[]>([]);
  const [active, setActive] = useState<InsuranceCategory | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });
    return unsub;
  }, [appUser]);

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(
      query(
        collection(db, "insurance_transactions"),
        where("retailerId", "==", appUser.uid),
        orderBy("createdAt", "desc"),
      ),
      (snap) => {
        const list: InsuranceTxn[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as InsuranceTxn) }));
        setTransactions(list.slice(0, 30));
      },
      () => {
        // Index missing — silent
      },
    );
    return unsub;
  }, [appUser]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return INSURANCE_CATEGORIES;
    return INSURANCE_CATEGORIES.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [search]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCount = transactions.filter(
      (t) => new Date(t.createdAt).toDateString() === today,
    ).length;
    const success = transactions.filter((t) => t.status === "success").length;
    const totalPremium = transactions
      .filter((t) => t.status === "success")
      .reduce((s, t) => s + (t.amount || 0), 0);
    return { todayCount, success, totalPremium };
  }, [transactions]);

  return (
    <div className="space-y-6 pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 text-white shadow-premium">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest backdrop-blur">
              <Shield className="h-3 w-3" /> Insurance · v2
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Protect what matters,
              <br />
              <span className="bg-gradient-to-r from-yellow-200 via-amber-100 to-white bg-clip-text text-transparent">
                in seconds.
              </span>
            </h1>
            <p className="mt-3 max-w-md text-sm text-white/85 md:text-base">
              Health, Motor, Life, Home, Travel — pay premiums directly from your wallet with
              instant policy issuance.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[200px] rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-white/70">
                <Wallet className="h-3.5 w-3.5" /> Wallet
              </div>
              <p className="mt-1 text-2xl font-bold">₹{balance.toFixed(2)}</p>
              <Link
                to="/retailer/wallet"
                className="mt-1 inline-flex items-center gap-1 text-xs text-white/85 hover:text-white"
              >
                Add money <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="min-w-[180px] rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-white/70">
                <Sparkles className="h-3.5 w-3.5" /> Lifetime premiums
              </div>
              <p className="mt-1 text-2xl font-bold">₹{stats.totalPremium.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile icon={TrendingUp} label="Today" value={String(stats.todayCount)} tone="from-blue-500 to-indigo-600" />
        <StatTile icon={CheckCircle2} label="Policies issued" value={String(stats.success)} tone="from-emerald-500 to-teal-600" />
        <StatTile icon={Receipt} label="Premiums paid" value={`₹${stats.totalPremium.toFixed(0)}`} tone="from-fuchsia-500 to-pink-600" />
      </div>

      {/* Catalog */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Insurance categories</h2>
            <p className="text-sm text-muted-foreground">
              Pick a category to capture customer details and pay the premium.
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => setActive(cat)}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-premium active:scale-[0.98]"
              >
                <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br opacity-10 transition-opacity group-hover:opacity-20 ${cat.gradient}`} />
                <div className={`relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${cat.gradient}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="relative text-base font-bold leading-tight text-foreground">
                  {cat.name}
                </h3>
                <p className="relative mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {cat.description}
                </p>
                <div className="relative mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Starting
                  </span>
                  <span className="text-sm font-bold text-primary">{cat.premiumHint}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Activity */}
      <section className="rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Recent policies</h2>
          </div>
          <Link to="/retailer/transactions" className="text-xs font-semibold text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-border/60">
          {transactions.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No insurance transactions yet. Pick a category above to get started.
            </div>
          ) : (
            transactions.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {tx.categoryName} · {tx.customerName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleString()} · {tx.subscriberId}
                    {tx.providerRef && <> · ref {tx.providerRef}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums">₹{tx.amount}</span>
                  <InsuranceStatusPill status={tx.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <InsuranceDialog
        category={active}
        onClose={() => setActive(null)}
        balance={balance}
        retailerId={appUser?.uid ?? ""}
        retailerEmail={appUser?.email ?? ""}
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
  icon: LucideIcon;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-15 ${tone}`} />
      <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function InsuranceStatusPill({ status }: { status: InsuranceTxn["status"] }) {
  const map = {
    processing: { tone: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", icon: Loader2, label: "Processing" },
    pending: { tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock, label: "Pending" },
    success: { tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2, label: "Issued" },
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

function InsuranceDialog({
  category,
  onClose,
  balance,
  retailerId,
  retailerEmail,
}: {
  category: InsuranceCategory | null;
  onClose: () => void;
  balance: number;
  retailerId: string;
  retailerEmail: string;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [subscriberId, setSubscriberId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setCustomerName("");
      setCustomerMobile("");
      setSubscriberId("");
      setAmount("");
    }
  }, [category?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!category) return null;

  const numAmount = Number(amount) || 0;
  const insufficient = numAmount > balance;
  const Icon = category.icon;

  const submit = async () => {
    if (!customerName.trim()) return toast.error("Customer name is required");
    if (!/^[6-9]\d{9}$/.test(customerMobile)) return toast.error("Enter a valid 10-digit mobile");
    if (!subscriberId.trim()) return toast.error("Policy/Subscriber ID is required");
    if (numAmount < 10) return toast.error("Premium must be at least ₹10");
    if (insufficient) return toast.error("Insufficient wallet balance");

    setSubmitting(true);
    let txDocId: string | null = null;
    try {
      // 1. Debit
      await atomicDebit(retailerId, numAmount, {
        source: "insurance-portal",
        description: `${category.name} premium for ${customerName}`,
        serviceKey: `insurance-${category.key}`,
      });

      // 2. Log txn
      const txRef = await addDoc(collection(db, "insurance_transactions"), {
        retailerId,
        retailerEmail,
        category: category.key,
        categoryName: category.name,
        operatorId: category.operatorId,
        subscriberId: subscriberId.trim(),
        customerName: customerName.trim(),
        customerMobile,
        amount: numAmount,
        status: "processing",
        createdAt: new Date().toISOString(),
      } satisfies Omit<InsuranceTxn, "id">);
      txDocId = txRef.id;

      // 3. Call upstream
      const result = await callInsuranceApi({
        data: {
          action: "balance_deduct",
          operatorId: category.operatorId,
          subscriberId: subscriberId.trim(),
          amount: numAmount,
          transactionId: txRef.id,
        },
      });

      if (result.success && result.status === "success") {
        await updateDoc(doc(db, "insurance_transactions", txRef.id), {
          status: "success",
          providerRef: result.transactionId ?? null,
          completedAt: new Date().toISOString(),
        });
        toast.success(`Policy issued · ${result.message}`);
        onClose();
      } else if (result.success && result.status === "pending") {
        await updateDoc(doc(db, "insurance_transactions", txRef.id), {
          status: "pending",
          providerRef: result.transactionId ?? null,
        });
        toast.message("Policy is pending — we'll update once confirmed.");
        onClose();
      } else {
        // Refund
        await atomicCredit(retailerId, numAmount, {
          source: "insurance-portal-refund",
          description: `Refund: ${category.name} failed`,
          serviceKey: `insurance-${category.key}`,
        });
        await updateDoc(doc(db, "insurance_transactions", txRef.id), {
          status: "refunded",
          errorMessage: result.message,
          completedAt: new Date().toISOString(),
        });
        toast.error(`Failed: ${result.message}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      if (txDocId) {
        try {
          await atomicCredit(retailerId, numAmount, {
            source: "insurance-portal-refund",
            description: `Refund: ${category.name} error`,
            serviceKey: `insurance-${category.key}`,
          });
          await updateDoc(doc(db, "insurance_transactions", txDocId), {
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

  return (
    <Dialog open={!!category} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className={`mb-2 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${category.gradient}`}>
            <Icon className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl">{category.name}</DialogTitle>
          <DialogDescription>{category.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide">
              Customer name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="As per ID proof"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide">
              Mobile <span className="text-destructive">*</span>
            </Label>
            <Input
              type="tel"
              maxLength={10}
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ""))}
              placeholder="10-digit mobile"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide">
              Policy / Subscriber ID <span className="text-destructive">*</span>
            </Label>
            <Input
              value={subscriberId}
              onChange={(e) => setSubscriberId(e.target.value)}
              placeholder="Vehicle number, policy no, etc."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide">
              Premium amount (₹) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={10}
              max={100000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
            />
          </div>

          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 to-muted/20 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Premium</span>
              <span className="font-semibold tabular-nums">₹{numAmount.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
              <span className="font-bold">Total debit</span>
              <span className={`text-lg font-bold tabular-nums ${insufficient ? "text-destructive" : "text-primary"}`}>
                ₹{numAmount.toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Wallet balance: ₹{balance.toFixed(2)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || insufficient || numAmount < 10}
            className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-premium hover:opacity-95"
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
            ) : (
              <>Pay premium · ₹{numAmount || 0}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

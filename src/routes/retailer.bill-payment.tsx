import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Banknote, Loader2, Search, Receipt, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { ServicePageShell } from "@/components/ServicePageShell";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceSectionCard } from "@/components/ServicePageShell";
import {
  Zap, Droplets, Flame, Smartphone, Tv, Car, Shield, GraduationCap,
  CreditCard, Building2, Wifi, Home, Landmark, Wallet, FileText, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  bbpsGetCategories,
  bbpsGetBillers,
  bbpsGetCustomerParams,
  bbpsFetchBill,
  bbpsPayBill,
} from "@/lib/bbps-api.functions";
import type {
  BbpsCategory,
  BbpsBiller,
  BbpsCustomerParam,
  BbpsBillFetchResult,
} from "@/lib/bbps-types";
import { downloadBbpsReceipt } from "@/lib/bbps-receipt-pdf";

export const Route = createFileRoute("/retailer/bill-payment")({
  ssr: false,
  component: BillPaymentPage,
});

type Step = "category" | "biller" | "params" | "confirm" | "success";

function BillPaymentPage() {
  const { appUser } = useAuth();
  const [step, setStep] = useState<Step>("category");

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<BbpsCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<BbpsCategory | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const [billers, setBillers] = useState<BbpsBiller[]>([]);
  const [billerQuery, setBillerQuery] = useState("");
  const [selectedBiller, setSelectedBiller] = useState<BbpsBiller | null>(null);

  const [params, setParams] = useState<BbpsCustomerParam[]>([]);
  const [billerMode, setBillerMode] = useState<number | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const [bill, setBill] = useState<BbpsBillFetchResult | null>(null);
  const [mobileNo, setMobileNo] = useState("");
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<{
    receipt: string | number;
    txId: string;
    amount: number;
    fee: number;
    totalDebited: number;
    mock?: boolean;
  } | null>(null);

  // Load categories on mount
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    bbpsGetCategories()
      .then((res) => {
        console.log("[BBPS] categories response:", res);
        if (!res.success) {
          setLoadError(res.message ?? "Failed to load categories");
          toast.error(res.message ?? "Failed to load categories");
          return;
        }

        // Runtime validation: ensure response is well-formed and contains Water + Electricity.
        if (!Array.isArray(res.categories)) {
          const msg = "Malformed categories response from provider (not an array).";
          console.error("[BBPS][validate]", msg, res);
          setLoadError(msg);
          toast.error(msg);
          return;
        }

        const malformed = res.categories.filter(
          (c) => !c || typeof c.id === "undefined" || typeof c.name !== "string" || !c.name.trim(),
        );
        if (malformed.length > 0) {
          const msg = `Malformed category entries received (${malformed.length}). Check provider response.`;
          console.error("[BBPS][validate]", msg, malformed);
          toast.error(msg);
        }

        const names = res.categories.map((c) => c.name);
        const hasWater = names.some((n) => /water/i.test(n));
        const hasElectricity = names.some((n) => /electric/i.test(n));
        console.log("[BBPS][debug] category count:", res.categories.length, "names:", names);
        console.log("[BBPS][debug] Water present:", hasWater, "| Electricity present:", hasElectricity);

        const gatedKeys = ["disabled", "enabled", "active", "status", "isActive", "blocked"];
        res.categories.forEach((c) => {
          const flags: Record<string, unknown> = {};
          for (const k of gatedKeys) {
            if (k in (c as unknown as Record<string, unknown>)) {
              flags[k] = (c as unknown as Record<string, unknown>)[k];
            }
          }
          if (Object.keys(flags).length > 0) {
            console.log(`[BBPS][debug] category "${c.name}" carries gating flags:`, flags);
          }
        });

        const missing: string[] = [];
        if (!hasWater) missing.push("Water");
        if (!hasElectricity) missing.push("Electricity");
        if (missing.length > 0) {
          const msg = `Missing categories from provider: ${missing.join(", ")}. Tiles cannot render.`;
          console.warn("[BBPS][validate]", msg);
          setLoadError(msg);
          toast.error(msg, {
            description: "Provider response did not include these categories. Contact admin to refresh BBPS provider config.",
            duration: 8000,
          });
        } else {
          console.log("[BBPS][debug] ✅ Water & Electricity will render as enabled (no client-side gating applied).");
        }

        setCategories(res.categories);
        if (res.mock) setDemoMode(true);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Network error";
        setLoadError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  // Bharat Connect official MOGO sonic identity — plays on every B Assured success screen.
  useEffect(() => {
    if (step !== "success") return;
    try {
      const audio = new Audio("/bharat-connect/mogo.mp3");
      audio.volume = 0.85;
      void audio.play().catch(() => {
        /* autoplay blocked — user gesture brought them here, should be allowed */
      });
    } catch {
      /* audio unavailable — ignore */
    }
  }, [step]);

  const filteredBillers = useMemo(() => {
    const q = billerQuery.trim().toLowerCase();
    if (!q) return billers;
    return billers.filter((b) => b.name.toLowerCase().includes(q));
  }, [billers, billerQuery]);

  async function pickCategory(cat: BbpsCategory) {
    setSelectedCategory(cat);
    setLoading(true);
    const res = await bbpsGetBillers({ data: { category: cat.name } });
    setLoading(false);
    if (!res.success) {
      toast.error(res.message ?? "Failed to load billers");
      return;
    }
    setBillers(res.billers);
    setStep("biller");
  }

  async function pickBiller(b: BbpsBiller) {
    setSelectedBiller(b);
    setLoading(true);
    const res = await bbpsGetCustomerParams({ data: { billerId: b.id } });
    setLoading(false);
    if (!res.success) {
      toast.error(res.message ?? "Failed to load biller form");
      return;
    }
    setParams(res.params);
    setBillerMode(res.mode);
    setParamValues({});
    setStep("params");
  }

  async function fetchBill() {
    const names = params.map((p) => p.name);
    const values = names.map((n) => paramValues[n] ?? "");
    for (let i = 0; i < params.length; i++) {
      const p = params[i];
      if (p.isMandatory && !values[i]) {
        toast.error(`${p.name} is required`);
        return;
      }
    }
    if (!selectedBiller) return;
    setLoading(true);
    const res = await bbpsFetchBill({
      data: { billerId: selectedBiller.id, paramNames: names, paramValues: values },
    });
    setLoading(false);
    if (!res.success || !res.bill) {
      toast.error(res.message ?? "Could not fetch bill");
      return;
    }
    setBill(res.bill);
    setStep("confirm");
  }

  async function pay() {
    if (!bill || !selectedBiller || !selectedCategory) return;
    setPaying(true);
    const res = await bbpsPayBill({
      data: {
        billerId: selectedBiller.id,
        billerName: selectedBiller.name,
        categoryName: selectedCategory.name,
        billPaymentId: bill.insertid,
        requestId: bill.requestId,
        billerMode: billerMode ?? 1,
        mobileNo: mobileNo || undefined,
        amount: bill.amount,
        params: paramValues,
        customerName: bill.custname,
        billDate: bill.billDate,
        dueDate: bill.dueDate,
        billNumber: bill.billNumber,
      },
    });
    setPaying(false);
    if (!res.success) {
      toast.error(res.message ?? "Payment failed");
      return;
    }
    setReceipt({
      receipt: res.receipt ?? "",
      txId: res.transactionId ?? "",
      amount: bill.amount,
      fee: res.fee ?? 0,
      totalDebited: res.totalDebited ?? bill.amount,
      mock: res.mock,
    });
    setStep("success");
  }

  function reset() {
    setStep("category");
    setSelectedCategory(null);
    setSelectedBiller(null);
    setBillers([]);
    setParams([]);
    setParamValues({});
    setBill(null);
    setReceipt(null);
    setMobileNo("");
  }

  return (
    <ServicePageShell
      icon={Banknote}
      title="Bill Payment"
      subtitle="Powered by Bharat Connect — Electricity, Water, Gas, Mobile, DTH, FASTag, Insurance & more."
      eyebrow="Bharat Connect • B Assured"
      gradient="from-indigo-700 via-blue-600 to-cyan-500"
    >
      <div className="space-y-5">
        {/* Bharat Connect brand strip */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-r from-white via-blue-50/40 to-cyan-50/40 dark:from-slate-900 dark:via-blue-950/30 dark:to-cyan-950/30 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <img
              src="/bharat-connect/bharat-connect-primary.svg"
              alt="Bharat Connect"
              className="h-9 w-auto"
            />
            <div className="hidden sm:block h-8 w-px bg-border/70" />
            <div className="hidden sm:block leading-tight">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">NPCI Bharat BillPay</div>
              <div className="text-xs text-foreground/80">26+ categories • 20,000+ billers</div>
            </div>
          </div>
          <Badge
            variant={demoMode ? "destructive" : "secondary"}
            className={demoMode ? "" : "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"}
          >
            {demoMode ? "DEMO MODE" : "LIVE • UAT"}
          </Badge>
        </div>

        {demoMode && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-xs text-foreground">
            <div className="font-semibold text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> Bharat Connect Demo Mode
            </div>
            <div className="mt-1.5 text-muted-foreground leading-relaxed">
              Provider credentials not yet configured. All categories, billers, bills and
              receipts shown are <strong className="text-foreground">simulated test data</strong>.
              <strong className="text-foreground"> No wallet will be debited</strong> and no
              real bills will be paid.
            </div>
          </div>
        )}

        {step === "category" && (
          <ServiceSectionCard
            title="Select a Category"
            icon={Receipt}
            accent="from-indigo-500 to-cyan-500"
            right={
              <span className="text-[11px] font-medium text-muted-foreground">
                {categories.length > 0 ? `${categories.length} available` : ""}
              </span>
            }
          >
            {loading && categories.length === 0 ? (
              <Loading label="Loading categories…" />
            ) : categories.length === 0 ? (
              <EmptyState
                message={loadError ? `Provider error: ${loadError}` : "No categories returned by provider."}
                hint={hintForError(loadError)}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {categories.map((cat) => {
                  const meta = getCategoryMeta(cat.name);
                  const Icon = meta.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => pickCategory(cat)}
                      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-3.5 text-left transition-all hover:border-transparent hover:shadow-xl hover:-translate-y-0.5"
                    >
                      <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${meta.gradient} opacity-0 group-hover:opacity-100 blur-md transition-opacity -z-10`} />
                      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white shadow-md mb-2.5`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-[13px] font-semibold text-foreground leading-tight line-clamp-2">
                        {cat.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Tap to continue →</div>
                    </button>
                  );
                })}
              </div>
            )}
          </ServiceSectionCard>
        )}

        {step === "biller" && selectedCategory && (
          <ServiceSectionCard
            title={`${selectedCategory.name} — Choose Biller`}
            icon={Building2}
            accent="from-blue-500 to-cyan-500"
            right={
              <Button variant="ghost" size="sm" onClick={() => setStep("category")} className="h-8 text-xs">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
              </Button>
            }
          >
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search biller…"
                  className="pl-10 h-11 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-indigo-400/40"
                  value={billerQuery}
                  onChange={(e) => setBillerQuery(e.target.value)}
                />
              </div>
              {loading ? (
                <Loading label="Loading billers…" />
              ) : (
                <div className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-1">
                  {filteredBillers.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => pickBiller(b)}
                      className="group flex w-full items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 text-left text-sm transition-all hover:border-indigo-400/60 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 hover:shadow-sm"
                    >
                      <span className="font-medium text-foreground">{b.name}</span>
                      <span className="text-xs text-muted-foreground group-hover:text-indigo-600 transition-colors">→</span>
                    </button>
                  ))}
                  {filteredBillers.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">No billers match.</div>
                  )}
                </div>
              )}
            </div>
          </ServiceSectionCard>
        )}

        {step === "params" && selectedBiller && (
          <ServiceSectionCard
            title={selectedBiller.name}
            icon={FileText}
            accent="from-emerald-500 to-teal-500"
            right={
              <Button variant="ghost" size="sm" onClick={() => setStep("biller")} className="h-8 text-xs">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
              </Button>
            }
          >
            <div className="space-y-4">
              {params.map((p) => (
                <div key={p.name} className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {p.name} {p.isMandatory && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    inputMode={p.type === "NUMERIC" ? "numeric" : "text"}
                    maxLength={p.maxLength ? Number(p.maxLength) : undefined}
                    value={paramValues[p.name] ?? ""}
                    onChange={(e) =>
                      setParamValues((prev) => ({ ...prev, [p.name]: e.target.value }))
                    }
                    className="h-11 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer Mobile (optional)
                </Label>
                <Input
                  inputMode="numeric"
                  maxLength={10}
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile"
                  className="h-11 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                />
              </div>
              <Button
                onClick={fetchBill}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 font-semibold shadow-md"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch Bill →"}
              </Button>
            </div>
          </ServiceSectionCard>
        )}

        {step === "confirm" && bill && selectedBiller && (
          <ServiceSectionCard
            title="Confirm Payment"
            icon={Wallet}
            accent="from-amber-500 to-orange-500"
            right={
              <Button variant="ghost" size="sm" onClick={() => setStep("params")} className="h-8 text-xs">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
              </Button>
            }
          >
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
                <Row label="Biller" value={selectedBiller.name} />
                <Row label="Customer" value={bill.custname || "—"} />
                <Row label="Bill No." value={bill.billNumber || "—"} />
                <Row label="Bill Date" value={bill.billDate || "—"} />
                <Row label="Due Date" value={bill.dueDate || "—"} />
              </div>
              <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/60 dark:border-amber-800/40 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Payable Amount</div>
                <div className="text-3xl font-bold text-foreground mt-1">₹{bill.amount.toFixed(2)}</div>
              </div>
              <Button
                onClick={pay}
                disabled={paying}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-95 font-semibold shadow-md"
              >
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ₹${bill.amount.toFixed(2)}`}
              </Button>
            </div>
          </ServiceSectionCard>
        )}

        {step === "success" && receipt && (
          <Card className="overflow-hidden border-emerald-500/40 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/30 shadow-xl">
            <CardContent className="space-y-5 p-6 text-center">
              <div className="relative mx-auto w-fit">
                <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-2xl animate-pulse" />
                <CheckCircle2 className="relative mx-auto h-16 w-16 text-emerald-600" />
              </div>
              <img
                src="/bharat-connect/b-assured.svg"
                alt="B Assured — Bharat Connect"
                className="mx-auto h-14 w-auto"
              />
              <div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  Payment Successful{receipt.mock ? " (DEMO)" : ""}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Receipt has been generated</div>
              </div>
              {receipt.mock && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-muted-foreground">
                  Simulated transaction — no wallet was debited and no real payment was made.
                </div>
              )}
              <div className="rounded-2xl bg-card border border-border/60 p-4 text-left text-sm space-y-2 shadow-sm">
                <Row label="Receipt" value={String(receipt.receipt)} />
                <Row label="Txn ID" value={receipt.txId.slice(0, 12)} />
                <Row label="Amount" value={`₹${receipt.amount.toFixed(2)}`} />
                <Row label="Service Fee" value={`₹${receipt.fee.toFixed(2)}`} />
                <div className="my-1 border-t border-border/60" />
                <Row label="Total Debited" value={`₹${receipt.totalDebited.toFixed(2)}`} bold />
              </div>
              <div className="flex items-center justify-center gap-2 border-t border-border/40 pt-3">
                <img
                  src="/bharat-connect/b-mnemonic.svg"
                  alt=""
                  className="h-5 w-auto opacity-70"
                />
                <span className="text-xs text-muted-foreground">
                  Powered by Bharat Connect • NPCI Bharat BillPay
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-11 rounded-xl border-2"
                  onClick={() => {
                    if (!bill || !selectedBiller || !selectedCategory) return;
                    downloadBbpsReceipt({
                      transactionId: receipt.txId,
                      receipt: receipt.receipt,
                      retailerEmail: appUser?.email ?? "",
                      categoryName: selectedCategory.name,
                      billerName: selectedBiller.name,
                      customerName: bill.custname,
                      billNumber: bill.billNumber,
                      billDate: bill.billDate,
                      dueDate: bill.dueDate,
                      mobileNo: mobileNo || undefined,
                      params: paramValues,
                      amount: receipt.amount,
                      fee: receipt.fee,
                      totalDebited: receipt.totalDebited,
                      paidAt: new Date().toISOString(),
                    });
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Receipt
                </Button>
                <Button
                  onClick={reset}
                  className="h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 font-semibold shadow-md"
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  New Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ServicePageShell>
  );
}

// ───── Category icon + gradient mapping (matches My Services hub style) ─────
const CATEGORY_META: Array<{ match: RegExp; icon: typeof Zap; gradient: string }> = [
  { match: /electric/i,           icon: Zap,           gradient: "from-yellow-400 via-amber-500 to-orange-500" },
  { match: /water/i,              icon: Droplets,      gradient: "from-cyan-400 via-blue-500 to-indigo-600" },
  { match: /gas|lpg/i,            icon: Flame,         gradient: "from-orange-500 via-red-500 to-rose-600" },
  { match: /mobile|prepaid|postpaid/i, icon: Smartphone, gradient: "from-violet-500 via-fuchsia-500 to-pink-500" },
  { match: /dth|cable/i,          icon: Tv,            gradient: "from-purple-500 via-indigo-500 to-blue-600" },
  { match: /fastag/i,             icon: Car,           gradient: "from-emerald-500 via-teal-500 to-cyan-500" },
  { match: /insurance/i,          icon: Shield,        gradient: "from-blue-500 via-sky-500 to-cyan-500" },
  { match: /loan|emi/i,           icon: Landmark,      gradient: "from-indigo-500 via-blue-600 to-purple-600" },
  { match: /credit\s*card/i,      icon: CreditCard,    gradient: "from-slate-600 via-gray-700 to-zinc-800" },
  { match: /broadband|landline|wifi/i, icon: Wifi,     gradient: "from-cyan-500 via-sky-500 to-blue-600" },
  { match: /education|fees|school/i, icon: GraduationCap, gradient: "from-purple-500 via-violet-500 to-indigo-600" },
  { match: /municipal|tax|housing/i, icon: Home,       gradient: "from-emerald-500 via-green-500 to-lime-500" },
  { match: /subscription|recharge/i, icon: Wallet,     gradient: "from-pink-500 via-rose-500 to-red-500" },
];
const FALLBACK_CAT_META = { icon: Receipt, gradient: "from-slate-500 via-slate-600 to-slate-700" };
function getCategoryMeta(name: string) {
  return CATEGORY_META.find((m) => m.match.test(name)) ?? FALLBACK_CAT_META;
}

function CategoryIcon({ icon, name }: { icon?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const isUrl = !!icon && /^https?:\/\//i.test(icon);
  if (isUrl && !failed) {
    return (
      <img
        src={icon}
        alt={name}
        className="h-8 w-8 rounded object-contain"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  if (icon && !isUrl) return <span className="text-2xl">{icon}</span>;
  return <span className="text-2xl" aria-label={name}>🧾</span>;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold" : ""}>{value}</span>
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center text-sm">
      <AlertCircle className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
      <div className="font-medium">{message}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/**
 * Map a raw provider/bridge error to a human-readable hint.
 * Different errors point to different root causes — show the right next step.
 */
function hintForError(err: string | null): string {
  if (!err) return "Provider responded but with empty data.";
  const lower = err.toLowerCase();
  if (lower.includes("bridge") && lower.includes("403")) {
    return "The bridge itself returned 403 before the provider call completed. Verify the bridge URL, HMAC secret, and any VPS firewall or proxy rules.";
  }
  if (lower.includes("403") || lower.includes("forbidden")) {
    return "Provider returned 403 Forbidden. This usually means IP whitelist is still not active, but it can also be an auth or bridge restriction — run Admin → BBPS Settings → Test Connection to confirm the exact response.";
  }
  if (lower.includes("401") || lower.includes("auth") || lower.includes("unauthor") || lower.includes("invalid token")) {
    return "Provider rejected our credentials (401). Verify BBPS_CLIENT_ID / BBPS_CLIENT_SECRET / BBPS_API_KEY match the values shared by the provider exactly.";
  }
  if (lower.includes("bad signature") || lower.includes("missing signature") || lower.includes("timestamp")) {
    return "Bridge rejected our HMAC signature. The BBPS_BRIDGE_HMAC_SECRET in Lovable Cloud must exactly match HMAC_SECRET in the bridge's .env file.";
  }
  if (lower.includes("timeout") || lower.includes("fetch failed") || lower.includes("network")) {
    return "Bridge or provider did not respond in time. Check that the VPS bridge service is running and BBPS_BRIDGE_BASE_URL is correct.";
  }
  if (lower.includes("permissions")) {
    return "Internal config read was blocked. Hard refresh — this should be resolved by the latest deploy.";
  }
  return "Open the browser console for the full response payload from the bridge.";
}

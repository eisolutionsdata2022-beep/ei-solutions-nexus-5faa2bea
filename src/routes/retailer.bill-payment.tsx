import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Banknote, Loader2, Search, Receipt, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { ServicePageShell } from "@/components/ServicePageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="space-y-4">
        {/* Bharat Connect brand strip — official primary logo */}
        <div className="flex items-center justify-between rounded-lg border bg-card p-3">
          <img
            src="/bharat-connect/bharat-connect-primary.svg"
            alt="Bharat Connect"
            className="h-9 w-auto"
          />
          <Badge variant={demoMode ? "destructive" : "secondary"}>
            {demoMode ? "DEMO MODE" : "UAT"}
          </Badge>
        </div>

        {demoMode && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-foreground">
            <div className="font-semibold text-destructive">⚠️ Bharat Connect Demo Mode</div>
            <div className="mt-1 text-muted-foreground">
              Provider credentials not yet configured. All categories, billers, bills and
              receipts shown are <strong className="text-foreground">simulated test data</strong>.
              <strong className="text-foreground"> No wallet will be debited</strong> and no
              real bills will be paid. Once the provider whitelists our IP and shares
              credentials, this banner will disappear and live BBPS will activate automatically.
            </div>
          </div>
        )}

        {step === "category" && (
          <Card>
            <CardHeader>
              <CardTitle>Select a Category</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && categories.length === 0 ? (
                <Loading label="Loading categories…" />
              ) : categories.length === 0 ? (
                <EmptyState
                  message={loadError ? `Provider error: ${loadError}` : "No categories returned by provider."}
                  hint={hintForError(loadError)}
                />
              ) : (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => pickCategory(cat)}
                      className="flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition hover:border-primary hover:shadow-sm"
                    >
                      <CategoryIcon icon={cat.icon ?? undefined} name={cat.name} />
                      <span className="text-sm font-medium">{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === "biller" && selectedCategory && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedCategory.name} — Choose Biller</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search biller…"
                  className="pl-9"
                  value={billerQuery}
                  onChange={(e) => setBillerQuery(e.target.value)}
                />
              </div>
              {loading ? (
                <Loading label="Loading billers…" />
              ) : (
                <div className="max-h-[60vh] space-y-1 overflow-y-auto">
                  {filteredBillers.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => pickBiller(b)}
                      className="block w-full rounded border bg-card px-3 py-2 text-left text-sm transition hover:border-primary"
                    >
                      {b.name}
                    </button>
                  ))}
                  {filteredBillers.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">No billers match.</div>
                  )}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setStep("category")}>
                ← Back
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "params" && selectedBiller && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedBiller.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {params.map((p) => (
                <div key={p.name} className="space-y-1">
                  <Label>
                    {p.name} {p.isMandatory && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    inputMode={p.type === "NUMERIC" ? "numeric" : "text"}
                    maxLength={p.maxLength ? Number(p.maxLength) : undefined}
                    value={paramValues[p.name] ?? ""}
                    onChange={(e) =>
                      setParamValues((prev) => ({ ...prev, [p.name]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label>Customer Mobile (optional)</Label>
                <Input
                  inputMode="numeric"
                  maxLength={10}
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("biller")}>
                  ← Back
                </Button>
                <Button onClick={fetchBill} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch Bill"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "confirm" && bill && selectedBiller && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Biller" value={selectedBiller.name} />
              <Row label="Customer" value={bill.custname || "—"} />
              <Row label="Bill No." value={bill.billNumber || "—"} />
              <Row label="Bill Date" value={bill.billDate || "—"} />
              <Row label="Due Date" value={bill.dueDate || "—"} />
              <div className="my-2 border-t" />
              <Row label="Amount" value={`₹${bill.amount.toFixed(2)}`} bold />
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("params")}>
                  ← Back
                </Button>
                <Button onClick={pay} disabled={paying} className="flex-1">
                  {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ₹${bill.amount.toFixed(2)}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "success" && receipt && (
          <Card className="border-emerald-500/50 bg-emerald-500/5">
            <CardContent className="space-y-4 p-6 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
              <img
                src="/bharat-connect/b-assured.svg"
                alt="B Assured — Bharat Connect"
                className="mx-auto h-16 w-auto"
              />
              <div className="text-sm font-medium text-emerald-700">
                Payment Successful{receipt.mock ? " (DEMO)" : ""}
              </div>
              {receipt.mock && (
                <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-muted-foreground">
                  This was a simulated transaction — no wallet was debited and no real payment was made.
                </div>
              )}
              <div className="rounded-lg bg-card p-3 text-left text-sm">
                <Row label="Receipt" value={String(receipt.receipt)} />
                <Row label="Txn ID" value={receipt.txId.slice(0, 12)} />
                <Row label="Amount" value={`₹${receipt.amount.toFixed(2)}`} />
                <Row label="Service Fee" value={`₹${receipt.fee.toFixed(2)}`} />
                <Row label="Total Debited" value={`₹${receipt.totalDebited.toFixed(2)}`} bold />
              </div>
              <div className="flex items-center justify-center gap-2 border-t pt-3">
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
                  Download Receipt
                </Button>
                <Button onClick={reset}>
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

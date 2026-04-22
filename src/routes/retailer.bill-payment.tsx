import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Banknote, Loader2, Search, Receipt, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { ServicePageShell } from "@/components/ServicePageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const [billers, setBillers] = useState<BbpsBiller[]>([]);
  const [billerQuery, setBillerQuery] = useState("");
  const [selectedBiller, setSelectedBiller] = useState<BbpsBiller | null>(null);

  const [params, setParams] = useState<BbpsCustomerParam[]>([]);
  const [billerMode, setBillerMode] = useState<number | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const [bill, setBill] = useState<BbpsBillFetchResult | null>(null);
  const [mobileNo, setMobileNo] = useState("");
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<{ receipt: string | number; txId: string } | null>(null);

  // Load categories on mount
  useEffect(() => {
    setLoading(true);
    bbpsGetCategories()
      .then((res) => {
        if (!res.success) {
          toast.error(res.message ?? "Failed to load categories");
          return;
        }
        setCategories(res.categories);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Network error"))
      .finally(() => setLoading(false));
  }, []);

  // Bharat Connect sonic ping when payment succeeds.
  useEffect(() => {
    if (step !== "success") return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
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
    setReceipt({ receipt: res.receipt ?? "", txId: res.transactionId ?? "" });
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
        {/* Bharat Connect brand strip */}
        <div className="flex items-center justify-between rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-indigo-600 to-cyan-500 font-black text-white">
              BC
            </div>
            <div className="text-sm">
              <div className="font-semibold">Bharat Connect</div>
              <div className="text-xs text-muted-foreground">B Assured • NPCI Bharat BillPay</div>
            </div>
          </div>
          <Badge variant="secondary">UAT</Badge>
        </div>

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
                  message="No categories available. UAT credentials may not be configured yet."
                  hint="Add BBPS_CLIENT_ID, BBPS_CLIENT_SECRET, BBPS_AES_KEY in Lovable Cloud Settings."
                />
              ) : (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => pickCategory(cat)}
                      className="flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition hover:border-primary hover:shadow-sm"
                    >
                      <span className="text-2xl">{cat.icon ?? "🧾"}</span>
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
            <CardContent className="space-y-3 p-6 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
              <div className="text-xl font-bold">B Assured</div>
              <div className="text-sm text-muted-foreground">Payment Successful</div>
              <div className="rounded-lg bg-card p-3 text-left text-sm">
                <Row label="Receipt" value={String(receipt.receipt)} />
                <Row label="Txn ID" value={receipt.txId.slice(0, 12)} />
              </div>
              <Button onClick={reset} className="w-full">
                <Receipt className="mr-2 h-4 w-4" />
                New Payment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ServicePageShell>
  );
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

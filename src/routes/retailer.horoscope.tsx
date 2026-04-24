/**
 * Retailer Horoscope — generate Malayalam Vedic horoscope reports.
 * Flow: form → wallet debit → AI generate → save to Firestore → auto-download PDF.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { ServicePageShell, ServiceSectionCard } from "@/components/ServicePageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Sparkles, Download, Loader2, FileText, Eye, Star, Printer } from "lucide-react";
import { toast } from "sonner";

import {
  PRODUCT_LABELS, STATUS_COLORS, NAKSHATRAS, DEFAULT_SETTINGS, RELIGION_LABELS,
  type HoroscopeRequest, type HoroscopeProduct, type Gender, type HoroscopeSettings, type Religion,
} from "@/lib/horoscope-types";
import {
  subscribeHoroscopeSettings, subscribeHoroscopeRequests,
  addHoroscopeRequest, updateHoroscopeRequest, getHoroscopeRequest,
} from "@/lib/horoscope-firebase";
import { atomicDebit } from "@/lib/firebase-transactions";
import { generateHoroscopeReport } from "@/lib/horoscope.functions";
import { downloadHoroscopePdf, openPrintableReport } from "@/lib/horoscope-pdf";

export const Route = createFileRoute("/retailer/horoscope")({
  ssr: false,
  component: RetailerHoroscope,
});

const EMPTY_FORM = {
  customerName: "",
  gender: "Male" as Gender,
  religion: "Hindu" as Religion,
  dateOfBirth: "",
  timeOfBirth: "",
  placeOfBirth: "",
  nakshatram: "",
};

function RetailerHoroscope() {
  const { appUser } = useAuth();
  const generate = useServerFn(generateHoroscopeReport);

  const [settings, setSettings] = useState<HoroscopeSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HoroscopeRequest[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [product, setProduct] = useState<HoroscopeProduct>("standard");
  const [busy, setBusy] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ── live data ──
  useEffect(() => subscribeHoroscopeSettings(setSettings), []);
  useEffect(() => {
    if (!appUser?.uid) return;
    return subscribeHoroscopeRequests(setHistory, appUser.uid);
  }, [appUser?.uid]);

  const fee = product === "premium" ? settings.premiumFee : settings.standardFee;

  const stats = useMemo(() => ([
    { icon: FileText, label: "Total", value: history.length, accent: "from-amber-400 to-orange-400" },
    { icon: Star, label: "This month", value: history.filter(r => {
        const d = new Date(r.createdAt); const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length, accent: "from-emerald-400 to-teal-400" },
    { icon: Sparkles, label: "Premium", value: history.filter(r => r.product === "premium").length, accent: "from-violet-400 to-fuchsia-400" },
  ]), [history]);

  // ── generate ──
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!appUser?.uid) { toast.error("Please sign in."); return; }
    if (!settings.enabled) { toast.error("Horoscope service is currently disabled."); return; }

    if (!form.customerName.trim()) { toast.error("Customer name is required."); return; }
    if (!form.dateOfBirth) { toast.error("Date of birth is required."); return; }
    if (!form.timeOfBirth) { toast.error("Time of birth is required."); return; }
    if (!form.placeOfBirth.trim()) { toast.error("Place of birth is required."); return; }

    setBusy(true);
    let requestId: string | null = null;

    try {
      // 1. Wallet debit (atomic, throws on insufficient balance)
      try {
        await atomicDebit(appUser.uid, fee, {
          source: "horoscope",
          description: `Horoscope (${product}) — ${form.customerName}`,
        });
      } catch (err: any) {
        toast.error(err?.message || "Wallet debit failed.");
        setBusy(false);
        return;
      }

      // 2. Save pending request
      const now = new Date().toISOString();
      const baseReq: Omit<HoroscopeRequest, "id"> = {
        userId: appUser.uid,
        userName: appUser.name || appUser.email || "",
        customerName: form.customerName.trim(),
        gender: form.gender,
        religion: form.religion,
        dateOfBirth: form.dateOfBirth,
        timeOfBirth: form.timeOfBirth,
        placeOfBirth: form.placeOfBirth.trim(),
        nakshatram: form.nakshatram || "",
        product,
        amount: fee,
        status: "Pending",
        createdAt: now,
      };
      requestId = await addHoroscopeRequest(baseReq);

      // 3. Generate AI report
      toast.message("✨ AI പ്രവചനം തയ്യാറാക്കുന്നു...", { description: "Please wait — generating Malayalam horoscope report." });
      const result = await generate({ data: {
        customerName: baseReq.customerName,
        gender: baseReq.gender,
        religion: baseReq.religion,
        dateOfBirth: baseReq.dateOfBirth,
        timeOfBirth: baseReq.timeOfBirth,
        placeOfBirth: baseReq.placeOfBirth,
        nakshatram: baseReq.nakshatram,
        product,
      }});

      if (!result.ok) {
        toast.error(result.error || "AI generation failed. Wallet has been debited — please contact support.");
        return;
      }

      // 4. Save report
      await updateHoroscopeRequest(requestId, {
        status: "Generated",
        report: result.report,
        generatedAt: new Date().toISOString(),
      });

      const final = await getHoroscopeRequest(requestId);
      if (!final) { toast.error("Saved, but could not reload — please use History."); return; }

      toast.success("✅ Report generated! Downloading...");

      // 5. Auto download
      try {
        await downloadHoroscopePdf(final);
        await updateHoroscopeRequest(requestId, { status: "Delivered" });
      } catch (err: any) {
        console.error("PDF download failed:", err);
        toast.error("Download failed — opening printable view instead.");
        openPrintableReport(final);
      }

      setForm(EMPTY_FORM);
    } finally {
      setBusy(false);
    }
  }

  async function handleRedownload(req: HoroscopeRequest) {
    if (!req.report) {
      toast.error("No report available for this request.");
      return;
    }
    setDownloadingId(req.id || "");
    try {
      await downloadHoroscopePdf(req);
      toast.success("Downloaded.");
    } catch (err: any) {
      console.error("Re-download failed:", err);
      toast.error("Download failed — opening printable view.");
      openPrintableReport(req);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <ServicePageShell
      icon={Sparkles}
      title="ജാതക സേവനം"
      subtitle="AI-powered Malayalam horoscope reports — direct PDF download."
      eyebrow="Horoscope"
      gradient="from-amber-600 via-orange-500 to-rose-500"
      stats={stats}
    >
      {settings.notice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2 text-sm text-amber-900 mb-4">
          {settings.notice}
        </div>
      )}

      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="new">പുതിയ ജാതകം</TabsTrigger>
          <TabsTrigger value="history">എന്റെ Reports ({history.length})</TabsTrigger>
        </TabsList>

        {/* ─── New ─── */}
        <TabsContent value="new" className="mt-4">
          <ServiceSectionCard title="വിശദാംശങ്ങൾ നൽകുക" icon={Sparkles}>
            <form onSubmit={handleGenerate} className="space-y-4">
              {/* product chooser */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["standard", "premium"] as HoroscopeProduct[]).map((p) => {
                  const f = p === "premium" ? settings.premiumFee : settings.standardFee;
                  const active = product === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProduct(p)}
                      className={`text-left rounded-xl border p-3 transition ${
                        active
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 ring-2 ring-amber-300"
                          : "border-border hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{PRODUCT_LABELS[p].emoji}</span>
                          <div>
                            <div className="font-bold text-sm">{PRODUCT_LABELS[p].ml}</div>
                            <div className="text-[11px] text-muted-foreground">{PRODUCT_LABELS[p].en}</div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-bold">₹{f}</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>വ്യക്തിയുടെ പേര് *</Label>
                  <Input
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>ലിംഗം *</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as Gender })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male / പുരുഷൻ</SelectItem>
                      <SelectItem value="Female">Female / സ്ത്രീ</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>ജനന തീയതി *</Label>
                  <Input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>ജനന സമയം *</Label>
                  <Input
                    type="time"
                    value={form.timeOfBirth}
                    onChange={(e) => setForm({ ...form, timeOfBirth: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>ജനന സ്ഥലം *</Label>
                  <Input
                    value={form.placeOfBirth}
                    onChange={(e) => setForm({ ...form, placeOfBirth: e.target.value })}
                    placeholder="e.g. Thiruvananthapuram, Kerala"
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>ജന്മ നക്ഷത്രം (Optional)</Label>
                  <Select value={form.nakshatram} onValueChange={(v) => setForm({ ...form, nakshatram: v })}>
                    <SelectTrigger><SelectValue placeholder="നക്ഷത്രം തിരഞ്ഞെടുക്കുക" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {NAKSHATRAS.map((n) => (
                        <SelectItem key={n.id} value={n.ml}>{n.ml} ({n.en})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-3 text-white text-sm flex items-center justify-between">
                <div>
                  <div className="font-bold">{PRODUCT_LABELS[product].ml}</div>
                  <div className="text-xs opacity-90">PDF report — auto download</div>
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-90">Total</div>
                  <div className="text-2xl font-bold">₹{fee}</div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={busy || !settings.enabled}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold h-12"
              >
                {busy
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  : <><Sparkles className="w-4 h-4 mr-2" /> Generate &amp; Download (₹{fee})</>}
              </Button>
            </form>
          </ServiceSectionCard>
        </TabsContent>

        {/* ─── History ─── */}
        <TabsContent value="history" className="mt-4">
          <ServiceSectionCard title="My Generated Reports" icon={FileText}>
            {history.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
                ഇതുവരെ ജാതകം ഒന്നും ഉണ്ടാക്കിയിട്ടില്ല.
              </CardContent></Card>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.customerName}</div>
                          <div className="text-[11px] text-muted-foreground">{r.placeOfBirth}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {PRODUCT_LABELS[r.product]?.emoji} {r.product}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${STATUS_COLORS[r.status]}`} variant="outline">
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm" variant="outline"
                              onClick={() => openPrintableReport(r)}
                              disabled={!r.report}
                              title="Open printable view"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRedownload(r)}
                              disabled={!r.report || downloadingId === r.id}
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              {downloadingId === r.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Download className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1">
              <Printer className="w-3 h-3" /> Tip: If download is blocked on your browser, the eye button opens a printable view — press Print → Save as PDF.
            </p>
          </ServiceSectionCard>
        </TabsContent>
      </Tabs>
    </ServicePageShell>
  );
}
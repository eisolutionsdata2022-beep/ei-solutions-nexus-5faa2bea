import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Download, Star, Sparkles, Hand, Camera, Image as ImageIcon, Loader2, Sun, Eye } from "lucide-react";
import { ServicePageShell } from "@/components/ServicePageShell";
import { generateHoroscope } from "@/lib/horoscope-engine";
import { generatePremiumExtras } from "@/lib/horoscope-premium-engine";
import { generateHoroscopePDF } from "@/lib/horoscope-pdf";
import { generatePremiumHoroscopePDF } from "@/lib/horoscope-premium-pdf";
import { downloadHoroscopePdf } from "@/lib/horoscope-pdf-export";
import { generatePalmistryReading } from "@/lib/palmistry.functions";
import {
  addHoroscopeRequest, subscribeHoroscopeRequests,
  subscribeHoroscopeSettings,
} from "@/lib/horoscope-firebase";
import { atomicDebit, atomicCredit } from "@/lib/firebase-transactions";
import type { HoroscopeRequest, HoroscopeSettings, Gender, HoroscopeProduct, PdfTemplate, HoroscopeLanguage } from "@/lib/horoscope-types";
import { STATUS_COLORS, NAKSHATRAS, PRODUCT_LABELS, getProductPricing } from "@/lib/horoscope-types";

export const Route = createFileRoute("/retailer/horoscope")({
  ssr: false,
  component: RetailerHoroscope,
});

function RetailerHoroscope() {
  const { appUser } = useAuth();
  const [requests, setRequests] = useState<HoroscopeRequest[]>([]);
  const [settings, setSettings] = useState<HoroscopeSettings | null>(null);
  const [product, setProduct] = useState<HoroscopeProduct>("standard");
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplate>("classic");
  const [loading, setLoading] = useState(false);

  // Common form state
  const [customerName, setCustomerName] = useState("");
  const [gender, setGender] = useState<Gender>("Male");
  const [dob, setDob] = useState("");
  const [timeOfBirth, setTimeOfBirth] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [language, setLanguage] = useState<HoroscopeLanguage>("Malayalam");
  const [birthStar, setBirthStar] = useState("");
  const [godImage, setGodImage] = useState<string>("");

  // Palmistry state
  const [leftPalm, setLeftPalm] = useState<string>("");
  const [rightPalm, setRightPalm] = useState<string>("");
  const cameraInputLeft = useRef<HTMLInputElement>(null);
  const cameraInputRight = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!appUser) return;
    const u1 = subscribeHoroscopeRequests((r) => setRequests(r), appUser.uid);
    const u2 = subscribeHoroscopeSettings((s) => setSettings(s));
    return () => { u1(); u2(); };
  }, [appUser]);

  // Auto-pick template
  useEffect(() => {
    setPdfTemplate(product === "standard" ? "classic" : "premium");
  }, [product]);

  const pricing = getProductPricing(settings, product);

  const fileToDataUrl = (file: File, max = 4): Promise<string> => new Promise((res, rej) => {
    if (file.size > max * 1024 * 1024) return rej(new Error(`File must be under ${max}MB`));
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });

  const resetForm = () => {
    setCustomerName(""); setDob(""); setTimeOfBirth(""); setPlaceOfBirth("");
    setBirthStar(""); setGodImage(""); setLeftPalm(""); setRightPalm("");
  };

  const handleSubmit = async () => {
    if (!appUser || !settings) return;
    if (!pricing.enabled) return toast.error(`${PRODUCT_LABELS[product].ml} നിലവിൽ ലഭ്യമല്ല`);
    if (!customerName.trim()) return toast.error("Customer name required");

    if (product !== "palmistry") {
      if (!dob || !timeOfBirth || !placeOfBirth) return toast.error("ജനന വിവരങ്ങൾ പൂരിപ്പിക്കുക");
    } else {
      if (!leftPalm && !rightPalm) return toast.error("കുറഞ്ഞത് ഒരു palm photo upload ചെയ്യുക");
    }

    setLoading(true);
    let debited = false;
    try {
      await atomicDebit(appUser.uid, pricing.price, {
        source: "horoscope",
        description: `${PRODUCT_LABELS[product].en} for ${customerName}`,
      });
      debited = true;

      const base: Omit<HoroscopeRequest, "id"> = {
        userId: appUser.uid,
        userName: appUser.name || appUser.email || "Unknown",
        product,
        pdfTemplate,
        customerName,
        gender,
        language,
        status: "Processing",
        amount: pricing.price,
        godImage: godImage || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (product === "palmistry") {
        toast.info("AI palm reading running... (15-30s)");
        const result = await generatePalmistryReading({
          data: {
            leftPalm: leftPalm || undefined,
            rightPalm: rightPalm || undefined,
            customerName, gender, language,
          },
        });
        if (!result.ok) throw new Error(result.error);
        await addHoroscopeRequest({
          ...base,
          status: "Delivered",
          palmImages: { left: leftPalm || undefined, right: rightPalm || undefined },
          palmistry: { ...result.reading, language },
          deliveredAt: new Date().toISOString(),
        });
      } else {
        const { chart, predictions } = generateHoroscope(dob, timeOfBirth);
        const premiumExtras = product === "premium" ? generatePremiumExtras(chart, dob) : undefined;
        await addHoroscopeRequest({
          ...base,
          status: "Delivered",
          dateOfBirth: dob, timeOfBirth, placeOfBirth,
          birthStar: birthStar || undefined,
          chart, predictions, premiumExtras,
          deliveredAt: new Date().toISOString(),
        });
      }

      toast.success("✨ Report generated! Check 'My Reports' tab.");
      resetForm();
    } catch (err: any) {
      // Refund wallet if we debited but failed to deliver the report.
      if (debited) {
        try {
          await atomicCredit(appUser.uid, pricing.price, {
            source: "horoscope-refund",
            description: `Refund: ${PRODUCT_LABELS[product].en} for ${customerName} (failed)`,
          });
          toast.error(`${err?.message || "Failed"} — ₹${pricing.price} refunded to wallet.`);
        } catch (refundErr: any) {
          console.error("Horoscope refund failed:", refundErr);
          toast.error(`${err?.message || "Failed"} — REFUND FAILED, contact admin.`);
        }
      } else {
        toast.error(err?.message || "Failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const buildHoroscopeHtml = (req: HoroscopeRequest): string => {
    return (req.pdfTemplate === "premium" || req.product !== "standard")
      ? generatePremiumHoroscopePDF(req)
      : generateHoroscopePDF(req);
  };

  const normalizeRequestDate = (value: unknown) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    if (value && typeof value === "object") {
      const maybeTimestamp = value as {
        toDate?: () => Date;
        seconds?: number;
        nanoseconds?: number;
      };
      if (typeof maybeTimestamp.toDate === "function") {
        const parsed = maybeTimestamp.toDate();
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      if (typeof maybeTimestamp.seconds === "number") {
        const parsed = new Date(maybeTimestamp.seconds * 1000);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
    }
    return new Date();
  };

  const safeFileName = (req: HoroscopeRequest) => {
    const name = (req.customerName || "horoscope").replace(/[^a-zA-Z0-9-_]+/g, "_");
    const date = normalizeRequestDate(req.createdAt).toISOString().slice(0, 10);
    return `Horoscope_${name}_${date}.pdf`;
  };

  const handleDownloadPDF = async (req: HoroscopeRequest) => {
    try {
      toast.loading("Generating PDF...", { id: `horoscope-download-${req.id}` });
      const html = buildHoroscopeHtml(req);
      await downloadHoroscopePdf(html, safeFileName(req));
      toast.success("PDF ഡൗൺലോഡ് തുടങ്ങി", { id: `horoscope-download-${req.id}` });
    } catch (err: any) {
      const msg = err?.message || String(err) || "Unknown error";
      console.error("[horoscope] download failed", { id: req.id, error: err });
      toast.error(`Download failed · Report ${req.id}\n${msg}`, {
        id: `horoscope-download-${req.id}`,
        duration: 12000,
        description: "ഈ error message admin-ന് അയക്കുക (Report ID ഉൾപ്പെടെ).",
      });
    }
  };

  // Eye button: open printable HTML in a new tab as ultimate fallback.
  const handlePreviewPDF = (req: HoroscopeRequest) => {
    try {
      const html = buildHoroscopeHtml(req);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        // Popup blocked — fallback to direct download
        toast.info("Popup blocked — downloading instead");
        handleDownloadPDF(req);
        return;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      const msg = err?.message || String(err) || "Unknown error";
      console.error("[horoscope] preview failed", { id: req.id, error: err });
      toast.error(`Preview failed · Report ${req.id}\n${msg}`, {
        duration: 12000,
        description: "ഈ error message admin-ന് അയക്കുക (Report ID ഉൾപ്പെടെ).",
      });
    }
  };

  return (
    <ServicePageShell
      icon={Sun}
      title="ജ്യോതിഷ കേന്ദ്രം · Astrology"
      subtitle="Premium Indian astrology — Standard, Premium & Palmistry reports."
      eyebrow="Horoscope Studio"
      gradient="from-amber-600 via-orange-600 to-red-600"
      headerAction={
        <Badge className="bg-white text-amber-700 hover:bg-white/90 px-3 py-1.5 text-xs font-bold shadow-lg">
          ₹{pricing.price} · {PRODUCT_LABELS[product].ml}
        </Badge>
      }
      stats={[
        { icon: FileText, label: "Reports", value: requests.length, accent: "from-amber-400 to-orange-400" },
        { icon: Star, label: "Active Product", value: PRODUCT_LABELS[product].en, accent: "from-pink-400 to-rose-400" },
      ]}
    >

      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new"><Sparkles className="w-4 h-4 mr-1" /> New Report</TabsTrigger>
          <TabsTrigger value="reports"><FileText className="w-4 h-4 mr-1" /> My Reports ({requests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          {/* product picker */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(["standard", "premium", "palmistry"] as HoroscopeProduct[]).map((p) => {
              const pp = getProductPricing(settings, p);
              const active = product === p;
              return (
                <button key={p} onClick={() => setProduct(p)} disabled={!pp.enabled}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${active ? "border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg scale-[1.02]" : "border-border bg-card hover:border-amber-300"} disabled:opacity-50`}>
                  <div className="text-2xl mb-1">{PRODUCT_LABELS[p].emoji}</div>
                  <div className="font-bold text-foreground">{PRODUCT_LABELS[p].ml}</div>
                  <div className="text-xs text-muted-foreground">{PRODUCT_LABELS[p].en}</div>
                  <div className="mt-2 text-amber-700 font-bold">₹{pp.price}</div>
                  {!pp.enabled && <div className="text-xs text-destructive mt-1">Disabled</div>}
                </button>
              );
            })}
          </div>

          <Card className="border-amber-200">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
              <CardTitle className="flex items-center gap-2">
                {PRODUCT_LABELS[product].emoji} {PRODUCT_LABELS[product].ml} — {PRODUCT_LABELS[product].en}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>പേര് / Name *</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
                <div className="space-y-2"><Label>ലിംഗം *</Label>
                  <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>ഭാഷ / Language</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as HoroscopeLanguage)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Malayalam">മലയാളം</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Hindi">हिन्दी</SelectItem>
                      <SelectItem value="Both">Both ML + EN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {product !== "standard" && (
                  <div className="space-y-2"><Label>PDF Template</Label>
                    <Select value={pdfTemplate} onValueChange={(v) => setPdfTemplate(v as PdfTemplate)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic">Classic (6-8 pages)</SelectItem>
                        <SelectItem value="premium">Premium Cosmic (12+ pages)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {product !== "palmistry" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>ജനന തീയതി *</Label><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
                  <div className="space-y-2"><Label>ജനന സമയം *</Label><Input type="time" value={timeOfBirth} onChange={(e) => setTimeOfBirth(e.target.value)} /></div>
                  <div className="space-y-2"><Label>ജനന സ്ഥലം *</Label><Input value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} placeholder="e.g., Thrissur, Kerala" /></div>
                  <div className="space-y-2"><Label>ജന്മ നക്ഷത്രം</Label>
                    <Select value={birthStar} onValueChange={setBirthStar}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{NAKSHATRAS.map((n) => <SelectItem key={n.id} value={n.ml}>{n.ml} ({n.en})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {product === "palmistry" && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                    <Hand className="w-4 h-4 inline mr-1 text-amber-700" />
                    <strong>Tip:</strong> Spread fingers, good lighting, palm fully visible. AI works best with clear close-up photos.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {([["left", leftPalm, setLeftPalm, cameraInputLeft], ["right", rightPalm, setRightPalm, cameraInputRight]] as const).map(([side, val, setter, ref]) => (
                      <div key={side} className="space-y-2 border-2 border-dashed border-amber-300 rounded-lg p-3">
                        <Label className="capitalize font-bold">{side === "left" ? "🖐️ Left Palm" : "✋ Right Palm"}</Label>
                        {val ? (
                          <div className="relative">
                            <img src={val} alt={side} className="w-full h-40 object-cover rounded" />
                            <button onClick={() => setter("")} className="absolute top-1 right-1 bg-destructive text-white w-6 h-6 rounded-full text-sm">×</button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <label className="flex-1 cursor-pointer bg-card border rounded px-3 py-2 text-sm flex items-center justify-center gap-1 hover:bg-accent">
                              <ImageIcon className="w-4 h-4" /> Upload
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                const f = e.target.files?.[0]; if (!f) return;
                                try { setter(await fileToDataUrl(f)); } catch (err: any) { toast.error(err.message); }
                              }} />
                            </label>
                            <button type="button" onClick={() => ref.current?.click()} className="flex-1 bg-card border rounded px-3 py-2 text-sm flex items-center justify-center gap-1 hover:bg-accent">
                              <Camera className="w-4 h-4" /> Camera
                            </button>
                            <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                              const f = e.target.files?.[0]; if (!f) return;
                              try { setter(await fileToDataUrl(f)); } catch (err: any) { toast.error(err.message); }
                            }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label><ImageIcon className="w-4 h-4 inline mr-1" /> ദൈവ ചിത്രം (Optional)</Label>
                <Input type="file" accept="image/*" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  try { setGodImage(await fileToDataUrl(f, 2)); } catch (err: any) { toast.error(err.message); }
                }} />
                {godImage && <img src={godImage} className="w-16 h-16 rounded-full object-cover border-2 border-amber-500" />}
              </div>

              <Button onClick={handleSubmit} disabled={loading || !pricing.enabled}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-6 text-base shadow-lg">
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</> :
                  <><Star className="w-5 h-5 mr-2" /> Generate {PRODUCT_LABELS[product].en} (₹{pricing.price})</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader><CardTitle>📋 My Reports</CardTitle></CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">ഇതുവരെ റിപ്പോർട്ടുകൾ ഇല്ല</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Customer</TableHead><TableHead>Product</TableHead><TableHead>Date</TableHead>
                    <TableHead>Status</TableHead><TableHead>Amount</TableHead><TableHead>Action</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.customerName}</TableCell>
                        <TableCell><Badge variant="outline">{PRODUCT_LABELS[r.product || "standard"].emoji} {PRODUCT_LABELS[r.product || "standard"].ml}</Badge></TableCell>
                        <TableCell className="text-xs">{normalizeRequestDate(r.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell><Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge></TableCell>
                        <TableCell>₹{r.amount}</TableCell>
                        <TableCell>
                          {(r.status === "Generated" || r.status === "Delivered") && (
                            <div className="flex gap-1.5 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => handlePreviewPDF(r)} title="Preview / Print → Save as PDF">
                                <Eye className="w-4 h-4 mr-1" /> View
                              </Button>
                              <Button size="sm" onClick={() => handleDownloadPDF(r)} title="Download HTML → Open → Save as PDF" className="bg-amber-600 hover:bg-amber-700 text-white">
                                <Download className="w-4 h-4 mr-1" /> PDF
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ServicePageShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Printer, Download, Image as ImageIcon, FileImage, IndianRupee,
  ArrowLeft, Share2, Maximize2, Upload, Palette,
} from "lucide-react";
import { toast } from "sonner";
import JpgToPdfConverter from "@/components/tools/JpgToPdfConverter";
import ServiceBilling from "@/components/tools/ServiceBilling";
import { PosterTemplateGallery } from "@/components/tools/PosterTemplateGallery";
import {
  ALL_POSTER_TEMPLATES, defaultDataForCategory, getCanvasSize,
  type PosterTemplate, type PosterData, type PosterFormat,
} from "@/lib/poster-template-engine";

export const Route = createFileRoute("/retailer/page-tools")({
  ssr: false,
  component: PageToolsPage,
});

function PageToolsPage() {
  return (
    <Tabs defaultValue="poster" className="h-full">
      <TabsList className="mb-4">
        <TabsTrigger value="poster">
          <ImageIcon className="w-4 h-4 mr-1.5" /> Poster Editor
        </TabsTrigger>
        <TabsTrigger value="jpg2pdf">
          <FileImage className="w-4 h-4 mr-1.5" /> JPG to PDF
        </TabsTrigger>
        <TabsTrigger value="billing">
          <IndianRupee className="w-4 h-4 mr-1.5" /> Service Billing
        </TabsTrigger>
      </TabsList>

      <TabsContent value="poster">
        <PosterEditor />
      </TabsContent>

      <TabsContent value="jpg2pdf">
        <JpgToPdfConverter />
      </TabsContent>

      <TabsContent value="billing">
        <ServiceBilling />
      </TabsContent>
    </Tabs>
  );
}

const ACCENT_PRESETS = [
  "#D4AF37", "#FACC15", "#F59E0B", "#EF4444", "#DC2626",
  "#7C2D12", "#138808", "#10B981", "#06B6D4", "#3B82F6",
  "#1E40AF", "#000080", "#7B2CBF", "#000000", "#FFFFFF",
];

// =============================================================================
// POSTER EDITOR
// =============================================================================

function PosterEditor() {
  const [phase, setPhase] = useState<"gallery" | "editor">("gallery");
  const [selected, setSelected] = useState<PosterTemplate | null>(null);
  const [format, setFormat] = useState<PosterFormat>("a4");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Form data
  const [data, setData] = useState<PosterData>({
    cspId: "",
    heading: "ജന സേവന കേന്ദ്രം",
    subHeading: "EI SOLUTIONS — ALL DIGITAL SERVICES",
    tagline: "AUTHORIZED SERVICE PARTNER",
    services: defaultDataForCategory("All Services").services,
    contact: "",
    whatsapp: "",
    location: "",
    logoUrl: null,
    brandName: "EI SOLUTIONS",
  });

  const handlePickTemplate = (t: PosterTemplate) => {
    setSelected(t);
    const def = defaultDataForCategory(t.category);
    setData(d => ({ ...d, subHeading: def.subHeading, services: def.services }));
    setPhase("editor");
  };

  const handleLogoUpload = (file: File | null) => {
    if (!file) { setLogoUrl(null); return; }
    if (file.size > 1.5 * 1024 * 1024) { toast.error("Logo must be under 1.5 MB"); return; }
    const r = new FileReader();
    r.onload = () => setLogoUrl(r.result as string);
    r.readAsDataURL(file);
  };

  if (phase === "gallery") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">🎨 Choose a Poster Template</h2>
            <p className="text-xs text-muted-foreground">
              {ALL_POSTER_TEMPLATES.length} professional templates · 15 service categories · Fully editable
            </p>
          </div>
        </div>
        <PosterTemplateGallery selectedId={selected?.id ?? null} onSelect={handlePickTemplate} />
      </div>
    );
  }

  // Editor phase
  return (
    <PosterEditorPhase
      template={selected!}
      data={{ ...data, logoUrl }}
      setData={setData}
      format={format}
      setFormat={setFormat}
      accentColor={accentColor}
      setAccentColor={setAccentColor}
      logoUrl={logoUrl}
      onLogoUpload={handleLogoUpload}
      onBack={() => setPhase("gallery")}
      fullscreen={fullscreen}
      setFullscreen={setFullscreen}
    />
  );
}

// =============================================================================
// EDITOR PHASE
// =============================================================================

interface EditorProps {
  template: PosterTemplate;
  data: PosterData;
  setData: React.Dispatch<React.SetStateAction<PosterData>>;
  format: PosterFormat;
  setFormat: (f: PosterFormat) => void;
  accentColor: string | null;
  setAccentColor: (c: string | null) => void;
  logoUrl: string | null;
  onLogoUpload: (f: File | null) => void;
  onBack: () => void;
  fullscreen: boolean;
  setFullscreen: (b: boolean) => void;
}

function PosterEditorPhase({
  template, data, setData, format, setFormat, accentColor, setAccentColor,
  logoUrl, onLogoUpload, onBack, fullscreen, setFullscreen,
}: EditorProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const servicesText = data.services.join("\n");

  const html = useMemo(
    () => template.render(data, { accentColor: accentColor || undefined, format }),
    [template, data, accentColor, format],
  );

  const { w, h } = getCanvasSize(format);

  const captureDataUrl = async (type: "png" | "jpeg" = "png"): Promise<string | null> => {
    const el = posterRef.current;
    if (!el) return null;
    const { toPng, toJpeg } = await import("html-to-image");
    const fn = type === "jpeg" ? toJpeg : toPng;
    return fn(el, { pixelRatio: 3, cacheBust: true, width: w, height: h });
  };

  const handleDownloadPDF = async () => {
    try {
      toast.loading("Generating PDF...", { id: "pdf" });
      const imgData = await captureDataUrl("jpeg");
      if (!imgData) return;
      const { default: jsPDF } = await import("jspdf");
      const orientation = format === "story" ? "portrait" : format === "square" ? "portrait" : "portrait";
      const pdf = new jsPDF({ orientation, unit: "px", format: [w, h] });
      pdf.addImage(imgData, "JPEG", 0, 0, w, h);
      pdf.save(`EI-Poster-${template.category.replace(/\s/g, "-")}.pdf`);
      toast.success("PDF downloaded", { id: "pdf" });
    } catch (e) { console.error(e); toast.error("PDF failed", { id: "pdf" }); }
  };

  const handleDownloadImage = async () => {
    try {
      toast.loading("Rendering image...", { id: "img" });
      const imgData = await captureDataUrl("png");
      if (!imgData) return;
      const link = document.createElement("a");
      link.download = `EI-Poster-${template.category.replace(/\s/g, "-")}.png`;
      link.href = imgData;
      link.click();
      toast.success("Image downloaded", { id: "img" });
    } catch (e) { console.error(e); toast.error("Image failed", { id: "img" }); }
  };

  const handleWhatsAppShare = async () => {
    try {
      toast.loading("Preparing share...", { id: "share" });
      const imgData = await captureDataUrl("png");
      if (!imgData) return;
      const blob = await (await fetch(imgData)).blob();
      const file = new File([blob], `poster-${template.category}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: data.heading, text: `${data.subHeading}\n${data.contact}` });
        toast.success("Shared!", { id: "share" });
      } else {
        // Fallback: download + open WhatsApp web
        const link = document.createElement("a");
        link.download = `poster-${template.category}.png`;
        link.href = imgData;
        link.click();
        const text = encodeURIComponent(`${data.heading}\n${data.subHeading}\n📞 ${data.contact}`);
        window.open(`https://wa.me/?text=${text}`, "_blank");
        toast.success("Image saved. Attach in WhatsApp.", { id: "share" });
      }
    } catch (e) { console.error(e); toast.error("Share failed", { id: "share" }); }
  };

  const handlePrint = async () => {
    try {
      const imgData = await captureDataUrl("png");
      if (!imgData) return;
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(`<!DOCTYPE html><html><head><title>Print Poster</title>
        <style>@page{size:A4 portrait;margin:0}body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh}img{width:100%;height:100%;object-fit:contain}</style>
        </head><body><img src="${imgData}" /></body></html>`);
      win.document.close();
      setTimeout(() => { win.print(); win.close(); }, 600);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Templates
          </Button>
          <div>
            <p className="text-sm font-bold leading-tight">{template.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{template.style} · {template.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <FormatToggle format={format} setFormat={setFormat} />
          <Button size="sm" variant="outline" onClick={() => setFullscreen(true)}>
            <Maximize2 className="w-3.5 h-3.5 mr-1" /> Preview
          </Button>
          <Button size="sm" onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-3.5 h-3.5 mr-1" /> PDF
          </Button>
          <Button size="sm" onClick={handleDownloadImage} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <ImageIcon className="w-3.5 h-3.5 mr-1" /> PNG
          </Button>
          <Button size="sm" onClick={handleWhatsAppShare} className="bg-green-500 hover:bg-green-600 text-white">
            <Share2 className="w-3.5 h-3.5 mr-1" /> Share
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left form */}
        <Card className="lg:w-80 shrink-0 max-h-[calc(100vh-220px)] overflow-y-auto">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-xs">CSP ID</Label>
              <Input value={data.cspId} onChange={e => setData(d => ({ ...d, cspId: e.target.value }))} placeholder="CSP12345" />
            </div>
            <div>
              <Label className="text-xs">Heading</Label>
              <Input value={data.heading} onChange={e => setData(d => ({ ...d, heading: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Sub Heading</Label>
              <Input value={data.subHeading} onChange={e => setData(d => ({ ...d, subHeading: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Tagline (small badge)</Label>
              <Input value={data.tagline} onChange={e => setData(d => ({ ...d, tagline: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Brand Name (footer)</Label>
              <Input value={data.brandName} onChange={e => setData(d => ({ ...d, brandName: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Services (one per line, max 8)</Label>
              <Textarea
                rows={7}
                value={servicesText}
                onChange={e => setData(d => ({ ...d, services: e.target.value.split("\n") }))}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">📞 Contact</Label>
              <Input value={data.contact} onChange={e => setData(d => ({ ...d, contact: e.target.value }))} placeholder="9876543210" />
            </div>
            <div>
              <Label className="text-xs">💬 WhatsApp</Label>
              <Input value={data.whatsapp} onChange={e => setData(d => ({ ...d, whatsapp: e.target.value }))} placeholder="9876543210" />
            </div>
            <div>
              <Label className="text-xs">📍 Location</Label>
              <Input value={data.location} onChange={e => setData(d => ({ ...d, location: e.target.value }))} placeholder="Town / Village" />
            </div>

            {/* Logo upload */}
            <div className="pt-2 border-t">
              <Label className="text-xs flex items-center gap-1"><Upload className="w-3 h-3" /> Custom Logo</Label>
              <div className="flex items-center gap-2 mt-1">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="w-10 h-10 object-contain border rounded bg-white" />
                ) : (
                  <div className="w-10 h-10 border rounded bg-muted flex items-center justify-center text-[9px] text-muted-foreground">No logo</div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => onLogoUpload(e.target.files?.[0] ?? null)}
                />
                <Button size="sm" variant="outline" className="text-xs" onClick={() => fileInputRef.current?.click()}>
                  Upload
                </Button>
                {logoUrl && <Button size="sm" variant="ghost" className="text-xs" onClick={() => onLogoUpload(null)}>Remove</Button>}
              </div>
            </div>

            {/* Accent color */}
            <div className="pt-2 border-t">
              <Label className="text-xs flex items-center gap-1"><Palette className="w-3 h-3" /> Accent Color</Label>
              <div className="grid grid-cols-8 gap-1 mt-1">
                <button
                  onClick={() => setAccentColor(null)}
                  title="Default"
                  className={`w-7 h-7 rounded border-2 flex items-center justify-center text-[8px] font-bold ${
                    accentColor === null ? "border-primary ring-2 ring-primary/30" : "border-border"
                  }`}
                  style={{ background: "linear-gradient(135deg,#fff 50%,#000 50%)" }}
                >
                </button>
                {ACCENT_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setAccentColor(c)}
                    title={c}
                    className={`w-7 h-7 rounded border-2 ${
                      accentColor === c ? "border-primary ring-2 ring-primary/30" : "border-border"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right preview */}
        <div className="flex-1 flex items-start justify-center overflow-auto bg-muted/30 rounded-lg p-3 min-h-[400px]">
          <div
            ref={posterRef}
            className="bg-white shadow-2xl"
            style={{ width: w, height: h, transform: w > 600 ? "scale(0.85)" : "scale(1)", transformOrigin: "top center" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      {/* Fullscreen preview */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-auto" onClick={() => setFullscreen(false)}>
          <div
            className="bg-white shadow-2xl"
            style={{ width: w, height: h }}
            dangerouslySetInnerHTML={{ __html: html }}
            onClick={e => e.stopPropagation()}
          />
          <Button
            className="fixed top-4 right-4"
            variant="secondary"
            onClick={() => setFullscreen(false)}
          >
            Close ✕
          </Button>
        </div>
      )}
    </div>
  );
}

function FormatToggle({ format, setFormat }: { format: PosterFormat; setFormat: (f: PosterFormat) => void }) {
  const opts: Array<{ v: PosterFormat; label: string }> = [
    { v: "a4", label: "A4" },
    { v: "story", label: "Story 9:16" },
    { v: "square", label: "Square 1:1" },
  ];
  return (
    <div className="inline-flex rounded-md border bg-background overflow-hidden">
      {opts.map(o => (
        <button
          key={o.v}
          onClick={() => setFormat(o.v)}
          className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            format === o.v ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

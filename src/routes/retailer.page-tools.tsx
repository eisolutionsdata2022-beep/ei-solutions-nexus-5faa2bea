import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Download } from "lucide-react";
import posterBg1 from "@/assets/poster-template.jpeg";
import posterBg2 from "@/assets/poster-template-2.jpeg";
import posterBg3 from "@/assets/poster-template-3.jpeg";
import posterBg4 from "@/assets/poster-template-4.jpeg";

export const Route = createFileRoute("/retailer/page-tools")({
  ssr: false,
  component: PageToolsPage,
});

const TEMPLATES = [
  { id: "1", name: "Classic", src: posterBg1 },
  { id: "2", name: "Green Wave", src: posterBg2 },
  { id: "3", name: "Tricolor", src: posterBg3 },
  { id: "4", name: "Saffron", src: posterBg4 },
];

const DEFAULT_SERVICES = [
  "ആധാർ സേവനങ്ങൾ",
  "പാൻ കാർഡ് സേവനങ്ങൾ",
  "പാസ്പോർട്ട് സേവനങ്ങൾ",
  "ഇൻഷുറൻസ് സേവനങ്ങൾ",
  "സ്കോളർഷിപ്പ് സേവനങ്ങൾ",
  "ട്രെയിൻ / ഫ്ലൈറ്റ് ടിക്കറ്റ് ബുക്കിംഗ്",
  "ബില്ല് പേയ്മെന്റ് സേവനങ്ങൾ",
  "സർട്ടിഫിക്കറ്റ് സേവനങ്ങൾ",
];

function PageToolsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState("1");
  const [cspId, setCspId] = useState("");
  const [heading, setHeading] = useState("ജന സേവന കേന്ദ്രം");
  const [subHeading, setSubHeading] = useState("EI SOLUTIONS JANASEVANA KENDRAM");
  const [servicesText, setServicesText] = useState(DEFAULT_SERVICES.join("\n"));
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState("");
  const posterRef = useRef<HTMLDivElement>(null);

  const services = servicesText.split("\n").filter((s) => s.trim());
  const currentTemplate = TEMPLATES.find((t) => t.id === selectedTemplate)!;

  const handlePrint = () => {
    const el = posterRef.current;
    if (!el) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Poster Print</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; display: flex; justify-content: center; }
        img { width: 100vw; height: 100vh; object-fit: contain; }
      </style></head>
      <body>${el.innerHTML}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleDownloadPDF = async () => {
    const el = posterRef.current;
    if (!el) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
      pdf.save("EI-Solutions-Poster.pdf");
    } catch (e) {
      console.error("PDF generation failed", e);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Sidebar Editor */}
      <Card className="lg:w-80 shrink-0 overflow-y-auto max-h-[calc(100vh-200px)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">📝 Poster Editor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Selector */}
          <div>
            <Label className="mb-2 block">Template തിരഞ്ഞെടുക്കുക</Label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                    selectedTemplate === t.id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <img src={t.src} alt={t.name} className="w-full h-20 object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] py-0.5 text-center">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>CSP ID</Label>
            <Input value={cspId} onChange={(e) => setCspId(e.target.value)} placeholder="CSP ID..." />
          </div>
          <div>
            <Label>Heading</Label>
            <Input value={heading} onChange={(e) => setHeading(e.target.value)} />
          </div>
          <div>
            <Label>Sub Heading</Label>
            <Input value={subHeading} onChange={(e) => setSubHeading(e.target.value)} />
          </div>
          <div>
            <Label>Services (one per line)</Label>
            <Textarea
              rows={8}
              value={servicesText}
              onChange={(e) => setServicesText(e.target.value)}
              className="text-xs"
            />
          </div>
          <div>
            <Label>Contact Number</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone number..." />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location..." />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleDownloadPDF} className="flex-1 bg-gov-blue hover:bg-gov-blue/90">
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Poster Preview */}
      <div className="flex-1 flex items-start justify-center overflow-auto">
        <div
          ref={posterRef}
          className="relative bg-white shadow-xl"
          style={{ width: 595, height: 842, fontFamily: "'Noto Sans Malayalam', sans-serif" }}
        >
          {/* Background template image */}
          <img
            src={currentTemplate.src}
            alt="Poster template"
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
          />

          {/* CSP ID overlay */}
          <div
            className="absolute text-black font-bold"
            style={{ top: "3.2%", left: "14%", fontSize: 13 }}
          >
            {cspId}
          </div>

          {/* Main heading overlay */}
          <div
            className="absolute w-full text-center font-extrabold text-[#1a237e]"
            style={{ top: "23%", left: 0, fontSize: 32, lineHeight: 1.2, textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
          >
            {heading}
          </div>

          {/* Sub heading overlay */}
          <div
            className="absolute w-full text-center font-bold text-[#333]"
            style={{ top: "29.5%", left: 0, fontSize: 14 }}
          >
            {subHeading}
          </div>

          {/* Services list overlay */}
          <div
            className="absolute"
            style={{ top: "37%", left: "10%", width: "55%", fontSize: 12.5, lineHeight: 2.05 }}
          >
            {services.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-green-600 text-sm">✅</span>
                <span className="font-bold text-[#222]">{s}</span>
              </div>
            ))}
          </div>

          {/* Contact overlay */}
          <div
            className="absolute font-bold text-[#222]"
            style={{ top: "86.5%", left: "19%", fontSize: 12 }}
          >
            {contact}
          </div>

          {/* Location overlay */}
          <div
            className="absolute font-bold text-[#222]"
            style={{ top: "89.5%", left: "19%", fontSize: 12 }}
          >
            {location}
          </div>
        </div>
      </div>
    </div>
  );
}

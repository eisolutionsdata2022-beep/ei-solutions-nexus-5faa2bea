import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  X,
  Download,
  Trash2,
  FileImage,
  FilePlus,
  FileText,
  Layers,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: "image" | "pdf";
}

const MAX_FILES = 20;

type ToolMode = "combine" | "jpg" | "png" | "tiff" | "svg";

interface ToolConfig {
  id: ToolMode;
  label: string;
  title: string;
  subtitle: string;
  accept: string;
  acceptTypes: string[];
  icon: React.ReactNode;
  color: string;
}

const TOOLS: ToolConfig[] = [
  {
    id: "combine",
    label: "Combine PDF",
    title: "Combine PDF",
    subtitle: "Multiple PDF, Image files ഒരൊറ്റ PDF ആയി merge ചെയ്യുക",
    accept: ".jpg,.jpeg,.png,.tiff,.tif,.svg,.pdf",
    acceptTypes: ["image/jpeg", "image/png", "image/tiff", "image/svg+xml", "application/pdf"],
    icon: <Layers className="w-4 h-4" />,
    color: "bg-blue-600 hover:bg-blue-700",
  },
  {
    id: "jpg",
    label: "JPG → PDF",
    title: "JPG to PDF Converter",
    subtitle: "JPEG/JPG images PDF ആയി convert ചെയ്യുക — Original quality maintained",
    accept: ".jpg,.jpeg",
    acceptTypes: ["image/jpeg"],
    icon: <ImageIcon className="w-4 h-4" />,
    color: "bg-orange-600 hover:bg-orange-700",
  },
  {
    id: "png",
    label: "PNG → PDF",
    title: "PNG to PDF Converter",
    subtitle: "PNG images transparent background-ഓടെ PDF ആയി convert ചെയ്യുക",
    accept: ".png",
    acceptTypes: ["image/png"],
    icon: <ImageIcon className="w-4 h-4" />,
    color: "bg-green-600 hover:bg-green-700",
  },
  {
    id: "tiff",
    label: "TIFF → PDF",
    title: "TIFF to PDF Converter",
    subtitle: "High-resolution TIFF images PDF format-ലേക്ക് convert ചെയ്യുക",
    accept: ".tiff,.tif",
    acceptTypes: ["image/tiff"],
    icon: <ImageIcon className="w-4 h-4" />,
    color: "bg-purple-600 hover:bg-purple-700",
  },
  {
    id: "svg",
    label: "SVG → PDF",
    title: "SVG to PDF Converter",
    subtitle: "Vector SVG graphics sharp PDF ആയി export ചെയ്യുക",
    accept: ".svg",
    acceptTypes: ["image/svg+xml"],
    icon: <ImageIcon className="w-4 h-4" />,
    color: "bg-rose-600 hover:bg-rose-700",
  },
];

export default function JpgToPdfConverter() {
  const [activeMode, setActiveMode] = useState<ToolMode>("combine");
  const tool = TOOLS.find((t) => t.id === activeMode)!;

  return (
    <div className="space-y-4">
      {/* Tool Selector - Horizontal chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveMode(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              activeMode === t.id
                ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Active Tool */}
      <ConverterPanel key={activeMode} tool={tool} />
    </div>
  );
}

function ConverterPanel({ tool }: { tool: ToolConfig }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [completed, setCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming);
      const filtered = arr.filter((f) => tool.acceptTypes.includes(f.type));
      if (filtered.length < arr.length) {
        const skipped = arr.length - filtered.length;
        toast.warning(`${skipped} file(s) skipped — unsupported format`);
      }
      const remaining = MAX_FILES - files.length;
      if (filtered.length > remaining) {
        toast.warning(`Maximum ${MAX_FILES} files allowed`);
      }
      const toAdd = filtered.slice(0, remaining);

      const newFiles: UploadedFile[] = toAdd.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
        type: f.type === "application/pdf" ? "pdf" : "image",
      }));

      setFiles((prev) => [...prev, ...newFiles]);
      setCompleted(false);
    },
    [files.length, tool.acceptTypes],
  );

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.id !== id);
    });
    setCompleted(false);
  };

  const clearAll = () => {
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setCompleted(false);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const loadImageAsCanvas = (
    file: File,
  ): Promise<{ width: number; height: number; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d")!;
          // White background for transparency
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve({
            width: img.width,
            height: img.height,
            dataUrl: canvas.toDataURL("image/jpeg", 0.95),
          });
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const loadPdfPages = async (
    file: File,
  ): Promise<{ width: number; height: number; dataUrl: string }[]> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: { width: number; height: number; dataUrl: string }[] = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      pages.push({
        width: viewport.width,
        height: viewport.height,
        dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      });
    }

    return pages;
  };

  const addImageToPdf = (
    pdf: any,
    imgData: { width: number; height: number; dataUrl: string },
    pdfW: number,
    pdfH: number,
  ) => {
    const ratio = Math.min(pdfW / imgData.width, pdfH / imgData.height);
    const w = imgData.width * ratio;
    const h = imgData.height * ratio;
    pdf.addImage(imgData.dataUrl, "JPEG", (pdfW - w) / 2, (pdfH - h) / 2, w, h);
  };

  const handleCombinePDF = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(0);
    setCompleted(false);

    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      let firstPage = true;

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgressLabel(`Processing ${i + 1}/${files.length}: ${f.file.name}`);
        setProgress(Math.round(((i + 1) / files.length) * 95));

        if (f.type === "pdf") {
          const pages = await loadPdfPages(f.file);
          for (const pg of pages) {
            if (!firstPage) pdf.addPage();
            firstPage = false;
            addImageToPdf(pdf, pg, pdfW, pdfH);
          }
        } else {
          const imgData = await loadImageAsCanvas(f.file);
          if (!firstPage) pdf.addPage();
          firstPage = false;
          addImageToPdf(pdf, imgData, pdfW, pdfH);
        }
      }

      setProgress(100);
      setProgressLabel("Saving...");
      pdf.save("combined.pdf");
      setCompleted(true);
      toast.success("PDF combined successfully!");
    } catch (e) {
      console.error("Combine PDF failed", e);
      toast.error("PDF generation failed. Please try again.");
    } finally {
      setProcessing(false);
      setProgress(0);
      setProgressLabel("");
    }
  };

  const handleDownloadSeparate = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(0);
    setCompleted(false);

    try {
      const { default: jsPDF } = await import("jspdf");
      let converted = 0;

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgressLabel(`Converting ${i + 1}/${files.length}: ${f.file.name}`);
        setProgress(Math.round(((i + 1) / files.length) * 95));

        if (f.type === "pdf") continue;

        const imgData = await loadImageAsCanvas(f.file);
        const pdf = new jsPDF({ unit: "pt", format: "a4" });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        addImageToPdf(pdf, imgData, pdfW, pdfH);

        const name = f.file.name.replace(/\.[^.]+$/, "");
        pdf.save(`${name}.pdf`);
        converted++;
      }

      setProgress(100);
      setCompleted(true);
      toast.success(`${converted} PDF(s) downloaded!`);
    } catch (e) {
      console.error("Separate PDF failed", e);
      toast.error("Conversion failed. Please try again.");
    } finally {
      setProcessing(false);
      setProgress(0);
      setProgressLabel("");
    }
  };

  const imageCount = files.filter((f) => f.type === "image").length;
  const pdfCount = files.filter((f) => f.type === "pdf").length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <h2 className="text-xl font-bold text-foreground">{tool.title}</h2>
        <p className="text-muted-foreground text-sm">{tool.subtitle}</p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !processing && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 md:p-10 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        } ${processing ? "pointer-events-none opacity-60" : ""}`}
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground">
          ഫയലുകൾ ഇവിടെ Drag & Drop ചെയ്യുക
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          അല്ലെങ്കിൽ click ചെയ്ത് select ചെയ്യുക
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Accepted: <span className="font-medium">{tool.accept}</span> • Max {MAX_FILES} files
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={tool.accept}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Stats & Actions */}
      {files.length > 0 && (
        <div className="space-y-3">
          {/* File Stats */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {files.length} / {MAX_FILES} files
            </Badge>
            {imageCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <ImageIcon className="w-3 h-3 mr-1" /> {imageCount} images
              </Badge>
            )}
            {pdfCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <FileText className="w-3 h-3 mr-1" /> {pdfCount} PDFs
              </Badge>
            )}
            {completed && (
              <Badge className="text-xs bg-green-600 text-white">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Done!
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              onClick={() => inputRef.current?.click()}
              variant="outline"
              size="sm"
              disabled={files.length >= MAX_FILES || processing}
            >
              <FilePlus className="w-4 h-4 mr-1" /> Add More
            </Button>
            <Button onClick={clearAll} variant="outline" size="sm" disabled={processing}>
              <Trash2 className="w-4 h-4 mr-1" /> Clear All
            </Button>
            <Button
              onClick={handleCombinePDF}
              disabled={processing || files.length === 0}
              size="sm"
              className={tool.color + " text-white"}
            >
              <Layers className="w-4 h-4 mr-1" />
              {tool.id === "combine" ? "Combine PDF" : "Combine All → PDF"}
            </Button>
            {files.filter((f) => f.type === "image").length > 0 && (
              <Button
                onClick={handleDownloadSeparate}
                disabled={processing}
                variant="secondary"
                size="sm"
              >
                <Download className="w-4 h-4 mr-1" /> Separate PDFs
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      {processing && (
        <div className="space-y-2 bg-muted/30 rounded-lg p-4">
          <Progress value={progress} className="h-2.5" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate max-w-[70%]">{progressLabel}</span>
            <span className="font-mono font-semibold">{progress}%</span>
          </div>
        </div>
      )}

      {/* File Previews Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {files.map((f, idx) => (
          <Card key={f.id} className="relative group overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-2">
              <div className="aspect-[3/4] rounded-md overflow-hidden bg-muted flex items-center justify-center mb-1.5">
                {f.type === "image" ? (
                  <img
                    src={f.preview}
                    alt={f.file.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <FileText className="w-10 h-10 mb-1" />
                    <span className="text-xs font-semibold">PDF</span>
                  </div>
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-foreground font-medium truncate">
                  {idx + 1}. {f.file.name}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {f.file.size < 1024 * 1024
                    ? `${(f.file.size / 1024).toFixed(0)} KB`
                    : `${(f.file.size / (1024 * 1024)).toFixed(1)} MB`}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(f.id);
                }}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                title="Remove file"
              >
                <X className="w-3 h-3" />
              </button>
              {/* File type badge */}
              <div className="absolute top-1 left-1">
                <span className="text-[8px] bg-black/50 text-white px-1.5 py-0.5 rounded-full uppercase font-bold">
                  {f.file.name.split(".").pop()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  X,
  Download,
  Trash2,
  FileImage,
  FilePlus,
  GripVertical,
} from "lucide-react";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: "image" | "pdf";
}

const MAX_FILES = 20;
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/svg+xml",
  "application/pdf",
];

export default function JpgToPdfConverter() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming);
      const filtered = arr.filter((f) => ACCEPTED_TYPES.includes(f.type));
      const remaining = MAX_FILES - files.length;
      const toAdd = filtered.slice(0, remaining);

      const newFiles: UploadedFile[] = toAdd.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
        type: f.type === "application/pdf" ? "pdf" : "image",
      }));

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length],
  );

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.id !== id);
    });
  };

  const clearAll = () => {
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
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
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d")!;
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
    jsPDFLib: typeof import("jspdf"),
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

  const handleCombinePDF = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(0);

    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      let firstPage = true;

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(Math.round(((i + 1) / files.length) * 100));

        if (f.type === "pdf") {
          const pages = await loadPdfPages(f.file, await import("jspdf"));
          for (const pg of pages) {
            if (!firstPage) pdf.addPage();
            firstPage = false;
            const ratio = Math.min(pdfW / pg.width, pdfH / pg.height);
            const w = pg.width * ratio;
            const h = pg.height * ratio;
            pdf.addImage(
              pg.dataUrl,
              "JPEG",
              (pdfW - w) / 2,
              (pdfH - h) / 2,
              w,
              h,
            );
          }
        } else {
          const imgData = await loadImageAsCanvas(f.file);
          if (!firstPage) pdf.addPage();
          firstPage = false;
          const ratio = Math.min(pdfW / imgData.width, pdfH / imgData.height);
          const w = imgData.width * ratio;
          const h = imgData.height * ratio;
          pdf.addImage(
            imgData.dataUrl,
            "JPEG",
            (pdfW - w) / 2,
            (pdfH - h) / 2,
            w,
            h,
          );
        }
      }

      pdf.save("combined.pdf");
    } catch (e) {
      console.error("Combine PDF failed", e);
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const handleDownloadSeparate = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(0);

    try {
      const { default: jsPDF } = await import("jspdf");

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(Math.round(((i + 1) / files.length) * 100));

        if (f.type === "pdf") continue; // skip already-pdf files

        const imgData = await loadImageAsCanvas(f.file);
        const pdf = new jsPDF({ unit: "pt", format: "a4" });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pdfW / imgData.width, pdfH / imgData.height);
        const w = imgData.width * ratio;
        const h = imgData.height * ratio;
        pdf.addImage(
          imgData.dataUrl,
          "JPEG",
          (pdfW - w) / 2,
          (pdfH - h) / 2,
          w,
          h,
        );

        const name = f.file.name.replace(/\.[^.]+$/, "");
        pdf.save(`${name}.pdf`);
      }
    } catch (e) {
      console.error("Separate PDF failed", e);
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          JPG to PDF Converter
        </h2>
        <p className="text-muted-foreground text-sm">
          JPG, PNG, TIFF, SVG, PDF ഫയലുകൾ upload ചെയ്ത് ഒരൊറ്റ PDF ആയി combine
          ചെയ്യുക അല്ലെങ്കിൽ ഓരോന്നും separate PDF ആയി download ചെയ്യുക
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-lg font-semibold text-foreground">
          ഫയലുകൾ ഇവിടെ Drag & Drop ചെയ്യുക
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          അല്ലെങ്കിൽ click ചെയ്ത് select ചെയ്യുക • JPG, PNG, TIFF, SVG, PDF •
          Max {MAX_FILES} files
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.tiff,.tif,.svg,.pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Action Buttons */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            onClick={() => inputRef.current?.click()}
            variant="outline"
            size="sm"
            disabled={files.length >= MAX_FILES}
          >
            <FilePlus className="w-4 h-4 mr-1" /> Add More
          </Button>
          <Button onClick={clearAll} variant="outline" size="sm">
            <Trash2 className="w-4 h-4 mr-1" /> Clear All
          </Button>
          <Button
            onClick={handleCombinePDF}
            disabled={processing}
            className="bg-primary"
            size="sm"
          >
            <Download className="w-4 h-4 mr-1" /> Combine PDF
          </Button>
          <Button
            onClick={handleDownloadSeparate}
            disabled={processing}
            variant="secondary"
            size="sm"
          >
            <Download className="w-4 h-4 mr-1" /> Separate PDFs
          </Button>
        </div>
      )}

      {/* Progress */}
      {processing && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">
            Processing... {progress}%
          </p>
        </div>
      )}

      {/* File Previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {files.map((f, idx) => (
            <Card
              key={f.id}
              className="relative group overflow-hidden"
            >
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
                      <FileImage className="w-10 h-10 mb-1" />
                      <span className="text-xs">PDF</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {idx + 1}. {f.file.name}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {(f.file.size / 1024).toFixed(0)} KB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(f.id);
                  }}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* File count */}
      {files.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          {files.length} / {MAX_FILES} files selected
        </p>
      )}
    </div>
  );
}

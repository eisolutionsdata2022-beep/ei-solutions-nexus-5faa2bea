import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationStatusBadge } from "@/components/services/ApplicationStatusBadge";
import {
  APPLICATION_STATUS_OPTIONS,
  ApplicationStatus,
  formatApplicationDate,
  getDocumentStatusLabel,
  ServiceApplicationRecord,
} from "@/lib/e-district";
import { Archive, Download, ExternalLink, Eye, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

function sanitizeFileName(name: string): string {
  return (name || "file").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

async function downloadAllAsZip(
  docs: { url: string; fileName: string; name: string }[],
  zipName: string,
) {
  const zip = new JSZip();
  const used = new Set<string>();
  let failed = 0;

  await Promise.all(
    docs.map(async (doc, idx) => {
      try {
        const res = await fetch(doc.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        let name = sanitizeFileName(doc.fileName || `${doc.name}_${idx + 1}`);
        if (used.has(name)) {
          const dot = name.lastIndexOf(".");
          name = dot > 0
            ? `${name.slice(0, dot)}_${idx + 1}${name.slice(dot)}`
            : `${name}_${idx + 1}`;
        }
        used.add(name);
        zip.file(name, blob);
      } catch {
        failed += 1;
      }
    }),
  );

  if (Object.keys(zip.files).length === 0) {
    throw new Error("All files failed to download");
  }

  const archive = await zip.generateAsync({ type: "blob" });
  const blobUrl = URL.createObjectURL(archive);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `${sanitizeFileName(zipName)}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);

  return { failed };
}

type PreviewKind = "image" | "pdf" | "other";

function detectPreviewKind(fileName: string, url: string): PreviewKind {
  const lower = (fileName || url).toLowerCase().split("?")[0];
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower)) return "image";
  if (/\.pdf$/.test(lower)) return "pdf";
  return "other";
}

interface StaffApplicationReviewDialogProps {
  application: ServiceApplicationRecord | null;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: {
    id: string;
    status: ApplicationStatus;
    govApplicationNo: string;
    staffRemark: string;
  }) => Promise<void>;
}

async function downloadDocument(url: string, fileName: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Download failed");

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function StaffApplicationReviewDialog({
  application,
  open,
  saving,
  onOpenChange,
  onSave,
}: StaffApplicationReviewDialogProps) {
  const [status, setStatus] = useState<ApplicationStatus>("Pending");
  const [govApplicationNo, setGovApplicationNo] = useState("");
  const [staffRemark, setStaffRemark] = useState("");
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    if (!application) return;

    setStatus(application.status);
    setGovApplicationNo(application.govApplicationNo ?? "");
    setStaffRemark(application.rejectionReason || application.staffRemark || "");
    setPreviewIdx(null);
  }, [application]);

  const activePreview = useMemo(() => {
    if (!application || previewIdx === null) return null;
    const doc = application.uploadedDocuments[previewIdx];
    if (!doc) return null;
    return { doc, kind: detectPreviewKind(doc.fileName, doc.url) };
  }, [application, previewIdx]);

  const documentMessage = useMemo(() => {
    if (!application) return "";
    return getDocumentStatusLabel(application.documentUploadStatus);
  }, [application]);

  const handleSave = async () => {
    if (!application) return;

    const trimmedRemark = staffRemark.trim();
    if (status === "Rejected" && !trimmedRemark) {
      toast.error("Rejected application-ന് reason ചേർക്കണം.");
      return;
    }

    await onSave({
      id: application.id,
      status,
      govApplicationNo: govApplicationNo.trim(),
      staffRemark: trimmedRemark,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{application?.applicationNo || "Application Review"}</DialogTitle>
          <DialogDescription>
            Submitted data, uploaded documents, and status update are managed here.
          </DialogDescription>
        </DialogHeader>

        {application ? (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <section className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Application details</h3>
                  <ApplicationStatusBadge status={application.status} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Name" value={application.fullName} />
                  <DetailItem label="Mobile" value={application.mobile} />
                  <DetailItem label="Email" value={application.email || "—"} />
                  <DetailItem label="Service" value={application.serviceType} />
                  <DetailItem label="District" value={application.district} />
                  <DetailItem label="Submitted" value={formatApplicationDate(application.createdAt)} />
                  <DetailItem label="Fee" value={`₹${application.fee.toFixed(2)}`} />
                  <DetailItem label="Govt App No" value={application.govApplicationNo || "—"} />
                  <DetailItem label="Address" value={application.address || "—"} className="sm:col-span-2" />
                  <DetailItem label="Purpose" value={application.purpose || "—"} className="sm:col-span-2" />
                </div>
              </section>

              <section className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Uploaded documents</h3>
                    <p className="text-xs text-muted-foreground">{documentMessage}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {application.uploadedDocuments.length} file(s)
                    </span>
                    {application.uploadedDocuments.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={zipping}
                        onClick={async () => {
                          if (!application) return;
                          setZipping(true);
                          try {
                            const { failed } = await downloadAllAsZip(
                              application.uploadedDocuments,
                              application.applicationNo || application.id,
                            );
                            if (failed > 0) {
                              toast.warning(`ZIP downloaded — ${failed} file(s) skipped.`);
                            } else {
                              toast.success("ZIP downloaded.");
                            }
                          } catch (err: any) {
                            toast.error(err?.message || "ZIP download failed");
                          } finally {
                            setZipping(false);
                          }
                        }}
                      >
                        {zipping ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Archive className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {zipping ? "Zipping…" : "Download all (ZIP)"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                  {application.uploadedDocuments.length > 0 ? (
                    application.uploadedDocuments.map((document, idx) => {
                      const kind = detectPreviewKind(document.fileName, document.url);
                      const isActive = previewIdx === idx;
                      return (
                        <div
                          key={`${document.url}-${document.fileName}`}
                          className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${
                            isActive ? "border-primary bg-primary/5" : "bg-background"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{document.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{document.fileName}</p>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            {kind !== "other" && (
                              <Button
                                size="sm"
                                variant={isActive ? "default" : "secondary"}
                                onClick={() => setPreviewIdx(isActive ? null : idx)}
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                {isActive ? "Hide" : "Preview"}
                              </Button>
                            )}
                            <Button size="sm" variant="outline" asChild>
                              <a href={document.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                Open
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadDocument(document.url, document.fileName)}
                            >
                              <Download className="mr-1.5 h-3.5 w-3.5" />
                              Download
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-lg border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
                      <FileText className="mx-auto mb-2 h-5 w-5" />
                      {application.documentUploadStatus === "failed"
                        ? "Document upload failed for this application."
                        : application.documentUploadStatus === "pending"
                          ? "Documents are still uploading."
                          : "No uploaded documents available for this application."}
                    </div>
                  )}
                </div>

                {activePreview && (
                  <div className="mt-3 overflow-hidden rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between border-b bg-background px-3 py-2">
                      <p className="truncate text-xs font-medium text-foreground">
                        Preview: {activePreview.doc.fileName}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setPreviewIdx(null)}
                        aria-label="Close preview"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex max-h-[420px] items-center justify-center overflow-auto bg-background">
                      {activePreview.kind === "image" ? (
                        <img
                          src={activePreview.doc.url}
                          alt={activePreview.doc.fileName}
                          className="max-h-[420px] w-auto max-w-full object-contain"
                        />
                      ) : activePreview.kind === "pdf" ? (
                        <iframe
                          src={activePreview.doc.url}
                          title={activePreview.doc.fileName}
                          className="h-[420px] w-full border-0"
                        />
                      ) : null}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-lg border bg-card p-4">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Update status</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as ApplicationStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Government application number</Label>
                  <Input
                    value={govApplicationNo}
                    onChange={(event) => setGovApplicationNo(event.target.value)}
                    placeholder="Enter tracking / govt number"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{status === "Rejected" ? "Rejection reason" : "Staff remark"}</Label>
                  <Textarea
                    value={staffRemark}
                    onChange={(event) => setStaffRemark(event.target.value)}
                    placeholder={
                      status === "Rejected"
                        ? "Why was this application rejected?"
                        : "Add a note for the retailer"
                    }
                    rows={5}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                    Close
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save update"}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
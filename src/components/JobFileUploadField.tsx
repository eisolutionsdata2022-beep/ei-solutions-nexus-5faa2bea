import { useState } from "react";
import { X, Image as ImageIcon, FileIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { JobFileMeta } from "@/lib/job-marketplace-types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 10;

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
}

export function JobFileUploadField({
  files,
  onChange,
  accept,
  multiple = true,
  maxFiles = MAX_FILES,
}: Props) {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const f of list) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name}: exceeds 10MB`);
        continue;
      }
      valid.push(f);
    }
    let next = multiple ? [...files, ...valid] : valid;
    if (next.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      next = next.slice(0, maxFiles);
    }
    onChange(next);
    const map: Record<string, string> = {};
    next.forEach((f) => {
      if (f.type.startsWith("image/")) map[f.name + f.size] = URL.createObjectURL(f);
    });
    setPreviews(map);
    // reset input so same file can be reselected after removal
    e.target.value = "";
  };

  const remove = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handle}
        className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
      />
      <p className="text-[11px] text-muted-foreground">Up to {maxFiles} files, max 10MB each.</p>
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {files.map((f, i) => {
            const isImg = f.type.startsWith("image/");
            const preview = previews[f.name + f.size];
            return (
              <div key={i} className="relative border rounded p-1 bg-muted/30">
                {isImg && preview ? (
                  <img src={preview} alt={f.name} className="w-full h-20 object-cover rounded" />
                ) : (
                  <div className="w-full h-20 flex flex-col items-center justify-center text-muted-foreground text-xs">
                    <FileIcon className="w-6 h-6 mb-1" />
                    <span className="truncate w-full text-center px-1">{f.name}</span>
                  </div>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 w-5 h-5"
                  onClick={() => remove(i)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isImageUrl(u: string) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$)/i.test(u);
}

/**
 * Renders attached files (new metadata format OR legacy URL-only) as a grid
 * with inline image preview and an explicit Download button preserving the
 * original filename when available.
 */
export function FilePreviewList({
  urls,
  files,
}: {
  urls?: string[];
  files?: JobFileMeta[];
}) {
  // Normalize: prefer `files` if present, else map urls to minimal meta
  const items: JobFileMeta[] =
    files && files.length > 0
      ? files
      : (urls || []).map((u, i) => ({ url: u, name: `File ${i + 1}` }));

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
      {items.map((f, i) => {
        const isImg = isImageUrl(f.url) || f.contentType?.startsWith("image/");
        return (
          <div
            key={i}
            className="border rounded overflow-hidden flex flex-col bg-card"
          >
            <a
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="block hover:opacity-90 transition"
              title={f.name}
            >
              {isImg ? (
                <img
                  src={f.url}
                  alt={f.name}
                  className="w-full h-24 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-24 flex flex-col items-center justify-center text-muted-foreground text-xs bg-muted/40">
                  <ImageIcon className="w-6 h-6 mb-1" />
                  <span className="px-1 truncate w-full text-center">{f.name}</span>
                </div>
              )}
            </a>
            <div className="flex items-center justify-between gap-1 p-1.5 border-t bg-muted/30">
              <span className="text-[11px] truncate flex-1" title={f.name}>
                {f.name}
              </span>
              <a
                href={f.url}
                download={f.name}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded hover:bg-primary/10 text-primary p-1"
                title={`Download ${f.name}`}
                aria-label={`Download ${f.name}`}
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

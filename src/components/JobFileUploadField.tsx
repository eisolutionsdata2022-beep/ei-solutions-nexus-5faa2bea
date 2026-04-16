import { useState } from "react";
import { X, Image as ImageIcon, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

export function JobFileUploadField({ files, onChange, accept, multiple = true }: Props) {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    const next = multiple ? [...files, ...list] : list;
    onChange(next);
    const map: Record<string, string> = {};
    next.forEach((f) => {
      if (f.type.startsWith("image/")) map[f.name + f.size] = URL.createObjectURL(f);
    });
    setPreviews(map);
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

export function FilePreviewList({ urls }: { urls: string[] }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
      {urls.map((u, i) => {
        const isImg = /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$)/i.test(u);
        return (
          <a
            key={i}
            href={u}
            target="_blank"
            rel="noreferrer"
            className="block border rounded p-1 hover:border-primary transition"
          >
            {isImg ? (
              <img src={u} alt={`file ${i + 1}`} className="w-full h-20 object-cover rounded" />
            ) : (
              <div className="w-full h-20 flex flex-col items-center justify-center text-muted-foreground text-xs">
                <ImageIcon className="w-6 h-6 mb-1" />
                <span>File {i + 1}</span>
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}

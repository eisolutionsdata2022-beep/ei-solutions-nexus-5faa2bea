import { useEffect, useMemo, useState } from "react";
import { Zap, Search, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { subscribeTemplates, applyTemplateTokens } from "@/lib/whatsapp-firebase";
import type { WaTemplate } from "@/lib/whatsapp-types";

interface Props {
  /** Name of the active contact, used to substitute {{name}} token. */
  contactName?: string;
  /** Called with the rendered (token-replaced) template body. */
  onPick: (body: string) => void;
  disabled?: boolean;
}

export function QuickReplyPicker({ contactName, onPick, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => subscribeTemplates(setTemplates), []);

  const grouped = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const filtered = f
      ? templates.filter((t) =>
          t.title.toLowerCase().includes(f) ||
          t.body.toLowerCase().includes(f) ||
          (t.category || "").toLowerCase().includes(f)
        )
      : templates;
    const buckets = new Map<string, WaTemplate[]>();
    filtered.forEach((t) => {
      const key = (t.category || "General").trim() || "General";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(t);
    });
    return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [templates, filter]);

  const pick = (t: WaTemplate) => {
    onPick(applyTemplateTokens(t.body, { name: contactName }));
    setOpen(false);
    setFilter("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          title="Quick replies"
        >
          <Zap className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-80 p-0">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search templates…"
              className="pl-7 h-8 text-xs"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {templates.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquareQuote className="h-7 w-7 mx-auto text-muted-foreground/40 mb-1.5" />
              <p className="text-xs text-muted-foreground">No templates yet.</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Admins can add templates in WhatsApp → Templates tab.
              </p>
            </div>
          ) : grouped.length === 0 ? (
            <p className="p-6 text-xs text-muted-foreground text-center">No matches.</p>
          ) : (
            grouped.map(([cat, items]) => (
              <div key={cat}>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/40 sticky top-0">
                  {cat}
                </div>
                {items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pick(t)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/60 transition border-b border-border/50 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-xs font-medium truncate">{t.title}</p>
                      {/\{\{\s*name\s*\}\}/i.test(t.body) && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">{"{{name}}"}</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                      {applyTemplateTokens(t.body, { name: contactName })}
                    </p>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

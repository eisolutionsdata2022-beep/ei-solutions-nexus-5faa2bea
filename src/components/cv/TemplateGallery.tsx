import { useMemo, useState } from "react";
import { ALL_TEMPLATES, TEMPLATE_CATEGORIES, QUICK_FILTERS, type CVTemplate } from "@/lib/cv-template-engine";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Check, Sparkles } from "lucide-react";

interface Props {
  selectedId: string;
  onSelect: (t: CVTemplate) => void;
  onContinue: () => void;
}

export function TemplateGallery({ selectedId, onSelect, onContinue }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");

  const filtered = useMemo(() => {
    let list = ALL_TEMPLATES;
    if (category) list = list.filter(t => t.category === category);
    if (tagFilter) list = list.filter(t => t.tags.includes(tagFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
      );
    }
    return list;
  }, [category, tagFilter, search]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search templates by name, category, or style..."
          className="pl-9 h-10"
        />
      </div>

      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setTagFilter(f.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              tagFilter === f.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCategory("")}
          className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
            category === ""
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-foreground border-border hover:bg-muted"
          }`}
        >
          All Categories
        </button>
        {TEMPLATE_CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
              category === c
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Result count + CTA */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3 inline mr-1 text-amber-500" />
          {filtered.length} template{filtered.length !== 1 ? "s" : ""} · {ALL_TEMPLATES.length} total
        </p>
        {selectedId && (
          <Button onClick={onContinue} size="sm" className="gap-1.5">
            Continue with selected →
          </Button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
          No templates match your filters. Try clearing them.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              selected={selectedId === t.id}
              onSelect={() => onSelect(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, selected, onSelect }: { template: CVTemplate; selected: boolean; onSelect: () => void }) {
  const isPremium = template.tags.includes("premium");
  return (
    <button
      onClick={onSelect}
      className={`group relative rounded-xl border-2 overflow-hidden bg-white transition-all duration-200 text-left ${
        selected
          ? "border-primary ring-2 ring-primary/30 shadow-lg scale-[1.02]"
          : "border-border hover:border-primary/40 hover:shadow-md hover:scale-[1.01]"
      }`}
    >
      {/* Premium badge */}
      {isPremium && (
        <div className="absolute top-1.5 left-1.5 z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
          ★ Premium
        </div>
      )}

      {/* Selected check */}
      {selected && (
        <div className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      {/* SVG preview */}
      <div className="aspect-[200/280] bg-gray-50 overflow-hidden relative">
        <div
          className="w-full h-full transition-transform duration-300 group-hover:scale-105"
          dangerouslySetInnerHTML={{ __html: template.generatePreviewSVG() }}
        />
      </div>

      {/* Info */}
      <div className="p-2.5 border-t bg-background">
        <p className="text-xs font-semibold truncate">{template.name}</p>
        <div className="flex items-center justify-between mt-1">
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{template.category}</Badge>
          <span className="text-[9px] text-muted-foreground capitalize">{template.layout.replace("-", " ")}</span>
        </div>
      </div>
    </button>
  );
}

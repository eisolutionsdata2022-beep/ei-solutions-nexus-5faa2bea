import { useMemo, useState } from "react";
import {
  ALL_POSTER_TEMPLATES, POSTER_CATEGORIES, POSTER_QUICK_FILTERS,
  type PosterTemplate,
} from "@/lib/poster-template-engine";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Check, Sparkles } from "lucide-react";

interface Props {
  selectedId: string | null;
  onSelect: (t: PosterTemplate) => void;
}

export function PosterTemplateGallery({ selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [tagFilter, setTagFilter] = useState<string>("");

  const filtered = useMemo(() => {
    let list = ALL_POSTER_TEMPLATES;
    if (category !== "All") list = list.filter(t => t.category === category);
    if (tagFilter) list = list.filter(t => t.tags.includes(tagFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q)),
      );
    }
    return list;
  }, [category, tagFilter, search]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search posters by name, category, or style..."
          className="pl-9 h-10"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {POSTER_QUICK_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setTagFilter(tagFilter === f.value ? "" : f.value)}
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

      <div className="flex flex-wrap gap-1.5">
        {POSTER_CATEGORIES.map(c => (
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

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3 inline mr-1 text-amber-500" />
          {filtered.length} poster{filtered.length !== 1 ? "s" : ""} · {ALL_POSTER_TEMPLATES.length} total
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
          No posters match your filters. Try clearing them.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(t => (
            <Card key={t.id} template={t} selected={selectedId === t.id} onSelect={() => onSelect(t)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ template, selected, onSelect }: { template: PosterTemplate; selected: boolean; onSelect: () => void }) {
  const isPremium = template.tags.includes("premium");
  const isUrgent = template.tags.includes("urgent");
  const isFestival = template.tags.includes("festival");
  return (
    <button
      onClick={onSelect}
      className={`group relative rounded-xl border-2 overflow-hidden bg-white transition-all duration-200 text-left ${
        selected
          ? "border-primary ring-2 ring-primary/30 shadow-lg scale-[1.02]"
          : "border-border hover:border-primary/40 hover:shadow-md hover:scale-[1.01]"
      }`}
    >
      <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-0.5">
        {isPremium && (
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
            ★ Premium
          </span>
        )}
        {isUrgent && (
          <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase shadow-sm">
            🔥 Offer
          </span>
        )}
        {isFestival && (
          <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase shadow-sm">
            🎉 Festival
          </span>
        )}
      </div>

      {selected && (
        <div className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      <div className="aspect-[200/280] bg-gray-50 overflow-hidden relative">
        <div
          className="w-full h-full transition-transform duration-300 group-hover:scale-105"
          dangerouslySetInnerHTML={{ __html: template.thumbnail() }}
        />
      </div>

      <div className="p-2.5 border-t bg-background">
        <p className="text-xs font-semibold truncate">{template.name}</p>
        <div className="flex items-center justify-between mt-1">
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{template.category}</Badge>
          <span className="text-[9px] text-muted-foreground capitalize">{template.style}</span>
        </div>
      </div>
    </button>
  );
}

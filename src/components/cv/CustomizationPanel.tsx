import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ACCENT_PRESETS, type TemplateCustomization } from "@/lib/cv-template-engine";
import { Type, Palette, RotateCcw } from "lucide-react";

interface Props {
  customization: TemplateCustomization;
  onChange: (c: TemplateCustomization) => void;
  defaultAccent: string;
  sectionOrder: string[];
  onReorder: (order: string[]) => void;
}

const SECTION_LABELS: Record<string, string> = {
  objective: "Career Objective",
  experience: "Work Experience",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
  certifications: "Certifications",
  additional: "Additional Info",
};

export function CustomizationPanel({ customization, onChange, defaultAccent, sectionOrder, onReorder }: Props) {
  const moveSection = (index: number, direction: -1 | 1) => {
    const newOrder = [...sectionOrder];
    const target = index + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    onReorder(newOrder);
  };

  return (
    <div className="space-y-4">
      {/* Font size */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5" /> Font Size: {Math.round((customization.fontScale || 1) * 100)}%
        </Label>
        <Slider
          value={[customization.fontScale || 1]}
          onValueChange={([v]) => onChange({ ...customization, fontScale: v })}
          min={0.85}
          max={1.2}
          step={0.05}
        />
      </div>

      {/* Accent color */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" /> Accent Color
        </Label>
        <div className="grid grid-cols-8 gap-1.5">
          <button
            onClick={() => onChange({ ...customization, accentColor: undefined })}
            className={`h-7 rounded-md border-2 flex items-center justify-center ${!customization.accentColor ? "border-foreground" : "border-border"}`}
            title="Default"
            type="button"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          {ACCENT_PRESETS.map(c => (
            <button
              key={c}
              onClick={() => onChange({ ...customization, accentColor: c })}
              className={`h-7 rounded-md border-2 transition-transform hover:scale-110 ${customization.accentColor === c ? "border-foreground ring-2 ring-foreground/20" : "border-border"}`}
              style={{ background: c }}
              type="button"
            />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Default: <span className="font-mono">{defaultAccent}</span></p>
      </div>

      {/* Section order */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Reorder Sections</Label>
        <div className="space-y-1">
          {sectionOrder.map((s, i) => (
            <div key={s} className="flex items-center justify-between bg-muted/50 rounded-md px-2 py-1 text-xs">
              <span className="font-medium">{SECTION_LABELS[s] || s}</span>
              <div className="flex gap-0.5">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={i === 0} onClick={() => moveSection(i, -1)}>↑</Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={i === sectionOrder.length - 1} onClick={() => moveSection(i, 1)}>↓</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

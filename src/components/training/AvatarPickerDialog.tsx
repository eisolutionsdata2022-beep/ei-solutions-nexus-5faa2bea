import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ALL_AVATARS, type AvatarOption } from "./AvatarStream";
import { Check } from "lucide-react";

interface Props {
  open: boolean;
  currentId: string | null;
  onPick: (a: AvatarOption) => void;
  onClose: () => void;
}

export function AvatarPickerDialog({ open, currentId, onPick, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl bg-[#0f172a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Choose Your Avatar</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
          {ALL_AVATARS.map((a) => {
            const selected = a.id === currentId;
            return (
              <button
                key={a.id}
                onClick={() => onPick(a)}
                className={`relative rounded-xl border-2 p-4 transition-all flex flex-col items-center gap-2 ${
                  selected
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/10 hover:border-white/30 bg-white/5"
                }`}
              >
                {selected && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                )}
                <div className="w-16 h-16 flex items-center justify-center text-4xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg">
                  {a.type === "2d" ? a.src : "🧑‍💼"}
                </div>
                <span className="text-[11px] text-center text-white/80 leading-tight">{a.label}</span>
                <span className="text-[9px] uppercase tracking-wider text-white/40">{a.type === "rpm" ? "3D" : "2D"}</span>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/10">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

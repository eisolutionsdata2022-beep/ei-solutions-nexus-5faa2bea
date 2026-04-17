/**
 * Visual progress indicator for the 19-step IPPB flow.
 * Shows compact dots on small screens and a labeled timeline on lg+.
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_ORDER, STEP_LABELS, type IPPBStep } from "@/lib/ippb-types";

interface Props {
  current: IPPBStep;
  className?: string;
}

export function StepIndicator({ current, className }: Props) {
  const currentIdx = STEP_ORDER.indexOf(current);
  const total = STEP_ORDER.length - 1; // exclude "completed" terminal

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-gov-blue">
          Step {Math.min(currentIdx + 1, total)} of {total}
        </span>
        <span className="text-muted-foreground">{STEP_LABELS[current]}</span>
      </div>
      <div className="flex items-center gap-1">
        {STEP_ORDER.slice(0, total).map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                done && "bg-green-500",
                active && "bg-gov-blue animate-pulse",
                !done && !active && "bg-muted"
              )}
              title={STEP_LABELS[s]}
            />
          );
        })}
      </div>
    </div>
  );
}

interface CompletedSectionProps {
  label: string;
  children?: React.ReactNode;
}

export function CompletedSection({ label, children }: CompletedSectionProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm">
      <Check className="w-4 h-4 text-green-600 shrink-0" />
      <span className="font-medium text-green-900">{label}</span>
      {children && <span className="ml-auto text-xs text-green-700">{children}</span>}
    </div>
  );
}

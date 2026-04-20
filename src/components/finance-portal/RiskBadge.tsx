/**
 * Reusable dark-themed risk badge for the Finance subsite.
 * Surfaces the result of the dual-cap risk policy as a compact pill + reasons.
 */
import { ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import type { RiskEvaluation } from "@/lib/gold-loan-risk";

const STYLES: Record<RiskEvaluation["level"], { ring: string; bg: string; text: string; icon: React.ReactNode; label: string }> = {
  ok: {
    ring: "ring-emerald-400/30",
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    label: "Within policy",
  },
  approaching: {
    ring: "ring-amber-400/30",
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    label: "Approaching limit",
  },
  breach: {
    ring: "ring-rose-400/40",
    bg: "bg-rose-500/15",
    text: "text-rose-300",
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
    label: "Risk policy breach",
  },
};

export function RiskBadge({
  evaluation,
  compact = false,
}: {
  evaluation: RiskEvaluation;
  compact?: boolean;
}) {
  const s = STYLES[evaluation.level];
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}
    >
      {s.icon}
      <span>{s.label}</span>
      {!compact && evaluation.utilisationPercent > 0 && (
        <span className="opacity-70">· {evaluation.utilisationPercent}%</span>
      )}
    </div>
  );
}

export function RiskReasons({ evaluation }: { evaluation: RiskEvaluation }) {
  if (evaluation.level === "ok" || evaluation.reasons.length === 0) return null;
  const tone =
    evaluation.level === "breach"
      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
      : "border-amber-400/30 bg-amber-500/10 text-amber-200";
  return (
    <ul className={`mt-2 list-disc space-y-0.5 rounded-lg border px-4 py-2 pl-7 text-[11px] ${tone}`}>
      {evaluation.reasons.map((r, i) => (
        <li key={i}>{r}</li>
      ))}
    </ul>
  );
}

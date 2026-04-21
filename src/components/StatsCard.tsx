import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

type Tone = "primary" | "success" | "warning" | "danger" | "violet" | "cyan";

const TONE_GRADIENT: Record<Tone, string> = {
  primary: "from-blue-500 to-indigo-600",
  success: "from-emerald-500 to-teal-600",
  warning: "from-amber-500 to-orange-500",
  danger: "from-rose-500 to-red-600",
  violet: "from-violet-500 to-purple-600",
  cyan: "from-sky-500 to-cyan-600",
};

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  /** Up / down indicator with percentage label */
  trend?: { direction: "up" | "down"; label: string };
  /** Color theme — defaults to primary */
  tone?: Tone;
  /** Stagger animation delay (0..n) */
  delay?: number;
  /** Optional click target */
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  tone = "primary",
  delay = 0,
  onClick,
}: StatsCardProps) {
  const gradient = TONE_GRADIENT[tone];

  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={`glass-card-v2 gradient-ring animate-stat-rise rounded-2xl p-5 relative overflow-hidden ${
        onClick ? "cursor-pointer" : ""
      }`}
      style={{ animationDelay: `${delay * 80}ms` }}
    >
      {/* Soft gradient bloom */}
      <div
        className={`pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-3xl`}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            {title}
          </p>
          <p className="mt-1.5 text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{description}</p>
          )}
          {trend && (
            <div
              className={`mt-2 inline-flex items-center gap-1 text-xs font-bold ${
                trend.direction === "up" ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {trend.label}
            </div>
          )}
        </div>
        <div
          className={`shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

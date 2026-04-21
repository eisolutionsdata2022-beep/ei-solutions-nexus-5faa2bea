/**
 * ServicePageShell — premium glassmorphism wrapper that gives every individual
 * retailer service dashboard the same look & feel as the My Services hub.
 *
 * Drop this around any service page to get:
 *  - Gradient hero header with floating blobs
 *  - Service icon tile + title + subtitle
 *  - Live wallet chip + back-to-hub button
 *  - Optional stat chips
 *  - Glass content container for the page body
 *
 * Pure presentation — accepts `children` for the existing page logic.
 */
import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode, type ElementType } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Wallet as WalletIcon, Zap } from "lucide-react";

export type ServiceShellStat = {
  icon: ElementType;
  label: string;
  value: string | number;
  accent?: string; // tailwind gradient e.g. "from-emerald-400 to-teal-400"
};

export type ServicePageShellProps = {
  /** Lucide icon component for the service */
  icon: ElementType;
  /** Service display name */
  title: string;
  /** One-line subtitle/description */
  subtitle?: string;
  /** Eyebrow chip text — defaults to "Premium Service" */
  eyebrow?: string;
  /** Tailwind gradient classes for the hero, e.g. "from-violet-600 via-fuchsia-600 to-pink-600" */
  gradient?: string;
  /** Optional stat chips below the hero header */
  stats?: ServiceShellStat[];
  /** Optional right-side action (e.g. "New Recharge" button) — placed next to wallet chip */
  headerAction?: ReactNode;
  /** Hide the wallet chip (default: shown) */
  hideWallet?: boolean;
  /** Hide the back-to-hub link (default: shown) */
  hideBack?: boolean;
  /** Page body */
  children: ReactNode;
};

const DEFAULT_GRADIENT = "from-indigo-600 via-purple-600 to-pink-600";

export function ServicePageShell({
  icon: Icon,
  title,
  subtitle,
  eyebrow = "Premium Service",
  gradient = DEFAULT_GRADIENT,
  stats,
  headerAction,
  hideWallet = false,
  hideBack = false,
  children,
}: ServicePageShellProps) {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!appUser?.uid || hideWallet) return;
    const unsub = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(Number((snap.data() as any).balance || 0));
    });
    return unsub;
  }, [appUser?.uid, hideWallet]);

  return (
    <div className="space-y-6 pb-10">
      {/* ───── HERO ───── */}
      <div
        className={`relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br ${gradient} p-6 lg:p-8 shadow-premium animate-fade-in`}
      >
        {/* ambient blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-blob" />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl animate-blob"
          style={{ animationDelay: "4s" }}
        />
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* LEFT — icon + title */}
          <div className="flex items-start gap-4 text-white">
            <div className="hidden sm:flex h-14 w-14 lg:h-16 lg:w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xl border border-white/30 shadow-lg shrink-0">
              <Icon className="w-7 h-7 lg:w-8 lg:h-8 text-white drop-shadow" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-medium border border-white/25">
                <Sparkles className="w-3 h-3" /> {eyebrow}
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-white/80 max-w-xl">{subtitle}</p>
              )}
            </div>
          </div>

          {/* RIGHT — wallet + action + back */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {!hideWallet && (
              <div className="flex items-center gap-2 rounded-2xl bg-white/15 backdrop-blur-xl px-3.5 py-2.5 border border-white/25 shadow-lg">
                <WalletIcon className="w-4 h-4 text-white" />
                <div className="leading-tight">
                  <div className="text-[9px] uppercase tracking-wider text-white/70">
                    Wallet
                  </div>
                  <div className="text-sm font-bold text-white">
                    ₹{balance.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            )}
            {headerAction}
            {!hideBack && (
              <Link to="/retailer/my-services">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-xl font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Hub
                </Button>
              </Link>
            )}
            {!hideWallet && (
              <Link to="/retailer/wallet">
                <Button
                  size="sm"
                  className="bg-white text-indigo-700 hover:bg-white/90 font-semibold shadow-lg"
                >
                  <Zap className="w-3.5 h-3.5 mr-1" /> Top-up
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* STAT CHIPS */}
        {stats && stats.length > 0 && (
          <div
            className={`relative mt-6 grid gap-3 ${
              stats.length >= 4
                ? "grid-cols-2 lg:grid-cols-4"
                : stats.length === 3
                  ? "grid-cols-3"
                  : "grid-cols-2"
            }`}
          >
            {stats.map((s, i) => (
              <ShellStatChip key={i} {...s} />
            ))}
          </div>
        )}
      </div>

      {/* ───── BODY ───── */}
      <div className="animate-fade-in" style={{ animationDelay: "60ms" }}>
        {children}
      </div>
    </div>
  );
}

function ShellStatChip({ icon: Icon, label, value, accent }: ServiceShellStat) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/12 backdrop-blur-xl px-4 py-3 border border-white/25 shadow-lg transition-all hover:bg-white/20">
      <div
        className={`absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br ${accent ?? "from-white/30 to-white/10"} opacity-40 blur-2xl`}
      />
      <div className="relative flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/20">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-white/70 truncate">
            {label}
          </div>
          <div className="text-lg font-bold text-white truncate">{value}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * ServiceSectionCard — premium glass-card matching the My Services aesthetic.
 * Use inside ServicePageShell for content sections.
 */
export function ServiceSectionCard({
  title,
  icon: Icon,
  right,
  children,
  className = "",
  accent = "from-indigo-500 to-purple-600",
}: {
  title?: string;
  icon?: ElementType;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  /** gradient for left accent bar */
  accent?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition hover:shadow-md ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-900/50 dark:to-indigo-950/30">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`h-5 w-1 rounded-full bg-gradient-to-b ${accent}`} />
            {Icon && <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
            <h2 className="text-sm font-bold text-foreground truncate">{title}</h2>
          </div>
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

/**
 * ServiceTag — reusable badge matching My Services tag style
 */
export function ServiceTag({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "warn" | "danger" | "neutral";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    info: "border-indigo-400/50 text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/30",
    success: "border-emerald-400/50 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30",
    warn: "border-amber-400/50 text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/30",
    danger: "border-rose-400/50 text-rose-700 dark:text-rose-300 bg-rose-50/60 dark:bg-rose-950/30",
    neutral: "border-border text-muted-foreground bg-muted/40",
  };
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold ${tones[tone]}`}>
      {children}
    </Badge>
  );
}

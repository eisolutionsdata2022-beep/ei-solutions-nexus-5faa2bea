/**
 * Shared dark-studio UI primitives for the /finance subsite.
 * Keep these styling-only — no business logic.
 */
import { type ReactNode } from "react";

export function StudioCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function StudioSectionTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-100">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

export function StudioInput({
  label,
  ...props
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
      )}
      <input
        {...props}
        className={`w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.07] ${props.className ?? ""}`}
      />
    </label>
  );
}

export function StudioTextarea({
  label,
  ...props
}: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
      )}
      <textarea
        {...props}
        className={`w-full resize-y rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.07] ${props.className ?? ""}`}
      />
    </label>
  );
}

export function StudioSelect({
  label,
  children,
  ...props
}: {
  label?: string;
  children: ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
      )}
      <select
        {...props}
        className={`w-full appearance-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.07] ${props.className ?? ""}`}
      >
        {children}
      </select>
    </label>
  );
}

export function StudioButton({
  variant = "primary",
  children,
  ...props
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles: Record<string, string> = {
    primary:
      "bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-md shadow-cyan-500/20 hover:opacity-95",
    secondary:
      "border border-white/15 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]",
    ghost: "text-slate-300 hover:bg-white/[0.06]",
    danger:
      "border border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function StudioBadge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/8 text-slate-300 border-white/10",
    success: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    warning: "bg-amber-500/15 text-amber-300 border-amber-400/30",
    danger: "bg-rose-500/15 text-rose-300 border-rose-400/30",
    info: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function StudioEmpty({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-slate-500">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function StudioModal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${width} max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

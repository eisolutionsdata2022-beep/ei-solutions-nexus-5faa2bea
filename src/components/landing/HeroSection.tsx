import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Sparkles, Star } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-hero-grad" aria-hidden />
      <div className="absolute inset-0 bg-grid-pattern opacity-60" aria-hidden />
      <div className="pointer-events-none absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-primary/30 blur-3xl animate-blob" aria-hidden />
      <div className="pointer-events-none absolute right-10 top-40 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl animate-blob [animation-delay:-6s]" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-32 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Trusted CSC Platform · Powering 5,000+ Service Centers
          </div>

          <h1 className="animate-fade-up mt-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl [animation-delay:120ms]">
            Run a complete{" "}
            <span className="text-premium-gradient">digital service center</span>{" "}
            from one platform
          </h1>

          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg [animation-delay:200ms]">
            EI Solutions Janasevana Kendram unifies PAN, IPPB, e‑Governance, recharge,
            money transfer, training, CRM and more — built for retailers, distributors,
            staff and trainers across India.
          </p>

          <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row [animation-delay:280ms]">
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" className="btn-premium group h-12 w-full border-0 px-7 text-base font-semibold text-white shadow-premium sm:w-auto">
                Start free today
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="h-12 w-full border-border bg-background/70 px-7 text-base font-semibold backdrop-blur-md sm:w-auto">
                Sign in
              </Button>
            </Link>
          </div>

          <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-muted-foreground [animation-delay:380ms]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Bank-grade security
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> 4.9 / 5 retailer rating
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Setup in under 5 minutes
            </span>
          </div>
        </div>

        {/* Floating preview card */}
        <div className="animate-fade-up relative mx-auto mt-16 max-w-5xl [animation-delay:520ms]">
          <div className="absolute -inset-4 rounded-3xl bg-premium-gradient opacity-30 blur-2xl" aria-hidden />
          <div className="glass-card relative overflow-hidden rounded-2xl">
            <div className="flex items-center gap-1.5 border-b border-border/60 bg-background/40 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-3 text-xs text-muted-foreground">app.eisoluions.xyz / dashboard</span>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
              {[
                { label: "Today's Revenue", value: "₹ 18,420", trend: "+12.4%" },
                { label: "Active Services", value: "26", trend: "+3 new" },
                { label: "Wallet Balance", value: "₹ 42,150", trend: "Topped up" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{s.value}</p>
                  <p className="mt-1 text-xs font-medium text-emerald-500">{s.trend}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 border-t border-border/60 bg-background/30 p-3 sm:grid-cols-8 sm:p-4">
              {["PAN", "IPPB", "e-Dis", "DMT", "Recharge", "CRM", "Training", "Forms"].map((t) => (
                <div key={t} className="rounded-lg border border-border/50 bg-background/70 px-2 py-2 text-center text-[11px] font-medium text-foreground sm:text-xs">
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

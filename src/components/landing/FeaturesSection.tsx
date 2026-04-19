import { ShieldCheck, Zap, BarChart3, Smartphone, Globe2, Headphones } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Bank-grade security",
    desc: "Firebase Auth, Firestore RLS, AES-GCM credentials, HMAC-signed APIs and atomic wallet transactions.",
  },
  {
    icon: Zap,
    title: "Lightning fast",
    desc: "Edge-rendered SSR, smart caching, optimistic UI — most actions complete in under 200 ms.",
  },
  {
    icon: BarChart3,
    title: "Real-time insights",
    desc: "Earnings, commissions, top services, staff performance — visualized live on every dashboard.",
  },
  {
    icon: Smartphone,
    title: "Mobile-first PWA",
    desc: "Installable on Android & iOS, works offline-friendly, and matches your branding.",
  },
  {
    icon: Globe2,
    title: "Built for India",
    desc: "Malayalam + English UI, INR-native, Aadhaar/PAN aware, and government-portal-friendly.",
  },
  {
    icon: Headphones,
    title: "Always-on support",
    desc: "AI assistant + live staff chat baked into every screen. Never get stuck.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative overflow-hidden border-y border-border bg-secondary/40 py-24 sm:py-32">
      <div className="pointer-events-none absolute -left-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Why EI Solutions</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Built like the platforms you{" "}
            <span className="text-premium-gradient">already trust</span>
          </h2>
          <p className="mt-5 text-base text-muted-foreground sm:text-lg">
            Engineered with the same primitives powering modern fintech. Designed for the
            realities of your CSC.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="card-tilt group relative rounded-2xl border border-border bg-card p-7"
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

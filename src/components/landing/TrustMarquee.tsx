import { ShieldCheck, Landmark, Fingerprint, Building2, CreditCard, Banknote, Globe2, BadgeCheck } from "lucide-react";

const partners = [
  { name: "NSDL", icon: Landmark, tag: "PAN Services" },
  { name: "IPPB", icon: Building2, tag: "India Post Payments" },
  { name: "UIDAI", icon: Fingerprint, tag: "Aadhaar Authority" },
  { name: "CSC SPV", icon: ShieldCheck, tag: "Common Services" },
  { name: "Aadhaar", icon: BadgeCheck, tag: "e-KYC Verified" },
  { name: "BBPS", icon: CreditCard, tag: "Bharat BillPay" },
  { name: "RBI", icon: Banknote, tag: "Regulated Partner" },
  { name: "Digital India", icon: Globe2, tag: "Govt. Initiative" },
];

export function TrustMarquee() {
  // Duplicate the list so the CSS-only marquee loops seamlessly
  const loop = [...partners, ...partners];

  return (
    <section
      aria-label="Trusted partners and integrations"
      className="relative border-y border-border/60 bg-background/40 py-10 backdrop-blur-sm"
    >
      {/* Subtle background accent */}
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-30" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-md">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Trusted integrations
          </span>
          <p className="text-sm text-muted-foreground sm:text-base">
            Officially integrated with India's leading government & financial networks
          </p>
        </div>

        {/* Marquee track with edge fade masks */}
        <div
          className="group relative overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <div className="flex w-max animate-marquee gap-4 group-hover:[animation-play-state:paused]">
            {loop.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={`${p.name}-${idx}`}
                  className="flex shrink-0 items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-5 py-3 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background/90 hover:shadow-premium"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-premium-gradient text-white shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold tracking-tight text-foreground">{p.name}</p>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {p.tag}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

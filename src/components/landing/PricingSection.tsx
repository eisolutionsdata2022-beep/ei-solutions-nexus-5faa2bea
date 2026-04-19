import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    price: "₹0",
    period: "free forever",
    desc: "Perfect for new retailers exploring the platform.",
    features: ["Wallet & basic services", "Recharge + BBPS", "AI support assistant", "Mobile PWA access"],
    cta: "Get started free",
    featured: false,
  },
  {
    name: "Retailer Pro",
    price: "₹999",
    period: "/ year",
    desc: "Everything an active CSC owner needs to scale.",
    features: [
      "All Starter features",
      "PAN + IPPB + e-Governance",
      "Money Transfer + DMT",
      "CRM, Forms & Reports",
      "Live training studio",
      "Priority support",
    ],
    cta: "Start Pro plan",
    featured: true,
  },
  {
    name: "Distributor",
    price: "Custom",
    period: "talk to sales",
    desc: "For agencies managing multiple retailers.",
    features: [
      "Everything in Pro",
      "Multi-retailer console",
      "Commission splits & audit",
      "White-label branding",
      "Dedicated success manager",
    ],
    cta: "Contact sales",
    featured: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="border-y border-border bg-secondary/40 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Simple pricing</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Pay for what you actually{" "}
            <span className="text-premium-gradient">use</span>
          </h2>
          <p className="mt-5 text-base text-muted-foreground sm:text-lg">
            No hidden setup fees. Cancel anytime. Per-service activation available.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all ${
                p.featured
                  ? "border-primary/50 bg-card shadow-premium ring-2 ring-primary/30"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-premium"
              }`}
            >
              {p.featured && (
                <div className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-premium-gradient px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg">
                  <Sparkles className="h-3 w-3" /> Most Popular
                </div>
              )}
              <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-foreground">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="mt-8 block">
                <Button
                  className={`h-11 w-full font-semibold ${
                    p.featured ? "btn-premium border-0 text-white" : ""
                  }`}
                  variant={p.featured ? "default" : "outline"}
                >
                  {p.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

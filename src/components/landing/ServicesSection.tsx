import { CreditCard, Banknote, Building2, Smartphone, GraduationCap, FileText, Users, Sparkles, Heart, Briefcase, Phone, Wallet } from "lucide-react";

const SERVICES = [
  { icon: CreditCard, name: "PAN Services", desc: "NSDL/UTI new + correction", grad: "from-blue-500 to-indigo-600" },
  { icon: Building2, name: "IPPB Banking", desc: "Account, AEPS, biometric", grad: "from-emerald-500 to-teal-600" },
  { icon: FileText, name: "e‑Governance", desc: "26+ certificates portal", grad: "from-amber-500 to-orange-600" },
  { icon: Banknote, name: "Money Transfer", desc: "DMT to any bank, instantly", grad: "from-rose-500 to-pink-600" },
  { icon: Smartphone, name: "Recharge & BBPS", desc: "Mobile, DTH, electricity", grad: "from-violet-500 to-purple-600" },
  { icon: Users, name: "CRM & Leads", desc: "Telecalling + reporting", grad: "from-cyan-500 to-blue-600" },
  { icon: GraduationCap, name: "Training Studio", desc: "Live multi-trainer classroom", grad: "from-fuchsia-500 to-rose-600" },
  { icon: Sparkles, name: "Horoscope & Palmistry", desc: "AI-powered Malayalam reports", grad: "from-yellow-500 to-amber-600" },
  { icon: Heart, name: "Matrimony", desc: "Profile creation & matching", grad: "from-pink-500 to-rose-600" },
  { icon: Briefcase, name: "Job Marketplace", desc: "Bid, hire, get rated", grad: "from-slate-600 to-slate-800" },
  { icon: Phone, name: "EI Pay (CSC)", desc: "Bridge to legacy CSC services", grad: "from-green-500 to-emerald-600" },
  { icon: Wallet, name: "Wallet & Earnings", desc: "Real-time, atomic, audited", grad: "from-indigo-500 to-blue-700" },
];

export function ServicesSection() {
  return (
    <section id="services" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">All-in-one</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Every service your customers need.{" "}
            <span className="text-premium-gradient">One platform.</span>
          </h2>
          <p className="mt-5 text-base text-muted-foreground sm:text-lg">
            Replace 10+ disconnected portals with a single, branded retailer dashboard.
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SERVICES.map(({ icon: Icon, name, desc, grad }) => (
            <div
              key={name}
              className="card-tilt group relative overflow-hidden rounded-2xl border border-border bg-card p-5"
            >
              <div className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r ${grad} opacity-70`} />
              <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-lg transition-transform group-hover:scale-110`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

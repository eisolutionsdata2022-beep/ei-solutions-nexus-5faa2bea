import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CreditCard,
  Receipt,
  Landmark,
  FileBadge,
  Wallet,
  GraduationCap,
  ShieldCheck,
  Plane,
  LayoutDashboard,
  Phone,
  Mail,
  Globe,
  Download,
  CheckCircle2,
  TrendingUp,
  Users,
  Award,
  Sparkles,
  ArrowRight,
  Building2,
  MapPin,
} from "lucide-react";

export const Route = createFileRoute("/brochure")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Service Brochure — EI Solutions Janasevana Kendram" },
      {
        name: "description",
        content:
          "India's Smart Digital Service & Business Automation Platform — PAN, Banking, Government, Loans, Education, Insurance, Travel & more. 2500+ franchise network.",
      },
      { property: "og:title", content: "EI Solutions — Digital Service Brochure" },
      {
        property: "og:description",
        content:
          "Premium multi-service software platform powering 2500+ franchise partners across India. Explore all services in one place.",
      },
    ],
  }),
  component: BrochurePage,
});

/* ───────────────────────── Data ─────────────────────────── */

const SERVICE_CATEGORIES = [
  {
    icon: CreditCard,
    title: "PAN Card Services",
    items: ["New PAN", "Correction PAN", "Reprint PAN", "Instant PAN"],
  },
  {
    icon: Receipt,
    title: "Bill Payment Services",
    items: [
      "Electricity Bill",
      "Water Bill",
      "Gas Bill",
      "Mobile Recharge",
      "DTH Recharge",
      "Fastag Recharge",
    ],
  },
  {
    icon: Landmark,
    title: "Banking Services",
    items: [
      "AEPS",
      "Money Transfer",
      "Mini Statement",
      "Cash Withdrawal",
      "Balance Check",
    ],
  },
  {
    icon: FileBadge,
    title: "Government Services",
    items: [
      "Aadhaar Services",
      "Ayushman Bharat",
      "Certificates",
      "Applications",
      "E-governance Services",
    ],
  },
  {
    icon: Wallet,
    title: "Loan Services",
    items: ["Personal Loan", "Business Loan", "Gold Loan", "Vehicle Loan"],
  },
  {
    icon: GraduationCap,
    title: "Education Services",
    items: [
      "Skill India",
      "NSDC Certificates",
      "Training Center",
      "Online Courses",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Insurance Services",
    items: ["Life Insurance", "Vehicle Insurance", "Health Insurance"],
  },
  {
    icon: Plane,
    title: "Travel Services",
    items: ["Flight Booking", "Train Booking", "Bus Booking", "Hotel Booking"],
  },
  {
    icon: LayoutDashboard,
    title: "Business Tools",
    items: [
      "Wallet System",
      "Distributor Panel",
      "Retailer Panel",
      "Admin Dashboard",
      "Commission Tracking",
      "Reports",
    ],
  },
] as const;

const WHY_US = [
  "One Software, Multiple Income Sources",
  "High Commission Services",
  "Easy to Use Dashboard",
  "Retailer / Distributor System",
  "Fast & Reliable Support",
  "Bank-grade Secure Technology",
  "Trusted Brand Across India",
  "Real Growth Opportunity",
] as const;

const FRANCHISE_TIERS = [
  { tier: "Retailer", desc: "Start your service centre from your shop." },
  { tier: "Distributor", desc: "Onboard & manage retailers in your area." },
  { tier: "District Partner", desc: "Lead an entire district network." },
  { tier: "State Partner", desc: "Top-tier rights with state-level revenue." },
] as const;

/* ─────────────────────── Primitives ─────────────────────── */

function Glass({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] ${className}`}
    >
      {children}
    </div>
  );
}

function GoldEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#E8C36B]">
      {children}
    </p>
  );
}

function SectionTitle({
  eyebrow,
  title,
  sub,
  center = true,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : ""}>
      {eyebrow && <GoldEyebrow>{eyebrow}</GoldEyebrow>}
      <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {sub && (
        <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
          {sub}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

function BrochurePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050B1F] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-[#0B2354] opacity-60 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full bg-[#1E3A8A] opacity-40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-[#E8C36B] opacity-10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050B1F]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#E8C36B] to-[#B8862A] text-[#0B2354] shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wide">EI SOLUTIONS</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8C36B]">
                Janasevana Kendram
              </p>
            </div>
          </Link>
          <a
            href="/EI-Solutions-Brochure.pdf"
            download
            className="hidden items-center gap-2 rounded-lg border border-[#E8C36B]/40 bg-[#E8C36B]/10 px-3 py-2 text-xs font-bold text-[#E8C36B] transition hover:bg-[#E8C36B]/20 sm:inline-flex"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </a>
        </div>
      </header>

      {/* ─── Cover ─────────────────────────────────────────── */}
      <section className="relative px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <Glass className="relative overflow-hidden p-6 sm:p-12">
            {/* Gold corner accents */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-0 top-0 h-1 w-1/3 bg-gradient-to-r from-[#E8C36B] to-transparent" />
              <div className="absolute bottom-0 right-0 h-1 w-1/3 bg-gradient-to-l from-[#E8C36B] to-transparent" />
            </div>

            <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#E8C36B]/30 bg-[#E8C36B]/5 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E8C36B]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E8C36B]">
                    Premium Service Brochure
                  </span>
                </div>

                <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
                  EI SOLUTIONS
                  <br />
                  <span className="bg-gradient-to-r from-[#E8C36B] via-[#F2D98C] to-[#B8862A] bg-clip-text text-transparent">
                    Janasevana Kendram
                  </span>
                </h1>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                  (OPC) Private Limited
                </p>

                <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                  India's Smart Digital Service & Business Automation Platform.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="#services"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#E8C36B] to-[#B8862A] px-5 py-3 text-sm font-bold text-[#0B2354] shadow-lg shadow-[#E8C36B]/20 transition hover:opacity-95"
                  >
                    Explore Services
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Contact Us
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Glass className="p-4 text-center">
                  <p className="text-3xl font-black text-[#E8C36B] sm:text-4xl">
                    2500+
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                    Franchise Partners
                  </p>
                </Glass>
                <Glass className="p-4 text-center">
                  <p className="text-3xl font-black text-[#E8C36B] sm:text-4xl">
                    50+
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                    Live Services
                  </p>
                </Glass>
                <Glass className="p-4 text-center">
                  <p className="text-3xl font-black text-[#E8C36B] sm:text-4xl">
                    24×7
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                    Support
                  </p>
                </Glass>
                <Glass className="p-4 text-center">
                  <p className="text-3xl font-black text-[#E8C36B] sm:text-4xl">
                    PAN India
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                    Network
                  </p>
                </Glass>
              </div>
            </div>
          </Glass>
        </div>
      </section>

      {/* ─── About ─────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="About the Company"
            title={
              <>
                A trusted, registered company powering{" "}
                <span className="text-[#E8C36B]">digital Bharat</span>.
              </>
            }
            sub="EI Solutions Janasevana Kendram (OPC) Private Limited is a technology-first business platform delivering government-related digital services, banking, and financial automation to thousands of users across India."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Building2,
                title: "Registered Company",
                desc: "An OPC Private Limited entity, fully compliant and legally registered.",
              },
              {
                icon: ShieldCheck,
                title: "Government-aligned",
                desc: "Digital service partner for citizen-centric government workflows.",
              },
              {
                icon: LayoutDashboard,
                title: "Multi-service Platform",
                desc: "One unified software replacing 10+ disconnected portals.",
              },
              {
                icon: Users,
                title: "Trusted by Thousands",
                desc: "Active retailer, distributor, and franchise network nationwide.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Glass key={title} className="p-5">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8C36B] to-[#B8862A] text-[#0B2354] shadow-md">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {desc}
                </p>
              </Glass>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Services ──────────────────────────────────────── */}
      <section id="services" className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="All-in-One Services"
            title={
              <>
                Every service your customers need.{" "}
                <span className="text-[#E8C36B]">One platform.</span>
              </>
            }
            sub="From PAN to banking, government applications to travel — power your entire service centre from a single premium dashboard."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_CATEGORIES.map(({ icon: Icon, title, items }) => (
              <Glass
                key={title}
                className="group relative overflow-hidden p-6 transition hover:border-[#E8C36B]/40 hover:bg-white/[0.08]"
              >
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#E8C36B]/60 to-transparent opacity-70" />
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#0B2354] text-[#E8C36B] shadow-lg ring-1 ring-[#E8C36B]/20 transition-transform group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{title}</h3>
                </div>
                <ul className="space-y-2">
                  {items.map((it) => (
                    <li
                      key={it}
                      className="flex items-start gap-2 text-sm text-slate-300"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#E8C36B]" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </Glass>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Us ───────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Why Choose Us"
            title={
              <>
                Built for <span className="text-[#E8C36B]">growth</span>,
                designed for trust.
              </>
            }
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_US.map((point, i) => (
              <Glass key={point} className="p-5">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#E8C36B]/15 text-xs font-black text-[#E8C36B]">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p className="text-sm font-semibold leading-snug text-white">
                  {point}
                </p>
              </Glass>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Earnings ─────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Glass className="relative overflow-hidden p-8 sm:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#E8C36B]/15 blur-3xl" />
            <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
              <div>
                <GoldEyebrow>Earnings Opportunity</GoldEyebrow>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Start your own digital service business with{" "}
                  <span className="text-[#E8C36B]">low investment</span>.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
                  Earn daily income across 50+ services — from PAN and banking
                  to government applications and travel. Transparent commissions,
                  instant settlements, real-time wallet.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Daily Income
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8C36B]/30 bg-[#E8C36B]/10 px-3 py-1 text-xs font-bold text-[#E8C36B]">
                    <Award className="h-3.5 w-3.5" />
                    High Commission
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300">
                    <Wallet className="h-3.5 w-3.5" />
                    Instant Settlement
                  </span>
                </div>
              </div>

              {/* Mini growth chart */}
              <div className="rounded-xl border border-white/10 bg-[#0B1838]/60 p-5">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Monthly Growth Trend
                </p>
                <div className="flex h-40 items-end gap-2">
                  {[28, 38, 46, 55, 68, 82, 95].map((h, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-[#B8862A] to-[#E8C36B] transition-all"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[10px] text-slate-500">M{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Glass>
        </div>
      </section>

      {/* ─── Franchise ────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow="Franchise Opportunity"
            title={
              <>
                Become a partner.{" "}
                <span className="text-[#E8C36B]">Build a territory.</span>
              </>
            }
            sub="Choose a partnership tier that matches your ambition — from a single-shop retailer to a full state-level partner."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FRANCHISE_TIERS.map(({ tier, desc }, i) => (
              <Glass
                key={tier}
                className="relative overflow-hidden p-6 text-center"
              >
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[#E8C36B] to-transparent" />
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#E8C36B]/40 bg-[#E8C36B]/10 text-lg font-black text-[#E8C36B]">
                  {i + 1}
                </div>
                <h3 className="text-lg font-bold text-white">{tier}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {desc}
                </p>
              </Glass>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Contact ──────────────────────────────────────── */}
      <section id="contact" className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Glass className="overflow-hidden p-8 sm:p-12">
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <GoldEyebrow>Get in Touch</GoldEyebrow>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Let's grow your{" "}
                  <span className="text-[#E8C36B]">digital business</span>{" "}
                  together.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-300">
                  Talk to our partnership team for franchise enquiries, demo,
                  pricing, and onboarding support.
                </p>
              </div>
              <div className="space-y-4">
                <a
                  href="tel:8078991386"
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#E8C36B]/15 text-[#E8C36B]">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Phone
                    </p>
                    <p className="text-sm font-semibold text-white">
                      8078991386 · 8921479506
                    </p>
                  </div>
                </a>
                <a
                  href="mailto:eisolutionswork@gmail.com"
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#E8C36B]/15 text-[#E8C36B]">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Email
                    </p>
                    <p className="text-sm font-semibold text-white">
                      eisolutionswork@gmail.com
                    </p>
                  </div>
                </a>
                <a
                  href="https://www.eisolutions.biz"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#E8C36B]/15 text-[#E8C36B]">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Website
                    </p>
                    <p className="text-sm font-semibold text-white">
                      www.eisolutions.biz
                    </p>
                  </div>
                </a>
                <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#E8C36B]/15 text-[#E8C36B]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Headquarters
                    </p>
                    <p className="text-sm font-semibold text-white">
                      EI Solutions Janasevana Kendram (OPC) Pvt. Ltd. · India
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Glass>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────── */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-3xl border border-[#E8C36B]/30 bg-gradient-to-br from-[#0B2354] via-[#102D6B] to-[#0B2354] p-10 text-center sm:p-14">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#E8C36B]/20 blur-3xl" />
              <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#1E3A8A]/40 blur-3xl" />
            </div>
            <div className="relative">
              <GoldEyebrow>Join Today</GoldEyebrow>
              <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
                Start Your{" "}
                <span className="bg-gradient-to-r from-[#E8C36B] to-[#F2D98C] bg-clip-text text-transparent">
                  Digital Business Journey
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-slate-300">
                Become a part of India's fastest-growing multi-service software
                network.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#E8C36B] to-[#B8862A] px-6 py-3 text-sm font-bold text-[#0B2354] shadow-lg shadow-[#E8C36B]/20 transition hover:opacity-95"
                >
                  Become a Partner
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="/EI-Solutions-Brochure.pdf"
                  download
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <Download className="h-4 w-4" />
                  Download Brochure
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer strip */}
      <footer className="border-t border-white/10 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
          <p>
            © {new Date().getFullYear()} EI Solutions Janasevana Kendram (OPC)
            Private Limited. All rights reserved.
          </p>
          <p className="text-[#E8C36B]">Empowering Bharat · Digitally.</p>
        </div>
      </footer>
    </div>
  );
}

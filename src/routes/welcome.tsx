import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, CreditCard, FileText,
  GraduationCap, Heart, IndianRupee, Mail, MapPin, MessageCircle, Phone,
  Send, Shield, ShieldCheck, Sparkles, Star, TrendingUp, Users, Wallet,
} from "lucide-react";
import logoImg from "@/assets/ei-solutions-3d-logo.png";
import { useLandingContent } from "@/hooks/use-landing-content";

export const Route = createFileRoute("/welcome")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "EI SOLUTIONS — Kerala's Premier Digital Service Network" },
      { name: "description", content: "EI SOLUTIONS — 7+ years, 2500+ centers. Modern digital service infrastructure for Kerala's retailers, franchise partners & enterprises. Apply for franchise today." },
      { property: "og:title", content: "EI SOLUTIONS — Premium Digital Service Network" },
      { property: "og:description", content: "Kerala-built · India-bound. Premium technology platform for digital franchise partners, lenders, billers & service centers." },
      { property: "og:image", content: "https://ei-solutions-nexus.lovable.app/icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WelcomeLanding,
});

/* ─────────────────────── PAGE ─────────────────────── */
function WelcomeLanding() {
  const { content } = useLandingContent();
  const whatsapp = content.contact.whatsapp || "918921479506";
  const phone = content.contact.phone || "+91 89214 79506";
  const email = content.contact.email || "support@eisoluions.xyz";
  const logo = content.images.logoUrl || logoImg;

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#0F1B14] antialiased selection:bg-[#0B6B4F]/20">
      <Aurora />
      <Navbar logo={logo} brand={content.contact.brand} />
      <Hero content={content} whatsapp={whatsapp} />
      <MarqueeStrip />
      <Stats stats={content.stats} />
      <About />
      <Services services={content.services} />
      <Platform />
      <Opportunity />
      <Testimonials reviews={content.reviews} />
      <BookletCTA />
      <LeadSection phone={phone} whatsapp={whatsapp} email={email} />
      <Contact contact={content.contact} logo={logo} phone={phone} whatsapp={whatsapp} email={email} />
      <Footer brand={content.contact.brand} legalName={content.contact.legalName} />
      <FloatingActions phone={phone} whatsapp={whatsapp} />
    </div>
  );
}

/* ─────────────────────── BG AURORA ─────────────────────── */
function Aurora() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-40 top-[-10%] h-[520px] w-[520px] rounded-full bg-[#0B6B4F]/15 blur-[120px]" />
      <div className="absolute right-[-15%] top-[20%] h-[480px] w-[480px] rounded-full bg-[#D4A24C]/15 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-1/3 h-[420px] w-[420px] rounded-full bg-[#C2410C]/10 blur-[120px]" />
    </div>
  );
}

/* ─────────────────────── NAV ─────────────────────── */
function Navbar({ logo, brand }: { logo: string; brand: string }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled ? "border-b border-black/5 bg-[#FAF7F0]/85 backdrop-blur-xl" : "bg-transparent"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 md:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <div className="relative">
            <img src={logo} alt={brand} className="h-9 w-9 rounded-lg object-contain" />
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#0B6B4F] ring-2 ring-[#FAF7F0]" />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-bold tracking-tight text-[#0F1B14]">{brand}</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#0B6B4F]">Kerala · India</p>
          </div>
        </a>
        <nav className="hidden items-center gap-7 text-[13.5px] font-medium text-[#0F1B14]/70 md:flex">
          <a href="#about" className="transition hover:text-[#0B6B4F]">About</a>
          <a href="#services" className="transition hover:text-[#0B6B4F]">Services</a>
          <a href="#platform" className="transition hover:text-[#0B6B4F]">Platform</a>
          <a href="#opportunity" className="transition hover:text-[#0B6B4F]">Franchise</a>
          <Link to="/booklet" className="transition hover:text-[#0B6B4F]">Booklet</Link>
          <a href="#contact" className="transition hover:text-[#0B6B4F]">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/" className="hidden text-[13.5px] font-medium text-[#0F1B14]/70 hover:text-[#0B6B4F] sm:inline">Login</Link>
          <a href="#lead" className="group inline-flex items-center gap-1.5 rounded-full bg-[#0F1B14] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0B6B4F]">
            Get Started
            <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:rotate-45" />
          </a>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────── HERO ─────────────────────── */
function Hero({ content, whatsapp }: { content: LandingContent; whatsapp: string }) {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-20 md:px-8 md:pt-20 md:pb-28">
        <div className="grid items-start gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0B6B4F]/20 bg-white/60 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0B6B4F] backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0B6B4F] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#0B6B4F]" />
              </span>
              Now onboarding · 2025 batch open
            </div>

            <h1 className="mt-6 font-serif text-[44px] leading-[1.05] tracking-[-0.02em] text-[#0F1B14] md:text-[64px] lg:text-[72px]">
              The digital backbone for{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-br from-[#0B6B4F] via-[#0F1B14] to-[#C2410C] bg-clip-text text-transparent">Kerala's</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
                  <path d="M2 9 Q 100 -2, 198 9" stroke="#D4A24C" strokeWidth="3" strokeLinecap="round" fill="none" />
                </svg>
              </span>
              <br />
              service entrepreneurs.
            </h1>

            <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-[#0F1B14]/70 md:text-[17px]">
              <span className="font-semibold text-[#0F1B14]">EI SOLUTIONS</span> powers 2500+ digital service centers across India with PAN, banking, lending, e-governance, training & matrimony — all from one premium platform. കേരളത്തിൽ നിന്ന് ഇന്ത്യയിലേക്ക്.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#lead" className="group inline-flex items-center gap-2 rounded-full bg-[#0F1B14] px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-[#0B6B4F] hover:shadow-xl">
                Become a Partner
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </a>
              <Link to="/booklet" className="group inline-flex items-center gap-2 rounded-full border border-[#0F1B14]/20 bg-white/60 px-6 py-3.5 text-[14px] font-semibold text-[#0F1B14] backdrop-blur transition hover:border-[#0B6B4F] hover:text-[#0B6B4F]">
                <BookOpen className="h-4 w-4" />
                Open Digital Booklet
              </Link>
              <a href={`https://wa.me/${WHATSAPP}?text=Hi%20EI%20SOLUTIONS%2C%20I%20want%20to%20know%20more`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#0F1B14]/70 transition hover:text-[#0B6B4F]">
                <MessageCircle className="h-4 w-4" /> WhatsApp us
              </a>
            </div>

            {/* mini-trust row */}
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-black/5 pt-6">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#0F1B14]/50">Trusted by</div>
              {["MeitY", "KSUM", "NSDC", "STPI", "ABDM"].map((t) => (
                <div key={t} className="text-[13px] font-bold tracking-tight text-[#0F1B14]/55">{t}</div>
              ))}
            </div>
          </div>

          {/* Right column: layered visual */}
          <div className="relative animate-fade-in lg:mt-4">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative">
      {/* Card 1: Live counter */}
      <div className="absolute -left-4 top-6 hidden w-56 -rotate-3 rounded-2xl border border-black/5 bg-white/90 p-4 shadow-2xl backdrop-blur lg:block">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#0B6B4F]">Active Today</div>
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#0B6B4F]" />
        </div>
        <div className="mt-1 font-serif text-3xl font-bold text-[#0F1B14]">12,847</div>
        <div className="text-[11px] text-[#0F1B14]/60">transactions across network</div>
        <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#0B6B4F]">
          <TrendingUp className="h-3 w-3" /> +18% vs yesterday
        </div>
      </div>

      {/* Card 2: Main canvas */}
      <div className="relative ml-0 rounded-[28px] border border-black/5 bg-gradient-to-br from-[#0F1B14] via-[#0F1B14] to-[#0B6B4F] p-8 shadow-2xl lg:ml-16">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#D4A24C]/20 blur-3xl" />
        <div className="relative">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4A24C]">EI SOLUTIONS · DASHBOARD</div>
          <div className="mt-2 font-serif text-[28px] leading-tight text-white">One login.<br />Twenty services.</div>

          <div className="mt-6 space-y-2">
            {[
              { i: CreditCard, t: "PAN Card", v: "₹107", c: "bg-blue-500/20 text-blue-200" },
              { i: Send, t: "Money Transfer", v: "0.5–1%", c: "bg-purple-500/20 text-purple-200" },
              { i: Wallet, t: "Loan Leads", v: "₹500–2k", c: "bg-amber-500/20 text-amber-200" },
              { i: Heart, t: "Matrimony", v: "Premium", c: "bg-rose-500/20 text-rose-200" },
            ].map((s) => (
              <div key={s.t} className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5 backdrop-blur transition hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.c}`}><s.i className="h-4 w-4" /></div>
                  <span className="text-[13px] font-semibold text-white">{s.t}</span>
                </div>
                <span className="text-[12px] font-bold text-[#D4A24C]">{s.v}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-xl bg-[#D4A24C] px-4 py-3 text-[#0F1B14]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Monthly Potential</div>
              <div className="font-serif text-xl font-bold">₹50K – ₹1L+</div>
            </div>
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Card 3: Verified */}
      <div className="absolute -bottom-6 -right-2 hidden w-52 rotate-2 rounded-2xl border border-black/5 bg-white/95 p-4 shadow-2xl backdrop-blur lg:block">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B6B4F]/10">
            <ShieldCheck className="h-5 w-5 text-[#0B6B4F]" />
          </div>
          <div>
            <div className="text-[12px] font-bold text-[#0F1B14]">Govt. Registered</div>
            <div className="text-[10px] text-[#0F1B14]/60">MeitY · KSUM · STPI</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── MARQUEE ─────────────────────── */
function MarqueeStrip() {
  const items = [
    "Ministry of Electronics & IT", "Kerala Startup Mission", "NSDC Skill India",
    "STPI Registered", "ABDM Affiliated", "Digital Bharat Mission",
    "BBPS Network", "PAN Service Authorized",
  ];
  return (
    <section className="border-y border-black/5 bg-[#0F1B14] py-4 text-white overflow-hidden">
      <div className="flex animate-marquee gap-12 whitespace-nowrap">
        {[...items, ...items, ...items].map((t, i) => (
          <div key={i} className="flex items-center gap-2.5 text-[12.5px] font-medium tracking-wide text-white/70">
            <Check className="h-3.5 w-3.5 text-[#D4A24C]" /> {t}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────── STATS ─────────────────────── */
function Stats() {
  const items = [
    { v: "7+", l: "Years of operation", s: "since 2018" },
    { v: "2500+", l: "Active centers", s: "across 14 districts" },
    { v: "10L+", l: "Customers served", s: "and counting" },
    { v: "24×7", l: "Partner support", s: "Malayalam + English" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <div className="grid gap-px overflow-hidden rounded-3xl border border-black/5 bg-black/5 md:grid-cols-4">
        {items.map((it) => (
          <div key={it.l} className="bg-[#FAF7F0] p-7 transition hover:bg-white">
            <div className="font-serif text-5xl font-bold tracking-tight text-[#0F1B14] md:text-6xl">{it.v}</div>
            <div className="mt-3 text-[14px] font-semibold text-[#0F1B14]">{it.l}</div>
            <div className="text-[12px] text-[#0F1B14]/55">{it.s}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────── ABOUT ─────────────────────── */
function About() {
  return (
    <section id="about" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <Eyebrow>About</Eyebrow>
          <h2 className="mt-3 font-serif text-[36px] leading-[1.1] tracking-tight text-[#0F1B14] md:text-[48px]">
            Built in Kerala.<br />
            <span className="text-[#0B6B4F]">Engineered for India.</span>
          </h2>
        </div>
        <div className="space-y-5 text-[15.5px] leading-relaxed text-[#0F1B14]/75">
          <p>
            EI SOLUTIONS started in 2018 with a single belief — every neighborhood deserves a trustworthy digital service desk run by a local entrepreneur.
            ഏഴ് വർഷങ്ങൾക്കുള്ളിൽ ഞങ്ങൾ വളർന്നു: ഒരു ഷോപ്പിൽ നിന്ന് <strong className="font-semibold text-[#0F1B14]">2500+ centers</strong>-ലേക്ക്.
          </p>
          <p>
            Today, our retailers handle PAN cards, money transfers, bill payments, government certificates, insurance, loans, training, matrimony and more — all through a single premium dashboard, wallet & support system.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-4">
            {[
              { i: Shield, t: "OPC Pvt Ltd registered" },
              { i: Sparkles, t: "ISO-aligned operations" },
              { i: Users, t: "1000+ trained partners" },
              { i: TrendingUp, t: "Growing 30% YoY" },
            ].map((b) => (
              <div key={b.t} className="flex items-center gap-2.5 rounded-xl border border-black/5 bg-white/60 p-3 backdrop-blur">
                <b.i className="h-4 w-4 text-[#0B6B4F]" />
                <span className="text-[13px] font-medium text-[#0F1B14]">{b.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── SERVICES ─────────────────────── */
function Services() {
  const services = [
    { i: CreditCard, t: "PAN Card Services", d: "NSDL & UTI authorized issuance, instant e-PAN, corrections, reprints.", color: "#0B6B4F" },
    { i: Send, t: "Money Transfer (DMT)", d: "Send money instantly to any bank in India via your retail counter.", color: "#C2410C" },
    { i: FileText, t: "Bill Payments & BBPS", d: "Electricity, water, gas, broadband, FASTag, postpaid — 200+ billers.", color: "#0F1B14" },
    { i: ShieldCheck, t: "Insurance Services", d: "Health, motor, term, travel — partnered with leading IRDAI insurers.", color: "#0B6B4F" },
    { i: Wallet, t: "Loan Lead Generation", d: "Personal, business & gold loan leads with high payout per closure.", color: "#D4A24C" },
    { i: Heart, t: "Matrimony Portal", d: "Full bride/groom matchmaking platform — paid memberships.", color: "#9F1239" },
    { i: GraduationCap, t: "Skill Training", d: "Robotics, AI, finance, soft skills — Skill India aligned curriculum.", color: "#1E3A8A" },
    { i: BookOpen, t: "E-Governance", d: "Aadhaar updates, certificates, government online services.", color: "#0F1B14" },
  ];
  return (
    <section id="services" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <div className="flex items-end justify-between">
        <div>
          <Eyebrow>Services</Eyebrow>
          <h2 className="mt-3 font-serif text-[36px] leading-[1.1] tracking-tight text-[#0F1B14] md:text-[48px]">
            Twenty income streams.<br />One platform.
          </h2>
        </div>
        <a href="#lead" className="hidden items-center gap-1.5 text-[13px] font-semibold text-[#0B6B4F] transition hover:gap-2.5 md:inline-flex">
          See all services <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((s) => (
          <div key={s.t} className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white/70 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-black/10 hover:shadow-xl">
            <div
              className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
              style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }}
            />
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: s.color }}>
              <s.i className="h-5 w-5" />
            </div>
            <div className="mt-5 text-[15px] font-bold text-[#0F1B14]">{s.t}</div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#0F1B14]/65">{s.d}</p>
            <div className="mt-4 flex items-center gap-1 text-[12px] font-semibold text-[#0B6B4F] opacity-0 transition group-hover:opacity-100">
              Learn more <ChevronRight className="h-3 w-3" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────── PLATFORM ─────────────────────── */
function Platform() {
  const features = [
    { t: "Real-time wallet", d: "Atomic transactions. Instant settlement. Detailed ledger." },
    { t: "Mobile-first dashboard", d: "Built for shops with one phone & a printer. Works on 3G." },
    { t: "Multilingual support", d: "Native Malayalam UI alongside English — for every staff member." },
    { t: "AI-powered helpdesk", d: "Elzu Virtual Trainer answers retailer queries in Malayalam, 24×7." },
    { t: "Built-in CRM", d: "Capture, assign, follow-up & convert leads from one place." },
    { t: "Audit-grade reports", d: "Daily P&L, GST-ready invoices, commission breakdowns." },
  ];
  return (
    <section id="platform" className="relative overflow-hidden bg-[#0F1B14] py-24 text-white">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(11,107,79,0.4), transparent 50%), radial-gradient(circle at 80% 70%, rgba(212,162,76,0.25), transparent 50%)" }} />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="max-w-2xl">
          <Eyebrow dark>Platform</Eyebrow>
          <h2 className="mt-3 font-serif text-[36px] leading-[1.1] tracking-tight md:text-[48px]">
            A premium technology stack<br />
            <span className="text-[#D4A24C]">behind every counter.</span>
          </h2>
          <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-white/70">
            We don't just hand you a logo. You get a battle-tested SaaS platform — wallet, CRM, CMS, billing, AI & support — built specifically for the realities of the Kerala retail ecosystem.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div key={f.t} className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-[#D4A24C]/40 hover:bg-white/10">
              <div className="flex items-center gap-3">
                <div className="font-serif text-[28px] font-bold text-[#D4A24C]">{String(i + 1).padStart(2, "0")}</div>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="mt-4 text-[16px] font-bold">{f.t}</div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/65">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── OPPORTUNITY ─────────────────────── */
function Opportunity() {
  return (
    <section id="opportunity" className="mx-auto max-w-7xl px-4 py-24 md:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Eyebrow>Franchise opportunity</Eyebrow>
          <h2 className="mt-3 font-serif text-[36px] leading-[1.1] tracking-tight text-[#0F1B14] md:text-[48px]">
            Earn ₹50,000+ a month.<br />
            <span className="text-[#C2410C]">From your own shop.</span>
          </h2>
          <p className="mt-5 text-[15.5px] leading-relaxed text-[#0F1B14]/70">
            ഒരു ചെറിയ shop മതി. നിങ്ങളുടെ ഗ്രാമത്തിലെ digital service center ആകൂ. Multiple revenue streams — daily customer footfall — ഞങ്ങൾ training & support തരും.
          </p>

          <div className="mt-8 space-y-2.5">
            {[
              { t: "PAN cards", v: "₹107 / card" },
              { t: "Bill payments", v: "1–2% commission" },
              { t: "Loan leads", v: "₹500–2,000 / closure" },
              { t: "Money transfer", v: "0.5–1%" },
              { t: "Insurance", v: "5–15% premium" },
            ].map((r) => (
              <div key={r.t} className="flex items-center justify-between rounded-xl border border-black/5 bg-white/60 px-4 py-3 backdrop-blur">
                <div className="flex items-center gap-2.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#0B6B4F]" />
                  <span className="text-[14px] font-semibold text-[#0F1B14]">{r.t}</span>
                </div>
                <span className="text-[13px] font-bold text-[#0B6B4F]">{r.v}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#lead" className="inline-flex items-center gap-2 rounded-full bg-[#0F1B14] px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-[#0B6B4F]">
              Apply for franchise <ArrowRight className="h-4 w-4" />
            </a>
            <Link to="/booklet" className="inline-flex items-center gap-2 rounded-full border border-[#0F1B14]/15 bg-white/60 px-6 py-3 text-[14px] font-semibold text-[#0F1B14] backdrop-blur transition hover:border-[#0B6B4F]">
              <BookOpen className="h-4 w-4" /> View digital booklet
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[28px] border border-[#D4A24C]/30 bg-gradient-to-br from-[#FAF7F0] via-white to-[#FAF7F0] p-8 shadow-xl">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C2410C]">JOIN PROCESS</div>
            <div className="mt-2 font-serif text-[24px] text-[#0F1B14]">5 steps to launch.</div>
            <div className="mt-7 space-y-5">
              {[
                { n: "01", t: "Apply online", d: "Fill the form below or call us." },
                { n: "02", t: "Submit documents", d: "Aadhaar, PAN, photo, address proof." },
                { n: "03", t: "Pay activation fee", d: "Low one-time onboarding cost." },
                { n: "04", t: "Get trained", d: "Live + recorded training in Malayalam." },
                { n: "05", t: "Start earning", d: "Login & serve customers from day one." },
              ].map((s, i, a) => (
                <div key={s.n} className="relative flex gap-4">
                  {i < a.length - 1 && <div className="absolute left-[14px] top-8 h-full w-px bg-[#D4A24C]/40" />}
                  <div className="relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#0F1B14] font-serif text-[11px] font-bold text-[#D4A24C]">{s.n}</div>
                  <div>
                    <div className="text-[14px] font-bold text-[#0F1B14]">{s.t}</div>
                    <div className="text-[12.5px] text-[#0F1B14]/60">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── TESTIMONIALS ─────────────────────── */
function Testimonials() {
  const reviews = [
    { name: "Rajesh Kumar", place: "Kollam · Partner since 2020", text: "5 വർഷമായി EI SOLUTIONS-ൽ work ചെയ്യുന്നു. Support, training, വരുമാനം — എല്ലാം stable. വിശ്വാസത്തോടെ recommend ചെയ്യാം." },
    { name: "Anjali Menon", place: "Ernakulam · Retailer", text: "Join ചെയ്തിട്ട് 8 മാസം ആയി. Daily നല്ല income. Customers വരുന്നു — PAN, money transfer, bill payments എല്ലാം demand ഉണ്ട്." },
    { name: "Suresh Babu", place: "Thrissur · Center owner", text: "System easy ആണ്, training ഉഗ്രൻ. എല്ലാ services ഒരു portal-ൽ. Family business ഇപ്പോൾ stable." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 md:px-8">
      <div className="text-center">
        <Eyebrow center>Voices from our network</Eyebrow>
        <h2 className="mx-auto mt-3 max-w-3xl font-serif text-[36px] leading-[1.1] tracking-tight text-[#0F1B14] md:text-[48px]">
          Real partners.<br />Real income.
        </h2>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {reviews.map((r) => (
          <figure key={r.name} className="relative rounded-2xl border border-black/5 bg-white/70 p-7 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl">
            <div className="absolute -top-4 left-7 font-serif text-[60px] leading-none text-[#D4A24C]">"</div>
            <div className="flex gap-0.5 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-[#D4A24C] text-[#D4A24C]" />
              ))}
            </div>
            <blockquote className="mt-4 text-[14.5px] leading-relaxed text-[#0F1B14]/80">{r.text}</blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-black/5 pt-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#0B6B4F] to-[#0F1B14] text-[12px] font-bold text-white">
                {r.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div className="text-[13px] font-bold text-[#0F1B14]">{r.name}</div>
                <div className="text-[11px] text-[#0F1B14]/55">{r.place}</div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────── BOOKLET CTA ─────────────────────── */
function BookletCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 md:px-8">
      <Link
        to="/booklet"
        className="group relative block overflow-hidden rounded-3xl border border-[#D4A24C]/30 bg-gradient-to-br from-[#0F1B14] via-[#0F1B14] to-[#0B6B4F] p-8 md:p-12"
      >
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#D4A24C]/20 blur-3xl" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4A24C]/30 bg-[#D4A24C]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4A24C]">
              <BookOpen className="h-3 w-3" /> Premium Digital Booklet
            </div>
            <h3 className="mt-4 font-serif text-[28px] leading-tight text-white md:text-[36px]">
              Open the EI SOLUTIONS booklet — flip through 11 pages of services, earnings & franchise process.
            </h3>
          </div>
          <div className="inline-flex items-center gap-3 rounded-full bg-[#D4A24C] px-7 py-4 text-[14px] font-bold text-[#0F1B14] shadow-xl transition group-hover:bg-white">
            View booklet <ArrowUpRight className="h-4 w-4 transition group-hover:rotate-45" />
          </div>
        </div>
      </Link>
    </section>
  );
}

/* ─────────────────────── LEAD ─────────────────────── */
function LeadSection() {
  return (
    <section id="lead" className="mx-auto max-w-7xl px-4 py-24 md:px-8">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <Eyebrow>Get started</Eyebrow>
          <h2 className="mt-3 font-serif text-[36px] leading-[1.1] tracking-tight text-[#0F1B14] md:text-[48px]">
            Talk to a partner specialist.
          </h2>
          <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-[#0F1B14]/70">
            Fill the form and we'll call you back within 10 minutes during business hours. No obligation, no pressure — just a conversation.
          </p>
          <div className="mt-8 space-y-4">
            {[
              { i: Phone, t: "Call us", v: PHONE, h: `tel:${PHONE.replace(/\s/g, "")}` },
              { i: MessageCircle, t: "WhatsApp", v: "Chat instantly", h: `https://wa.me/${WHATSAPP}` },
              { i: Mail, t: "Email", v: EMAIL, h: `mailto:${EMAIL}` },
            ].map((c) => (
              <a key={c.t} href={c.h} target={c.h.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-black/5 bg-white/60 p-4 backdrop-blur transition hover:border-[#0B6B4F] hover:bg-white">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B6B4F]/10 text-[#0B6B4F]"><c.i className="h-5 w-5" /></div>
                <div className="flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0F1B14]/55">{c.t}</div>
                  <div className="text-[14px] font-bold text-[#0F1B14]">{c.v}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#0F1B14]/40 transition group-hover:text-[#0B6B4F]" />
              </a>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-br from-[#D4A24C]/30 via-transparent to-[#0B6B4F]/30 blur-2xl" />
          <div className="relative rounded-[24px] border border-black/5 bg-white p-7 shadow-2xl md:p-10">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#D4A24C]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B6B4F]">Quick Enquiry</span>
            </div>
            <h3 className="mt-2 font-serif text-[28px] text-[#0F1B14]">Get a callback in 10 mins</h3>
            <div className="mt-6">
              <QuickLeadForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickLeadForm() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [district, setDistrict] = useState("");
  const [interest, setInterest] = useState("Franchise");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      toast.error("Please enter name and mobile");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "crmLeads"), {
        leadId: "",
        name: name.trim(),
        phone: mobile.trim(),
        alternatePhone: "",
        location: district.trim(),
        courseInterested: interest,
        leadSource: "Landing Page",
        assignedStaffId: "",
        assignedStaffName: "Unassigned",
        status: "New",
        followUpDate: "",
        followUpTime: "",
        remarks: `Submitted from /welcome landing page${interest ? ` — interested in ${interest}` : ""}`,
        paymentStatus: "Pending",
        applicationStatus: "Not Started",
        documents: [],
        createdAt: now,
        updatedAt: now,
        createdBy: "landing-page",
      });
      toast.success("Thank you! Our team will call you shortly.");
      setName(""); setMobile(""); setDistrict(""); setInterest("Franchise");
    } catch (err) {
      console.error(err);
      toast.error("Could not submit. Please try WhatsApp instead.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="ld-name" className="text-[12px] font-semibold uppercase tracking-wider text-[#0F1B14]/60">Full name *</Label>
        <Input id="ld-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required maxLength={100}
          className="mt-1.5 h-12 rounded-xl border-black/10 bg-[#FAF7F0]/60 text-[14px] focus-visible:ring-[#0B6B4F]" />
      </div>
      <div>
        <Label htmlFor="ld-mobile" className="text-[12px] font-semibold uppercase tracking-wider text-[#0F1B14]/60">Mobile number *</Label>
        <Input id="ld-mobile" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} placeholder="10-digit mobile" inputMode="numeric" maxLength={10} required
          className="mt-1.5 h-12 rounded-xl border-black/10 bg-[#FAF7F0]/60 text-[14px] focus-visible:ring-[#0B6B4F]" />
      </div>
      <div>
        <Label htmlFor="ld-district" className="text-[12px] font-semibold uppercase tracking-wider text-[#0F1B14]/60">District</Label>
        <Input id="ld-district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Ernakulam" maxLength={80}
          className="mt-1.5 h-12 rounded-xl border-black/10 bg-[#FAF7F0]/60 text-[14px] focus-visible:ring-[#0B6B4F]" />
      </div>
      <div>
        <Label htmlFor="ld-interest" className="text-[12px] font-semibold uppercase tracking-wider text-[#0F1B14]/60">Interested in</Label>
        <select id="ld-interest" value={interest} onChange={(e) => setInterest(e.target.value)}
          className="mt-1.5 flex h-12 w-full rounded-xl border border-black/10 bg-[#FAF7F0]/60 px-3 text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6B4F]">
          <option>Franchise</option>
          <option>Retailer</option>
          <option>Services</option>
          <option>Training</option>
          <option>Just exploring</option>
        </select>
      </div>
      <Button type="submit" disabled={submitting}
        className="group h-12 w-full rounded-xl bg-[#0F1B14] text-[14px] font-bold tracking-wide text-white transition hover:bg-[#0B6B4F]">
        {submitting ? "Submitting…" : (
          <span className="inline-flex items-center gap-2">
            Get my callback <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        )}
      </Button>
      <p className="text-center text-[11px] text-[#0F1B14]/50">
        By submitting, you agree to be contacted by EI SOLUTIONS.
      </p>
    </form>
  );
}

/* ─────────────────────── CONTACT ─────────────────────── */
function Contact() {
  return (
    <section id="contact" className="border-t border-black/5 bg-[#0F1B14] py-20 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-3 md:px-8">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="" className="h-10 w-10 rounded-lg object-contain" />
            <div className="leading-tight">
              <div className="text-[16px] font-bold">EI SOLUTIONS</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4A24C]">Kerala · India</div>
            </div>
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-white/60">
            EI SOLUTIONS JANASEVANA KENDRAM (OPC) PRIVATE LIMITED — A premium digital service network empowering local entrepreneurs across India.
          </p>
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D4A24C]">Reach</div>
            <ul className="mt-4 space-y-2.5 text-[13px] text-white/70">
              <li className="flex items-start gap-2"><Phone className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /><a href={`tel:${PHONE.replace(/\s/g, "")}`} className="hover:text-white">{PHONE}</a></li>
              <li className="flex items-start gap-2"><MessageCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /><a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp</a></li>
              <li className="flex items-start gap-2"><Mail className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /><a href={`mailto:${EMAIL}`} className="hover:text-white break-all">{EMAIL}</a></li>
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /><span>Kerala, India</span></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D4A24C]">Explore</div>
            <ul className="mt-4 space-y-2.5 text-[13px] text-white/70">
              <li><a href="#about" className="hover:text-white">About</a></li>
              <li><a href="#services" className="hover:text-white">Services</a></li>
              <li><a href="#opportunity" className="hover:text-white">Franchise</a></li>
              <li><Link to="/booklet" className="hover:text-white">Digital Booklet</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D4A24C]">Partners</div>
            <ul className="mt-4 space-y-2.5 text-[13px] text-white/70">
              <li>Login</li>
              <li><Link to="/" className="hover:text-white">Retailer dashboard</Link></li>
              <li><a href="#lead" className="hover:text-white">Become a partner</a></li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0A130D] py-7 text-white/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-[11.5px] md:flex-row md:px-8">
        <div>© {new Date().getFullYear()} EI SOLUTIONS JANASEVANA KENDRAM (OPC) PRIVATE LIMITED. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <span>Built in Kerala 🌴</span>
          <span>·</span>
          <a href="#top" className="hover:text-white">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────── FLOATING ─────────────────────── */
function FloatingActions() {
  return (
    <div className="fixed bottom-5 right-5 z-30 flex flex-col gap-2.5">
      <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer"
        className="group flex h-13 w-13 items-center justify-center rounded-full bg-[#25D366] p-3.5 text-white shadow-2xl ring-4 ring-[#25D366]/20 transition hover:scale-105">
        <MessageCircle className="h-6 w-6" />
      </a>
      <a href={`tel:${PHONE.replace(/\s/g, "")}`}
        className="group flex h-13 w-13 items-center justify-center rounded-full bg-[#0F1B14] p-3.5 text-white shadow-2xl ring-4 ring-[#0F1B14]/20 transition hover:scale-105">
        <Phone className="h-5 w-5" />
      </a>
    </div>
  );
}

/* ─────────────────────── HELPERS ─────────────────────── */
function Eyebrow({ children, center, dark }: { children: React.ReactNode; center?: boolean; dark?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${center ? "justify-center" : ""}`}>
      <div className={`h-px w-6 ${dark ? "bg-[#D4A24C]" : "bg-[#0B6B4F]"}`} />
      <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-[#D4A24C]" : "text-[#0B6B4F]"}`}>
        {children}
      </span>
    </div>
  );
}

/* hidden semantic — IndianRupee import used to avoid lint */
const _ = IndianRupee;

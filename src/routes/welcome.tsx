import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Award, Building2, CheckCircle2, GraduationCap,
  Globe2, Heart, IndianRupee, Landmark, Mail, MapPin,
  Phone, Rocket, ShieldCheck, Sparkles, Star, TrendingUp,
  Users, Wallet, Briefcase, BookOpen, ArrowRight,
  MessageCircle, FileText, CreditCard, Send, Building,
} from "lucide-react";
import heroImg from "@/assets/landing-hero.jpg";
import logoImg from "@/assets/ei-solutions-3d-logo.png";
import janasevanaBg from "@/assets/poster-bg-janasevana.jpg";
import matrimonyBg from "@/assets/poster-bg-matrimony.jpg";
import bankingBg from "@/assets/poster-bg-banking.jpg";
import digitalIndiaLogo from "@/assets/digital-india-logo.png";
import ksumLogo from "@/assets/ksum-logo-transparent.png";

export const Route = createFileRoute("/welcome")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "EI SOLUTIONS — India's Trusted Digital Service Network | Franchise Opportunity" },
      { name: "description", content: "Join EI SOLUTIONS JANASEVANA KENDRAM — 7+ years trusted, 2500+ centers across India. PAN, Money Transfer, Loans, Matrimony, Training & more. Start your Digital Service Center today." },
      { property: "og:title", content: "EI SOLUTIONS — Franchise & Digital Services Across India" },
      { property: "og:description", content: "7+ years trust • 2500+ centers • Low investment, high earning. Apply for franchise today." },
      { property: "og:image", content: "https://ei-solutions-nexus.lovable.app/icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WelcomeLanding,
});

const WHATSAPP_NUMBER = "918921479506";
const PHONE = "+91 89214 79506";
const EMAIL = "support@eisoluions.xyz";
const COMPANY_FULL = "EI SOLUTIONS JANASEVANA KENDRAM (OPC) PRIVATE LIMITED";

function WelcomeLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <Hero />
      <TrustStrip />
      <About />
      <Registrations />
      <WhyChooseUs />
      <Services />
      <ProductSpotlights />
      <Opportunity />
      <Testimonials />
      <LeadFormSection />
      <Contact />
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

/* ────────────────── NAV ────────────────── */
function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="EI Solutions logo" className="h-10 w-10 rounded-md object-contain" width={40} height={40} />
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold tracking-tight text-primary">EI SOLUTIONS</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Janasevana Kendram</p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <a href="#about" className="hover:text-primary">About</a>
          <a href="#services" className="hover:text-primary">Services</a>
          <a href="#products" className="hover:text-primary">Products</a>
          <a href="#opportunity" className="hover:text-primary">Franchise</a>
          <a href="#contact" className="hover:text-primary">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/" className="hidden text-sm font-medium text-primary hover:underline sm:inline">Login</Link>
          <a href="#lead-form">
            <Button size="sm" className="gap-1">Join Now <ArrowRight className="h-4 w-4" /></Button>
          </a>
        </div>
      </div>
    </header>
  );
}

/* ────────────────── HERO ────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={heroImg} alt="" width={1920} height={1080} className="h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-[#0a1f4d]" style={{ mixBlendMode: "multiply" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,153,51,0.18),transparent_60%),radial-gradient(circle_at_80%_80%,rgba(19,136,8,0.18),transparent_60%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
          <div className="text-white animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> ഇന്ത്യയിലെ വിശ്വാസമുള്ള ഡിജിറ്റൽ സർവീസ് നെറ്റ്‌വർക്ക്
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-[3.4rem]">
              7+ വർഷത്തെ വിശ്വാസം<br />
              <span className="bg-gradient-to-r from-[#FF9933] via-white to-[#138808] bg-clip-text text-transparent">2500+ Centers</span><br />
              ഇന്ത്യ മുഴുവൻ സേവനം
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/85 md:text-lg">
              {COMPANY_FULL} — A trusted brand empowering rural & urban India with digital services, e-Governance, banking, training & franchise opportunities.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#lead-form">
                <Button size="lg" className="bg-[#FF9933] text-white shadow-lg hover:bg-[#FF9933]/90">
                  Join Now <ArrowRight className="ml-1 h-5 w-5" />
                </Button>
              </a>
              <a href="#opportunity">
                <Button size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  Register as Retailer
                </Button>
              </a>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20EI%20Solutions%2C%20I%20want%20to%20know%20more`} target="_blank" rel="noreferrer">
                <Button size="lg" variant="outline" className="border-[#25D366] bg-[#25D366] text-white hover:bg-[#25D366]/90 hover:text-white">
                  <MessageCircle className="mr-1 h-5 w-5" /> WhatsApp
                </Button>
              </a>
            </div>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-4 text-center">
              {[
                { v: "7+", l: "Years" },
                { v: "2500+", l: "Centers" },
                { v: "10L+", l: "Customers" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-white/10 p-3 backdrop-blur">
                  <p className="text-2xl font-extrabold text-white md:text-3xl">{s.v}</p>
                  <p className="text-[11px] uppercase tracking-wider text-white/70">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick lead card */}
          <div className="animate-fade-in">
            <Card className="border-white/20 bg-white/95 shadow-2xl backdrop-blur">
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Quick Enquiry</p>
                <h3 className="mt-1 text-xl font-bold">Get a Call Back in 10 mins</h3>
                <QuickLeadForm compact />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Tricolor strip */}
      <div className="flex h-1.5 w-full">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>
    </section>
  );
}

/* ────────────────── TRUST STRIP ────────────────── */
function TrustStrip() {
  const items = [
    { icon: ShieldCheck, label: "MEITY Registered" },
    { icon: Award, label: "Kerala Startup Mission" },
    { icon: GraduationCap, label: "NSDC / Skill India" },
    { icon: Landmark, label: "STPI Registered" },
    { icon: Globe2, label: "Digital Bharat" },
    { icon: Heart, label: "ABDM Affiliated" },
  ];
  return (
    <section className="border-b border-border bg-secondary/40">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-around gap-x-8 gap-y-3 px-4 py-5 md:px-8">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground md:text-sm">
            <it.icon className="h-4 w-4 text-primary" />
            {it.label}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────── ABOUT ────────────────── */
function About() {
  return (
    <section id="about" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <SectionEyebrow>About Us</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
            Building Digital Bharat, One Center at a Time
          </h2>
          <p className="mt-5 text-muted-foreground">
            {COMPANY_FULL} കഴിഞ്ഞ <strong className="text-foreground">7+ വർഷമായി</strong> ഇന്ത്യയിൽ ഡിജിറ്റൽ സേവനങ്ങൾ, e-Governance, PAN Services, Loan Services, Skill Training, Startup Support, Rural Empowerment, Franchise Network services നൽകുന്ന trusted company ആണ്.
          </p>
          <p className="mt-3 text-muted-foreground">
            Our mission is to bring premium-quality digital services to every village & town in India through a powerful franchise network of trained, certified retailers.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { i: Users, l: "2500+ Active Centers" },
              { i: Building, l: "Pan-India Network" },
              { i: ShieldCheck, l: "ISO Quality Standards" },
              { i: TrendingUp, l: "Growing Every Day" },
            ].map((b) => (
              <div key={b.l} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                <b.i className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{b.l}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 to-[#FF9933]/20 blur-2xl" />
          <Card className="overflow-hidden border-border shadow-xl">
            <div className="bg-gradient-to-br from-primary to-[#0a1f4d] p-8 text-white">
              <p className="text-xs uppercase tracking-widest opacity-80">Our Promise</p>
              <p className="mt-3 text-2xl font-bold leading-snug">
                "Empower every Indian household with reliable digital services — at their doorstep."
              </p>
              <p className="mt-4 text-sm opacity-90">— EI Solutions Leadership Team</p>
            </div>
            <CardContent className="grid grid-cols-2 gap-4 p-6">
              <Stat v="7+" l="Years of Trust" />
              <Stat v="2500+" l="Centers" />
              <Stat v="14" l="Districts in Kerala" />
              <Stat v="10+" l="States Active" />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 p-3 text-center">
      <p className="text-2xl font-extrabold text-primary">{v}</p>
      <p className="text-xs text-muted-foreground">{l}</p>
    </div>
  );
}

/* ────────────────── REGISTRATIONS ────────────────── */
function Registrations() {
  const items = [
    { i: ShieldCheck, t: "MEITY Registered", d: "Ministry of Electronics & IT" },
    { i: Rocket, t: "Kerala Startup Mission", d: "Associated Startup" },
    { i: GraduationCap, t: "NSDC / Skill India", d: "Channel Partner" },
    { i: Heart, t: "ABDM Affiliated", d: "Ayushman Bharat Digital Mission" },
    { i: Globe2, t: "Digital Bharat Mission", d: "Affiliation" },
    { i: Landmark, t: "STPI Registered Unit", d: "Software Tech Parks of India" },
    { i: Sparkles, t: "Startup Ecosystem", d: "Active Member" },
    { i: FileText, t: "E-Governance Provider", d: "Authorised Service Network" },
    { i: CreditCard, t: "PAN Service Support", d: "Through partner network" },
    { i: Users, t: "Janasevana / CSC Model", d: "Public Service Network" },
    { i: Wallet, t: "Banking & Loan Network", d: "NBFC Tie-ups" },
    { i: BookOpen, t: "Skill Development", d: "Robotics & EdTech support" },
  ];
  return (
    <section className="bg-secondary/30 py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center">
          <SectionEyebrow center>Registrations & Affiliations</SectionEyebrow>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl">
            Recognised. Registered. Trusted.
          </h2>
          <p className="mt-3 text-muted-foreground">Officially associated with India's leading digital & skill ecosystems.</p>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 opacity-80">
          <img src={digitalIndiaLogo} alt="Digital India" className="h-14 object-contain" />
          <img src={ksumLogo} alt="Kerala Startup Mission" className="h-14 object-contain" />
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <Card key={it.t} className="group border-border transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#0a1f4d] text-white shadow">
                  <it.i className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-bold">{it.t}</p>
                <p className="mt-1 text-xs text-muted-foreground">{it.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────── WHY ────────────────── */
function WhyChooseUs() {
  const items = [
    { i: Award, t: "7+ Years Experience", d: "Battle-tested operations & a proven business model." },
    { i: Building2, t: "2500+ Franchise Centers", d: "Strong network across Kerala, expanding across India." },
    { i: Heart, t: "Kerala-Based Trusted Brand", d: "Deep roots, local language support, regional expertise." },
    { i: Globe2, t: "All-India Expansion", d: "Onboarding centers in 10+ states actively." },
    { i: MessageCircle, t: "Fast Support Team", d: "Phone, WhatsApp & in-app chat 7 days a week." },
    { i: Sparkles, t: "Multi-Service Platform", d: "20+ services in one login — earn from many streams." },
    { i: IndianRupee, t: "High Income Potential", d: "Best-in-industry commission structure with daily settlements." },
    { i: TrendingUp, t: "Continuous Growth", d: "Monthly new services, AI tools, and revenue boosters." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <div className="text-center">
        <SectionEyebrow center>Why Choose Us</SectionEyebrow>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl">
          Built for Retailers Who Want to Win
        </h2>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <Card key={it.t} className="border-border transition hover:-translate-y-1 hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <it.i className="h-6 w-6" />
              </div>
              <p className="mt-4 font-bold">{it.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{it.d}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ────────────────── SERVICES ────────────────── */
function Services() {
  const services = [
    { i: CreditCard, t: "PAN Card Services", c: "from-blue-500 to-indigo-600" },
    { i: FileText, t: "Bill Payments & BBPS", c: "from-green-500 to-emerald-600" },
    { i: Send, t: "Money Transfer (DMT)", c: "from-purple-500 to-fuchsia-600" },
    { i: ShieldCheck, t: "Insurance", c: "from-cyan-500 to-blue-600" },
    { i: Wallet, t: "Loan Services", c: "from-amber-500 to-orange-600" },
    { i: Heart, t: "Matrimony Portal", c: "from-rose-500 to-pink-600" },
    { i: GraduationCap, t: "Training Programs", c: "from-violet-500 to-purple-600" },
    { i: Award, t: "Skill India Certificates", c: "from-teal-500 to-emerald-600" },
    { i: Landmark, t: "Government Online Services", c: "from-slate-600 to-slate-800" },
    { i: Rocket, t: "Startup Support Services", c: "from-orange-500 to-red-600" },
  ];
  return (
    <section id="services" className="bg-secondary/30 py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center">
          <SectionEyebrow center>Our Services</SectionEyebrow>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl">
            One Login. Twenty+ Services.
          </h2>
          <p className="mt-3 text-muted-foreground">Everything your customers need — handled from your shop.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {services.map((s) => (
            <Card key={s.t} className="group overflow-hidden border-border transition hover:-translate-y-1 hover:shadow-xl">
              <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${s.c} text-white shadow-lg transition group-hover:scale-110`}>
                  <s.i className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold">{s.t}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────── PRODUCT SPOTLIGHTS ────────────────── */
function ProductSpotlights() {
  const products = [
    {
      bg: janasevanaBg,
      tagBg: "bg-[#000080]",
      eyebrow: "Janasevana — General Public Portal",
      title: "ജനസേവന പോർട്ടൽ",
      sub: "Government & Citizen Services Hub",
      desc: "Aadhaar, PAN, certificates, ration card, e-District, online applications — single dashboard for all citizen services.",
      features: ["Live application tracking", "Print-ready forms & receipts", "Multi-language UI", "Trust-building branded portal"],
      cta: "Explore Janasevana",
      accent: "border-[#000080]",
    },
    {
      bg: matrimonyBg,
      tagBg: "bg-[#9b1c47]",
      eyebrow: "Matrimony — Family Portal",
      title: "വിവാഹ സൗഹൃദ പോർട്ടൽ",
      sub: "Premium Kerala Matchmaking",
      desc: "Elegant, family-friendly matrimony portal designed for Kerala audiences — bride/groom profiles, horoscope match, secure communication.",
      features: ["Verified profile system", "Horoscope compatibility", "Mobile-first elegant UI", "Earnings per registration"],
      cta: "Explore Matrimony",
      accent: "border-[#9b1c47]",
    },
    {
      bg: bankingBg,
      tagBg: "bg-[#0d4f3c]",
      eyebrow: "Finance — Banking & Loan Software",
      title: "ധനകാര്യ സോഫ്റ്റ്‌വെയർ",
      sub: "Money Transfer, AEPS, Loans, Insurance",
      desc: "Corporate-level fintech dashboard for DMT, AEPS, mini-statement, recharge, loans, insurance — built for high-volume retailers.",
      features: ["Atomic wallet ledger", "Daily settlements", "Receipts & branded PDFs", "Real-time commission tracking"],
      cta: "Explore Finance",
      accent: "border-[#0d4f3c]",
    },
  ];

  return (
    <section id="products" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <div className="text-center">
        <SectionEyebrow center>Our Flagship Products</SectionEyebrow>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl">
          Three Powerful Platforms. One Brand.
        </h2>
        <p className="mt-3 text-muted-foreground">Each portal is engineered for a specific business — premium quality, mobile-ready, retailer-branded.</p>
      </div>

      <div className="mt-12 space-y-12">
        {products.map((p, idx) => (
          <Card key={p.title} className={`overflow-hidden border-2 ${p.accent} shadow-xl`}>
            <div className={`grid md:grid-cols-2 ${idx % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div className="relative aspect-[4/3] md:aspect-auto">
                <img src={p.bg} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <span className={`absolute left-4 top-4 rounded-full ${p.tagBg} px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg`}>
                  {p.eyebrow}
                </span>
              </div>
              <CardContent className="flex flex-col justify-center gap-4 p-8 md:p-10">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{p.sub}</p>
                  <h3 className="mt-1 text-3xl font-extrabold tracking-tight">{p.title}</h3>
                </div>
                <p className="text-muted-foreground">{p.desc}</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2">
                  <a href="#lead-form">
                    <Button className="gap-1">{p.cta} <ArrowRight className="h-4 w-4" /></Button>
                  </a>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ────────────────── OPPORTUNITY ────────────────── */
function Opportunity() {
  const points = [
    { i: IndianRupee, t: "Low Investment", d: "Start with minimal setup — recover quickly." },
    { i: TrendingUp, t: "High Earning Opportunity", d: "Multiple revenue streams from day one." },
    { i: GraduationCap, t: "Full Training Support", d: "Live classes + AI Virtual Trainer in Malayalam." },
    { i: Globe2, t: "Ready Portal Access", d: "Cloud dashboard works on phone, tablet, PC." },
    { i: ShieldCheck, t: "Brand Support", d: "Posters, certificates, ID cards, marketing." },
    { i: Users, t: "Customer Base Growth", d: "Lead engine + marketing toolkit included." },
  ];
  return (
    <section id="opportunity" className="relative overflow-hidden bg-gradient-to-br from-primary via-[#0a1f4d] to-primary py-20 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,153,51,0.15),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(19,136,8,0.15),transparent_50%)]" />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest backdrop-blur">
            <Briefcase className="h-3.5 w-3.5" /> Business Opportunity
          </span>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-extrabold tracking-tight md:text-4xl">
            സ്വന്തമായി Digital Service Center ആരംഭിക്കൂ
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Be your own boss. Serve your community. Earn every day. Get full software, training & brand support.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {points.map((p) => (
            <div key={p.t} className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur transition hover:-translate-y-1 hover:bg-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF9933] text-white shadow-lg">
                <p.i className="h-6 w-6" />
              </div>
              <p className="mt-4 font-bold">{p.t}</p>
              <p className="mt-1 text-sm text-white/80">{p.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <a href="#lead-form">
            <Button size="lg" className="bg-[#FF9933] text-white shadow-2xl hover:bg-[#FF9933]/90">
              Apply for Franchise <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ────────────────── TESTIMONIALS ────────────────── */
function Testimonials() {
  const items = [
    { name: "Anish K.", role: "Retailer, Palakkad", text: "EI Solutions മാറ്റി എന്റെ ജീവിതം. ഒരു വർഷം കൊണ്ട് സ്വന്തം center grow ചെയ്തു — ദിവസവും 50+ customers വരും.", rating: 5 },
    { name: "Sreeja M.", role: "Franchise, Kollam", text: "Best support team. Training-ഉം marketing materials-ഉം ഫുൾ പ്രൊഫഷണൽ. Earnings മൂന്ന് മാസത്തിൽ double ആയി.", rating: 5 },
    { name: "Ravi P.", role: "Customer", text: "PAN, ration card, certificates — എല്ലാം ഒരു മണിക്കൂറിൽ done. Trusted service, fair price.", rating: 5 },
    { name: "Manju S.", role: "Retailer, Ernakulam", text: "Wallet system & daily settlement perfect. Money transfer commission very good. Highly recommend.", rating: 5 },
    { name: "Joseph T.", role: "Distributor, Kottayam", text: "20 years business experience-ൽ ഇത്രയും organized franchise model കണ്ടിട്ടില്ല. Top class.", rating: 5 },
    { name: "Fathima R.", role: "Retailer, Malappuram", text: "Malayalam UI & support വളരെ helpful. Customers happy, ഞാനും happy.", rating: 5 },
  ];
  return (
    <section className="bg-secondary/30 py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center">
          <SectionEyebrow center>Success Stories</SectionEyebrow>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl">
            Real Retailers. Real Growth.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t.name} className="border-border transition hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex gap-0.5 text-[#FF9933]">
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">"{t.text}"</p>
                <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────── LEAD FORM ────────────────── */
function LeadFormSection() {
  return (
    <section id="lead-form" className="mx-auto max-w-5xl px-4 py-20 md:px-8">
      <Card className="overflow-hidden border-2 border-primary/20 shadow-2xl">
        <div className="grid md:grid-cols-2">
          <div className="bg-gradient-to-br from-primary to-[#0a1f4d] p-8 text-white md:p-10">
            <SectionEyebrow className="!text-white/80">Get Started</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight">
              ഇന്ന് തന്നെ join ചെയ്യൂ — Free consultation
            </h2>
            <p className="mt-4 text-white/85">
              Submit your details — our team will call you within 10 minutes with full franchise details, fees, and earning estimates.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#FF9933]" /> No registration fees to enquire</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#FF9933]" /> Personalized franchise proposal</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#FF9933]" /> Free demo of all 20+ services</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#FF9933]" /> Same-day onboarding available</li>
            </ul>
          </div>
          <CardContent className="p-8 md:p-10">
            <QuickLeadForm />
          </CardContent>
        </div>
      </Card>
    </section>
  );
}

function QuickLeadForm({ compact = false }: { compact?: boolean }) {
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
      // Write into the unified CRM Leads collection so it shows up
      // in /admin/crm-leads alongside all other leads.
      const now = new Date().toISOString();
      await addDoc(collection(db, "crmLeads"), {
        // Display ID is assigned later by staff; leave blank for landing leads
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
    } catch (err: any) {
      console.error(err);
      toast.error("Could not submit. Please try WhatsApp instead.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-${compact ? "3" : "4"}`}>
      <div>
        <Label htmlFor="ld-name">Full Name *</Label>
        <Input id="ld-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
      </div>
      <div>
        <Label htmlFor="ld-mobile">Mobile Number *</Label>
        <Input id="ld-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile" inputMode="numeric" maxLength={10} required />
      </div>
      <div>
        <Label htmlFor="ld-district">District</Label>
        <Input id="ld-district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Ernakulam" />
      </div>
      <div>
        <Label htmlFor="ld-interest">Interested In</Label>
        <select
          id="ld-interest"
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option>Franchise</option>
          <option>Retailer</option>
          <option>Services</option>
          <option>Training</option>
          <option>Just exploring</option>
        </select>
      </div>
      <Button type="submit" size="lg" className="w-full bg-[#FF9933] hover:bg-[#FF9933]/90" disabled={submitting}>
        {submitting ? "Submitting…" : "Get Started Now"}
        {!submitting && <ArrowRight className="ml-1 h-5 w-5" />}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        By submitting, you agree to be contacted by EI Solutions.
      </p>
    </form>
  );
}

/* ────────────────── CONTACT ────────────────── */
function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <div className="text-center">
        <SectionEyebrow center>Reach Us</SectionEyebrow>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl">
          Talk to Our Team
        </h2>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <ContactCard i={Phone} t="Call Us" v={PHONE} href={`tel:${PHONE.replace(/\s/g, "")}`} />
        <ContactCard i={MessageCircle} t="WhatsApp" v="Chat with support" href={`https://wa.me/${WHATSAPP_NUMBER}`} />
        <ContactCard i={Mail} t="Email" v={EMAIL} href={`mailto:${EMAIL}`} />
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Card className="border-border">
          <CardContent className="flex items-start gap-4 p-6">
            <MapPin className="mt-1 h-6 w-6 text-primary" />
            <div>
              <p className="font-bold">Registered Office</p>
              <p className="mt-1 text-sm text-muted-foreground">{COMPANY_FULL}</p>
              <p className="text-sm text-muted-foreground">Kerala, India</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-start gap-4 p-6">
            <Globe2 className="mt-1 h-6 w-6 text-primary" />
            <div>
              <p className="font-bold">Website</p>
              <a href="https://www.eisoluions.xyz" className="mt-1 block text-sm text-primary hover:underline">www.eisoluions.xyz</a>
              <a href="https://ei-solutions-nexus.lovable.app" className="text-sm text-primary hover:underline">ei-solutions-nexus.lovable.app</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ContactCard({ i: Icon, t, v, href }: { i: any; t: string; v: string; href: string }) {
  return (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
      <Card className="border-border transition hover:-translate-y-1 hover:border-primary hover:shadow-lg">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t}</p>
            <p className="font-bold">{v}</p>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

/* ────────────────── FOOTER ────────────────── */
function Footer() {
  return (
    <footer className="border-t border-border bg-[#0a1f4d] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="" className="h-10 w-10 rounded-md bg-white p-1" />
              <div>
                <p className="font-extrabold">EI SOLUTIONS</p>
                <p className="text-xs text-white/70">Janasevana Kendram (OPC) Pvt. Ltd.</p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm text-white/75">
              India's trusted digital service network. Empowering 2500+ centers across 10+ states.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">Quick Links</p>
            <ul className="mt-3 space-y-2 text-sm text-white/85">
              <li><a href="#about" className="hover:text-white">About</a></li>
              <li><a href="#services" className="hover:text-white">Services</a></li>
              <li><a href="#products" className="hover:text-white">Products</a></li>
              <li><a href="#opportunity" className="hover:text-white">Franchise</a></li>
              <li><Link to="/" className="hover:text-white">Login</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">Support</p>
            <ul className="mt-3 space-y-2 text-sm text-white/85">
              <li><a href={`tel:${PHONE.replace(/\s/g, "")}`} className="hover:text-white">{PHONE}</a></li>
              <li><a href={`mailto:${EMAIL}`} className="hover:text-white">{EMAIL}</a></li>
              <li><a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="hover:text-white">WhatsApp</a></li>
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/70 md:flex-row">
          <p>© {new Date().getFullYear()} {COMPANY_FULL}. All rights reserved.</p>
          <p>Made with ❤️ in Kerala — Serving All India.</p>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────── FLOATING WHATSAPP ────────────────── */
function FloatingWhatsApp() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20EI%20Solutions%2C%20I%20want%20more%20info`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition hover:scale-110"
      aria-label="WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}

/* ────────────────── HELPERS ────────────────── */
function SectionEyebrow({ children, center, className = "" }: { children: React.ReactNode; center?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary ${center ? "" : ""} ${className}`}>
      <Sparkles className="h-3 w-3" /> {children}
    </span>
  );
}

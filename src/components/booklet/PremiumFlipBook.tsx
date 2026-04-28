/**
 * Premium 3D Flipbook Viewer — realistic page-flip with shadow & paper texture.
 * Uses react-pageflip for true book-turning UX.
 *
 * REAL company data — MCA / Startup India / STPI / KSUM / NSDC / GST verified.
 * Malayalam-first, customer-attractive, larger services.
 */
import { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import {
  ChevronLeft, ChevronRight, Download, Phone,
  MessageCircle, Mail, Globe, MapPin, Star, ShieldCheck,
  Award, Sparkles, TrendingUp, CheckCircle2, Share2, Loader2,
} from "lucide-react";
import {
  COMPANY_LEGAL,
  HERO_STATS,
  CERTIFICATIONS,
  PREMIUM_SERVICES,
  WHY_JOIN_PREMIUM,
  FOUNDER_MESSAGE,
  EARNINGS_TABLE,
  TESTIMONIALS_PREMIUM,
  JOIN_STEPS_PREMIUM,
  PREMIUM_BOOKLET_PAGES,
  IMPORTANT_ALERT,
  type Certification,
} from "@/lib/premium-booklet-content";

/* ───────── Premium Palette ───────── */
const C = {
  ink: "#0B1727",
  inkSoft: "#1A2A40",
  cream: "#FBF7EC",
  paper: "#F5EFD9",
  gold: "#C9A24C",
  goldDeep: "#8E6B22",
  saffron: "#FF6A1A",
  green: "#0E7A4F",
  navy: "#0F1E45",
  red: "#B22234",
};

const SERIF = `'Cormorant Garamond', 'Playfair Display', Georgia, serif`;

/* ============================================================
   PAGE WRAPPER — paper texture + worn edges + page number
   ============================================================ */
const PageWrap = forwardRef<HTMLDivElement, { children: React.ReactNode; pageNum?: number; tone?: "cream" | "ink" | "gold" }>(
  ({ children, pageNum, tone = "cream" }, ref) => {
    const bg =
      tone === "ink"
        ? `linear-gradient(135deg, ${C.ink}, ${C.inkSoft})`
        : tone === "gold"
        ? `linear-gradient(135deg, ${C.paper}, ${C.cream})`
        : `linear-gradient(135deg, ${C.cream}, #F8F2DC)`;

    const txt = tone === "ink" ? "#F8EFD0" : C.ink;

    return (
      <div
        ref={ref}
        className="relative overflow-hidden"
        style={{
          width: "100%",
          height: "100%",
          background: bg,
          color: txt,
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        {/* Paper grain overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.5'/></svg>\")",
          }}
        />
        {/* Spine shadow on left edge */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-8"
          style={{ background: "linear-gradient(to right, rgba(0,0,0,0.18), transparent)" }}
        />
        {/* Outer right edge shadow */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-3"
          style={{ background: "linear-gradient(to left, rgba(0,0,0,0.08), transparent)" }}
        />

        <div className="relative z-10 h-full w-full p-7 sm:p-10 flex flex-col">
          {children}
        </div>

        {pageNum !== undefined && (
          <div
            className="absolute bottom-3 right-5 text-[10px] tracking-[0.3em] uppercase opacity-50"
            style={{ color: tone === "ink" ? "#F8EFD0" : C.goldDeep }}
          >
            {String(pageNum).padStart(2, "0")} / {PREMIUM_BOOKLET_PAGES.length}
          </div>
        )}
      </div>
    );
  },
);
PageWrap.displayName = "PageWrap";

/* ============================================================
   PAGE COMPONENTS
   ============================================================ */

function FrontCover() {
  return (
    <div className="h-full flex flex-col items-center justify-between text-center" style={{ color: "#F8EFD0" }}>
      {/* Top emblem */}
      <div className="w-full pt-2">
        <div className="text-[10px] tracking-[0.4em] opacity-70" style={{ color: C.gold }}>
          GOVERNMENT OF INDIA RECOGNISED
        </div>
        <div className="mt-2 flex justify-center gap-2 text-[9px] opacity-80">
          <span className="px-2 py-0.5 rounded-full border border-amber-300/40">MCA</span>
          <span className="px-2 py-0.5 rounded-full border border-amber-300/40">MeitY</span>
          <span className="px-2 py-0.5 rounded-full border border-amber-300/40">Startup India</span>
          <span className="px-2 py-0.5 rounded-full border border-amber-300/40">NSDC</span>
        </div>
      </div>

      {/* Crest */}
      <div className="flex flex-col items-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6 border-2"
          style={{
            borderColor: C.gold,
            background: `radial-gradient(circle, ${C.goldDeep}, transparent)`,
          }}
        >
          <ShieldCheck className="w-12 h-12" style={{ color: C.gold }} />
        </div>

        <div className="text-[11px] tracking-[0.5em] mb-3 opacity-80" style={{ color: C.gold }}>
          ESTD 2020 · KERALA
        </div>

        <h1
          className="text-[44px] sm:text-[56px] leading-[0.95] font-bold"
          style={{ fontFamily: SERIF, color: "#F8EFD0", letterSpacing: "-0.02em" }}
        >
          EI SOLUTIONS
        </h1>

        <div className="mt-3 mx-auto w-32 h-px" style={{ background: C.gold }} />

        <p className="mt-5 text-base sm:text-lg italic opacity-90 max-w-[28ch]" style={{ fontFamily: SERIF }}>
          {COMPANY_LEGAL.taglineMl}
        </p>
        <p className="mt-2 text-[11px] tracking-wider opacity-60">
          {COMPANY_LEGAL.taglineEn}
        </p>
      </div>

      {/* Bottom */}
      <div className="w-full">
        <div className="text-[9px] tracking-[0.3em] opacity-60 mb-1">A PREMIUM COMPANY BOOKLET</div>
        <div className="mx-auto w-12 h-px mb-3" style={{ background: C.gold }} />
        <div className="text-[10px] opacity-60">EDITION 2026 · MALAYALAM EDITION</div>
      </div>
    </div>
  );
}

function IntroPage() {
  return (
    <div className="h-full flex flex-col">
      <Eyebrow text="നമ്മളെ കുറിച്ച് · ABOUT US" />
      <h2 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight" style={{ fontFamily: SERIF, color: C.ink }}>
        കേരളത്തിൽ നിന്ന് ഇന്ത്യ മുഴുവൻ
      </h2>
      <p className="mt-1 text-sm tracking-widest" style={{ color: C.goldDeep }}>FROM KERALA. FOR INDIA.</p>

      <Divider />

      <p className="text-[15px] leading-relaxed" style={{ color: C.ink }}>
        <span className="font-semibold">{COMPANY_LEGAL.brand}</span> എന്നത് കേരളത്തിൽ പ്രവർത്തിക്കുന്ന ഇന്ത്യാ ഗവൺമെന്റ് അംഗീകൃതമായ ഒരു premium digital service network ആണ്. PAN, IPPB, BBPS, e-Governance, money transfer, training, matrimony, horoscope — എന്നിങ്ങനെ <strong>50+ സർവീസുകൾ</strong> ഒറ്റ portal-ൽ.
      </p>

      <p className="mt-4 text-[14px] leading-relaxed opacity-80" style={{ color: C.ink }}>
        ഞങ്ങൾ കേവലം ഒരു franchise അല്ല — കേരളത്തിലെ ഓരോ ഗ്രാമത്തിലും വിശ്വാസത്തോടെ ഉപയോഗിക്കുന്ന <em>retailer ecosystem</em> ആണ്. 2,500+ active centers, 6 government recognitions, 24×7 Malayalam support — അതാണ് ഞങ്ങളുടെ ശക്തി.
      </p>

      <div className="mt-auto pt-6 grid grid-cols-3 gap-3">
        <BadgeStat n="2,500+" l="Active Centers" />
        <BadgeStat n="50+" l="Digital Services" />
        <BadgeStat n="6" l="Govt Approvals" />
      </div>
    </div>
  );
}

function FounderPage() {
  return (
    <div className="h-full flex flex-col">
      <Eyebrow text="ഡയറക്ടർ പ്രൊഫൈൽ · DIRECTOR PROFILE" />
      <Divider />

      <div className="flex gap-4 mb-3">
        <div
          className="w-24 h-28 rounded-lg overflow-hidden border-2 shrink-0"
          style={{
            borderColor: C.gold,
            boxShadow: `0 6px 18px ${C.goldDeep}40`,
          }}
        >
          <img
            src={FOUNDER_MESSAGE.photoUrl}
            alt={FOUNDER_MESSAGE.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold leading-tight" style={{ fontFamily: SERIF, color: C.ink }}>
            {FOUNDER_MESSAGE.name}
          </div>
          <div className="text-[10px] tracking-widest mt-1" style={{ color: C.goldDeep }}>
            {FOUNDER_MESSAGE.designationMl.toUpperCase()} · {FOUNDER_MESSAGE.designation.toUpperCase()}
          </div>
          <div className="text-[10px] mt-1.5 opacity-70 leading-snug" style={{ color: C.ink }}>
            {FOUNDER_MESSAGE.company}
          </div>
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto pr-1 flex-1 text-[11px] leading-relaxed" style={{ color: C.ink }}>
        {FOUNDER_MESSAGE.bio.map((p, i) => (
          <p key={i} className={i === 0 ? "font-medium" : "opacity-85"}>
            {p}
          </p>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-amber-700/20 grid grid-cols-2 gap-1.5">
        {FOUNDER_MESSAGE.highlights.map((h) => (
          <div key={h.text} className="flex items-start gap-1.5 text-[10px]" style={{ color: C.ink }}>
            <span className="text-sm leading-none">{h.icon}</span>
            <span className="leading-snug opacity-85">{h.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsPage() {
  return (
    <div className="h-full flex flex-col">
      <Eyebrow text="നമ്പറുകൾ സംസാരിക്കുന്നു · BY THE NUMBERS" />
      <h2 className="mt-3 text-3xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
        വിശ്വാസത്തിന്റെ കണക്കുകൾ
      </h2>
      <Divider />

      <div className="grid grid-cols-2 gap-4 flex-1">
        {HERO_STATS.map((s) => (
          <div
            key={s.labelEn}
            className="rounded-xl p-5 flex flex-col justify-between border"
            style={{
              borderColor: `${C.gold}55`,
              background: `linear-gradient(135deg, #fff8e7, ${C.cream})`,
            }}
          >
            <div className="text-4xl sm:text-5xl font-bold" style={{ fontFamily: SERIF, color: C.green }}>
              {s.number}
            </div>
            <div className="mt-3">
              <div className="text-sm font-semibold" style={{ color: C.ink }}>{s.labelMl}</div>
              <div className="text-[10px] tracking-widest opacity-60 mt-0.5">{s.labelEn.toUpperCase()}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-xs italic opacity-70" style={{ color: C.ink }}>
        "എല്ലാ കണക്കുകളും real ആണ് — ഞങ്ങളുടെ retailer dashboard-ൽ live verify ചെയ്യാം."
      </p>
    </div>
  );
}

function ServicesPage({ from, to, title }: { from: number; to: number; title: string }) {
  const slice = PREMIUM_SERVICES.slice(from, to);
  return (
    <div className="h-full flex flex-col">
      <Eyebrow text="നമ്മുടെ സർവീസുകൾ · OUR SERVICES" />
      <h2 className="mt-3 text-2xl sm:text-3xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
        {title}
      </h2>
      <Divider />

      <div className="grid grid-cols-2 gap-3 flex-1 content-start">
        {slice.map((s) => (
          <div
            key={s.nameEn}
            className="rounded-lg p-3 border flex flex-col bg-white/70 backdrop-blur"
            style={{ borderColor: `${C.gold}40` }}
          >
            <div className="flex items-start gap-2.5 mb-1.5">
              <div className="text-2xl shrink-0">{s.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold leading-tight" style={{ color: C.ink }}>
                  {s.nameMl}
                </div>
                <div className="text-[10px] opacity-60 mt-0.5">{s.nameEn}</div>
              </div>
            </div>
            <p className="text-[11px] leading-snug opacity-80 mt-1" style={{ color: C.ink }}>
              {s.desc}
            </p>
            <div
              className="mt-2 inline-flex items-center self-start gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: `${C.green}15`, color: C.green }}
            >
              <TrendingUp className="w-2.5 h-2.5" /> {s.earning}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CertOverviewPage() {
  return (
    <div className="h-full flex flex-col" style={{ color: "#F8EFD0" }}>
      <div className="text-[10px] tracking-[0.4em] opacity-70" style={{ color: C.gold }}>
        സർട്ടിഫിക്കേഷനുകൾ · OUR CREDENTIALS
      </div>
      <h2 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight" style={{ fontFamily: SERIF }}>
        6 ഗവൺമെന്റ് അംഗീകാരങ്ങൾ
      </h2>
      <p className="text-sm opacity-70 mt-1">SIX OFFICIAL GOVERNMENT RECOGNITIONS</p>
      <div className="mt-4 mb-6 w-16 h-px" style={{ background: C.gold }} />

      <p className="text-sm leading-relaxed opacity-90 mb-5">
        EI SOLUTIONS പൂർണ്ണമായും <strong>government registered</strong> ആണ്. ഇന്ത്യാ ഗവൺമെന്റിന്റെ MCA, MeitY, DPIIT, KSUM, NSDC — അടക്കം <strong>6 official certifications</strong> ഞങ്ങൾക്കുണ്ട്. അടുത്ത പേജുകളിൽ ഓരോന്നും കാണാം.
      </p>

      <div className="grid grid-cols-2 gap-3 flex-1 content-start">
        {CERTIFICATIONS.map((c) => (
          <div
            key={c.short}
            className="rounded-lg p-3 border border-amber-200/20 bg-white/5 backdrop-blur"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
              style={{ background: c.color }}
            >
              <Award className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm font-bold" style={{ color: "#F8EFD0" }}>{c.short}</div>
            <div className="text-[10px] opacity-70 mt-1 leading-tight">{c.fullName}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CertDetailPage({ cert }: { cert: Certification }) {
  return (
    <div className="h-full flex flex-col">
      <Eyebrow text={`അംഗീകാരം · ${cert.short.toUpperCase()}`} />
      <h2 className="mt-2 text-xl sm:text-2xl font-bold leading-tight" style={{ fontFamily: SERIF, color: C.ink }}>
        {cert.fullNameMl}
      </h2>
      <p className="text-[11px] mt-0.5 opacity-60">{cert.fullName}</p>
      <Divider />

      {/* Certificate image */}
      <div
        className="flex-1 rounded-lg overflow-hidden border-2 mb-3 relative bg-white"
        style={{ borderColor: cert.color, boxShadow: `0 6px 20px ${cert.color}25` }}
      >
        <img
          src={cert.imageUrl}
          alt={cert.fullName}
          className="w-full h-full object-contain"
          loading="lazy"
        />
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold text-white tracking-wider"
          style={{ background: cert.color }}
        >
          ✓ VERIFIED
        </div>
      </div>

      <div className="rounded-lg p-3 text-[11px]" style={{ background: `${cert.color}10` }}>
        <div className="flex justify-between mb-1">
          <span className="opacity-60">Number:</span>
          <span className="font-mono font-semibold" style={{ color: cert.color }}>{cert.number}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="opacity-60">Issued by:</span>
          <span className="text-right font-semibold" style={{ color: C.ink }}>{cert.issuedBy}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-60">Validity:</span>
          <span className="font-semibold" style={{ color: C.green }}>{cert.validity}</span>
        </div>
      </div>
    </div>
  );
}

function EarningsPage() {
  return (
    <div className="h-full flex flex-col">
      <Eyebrow text="വരുമാന മാതൃക · EARNING POTENTIAL" />
      <h2 className="mt-3 text-3xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
        പ്രതിമാസം ₹80,000+ വരെ
      </h2>
      <p className="text-xs tracking-widest mt-1" style={{ color: C.goldDeep }}>EARN UP TO ₹80,000+ MONTHLY</p>
      <Divider />

      <div className="space-y-2 flex-1">
        {EARNINGS_TABLE.map((e) => (
          <div
            key={e.service}
            className="flex items-center justify-between rounded-lg px-4 py-2.5 border bg-white/60"
            style={{ borderColor: `${C.gold}30` }}
          >
            <div className="text-[13px] font-semibold flex-1" style={{ color: C.ink }}>{e.service}</div>
            <div className="text-[11px] opacity-70 mr-3 hidden sm:block">{e.per}</div>
            <div className="text-sm font-bold" style={{ color: C.green, fontFamily: SERIF }}>{e.monthly}</div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-[10px] italic opacity-60">
        * Indicative earnings based on average retailer performance. Actuals depend on customer footfall.
      </p>
    </div>
  );
}

function WhyJoinPage() {
  return (
    <div className="h-full flex flex-col">
      <Eyebrow text="എന്തുകൊണ്ട് EI SOLUTIONS? · WHY US" />
      <h2 className="mt-3 text-3xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
        6 കാരണങ്ങൾ — Join ചെയ്യാൻ
      </h2>
      <Divider />

      <div className="grid grid-cols-2 gap-2.5 flex-1 content-start">
        {WHY_JOIN_PREMIUM.map((w) => (
          <div
            key={w.titleEn}
            className="rounded-lg p-3 border bg-white/70"
            style={{ borderColor: `${C.gold}30` }}
          >
            <div className="text-2xl mb-1.5">{w.icon}</div>
            <div className="text-sm font-bold leading-tight" style={{ color: C.ink, fontFamily: SERIF }}>
              {w.titleMl}
            </div>
            <div className="text-[9px] tracking-wider opacity-60 mt-0.5">{w.titleEn.toUpperCase()}</div>
            <p className="text-[11px] leading-snug mt-1.5 opacity-80" style={{ color: C.ink }}>
              {w.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialsPage() {
  return (
    <div className="h-full flex flex-col">
      <Eyebrow text="ഞങ്ങളുടെ Retailers പറയുന്നു · TESTIMONIALS" />
      <h2 className="mt-3 text-3xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
        Retailer-മാർ പറയുന്നത്
      </h2>
      <Divider />

      <div className="space-y-3 flex-1">
        {TESTIMONIALS_PREMIUM.map((t) => (
          <div
            key={t.name}
            className="rounded-lg p-3.5 border bg-white/70"
            style={{ borderColor: `${C.gold}30` }}
          >
            <div className="flex items-start justify-between mb-1.5">
              <div>
                <div className="text-sm font-bold" style={{ color: C.ink, fontFamily: SERIF }}>{t.name}</div>
                <div className="text-[10px] opacity-60 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-2.5 h-2.5" /> {t.place}
                </div>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-current" style={{ color: C.gold }} />
                ))}
              </div>
            </div>
            <p className="text-[11.5px] italic leading-relaxed" style={{ color: C.ink, fontFamily: SERIF }}>
              "{t.text}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function JoinStepsPage() {
  return (
    <div className="h-full flex flex-col">
      <Eyebrow text="എങ്ങനെ Join ചെയ്യാം · HOW TO JOIN" />
      <h2 className="mt-3 text-3xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
        5 Steps — Today
      </h2>
      <Divider />

      <div className="space-y-3 flex-1">
        {JOIN_STEPS_PREMIUM.map((s) => (
          <div key={s.step} className="flex gap-3 items-start">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`,
                color: "#fff",
                fontFamily: SERIF,
              }}
            >
              {s.step}
            </div>
            <div className="flex-1 pt-0.5">
              <div className="text-sm font-bold" style={{ color: C.ink, fontFamily: SERIF }}>
                {s.titleMl}
              </div>
              <div className="text-[10px] tracking-widest opacity-60">{s.titleEn.toUpperCase()}</div>
              <p className="text-[12px] leading-snug mt-1 opacity-80" style={{ color: C.ink }}>
                {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-4 rounded-lg p-3 text-center text-[12px]"
        style={{ background: `${C.green}15`, color: C.green }}
      >
        <CheckCircle2 className="inline w-4 h-4 mr-1" />
        <strong>Same-day activation</strong> — registration മുതൽ portal access വരെ കുറഞ്ഞ സമയം!
      </div>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="h-full flex flex-col" style={{ color: "#F8EFD0" }}>
      <div className="text-[10px] tracking-[0.4em] opacity-70" style={{ color: C.gold }}>
        ബന്ധപ്പെടുക · GET IN TOUCH
      </div>
      <h2 className="mt-3 text-4xl font-bold" style={{ fontFamily: SERIF }}>
        ഇന്ന് തന്നെ Join ചെയ്യുക
      </h2>
      <p className="text-sm opacity-70 mt-1">START YOUR DIGITAL JOURNEY TODAY</p>
      <div className="mt-4 mb-6 w-16 h-px" style={{ background: C.gold }} />

      <div className="space-y-3 flex-1">
        <ContactRow icon={<Phone className="w-4 h-4" />} label="Phone / Call" value={COMPANY_LEGAL.phone} />
        <ContactRow icon={<MessageCircle className="w-4 h-4" />} label="WhatsApp" value={COMPANY_LEGAL.phone} />
        <ContactRow icon={<Mail className="w-4 h-4" />} label="Email" value={COMPANY_LEGAL.email} />
        <ContactRow icon={<Globe className="w-4 h-4" />} label="Website" value={COMPANY_LEGAL.website.replace("https://", "")} />
        <ContactRow icon={<MapPin className="w-4 h-4" />} label="Registered Office" value={COMPANY_LEGAL.registeredOffice} multiline />
      </div>

      <div className="mt-4 pt-4 border-t border-amber-300/20 text-[9px] opacity-50 leading-relaxed">
        <div>{COMPANY_LEGAL.legalName}</div>
        <div>CIN: {COMPANY_LEGAL.cin} · GSTIN: {COMPANY_LEGAL.gstin}</div>
      </div>
    </div>
  );
}

function AlertPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ background: `${C.red}15`, color: C.red, border: `1.5px solid ${C.red}55` }}
        >
          ⚠️
        </div>
        <div>
          <div className="text-[10px] tracking-[0.3em] font-bold" style={{ color: C.red }}>
            {IMPORTANT_ALERT.titleEn.toUpperCase()}
          </div>
          <div className="text-lg font-bold leading-tight" style={{ fontFamily: SERIF, color: C.ink }}>
            {IMPORTANT_ALERT.titleMl}
          </div>
        </div>
      </div>
      <div className="my-3 h-px w-full" style={{ background: `linear-gradient(to right, ${C.red}, transparent)` }} />

      <p className="text-[11px] leading-relaxed" style={{ color: C.ink }}>
        {IMPORTANT_ALERT.intro}
      </p>

      <div className="mt-2.5 space-y-1.5">
        {IMPORTANT_ALERT.authorized.map((a) => (
          <div
            key={a.tag}
            className="flex items-start gap-2 rounded-md px-2.5 py-1.5"
            style={{ background: `${C.green}10`, border: `1px solid ${C.green}30` }}
          >
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: C.green, color: "#fff" }}>
              ✓ {a.tag}
            </span>
            <span className="text-[10.5px] leading-snug pt-0.5" style={{ color: C.ink }}>{a.text}</span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 space-y-1">
        {IMPORTANT_ALERT.warnings.map((w, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[10.5px] leading-snug" style={{ color: C.ink }}>
            <span style={{ color: C.red }}>✗</span>
            <span className="opacity-85">{w}</span>
          </div>
        ))}
      </div>

      <div
        className="mt-3 rounded-md p-2.5"
        style={{ background: `${C.gold}15`, border: `1px solid ${C.gold}40` }}
      >
        <div className="text-[10px] font-bold mb-1.5" style={{ color: C.goldDeep }}>
          💡 ബിസിനസ് തുടങ്ങുന്നതിന് മുമ്പ് ചിന്തിക്കുക:
        </div>
        <div className="space-y-1">
          {IMPORTANT_ALERT.checklist.map((c, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10.5px]" style={{ color: C.ink }}>
              <span style={{ color: C.green }}>✔️</span>
              <span className="leading-snug">{c}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-auto pt-2.5 text-[10px] italic leading-snug text-center"
        style={{ color: C.red }}
      >
        ⚠️ {IMPORTANT_ALERT.footer}
      </div>
    </div>
  );
}

function BackCover() {
  return (
    <div className="h-full flex flex-col items-center justify-between text-center" style={{ color: "#F8EFD0" }}>
      <div className="w-full pt-2">
        <div className="text-[10px] tracking-[0.4em] opacity-70" style={{ color: C.gold }}>
          THANK YOU FOR READING
        </div>
      </div>

      <div className="flex flex-col items-center">
        <Sparkles className="w-10 h-10 mb-4" style={{ color: C.gold }} />
        <h2 className="text-3xl sm:text-4xl font-bold leading-tight" style={{ fontFamily: SERIF }}>
          ഞങ്ങളുടെ digital<br/>കുടുംബത്തിലേക്ക് സ്വാഗതം.
        </h2>
        <div className="mx-auto mt-4 w-20 h-px" style={{ background: C.gold }} />
        <p className="mt-4 text-xs italic opacity-80 max-w-[28ch]" style={{ fontFamily: SERIF }}>
          "Welcome to our digital family."
        </p>
      </div>

      <div className="w-full">
        <div className="text-[16px] font-bold tracking-widest mb-2" style={{ color: C.gold, fontFamily: SERIF }}>
          EI SOLUTIONS
        </div>
        <div className="text-[9px] opacity-60 tracking-wider">
          {COMPANY_LEGAL.website.replace("https://", "")} · {COMPANY_LEGAL.phone}
        </div>
        <div className="text-[8px] opacity-40 mt-3">© 2026 EI SOLUTIONS · ALL RIGHTS RESERVED</div>
      </div>
    </div>
  );
}

/* ───────── Helpers ───────── */
function Eyebrow({ text }: { text: string }) {
  return (
    <div className="text-[10px] tracking-[0.35em] uppercase font-semibold" style={{ color: C.goldDeep }}>
      {text}
    </div>
  );
}
function Divider() {
  return <div className="my-4 h-px w-full" style={{ background: `linear-gradient(to right, ${C.gold}, transparent)` }} />;
}
function BadgeStat({ n, l }: { n: string; l: string }) {
  return (
    <div className="text-center rounded-lg py-2.5 px-1 border" style={{ borderColor: `${C.gold}40`, background: "#fff8e7" }}>
      <div className="text-lg font-bold" style={{ color: C.green, fontFamily: SERIF }}>{n}</div>
      <div className="text-[9px] tracking-wider opacity-70 mt-0.5">{l.toUpperCase()}</div>
    </div>
  );
}
function ContactRow({ icon, label, value, multiline }: { icon: React.ReactNode; label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex gap-3 items-start">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${C.gold}25`, color: C.gold }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] tracking-widest opacity-60">{label.toUpperCase()}</div>
        <div className={`text-sm font-semibold ${multiline ? "leading-snug" : "truncate"}`} style={{ color: "#F8EFD0" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE RESOLVER
   ============================================================ */
function renderPage(kind: string, pageNum: number) {
  switch (kind) {
    case "front-cover":
      return <PageWrap pageNum={pageNum} tone="ink"><FrontCover /></PageWrap>;
    case "intro":
      return <PageWrap pageNum={pageNum}><IntroPage /></PageWrap>;
    case "founder":
      return <PageWrap pageNum={pageNum} tone="gold"><FounderPage /></PageWrap>;
    case "stats":
      return <PageWrap pageNum={pageNum}><StatsPage /></PageWrap>;
    case "services-1":
      return <PageWrap pageNum={pageNum}><ServicesPage from={0} to={4} title="Banking & Financial" /></PageWrap>;
    case "services-2":
      return <PageWrap pageNum={pageNum}><ServicesPage from={4} to={8} title="Bills, Loans & Insurance" /></PageWrap>;
    case "services-3":
      return <PageWrap pageNum={pageNum}><ServicesPage from={8} to={12} title="Lifestyle & Tools" /></PageWrap>;
    case "certifications-overview":
      return <PageWrap pageNum={pageNum} tone="ink"><CertOverviewPage /></PageWrap>;
    case "cert-mca":
      return <PageWrap pageNum={pageNum}><CertDetailPage cert={CERTIFICATIONS[0]} /></PageWrap>;
    case "cert-startup-india":
      return <PageWrap pageNum={pageNum}><CertDetailPage cert={CERTIFICATIONS[1]} /></PageWrap>;
    case "cert-stpi":
      return <PageWrap pageNum={pageNum}><CertDetailPage cert={CERTIFICATIONS[2]} /></PageWrap>;
    case "cert-ksum":
      return <PageWrap pageNum={pageNum}><CertDetailPage cert={CERTIFICATIONS[3]} /></PageWrap>;
    case "cert-nsdc":
      return <PageWrap pageNum={pageNum}><CertDetailPage cert={CERTIFICATIONS[4]} /></PageWrap>;
    case "cert-gst":
      return <PageWrap pageNum={pageNum}><CertDetailPage cert={CERTIFICATIONS[5]} /></PageWrap>;
    case "earnings":
      return <PageWrap pageNum={pageNum}><EarningsPage /></PageWrap>;
    case "why-join":
      return <PageWrap pageNum={pageNum}><WhyJoinPage /></PageWrap>;
    case "testimonials":
      return <PageWrap pageNum={pageNum}><TestimonialsPage /></PageWrap>;
    case "join-steps":
      return <PageWrap pageNum={pageNum}><JoinStepsPage /></PageWrap>;
    case "contact":
      return <PageWrap pageNum={pageNum} tone="ink"><ContactPage /></PageWrap>;
    case "alert":
      return <PageWrap pageNum={pageNum}><AlertPage /></PageWrap>;
    case "back-cover":
      return <PageWrap pageNum={pageNum} tone="ink"><BackCover /></PageWrap>;
    default:
      return <PageWrap pageNum={pageNum}><div /></PageWrap>;
  }
}

/* ============================================================
   MAIN VIEWER
   ============================================================ */
export function PremiumFlipBook() {
  const bookRef = useRef<any>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [size, setSize] = useState({ w: 480, h: 680, isMobile: false });
  const [exporting, setExporting] = useState(false);
  const totalPages = PREMIUM_BOOKLET_PAGES.length;

  // Responsive sizing — single portrait page on mobile, spread on tablet+
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 720;

      if (isMobile) {
        // Portrait single-page, fills screen with comfortable margins
        const padX = 24;
        const headerFooter = 170;
        let w = vw - padX * 2;
        let h = w / 0.7;
        const maxH = vh - headerFooter;
        if (h > maxH) {
          h = maxH;
          w = h * 0.7;
        }
        setSize({ w: Math.floor(w), h: Math.floor(h), isMobile: true });
      } else {
        const maxH = vh - 180;
        const maxWPerPage = (vw - 120) / 2;
        let h = Math.min(maxH, 760);
        let w = h * 0.7;
        if (w > maxWPerPage) {
          w = maxWPerPage;
          h = w / 0.7;
        }
        if (w < 320) {
          w = Math.min(maxWPerPage, 360);
          h = w / 0.7;
        }
        setSize({ w: Math.floor(w), h: Math.floor(h), isMobile: false });
      }
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const goPrev = () => bookRef.current?.pageFlip()?.flipPrev();
  const goNext = () => bookRef.current?.pageFlip()?.flipNext();

  const pages = useMemo(() => PREMIUM_BOOKLET_PAGES, []);

  /* ───────── PDF EXPORT ─────────
     Renders an off-screen high-res copy of every page sequentially with
     html2canvas, then composes them into a multi-page A4-ish PDF with jsPDF.
     Works on mobile (offers Web Share if available). */
  async function generatePdf(): Promise<Blob> {
    const [{ default: html2canvas }, jsPdfMod] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const JsPDF = (jsPdfMod as any).jsPDF || (jsPdfMod as any).default;

    const PAGE_W = 700; // capture pixel size (good print quality)
    const PAGE_H = 1000;
    const pdf = new JsPDF({ orientation: "portrait", unit: "px", format: [PAGE_W, PAGE_H] });

    const host = exportRef.current;
    if (!host) throw new Error("Export host missing");

    for (let i = 0; i < pages.length; i++) {
      // Render one page into the hidden host
      host.innerHTML = "";
      const slot = document.createElement("div");
      slot.style.width = `${PAGE_W}px`;
      slot.style.height = `${PAGE_H}px`;
      slot.style.position = "relative";
      host.appendChild(slot);

      // Mount React page via createRoot
      const { createRoot } = await import("react-dom/client");
      const root = createRoot(slot);
      await new Promise<void>((resolve) => {
        root.render(renderPage(pages[i], i + 1));
        // Wait two frames for layout + images
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      // Wait for images inside to load
      const imgs = Array.from(slot.querySelectorAll("img"));
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((res) => {
              if (img.complete) return res();
              img.onload = () => res();
              img.onerror = () => res();
            }),
        ),
      );
      // Small settle delay
      await new Promise((r) => setTimeout(r, 80));

      const canvas = await html2canvas(slot, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      if (i > 0) pdf.addPage([PAGE_W, PAGE_H], "portrait");
      pdf.addImage(imgData, "JPEG", 0, 0, PAGE_W, PAGE_H);

      root.unmount();
    }
    host.innerHTML = "";
    return pdf.output("blob");
  }

  async function handleDownload() {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await generatePdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "EI-Solutions-Premium-Booklet.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("[booklet] PDF generation failed:", err);
      alert("PDF ഉണ്ടാക്കാൻ കഴിഞ്ഞില്ല. ദയവായി വീണ്ടും ശ്രമിക്കൂ.");
    } finally {
      setExporting(false);
    }
  }

  async function handleShare() {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await generatePdf();
      const file = new File([blob], "EI-Solutions-Booklet.pdf", { type: "application/pdf" });
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: "EI SOLUTIONS — Premium Digital Booklet",
          text: "EI SOLUTIONS-ന്റെ premium digital booklet — government recognised, 50+ services.",
        });
      } else {
        // Fallback: trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "EI-Solutions-Booklet.pdf";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      console.error("[booklet] share failed:", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center"
      style={{
        background: `radial-gradient(circle at 50% 30%, ${C.inkSoft}, ${C.ink} 70%)`,
      }}
    >
      {/* Top bar */}
      <div className="w-full max-w-7xl px-3 sm:px-4 py-3 flex items-center justify-between gap-3 text-amber-50">
        <div className="min-w-0">
          <div className="text-[9px] sm:text-[10px] tracking-[0.3em] opacity-60">A PREMIUM PUBLICATION</div>
          <div
            className="text-[13px] sm:text-base font-bold tracking-widest truncate"
            style={{ fontFamily: SERIF, color: C.gold }}
          >
            EI SOLUTIONS · DIGITAL BOOKLET
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={handleShare}
            disabled={exporting}
            className="px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border border-amber-300/30 hover:bg-amber-300/10 transition flex items-center gap-1.5 disabled:opacity-50"
            aria-label="Share"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden xs:inline sm:inline">Share</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`,
              color: "#1A1306",
            }}
            aria-label="Download PDF"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{exporting ? "Creating…" : "PDF"}</span>
          </button>
        </div>
      </div>

      {/* Book stage */}
      <div className="relative flex-1 w-full flex items-center justify-center py-2 sm:py-4 px-1">
        {/* Subtle book shadow on floor */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: size.isMobile ? size.w : size.w * 2,
            height: 32,
            bottom: "10%",
            background: "radial-gradient(ellipse, rgba(0,0,0,0.6), transparent 70%)",
            filter: "blur(8px)",
          }}
        />

        {!size.isMobile && (
          <button
            onClick={goPrev}
            className="absolute left-2 sm:left-6 z-20 w-11 h-11 rounded-full bg-amber-50/10 hover:bg-amber-50/20 backdrop-blur border border-amber-300/30 flex items-center justify-center text-amber-50 transition"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <HTMLFlipBook
          ref={bookRef}
          width={size.w}
          height={size.h}
          minWidth={260}
          maxWidth={600}
          minHeight={380}
          maxHeight={900}
          showCover
          mobileScrollSupport
          flippingTime={size.isMobile ? 700 : 900}
          maxShadowOpacity={0.6}
          drawShadow
          usePortrait={size.isMobile}
          startPage={0}
          size="fixed"
          className=""
          style={{}}
          startZIndex={0}
          autoSize={false}
          clickEventForward
          useMouseEvents
          swipeDistance={20}
          showPageCorners
          disableFlipByClick={false}
          onFlip={(e: any) => setCurrentPage(e.data)}
        >
          {pages.map((kind, i) => (
            <div key={kind} className="page-host" style={{ width: size.w, height: size.h }}>
              {renderPage(kind, i + 1)}
            </div>
          ))}
        </HTMLFlipBook>

        {!size.isMobile && (
          <button
            onClick={goNext}
            className="absolute right-2 sm:right-6 z-20 w-11 h-11 rounded-full bg-amber-50/10 hover:bg-amber-50/20 backdrop-blur border border-amber-300/30 flex items-center justify-center text-amber-50 transition"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mobile nav buttons (below book) */}
      {size.isMobile && (
        <div className="flex items-center justify-center gap-3 pb-2">
          <button
            onClick={goPrev}
            className="w-12 h-12 rounded-full bg-amber-50/10 active:bg-amber-50/25 border border-amber-300/30 flex items-center justify-center text-amber-50"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-[10px] tracking-widest text-amber-50/70 px-3">
            👆 Swipe / Tap corner to flip
          </div>
          <button
            onClick={goNext}
            className="w-12 h-12 rounded-full bg-amber-50/10 active:bg-amber-50/25 border border-amber-300/30 flex items-center justify-center text-amber-50"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Bottom progress */}
      <div className="w-full max-w-md px-4 pb-4 sm:pb-6">
        <div className="flex items-center justify-between text-[10px] text-amber-50/60 tracking-widest mb-2">
          <span>PAGE {String(currentPage + 1).padStart(2, "0")}</span>
          <span>OF {String(totalPages).padStart(2, "0")}</span>
        </div>
        <div className="h-px bg-amber-50/10 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 transition-all duration-500"
            style={{
              width: `${((currentPage + 1) / totalPages) * 100}%`,
              background: `linear-gradient(to right, ${C.gold}, ${C.goldDeep})`,
            }}
          />
        </div>
      </div>

      {/* Hidden off-screen host used for PDF capture */}
      <div
        ref={exportRef}
        aria-hidden
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: 700,
          height: 1000,
          pointerEvents: "none",
          opacity: 0,
        }}
      />

      {/* Full-screen overlay while exporting */}
      {exporting && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center text-amber-50 backdrop-blur-sm"
          style={{ background: "rgba(11,23,39,0.75)" }}
        >
          <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: C.gold }} />
          <div className="text-sm font-semibold tracking-wider">PDF തയ്യാറാക്കുന്നു…</div>
          <div className="text-[11px] opacity-60 mt-1">{totalPages} pages · few seconds</div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, Download, Share2, Home, Menu, X,
  Phone, MessageCircle, Mail, Globe, MapPin, Star, CheckCircle2, Sparkles, Leaf,
} from "lucide-react";
import {
  BOOKLET_PAGES, REGISTRATIONS, EARNINGS,
  MODULES, WHY_JOIN, JOIN_STEPS, REQUIRED_DOCS,
} from "@/lib/booklet-content";
import { Link } from "@tanstack/react-router";
import { useLandingContent } from "@/hooks/use-landing-content";
import type { CmsContact, CmsHero, CmsStat, CmsService, CmsReview } from "@/lib/landing-cms";

const FLIP_MS = 600;

/* ============================================================
   Kerala Business Modern — Booklet
   Cream canvas, forest green + gold palette, serif headings.
   Matches the /welcome landing page aesthetic.
   ============================================================ */

const PALETTE = {
  cream: "#FAF7F0",
  creamSoft: "#F4EFE2",
  ink: "#1A2E22",
  forest: "#0B6B4F",
  forestDeep: "#074A37",
  gold: "#B8893A",
  goldSoft: "#E6C988",
};

const SERIF = `'Cormorant Garamond', 'Playfair Display', Georgia, serif`;

export function CompanyBooklet() {
  const total = BOOKLET_PAGES.length;
  const [index, setIndex] = useState(0);
  const [flipping, setFlipping] = useState<"next" | "prev" | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);

  const goNext = () => {
    if (index >= total - 1 || flipping) return;
    setFlipping("next");
    setTimeout(() => { setIndex((i) => Math.min(i + 1, total - 1)); setFlipping(null); }, FLIP_MS);
  };
  const goPrev = () => {
    if (index <= 0 || flipping) return;
    setFlipping("prev");
    setTimeout(() => { setIndex((i) => Math.max(i - 1, 0)); setFlipping(null); }, FLIP_MS);
  };
  const goTo = (i: number) => {
    if (flipping || i === index) return;
    setFlipping(i > index ? "next" : "prev");
    setTimeout(() => { setIndex(i); setFlipping(null); setTocOpen(false); }, FLIP_MS);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") setTocOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const touchStart = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 50) (dx < 0 ? goNext : goPrev)();
    touchStart.current = null;
  };

  const page = BOOKLET_PAGES[index];

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${COMPANY.brand} — Digital Booklet`;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: text, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); alert("Link copied!"); } catch {}
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"), import("jspdf"),
      ]);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const wasIndex = index;
      for (let i = 0; i < total; i++) {
        setIndex(i);
        await new Promise((r) => setTimeout(r, 120));
        const node = bookRef.current?.querySelector("[data-booklet-page]") as HTMLElement | null;
        if (!node) continue;
        const canvas = await html2canvas(node, { backgroundColor: PALETTE.cream, scale: 2, useCORS: true });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        const ratio = canvas.height / canvas.width;
        const imgW = pdfW;
        const imgH = imgW * ratio;
        const y = imgH < pdfH ? (pdfH - imgH) / 2 : 0;
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, y, imgW, Math.min(imgH, pdfH));
      }
      pdf.save("EI-Solutions-Booklet.pdf");
      setIndex(wasIndex);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="min-h-screen relative"
      style={{
        background: `radial-gradient(ellipse at top, ${PALETTE.creamSoft} 0%, ${PALETTE.cream} 50%, #EFE8D6 100%)`,
        color: PALETTE.ink,
        fontFamily: SERIF,
      }}
    >
      {/* Subtle ornamental backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            `radial-gradient(circle at 12% 18%, ${PALETTE.forest} 0%, transparent 35%),
             radial-gradient(circle at 88% 82%, ${PALETTE.gold} 0%, transparent 35%)`,
        }}
      />

      {/* Top bar */}
      <header
        className="sticky top-0 z-30 backdrop-blur"
        style={{
          background: "rgba(250, 247, 240, 0.82)",
          borderBottom: `1px solid ${PALETTE.gold}33`,
        }}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-3">
          <Link to="/welcome" className="p-2 rounded-lg hover:bg-black/5" title="Home" style={{ color: PALETTE.forestDeep }}>
            <Home className="h-5 w-5" />
          </Link>
          <button onClick={() => setTocOpen(true)} className="p-2 rounded-lg hover:bg-black/5" title="Contents" style={{ color: PALETTE.forestDeep }}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm sm:text-base font-bold truncate" style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}>
              EI SOLUTIONS — Digital Booklet
            </div>
            <div className="text-[11px] tracking-widest uppercase" style={{ color: PALETTE.gold, fontFamily: "Inter, sans-serif" }}>
              Folio {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </div>
          </div>
          <button onClick={share} className="p-2 rounded-lg hover:bg-black/5" title="Share" style={{ color: PALETTE.forestDeep }}>
            <Share2 className="h-5 w-5" />
          </button>
          <button onClick={exportPDF} disabled={exporting} className="p-2 rounded-lg hover:bg-black/5 disabled:opacity-50" title="Download PDF" style={{ color: PALETTE.forestDeep }}>
            <Download className={`h-5 w-5 ${exporting ? "animate-pulse" : ""}`} />
          </button>
        </div>
        <div className="h-[2px]" style={{ background: `${PALETTE.gold}22` }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${((index + 1) / total) * 100}%`,
              background: `linear-gradient(90deg, ${PALETTE.forest}, ${PALETTE.gold})`,
            }}
          />
        </div>
      </header>

      {/* Book stage */}
      <div
        ref={bookRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative max-w-5xl mx-auto px-2 sm:px-6 py-6 sm:py-10"
        style={{ perspective: "2400px" }}
      >
        {/* Spine shadow under the page */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 top-6 sm:top-10 bottom-6 sm:bottom-10 w-full max-w-[700px] rounded-2xl pointer-events-none"
          style={{ boxShadow: `0 50px 120px -30px ${PALETTE.forestDeep}55, 0 10px 30px -10px ${PALETTE.ink}22` }}
        />

        <div
          data-booklet-page
          className={[
            "relative mx-auto rounded-[14px] overflow-hidden",
            "transition-transform duration-[600ms] ease-[cubic-bezier(0.45,0.05,0.25,1)]",
            "aspect-[3/4] sm:aspect-[210/297] w-full max-w-[680px]",
            flipping === "next" ? "[transform:rotateY(-12deg)]" : flipping === "prev" ? "[transform:rotateY(12deg)]" : "",
          ].join(" ")}
          style={{
            transformStyle: "preserve-3d",
            transformOrigin: flipping === "next" ? "left center" : "right center",
            background: PALETTE.cream,
            color: PALETTE.ink,
            border: `1px solid ${PALETTE.gold}33`,
            boxShadow: `0 30px 80px -20px ${PALETTE.forestDeep}40, inset 0 0 0 1px ${PALETTE.gold}22`,
          }}
        >
          <PageContent kind={page.kind} />

          {/* Decorative page edge */}
          <div className="pointer-events-none absolute inset-0 rounded-[14px]" style={{ boxShadow: `inset 0 0 0 6px ${PALETTE.cream}, inset 0 0 0 7px ${PALETTE.gold}30` }} />

          {/* Page corner curl hint */}
          <div
            className="pointer-events-none absolute top-0 right-0 w-14 h-14"
            style={{ background: `linear-gradient(225deg, ${PALETTE.gold}33 0%, transparent 60%)` }}
          />

          {/* Footer line */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 text-center py-2 text-[10px] tracking-[0.25em] uppercase"
            style={{ color: PALETTE.gold, fontFamily: "Inter, sans-serif", background: `linear-gradient(to top, ${PALETTE.cream} 60%, transparent)` }}
          >
            EI SOLUTIONS · Folio {String(index + 1).padStart(2, "0")}
          </div>
        </div>

        {/* Nav arrows (desktop) */}
        <button
          onClick={goPrev}
          disabled={index === 0 || !!flipping}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full disabled:opacity-30 transition"
          style={{ background: PALETTE.cream, color: PALETTE.forestDeep, border: `1px solid ${PALETTE.gold}55`, boxShadow: `0 10px 30px -10px ${PALETTE.forestDeep}66` }}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={goNext}
          disabled={index === total - 1 || !!flipping}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full disabled:opacity-30 transition"
          style={{ background: PALETTE.forest, color: "#FFF", border: `1px solid ${PALETTE.gold}66`, boxShadow: `0 12px 30px -8px ${PALETTE.forestDeep}88` }}
          aria-label="Next page"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile bottom nav */}
      <div
        className="sm:hidden sticky bottom-0 z-30 backdrop-blur px-3 py-2 flex items-center gap-2"
        style={{ background: "rgba(250, 247, 240, 0.92)", borderTop: `1px solid ${PALETTE.gold}33` }}
      >
        <button
          onClick={goPrev}
          disabled={index === 0 || !!flipping}
          className="flex-1 py-2.5 rounded-lg disabled:opacity-30 flex items-center justify-center gap-1 text-sm font-semibold"
          style={{ background: PALETTE.creamSoft, color: PALETTE.forestDeep, border: `1px solid ${PALETTE.gold}44`, fontFamily: "Inter, sans-serif" }}
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <div className="text-xs px-2" style={{ color: PALETTE.gold, fontFamily: "Inter, sans-serif" }}>{index + 1}/{total}</div>
        <button
          onClick={goNext}
          disabled={index === total - 1 || !!flipping}
          className="flex-1 py-2.5 rounded-lg disabled:opacity-30 flex items-center justify-center gap-1 text-sm font-semibold text-white"
          style={{ background: `linear-gradient(135deg, ${PALETTE.forest}, ${PALETTE.forestDeep})`, fontFamily: "Inter, sans-serif" }}
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* TOC drawer */}
      {tocOpen && (
        <div className="fixed inset-0 z-50" style={{ background: "rgba(11, 46, 34, 0.55)", backdropFilter: "blur(4px)" }} onClick={() => setTocOpen(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm p-5 overflow-y-auto"
            style={{ background: PALETTE.cream, borderRight: `1px solid ${PALETTE.gold}55` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[10px] tracking-[0.3em] uppercase font-bold" style={{ color: PALETTE.gold, fontFamily: "Inter, sans-serif" }}>Index</div>
                <div className="text-2xl font-bold" style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}>Contents</div>
              </div>
              <button onClick={() => setTocOpen(false)} className="p-2 rounded-lg hover:bg-black/5" style={{ color: PALETTE.forestDeep }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <ol className="space-y-1">
              {BOOKLET_PAGES.map((p, i) => {
                const active = i === index;
                return (
                  <li key={i}>
                    <button
                      onClick={() => goTo(i)}
                      className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition"
                      style={{
                        background: active ? `${PALETTE.forest}15` : "transparent",
                        border: active ? `1px solid ${PALETTE.gold}66` : "1px solid transparent",
                      }}
                    >
                      <span className="text-xs font-mono w-7" style={{ color: PALETTE.gold, fontFamily: "Inter, sans-serif" }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}>
                        {TOC_LABELS[p.kind]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-6 pt-4 border-t text-[10px] tracking-widest uppercase text-center" style={{ borderColor: `${PALETTE.gold}33`, color: PALETTE.gold, fontFamily: "Inter, sans-serif" }}>
              Built in Kerala · Engineered for India
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TOC_LABELS: Record<string, string> = {
  cover: "Cover",
  intro: "About EI Solutions",
  registrations: "Registrations & Affiliations",
  services: "Our Services",
  earnings: "Earnings Model",
  modules: "Software Modules",
  "why-join": "Why Join Us",
  reviews: "Customer Voices",
  join: "Join the Network",
  contact: "Contact",
  "back-cover": "Thank You",
};

/* ───────── Page renderers ───────── */

function PageContent({ kind }: { kind: string }) {
  switch (kind) {
    case "cover": return <CoverPage />;
    case "intro": return <IntroPage />;
    case "registrations": return <RegistrationsPage />;
    case "services": return <ServicesPage />;
    case "earnings": return <EarningsPage />;
    case "modules": return <ModulesPage />;
    case "why-join": return <WhyJoinPage />;
    case "reviews": return <ReviewsPage />;
    case "join": return <JoinPage />;
    case "contact": return <ContactPage />;
    case "back-cover": return <BackCoverPage />;
    default: return null;
  }
}

/* ───────── Shared elements ───────── */

function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <div className="h-px w-10" style={{ background: `linear-gradient(to right, transparent, ${PALETTE.gold})` }} />
      <Leaf className="h-3.5 w-3.5" style={{ color: PALETTE.gold }} />
      <div className="h-px w-10" style={{ background: `linear-gradient(to left, transparent, ${PALETTE.gold})` }} />
    </div>
  );
}

function PageHeader({ no, title, ml }: { no: string; title: string; ml?: string }) {
  return (
    <div className="mb-5 pb-4" style={{ borderBottom: `1px solid ${PALETTE.gold}55` }}>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] tracking-[0.35em] font-bold uppercase" style={{ color: PALETTE.gold, fontFamily: "Inter, sans-serif" }}>
            Chapter · {no}
          </div>
          <h2 className="text-xl sm:text-3xl font-bold leading-tight mt-1" style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}>
            {title}
          </h2>
          {ml && (
            <div className="text-xs sm:text-sm mt-0.5 italic" style={{ color: PALETTE.ink, opacity: 0.65, fontFamily: SERIF }}>
              {ml}
            </div>
          )}
        </div>
        <div
          className="text-4xl sm:text-5xl font-bold leading-none"
          style={{ color: PALETTE.gold, opacity: 0.25, fontFamily: SERIF }}
        >
          {no}
        </div>
      </div>
    </div>
  );
}

/* ───────── Pages ───────── */

function CoverPage() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-10 text-center"
      style={{ background: `linear-gradient(160deg, ${PALETTE.cream} 0%, ${PALETTE.creamSoft} 60%, #EBE2CB 100%)` }}>
      {/* Ornamental corners */}
      <div className="absolute top-4 left-4 h-10 w-10 border-l-2 border-t-2 rounded-tl-lg" style={{ borderColor: PALETTE.gold }} />
      <div className="absolute top-4 right-4 h-10 w-10 border-r-2 border-t-2 rounded-tr-lg" style={{ borderColor: PALETTE.gold }} />
      <div className="absolute bottom-4 left-4 h-10 w-10 border-l-2 border-b-2 rounded-bl-lg" style={{ borderColor: PALETTE.gold }} />
      <div className="absolute bottom-4 right-4 h-10 w-10 border-r-2 border-b-2 rounded-br-lg" style={{ borderColor: PALETTE.gold }} />

      <div className="relative">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold mb-6 uppercase tracking-widest"
          style={{ background: `${PALETTE.forest}10`, border: `1px solid ${PALETTE.gold}66`, color: PALETTE.forestDeep, fontFamily: "Inter, sans-serif" }}
        >
          <Sparkles className="h-3.5 w-3.5" style={{ color: PALETTE.gold }} /> Premium Digital Booklet · 2025
        </div>

        <div
          className="mx-auto h-24 w-24 sm:h-32 sm:w-32 rounded-2xl flex items-center justify-center text-3xl sm:text-5xl font-bold shadow-xl mb-6"
          style={{
            background: `linear-gradient(135deg, ${PALETTE.forest}, ${PALETTE.forestDeep})`,
            color: PALETTE.goldSoft,
            border: `2px solid ${PALETTE.gold}`,
            fontFamily: SERIF,
          }}
        >
          EI
        </div>

        <h1
          className="text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight"
          style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}
        >
          EI SOLUTIONS
        </h1>
        <div
          className="mt-2 text-[10px] sm:text-[11px] tracking-[0.3em] uppercase"
          style={{ color: PALETTE.gold, fontFamily: "Inter, sans-serif" }}
        >
          Janasevana Kendram (OPC) Pvt Ltd
        </div>

        <Ornament className="my-6" />

        <p
          className="text-base sm:text-xl leading-relaxed max-w-md italic"
          style={{ color: PALETTE.ink, fontFamily: SERIF }}
        >
          {COMPANY.tagline}
        </p>
        <p
          className="mt-3 text-[11px] sm:text-xs max-w-md mx-auto"
          style={{ color: PALETTE.ink, opacity: 0.7, fontFamily: "Inter, sans-serif" }}
        >
          Built in Kerala. Engineered for India.
        </p>

        <div
          className="mt-10 inline-flex items-center justify-center gap-4 px-5 py-2 rounded-full text-[11px] uppercase tracking-widest"
          style={{ background: `${PALETTE.forest}10`, border: `1px solid ${PALETTE.gold}55`, color: PALETTE.forestDeep, fontFamily: "Inter, sans-serif" }}
        >
          <span>7+ Years</span>
          <span style={{ color: PALETTE.gold }}>◆</span>
          <span>2500+ Centers</span>
          <span style={{ color: PALETTE.gold }}>◆</span>
          <span>All India</span>
        </div>
      </div>
    </div>
  );
}

function IntroPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col">
      <PageHeader no="01" title="About EI Solutions" ml="കമ്പനി പരിചയം" />

      <p className="text-base sm:text-lg leading-relaxed mb-3" style={{ color: PALETTE.ink, fontFamily: SERIF }}>
        <span className="font-bold" style={{ color: PALETTE.forestDeep }}>EI Solutions</span> കഴിഞ്ഞ
        <span className="font-bold" style={{ color: PALETTE.gold }}> 7+ വർഷമായി </span>
        digital services, retailer network, e-governance, PAN, finance, training, startup support എന്നിവ നൽകി വരുന്ന
        <span className="italic"> trusted Kerala-rooted</span> സ്ഥാപനമാണ്.
      </p>
      <p className="text-xs sm:text-sm italic mb-5" style={{ color: PALETTE.ink, opacity: 0.7, fontFamily: SERIF }}>
        For seven years, EI Solutions has been a trusted name delivering digital services, retailer networks and e-governance solutions across Kerala — and now scaling across India.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-3 sm:p-4"
            style={{ background: PALETTE.creamSoft, border: `1px solid ${PALETTE.gold}55` }}
          >
            <div className="text-2xl sm:text-3xl font-bold" style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}>
              {s.number}
            </div>
            <div className="text-xs font-semibold mt-1" style={{ color: PALETTE.ink, fontFamily: "Inter, sans-serif" }}>
              {s.label}
            </div>
            <div className="text-[10px] italic" style={{ color: PALETTE.gold, fontFamily: SERIF }}>
              {s.labelMl}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <div
          className="rounded-xl p-3 sm:p-4 text-center"
          style={{ background: `linear-gradient(135deg, ${PALETTE.forest}, ${PALETTE.forestDeep})`, color: PALETTE.cream }}
        >
          <div className="text-[10px] tracking-[0.3em] font-bold uppercase mb-1" style={{ color: PALETTE.goldSoft, fontFamily: "Inter, sans-serif" }}>
            Our Mission
          </div>
          <div className="text-sm sm:text-base italic" style={{ fontFamily: SERIF }}>
            "എല്ലാ ഗ്രാമത്തിലും ഒരു digital service center — സാധാരണക്കാർക്ക് വിശ്വാസമുള്ള സേവനം."
          </div>
        </div>
      </div>
    </div>
  );
}

function RegistrationsPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col">
      <PageHeader no="02" title="Registrations & Affiliations" ml="രജിസ്ട്രേഷനുകൾ" />
      <p className="text-xs sm:text-sm mb-4" style={{ color: PALETTE.ink, opacity: 0.75, fontFamily: SERIF }}>
        Officially registered & recognized across multiple government & industry bodies.
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 flex-1 content-start">
        {REGISTRATIONS.map((r) => (
          <div
            key={r.short}
            className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: PALETTE.cream, border: `1px solid ${PALETTE.gold}44`, boxShadow: `0 4px 14px -8px ${PALETTE.forestDeep}33` }}
          >
            <div
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center font-bold text-[11px] sm:text-xs flex-shrink-0"
              style={{ background: PALETTE.forest, color: PALETTE.goldSoft, border: `1px solid ${PALETTE.gold}66`, fontFamily: "Inter, sans-serif" }}
            >
              {r.short}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-bold leading-tight" style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}>
                {r.name}
              </div>
              <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: PALETTE.ink, opacity: 0.7, fontFamily: "Inter, sans-serif" }}>
                <CheckCircle2 className="h-3 w-3" style={{ color: PALETTE.forest }} /> Verified
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center text-[10px] italic" style={{ color: PALETTE.ink, opacity: 0.6, fontFamily: SERIF }}>
        Representative of EI Solutions' affiliations & alignments with national digital initiatives.
      </div>
    </div>
  );
}

function ServicesPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col">
      <PageHeader no="03" title="Our Services" ml="നമ്മുടെ സേവനങ്ങൾ" />
      <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1 content-start">
        {SERVICES.map((s) => (
          <div
            key={s.name}
            className="rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 transition"
            style={{ background: PALETTE.cream, border: `1px solid ${PALETTE.gold}44` }}
          >
            <div className="text-2xl flex-shrink-0">{s.icon}</div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-bold leading-tight" style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}>
                {s.name}
              </div>
              <div className="text-[10px] truncate italic" style={{ color: PALETTE.ink, opacity: 0.65, fontFamily: SERIF }}>
                {s.ml}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EarningsPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col">
      <PageHeader no="04" title="Earnings Model" ml="വരുമാന മാതൃക" />
      <p className="text-xs sm:text-sm mb-3" style={{ color: PALETTE.ink, opacity: 0.75, fontFamily: SERIF }}>
        Multiple revenue streams — combined earning potential per active center:
      </p>
      <div
        className="rounded-xl overflow-hidden mb-3"
        style={{ border: `1px solid ${PALETTE.gold}55` }}
      >
        <table className="w-full text-[11px] sm:text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
          <thead style={{ background: PALETTE.forest, color: PALETTE.goldSoft }}>
            <tr>
              <th className="text-left px-2.5 py-2 font-bold uppercase tracking-wider text-[10px]">Service</th>
              <th className="text-left px-2.5 py-2 font-bold uppercase tracking-wider text-[10px]">Earning</th>
              <th className="text-right px-2.5 py-2 font-bold uppercase tracking-wider text-[10px]">Monthly*</th>
            </tr>
          </thead>
          <tbody>
            {EARNINGS.map((e, i) => (
              <tr key={e.service} style={{ background: i % 2 ? PALETTE.creamSoft : PALETTE.cream }}>
                <td className="px-2.5 py-2 font-semibold" style={{ color: PALETTE.forestDeep }}>{e.service}</td>
                <td className="px-2.5 py-2" style={{ color: PALETTE.ink, opacity: 0.8 }}>{e.per}</td>
                <td className="px-2.5 py-2 text-right font-bold" style={{ color: PALETTE.forest }}>{e.monthly}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        className="rounded-xl p-3 sm:p-4 text-center"
        style={{ background: `linear-gradient(135deg, ${PALETTE.forest}, ${PALETTE.forestDeep})`, border: `1px solid ${PALETTE.gold}66` }}
      >
        <div className="text-[10px] tracking-[0.3em] font-bold uppercase" style={{ color: PALETTE.goldSoft, fontFamily: "Inter, sans-serif" }}>
          Combined Potential
        </div>
        <div className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: PALETTE.cream, fontFamily: SERIF }}>
          ₹50,000 – ₹1,00,000+
        </div>
        <div className="text-[10px] mt-1 italic" style={{ color: PALETTE.goldSoft, fontFamily: SERIF }}>
          per month, per active center
        </div>
      </div>
      <div className="mt-2 text-[9px] italic" style={{ color: PALETTE.ink, opacity: 0.55, fontFamily: SERIF }}>
        *Indicative figures based on average active retailer performance. Actual earnings depend on customer footfall, locality & effort.
      </div>
    </div>
  );
}

function ModulesPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col">
      <PageHeader no="05" title="Software Modules" ml="സോഫ്റ്റ്‌വെയർ മൊഡ്യൂളുകൾ" />
      <div className="space-y-3 flex-1">
        {MODULES.map((m) => (
          <div
            key={m.name}
            className="rounded-xl p-3 sm:p-4"
            style={{ background: PALETTE.creamSoft, borderLeft: `4px solid ${PALETTE.gold}`, border: `1px solid ${PALETTE.gold}33`, borderLeftWidth: 4 }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <div className="font-bold text-base sm:text-lg" style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}>
                {m.name}
              </div>
              <div className="text-[10px] italic" style={{ color: PALETTE.gold, fontFamily: SERIF }}>{m.ml}</div>
            </div>
            <p className="text-[11px] sm:text-xs mb-2" style={{ color: PALETTE.ink, opacity: 0.8, fontFamily: SERIF }}>{m.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {m.features.map((f) => (
                <span
                  key={f}
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: `${PALETTE.forest}15`, color: PALETTE.forestDeep, border: `1px solid ${PALETTE.gold}44`, fontFamily: "Inter, sans-serif" }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhyJoinPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col">
      <PageHeader no="06" title="Why Join Us" ml="എന്തുകൊണ്ട് ഞങ്ങൾ?" />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 flex-1 content-start">
        {WHY_JOIN.map((w) => (
          <div
            key={w.title}
            className="rounded-xl p-2.5 sm:p-3"
            style={{ background: PALETTE.cream, border: `1px solid ${PALETTE.gold}44` }}
          >
            <div className="text-2xl mb-1">{w.icon}</div>
            <div className="text-xs sm:text-sm font-bold leading-tight" style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}>
              {w.title}
            </div>
            <div className="text-[10px] font-semibold italic mb-1" style={{ color: PALETTE.gold, fontFamily: SERIF }}>
              {w.ml}
            </div>
            <div className="text-[10px] sm:text-[11px] leading-snug" style={{ color: PALETTE.ink, opacity: 0.78, fontFamily: SERIF }}>
              {w.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewsPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col">
      <PageHeader no="07" title="Customer Voices" ml="ഉപഭോക്താക്കളുടെ വാക്കുകൾ" />
      <div className="space-y-2.5 flex-1">
        {REVIEWS.map((r) => (
          <div
            key={r.name}
            className="rounded-xl p-3 sm:p-4 relative"
            style={{ background: PALETTE.creamSoft, border: `1px solid ${PALETTE.gold}44` }}
          >
            <div className="absolute top-2 right-3 text-3xl leading-none" style={{ color: PALETTE.gold, opacity: 0.3, fontFamily: SERIF }}>"</div>
            <div className="flex items-center gap-1 mb-1.5">
              {Array.from({ length: r.stars }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5" style={{ fill: PALETTE.gold, color: PALETTE.gold }} />
              ))}
            </div>
            <p className="text-[12px] sm:text-sm italic leading-relaxed" style={{ color: PALETTE.ink, fontFamily: SERIF }}>
              {r.text}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: PALETTE.forest, color: PALETTE.goldSoft, fontFamily: "Inter, sans-serif" }}
              >
                {r.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div className="text-[11px] font-bold" style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}>{r.name}</div>
                <div className="text-[9px] italic" style={{ color: PALETTE.gold, fontFamily: SERIF }}>{r.place} · Verified Retailer</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function JoinPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col">
      <PageHeader no="08" title="Join the Network" ml="ഫ്രാഞ്ചൈസി ജോയിൻ ചെയ്യൂ" />
      <div className="text-center mb-3">
        <div className="text-base sm:text-lg font-bold italic" style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}>
          "നിങ്ങളും സ്വന്തം Digital Service Center ആരംഭിക്കൂ"
        </div>
        <div className="text-[10px] italic mt-0.5" style={{ color: PALETTE.gold, fontFamily: SERIF }}>
          Start your own Digital Service Center today
        </div>
      </div>
      <div className="space-y-1.5 mb-3">
        {JOIN_STEPS.map((s) => (
          <div
            key={s.step}
            className="flex items-start gap-2.5 rounded-lg p-2"
            style={{ background: PALETTE.cream, border: `1px solid ${PALETTE.gold}44` }}
          >
            <div
              className="h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0"
              style={{ background: PALETTE.forest, color: PALETTE.goldSoft, border: `1px solid ${PALETTE.gold}66`, fontFamily: SERIF }}
            >
              {s.step}
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-bold" style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}>
                {s.title} <span className="text-[10px] italic font-normal" style={{ color: PALETTE.gold }}>· {s.ml}</span>
              </div>
              <div className="text-[10px]" style={{ color: PALETTE.ink, opacity: 0.78, fontFamily: SERIF }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div
        className="rounded-xl p-3 mb-3"
        style={{ background: `linear-gradient(135deg, ${PALETTE.forest}, ${PALETTE.forestDeep})`, color: PALETTE.cream }}
      >
        <div className="text-[10px] tracking-[0.3em] font-bold uppercase mb-1.5" style={{ color: PALETTE.goldSoft, fontFamily: "Inter, sans-serif" }}>
          Required Documents
        </div>
        <div className="flex flex-wrap gap-1.5">
          {REQUIRED_DOCS.map((d) => (
            <span
              key={d}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: `${PALETTE.goldSoft}22`, border: `1px solid ${PALETTE.gold}66`, color: PALETTE.cream, fontFamily: "Inter, sans-serif" }}
            >
              {d}
            </span>
          ))}
        </div>
      </div>
      <a
        href="/welcome"
        className="block text-center rounded-xl py-3 font-bold transition uppercase tracking-widest text-sm"
        style={{
          background: `linear-gradient(135deg, ${PALETTE.gold}, #9B7430)`,
          color: PALETTE.cream,
          border: `1px solid ${PALETTE.gold}`,
          fontFamily: "Inter, sans-serif",
          boxShadow: `0 12px 30px -10px ${PALETTE.forestDeep}66`,
        }}
      >
        Apply Now · ഇപ്പോൾ അപേക്ഷിക്കുക →
      </a>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col"
      style={{ background: `linear-gradient(160deg, ${PALETTE.forest} 0%, ${PALETTE.forestDeep} 100%)`, color: PALETTE.cream }}>
      <div className="mb-5 pb-4" style={{ borderBottom: `1px solid ${PALETTE.gold}66` }}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] tracking-[0.35em] font-bold uppercase" style={{ color: PALETTE.goldSoft, fontFamily: "Inter, sans-serif" }}>
              Chapter · 09
            </div>
            <h2 className="text-xl sm:text-3xl font-bold leading-tight mt-1" style={{ fontFamily: SERIF }}>
              Contact Us
            </h2>
            <div className="text-xs sm:text-sm italic mt-0.5" style={{ color: PALETTE.goldSoft, opacity: 0.85, fontFamily: SERIF }}>
              ഞങ്ങളെ ബന്ധപ്പെടുക
            </div>
          </div>
          <div className="text-4xl sm:text-5xl font-bold leading-none" style={{ color: PALETTE.gold, opacity: 0.35, fontFamily: SERIF }}>09</div>
        </div>
      </div>

      <div className="space-y-2.5 flex-1">
        <ContactRow icon={<Phone className="h-5 w-5" />} label="Call" value={COMPANY.phone} href={`tel:${COMPANY.phone}`} />
        <ContactRow icon={<MessageCircle className="h-5 w-5" />} label="WhatsApp" value={COMPANY.phone} href={`https://wa.me/${COMPANY.whatsapp}`} />
        <ContactRow icon={<Mail className="h-5 w-5" />} label="Email" value={COMPANY.email} href={`mailto:${COMPANY.email}`} />
        <ContactRow icon={<Globe className="h-5 w-5" />} label="Website" value={COMPANY.website.replace("https://", "")} href={COMPANY.website} />
        <ContactRow icon={<MapPin className="h-5 w-5" />} label="Office" value={COMPANY.address} />
      </div>
    </div>
  );
}

function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const content = (
    <>
      <div
        className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${PALETTE.goldSoft}22`, color: PALETTE.goldSoft, border: `1px solid ${PALETTE.gold}55` }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: PALETTE.goldSoft, opacity: 0.75, fontFamily: "Inter, sans-serif" }}>
          {label}
        </div>
        <div className="font-bold text-sm" style={{ color: PALETTE.cream, fontFamily: SERIF }}>{value}</div>
      </div>
    </>
  );

  return href ? (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      className="flex items-center gap-3 rounded-xl p-3 transition"
      style={{ background: `${PALETTE.cream}10`, border: `1px solid ${PALETTE.gold}44` }}
    >
      {content}
    </a>
  ) : (
    <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: `${PALETTE.cream}10`, border: `1px solid ${PALETTE.gold}44` }}>
      {content}
    </div>
  );
}

function BackCoverPage() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
      style={{ background: `linear-gradient(160deg, ${PALETTE.cream} 0%, ${PALETTE.creamSoft} 60%, #EBE2CB 100%)` }}>
      {/* Ornamental corners */}
      <div className="absolute top-4 left-4 h-10 w-10 border-l-2 border-t-2 rounded-tl-lg" style={{ borderColor: PALETTE.gold }} />
      <div className="absolute top-4 right-4 h-10 w-10 border-r-2 border-t-2 rounded-tr-lg" style={{ borderColor: PALETTE.gold }} />
      <div className="absolute bottom-4 left-4 h-10 w-10 border-l-2 border-b-2 rounded-bl-lg" style={{ borderColor: PALETTE.gold }} />
      <div className="absolute bottom-4 right-4 h-10 w-10 border-r-2 border-b-2 rounded-br-lg" style={{ borderColor: PALETTE.gold }} />

      <div className="relative">
        <div className="text-5xl sm:text-6xl mb-4">🙏</div>
        <h2 className="text-3xl sm:text-5xl font-bold" style={{ color: PALETTE.forestDeep, fontFamily: SERIF }}>
          Thank You
        </h2>
        <Ornament className="my-5" />
        <p className="text-base sm:text-lg italic max-w-md leading-relaxed" style={{ color: PALETTE.ink, fontFamily: SERIF }}>
          EI Solutions-ന്റെ family-യിലേക്ക് സ്വാഗതം. നിങ്ങളുടെ digital business journey ഇപ്പോൾ തുടങ്ങാം.
        </p>
        <p className="mt-2 text-[11px] italic" style={{ color: PALETTE.ink, opacity: 0.65, fontFamily: SERIF }}>
          Welcome to the EI Solutions family. Begin your digital business journey today.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`https://wa.me/${COMPANY.whatsapp}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full font-bold px-5 py-2.5 text-sm uppercase tracking-widest transition"
            style={{ background: PALETTE.forest, color: PALETTE.cream, border: `1px solid ${PALETTE.gold}66`, fontFamily: "Inter, sans-serif" }}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp Us
          </a>
          <a
            href="/welcome"
            className="inline-flex items-center gap-2 rounded-full font-bold px-5 py-2.5 text-sm uppercase tracking-widest transition"
            style={{ background: `linear-gradient(135deg, ${PALETTE.gold}, #9B7430)`, color: PALETTE.cream, border: `1px solid ${PALETTE.gold}`, fontFamily: "Inter, sans-serif" }}
          >
            Apply Now →
          </a>
        </div>

        <div className="mt-10 text-[10px] tracking-[0.3em] uppercase" style={{ color: PALETTE.gold, fontFamily: "Inter, sans-serif" }}>
          © {new Date().getFullYear()} EI Solutions · Built in Kerala
        </div>
      </div>
    </div>
  );
}

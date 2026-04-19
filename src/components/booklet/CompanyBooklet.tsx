import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, Download, Share2, Home, Menu, X,
  Phone, MessageCircle, Mail, Globe, MapPin, Star, CheckCircle2, Sparkles,
} from "lucide-react";
import {
  BOOKLET_PAGES, COMPANY, STATS, REGISTRATIONS, SERVICES, EARNINGS,
  MODULES, WHY_JOIN, REVIEWS, JOIN_STEPS, REQUIRED_DOCS,
} from "@/lib/booklet-content";
import { Link } from "@tanstack/react-router";

const FLIP_MS = 600;

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

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") setTocOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Touch / swipe
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
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); return; } catch {}
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
      // Render each page off-screen by temporarily setting index
      const wasIndex = index;
      for (let i = 0; i < total; i++) {
        setIndex(i);
        // wait a tick for render
        await new Promise((r) => setTimeout(r, 80));
        const node = bookRef.current?.querySelector("[data-booklet-page]") as HTMLElement | null;
        if (!node) continue;
        const canvas = await html2canvas(node, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur bg-slate-950/70 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-3">
          <Link to="/welcome" className="p-2 rounded-lg hover:bg-white/10" title="Home"><Home className="h-5 w-5" /></Link>
          <button onClick={() => setTocOpen(true)} className="p-2 rounded-lg hover:bg-white/10" title="Contents"><Menu className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0">
            <div className="text-sm sm:text-base font-bold truncate">EI SOLUTIONS — Digital Booklet</div>
            <div className="text-[11px] text-white/60 truncate">Page {index + 1} of {total}</div>
          </div>
          <button onClick={share} className="p-2 rounded-lg hover:bg-white/10" title="Share"><Share2 className="h-5 w-5" /></button>
          <button onClick={exportPDF} disabled={exporting} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50" title="Download PDF">
            <Download className={`h-5 w-5 ${exporting ? "animate-pulse" : ""}`} />
          </button>
        </div>
        {/* progress */}
        <div className="h-1 bg-white/5">
          <div className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 transition-all duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
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
        <div
          data-booklet-page
          className={[
            "relative mx-auto rounded-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] overflow-hidden",
            "transition-transform duration-[600ms] ease-[cubic-bezier(0.45,0.05,0.25,1)]",
            "bg-white text-slate-900",
            "aspect-[3/4] sm:aspect-[210/297] w-full max-w-[680px]",
            flipping === "next" ? "[transform:rotateY(-12deg)]" : flipping === "prev" ? "[transform:rotateY(12deg)]" : "",
          ].join(" ")}
          style={{ transformStyle: "preserve-3d", transformOrigin: flipping === "next" ? "left center" : "right center" }}
        >
          <PageContent kind={page.kind} />
          {/* page corner curl hint */}
          <div className="pointer-events-none absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-black/20 to-transparent" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 text-center text-[10px] text-slate-400 py-1.5 bg-gradient-to-t from-white to-transparent">
            {COMPANY.brand} · Page {index + 1}
          </div>
        </div>

        {/* nav arrows */}
        <button
          onClick={goPrev} disabled={index === 0 || !!flipping}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 disabled:opacity-30"
          aria-label="Previous page"
        ><ChevronLeft className="h-6 w-6" /></button>
        <button
          onClick={goNext} disabled={index === total - 1 || !!flipping}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 disabled:opacity-30"
          aria-label="Next page"
        ><ChevronRight className="h-6 w-6" /></button>
      </div>

      {/* mobile bottom nav */}
      <div className="sm:hidden sticky bottom-0 z-30 backdrop-blur bg-slate-950/80 border-t border-white/10 px-3 py-2 flex items-center gap-2">
        <button onClick={goPrev} disabled={index === 0 || !!flipping} className="flex-1 py-2.5 rounded-lg bg-white/10 disabled:opacity-30 flex items-center justify-center gap-1 text-sm">
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <div className="text-xs text-white/60 px-2">{index + 1}/{total}</div>
        <button onClick={goNext} disabled={index === total - 1 || !!flipping} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 disabled:opacity-30 flex items-center justify-center gap-1 text-sm font-semibold">
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* TOC drawer */}
      {tocOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setTocOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-slate-900 border-r border-white/10 p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">Contents</div>
              <button onClick={() => setTocOpen(false)} className="p-2 rounded-lg hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            <ol className="space-y-1">
              {BOOKLET_PAGES.map((p, i) => (
                <li key={i}>
                  <button onClick={() => goTo(i)} className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 ${i === index ? "bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-400/30" : "hover:bg-white/5"}`}>
                    <span className="text-xs font-mono text-white/50 w-6">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-sm">{TOC_LABELS[p.kind]}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

const TOC_LABELS: Record<string, string> = {
  cover: "Cover",
  intro: "Company Introduction",
  registrations: "Registrations & Affiliations",
  services: "Our Services",
  earnings: "Earnings / Profit Model",
  modules: "Software Modules",
  "why-join": "Why Join Us",
  reviews: "Customer Reviews",
  join: "Franchise Join Process",
  contact: "Contact Us",
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

function CoverPage() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 sm:p-10 text-center"
      style={{ background: "radial-gradient(ellipse at top, #1e3a8a, #0f172a 60%, #020617)" }}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #f59e0b 0%, transparent 40%), radial-gradient(circle at 80% 70%, #ec4899 0%, transparent 40%)" }} />
      <div className="relative">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11px] sm:text-xs font-semibold mb-6">
          <Sparkles className="h-3.5 w-3.5" /> PREMIUM DIGITAL BOOKLET · 2025
        </div>
        <div className="mx-auto h-20 w-20 sm:h-28 sm:w-28 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-3xl sm:text-5xl font-black shadow-2xl mb-6">EI</div>
        <h1 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">{COMPANY.brand}</h1>
        <div className="mt-2 text-[10px] sm:text-xs text-white/60 tracking-widest uppercase">{COMPANY.legalName}</div>
        <div className="mt-6 mx-auto w-16 h-px bg-amber-400/60" />
        <p className="mt-6 text-sm sm:text-base text-amber-100/90 font-medium leading-relaxed max-w-md">{COMPANY.tagline}</p>
        <p className="mt-2 text-[11px] sm:text-xs text-white/50 italic max-w-md mx-auto">{COMPANY.taglineEn}</p>
        <div className="mt-10 flex items-center justify-center gap-4 text-[11px] text-white/60">
          <span>7+ Years</span><span>·</span><span>2500+ Centers</span><span>·</span><span>All India</span>
        </div>
      </div>
    </div>
  );
}

function PageHeader({ no, title, ml }: { no: string; title: string; ml?: string }) {
  return (
    <div className="flex items-end justify-between mb-5 pb-3 border-b-2 border-amber-400">
      <div>
        <div className="text-[10px] tracking-[0.3em] text-amber-600 font-bold">CHAPTER · {no}</div>
        <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">{title}</h2>
        {ml && <div className="text-xs sm:text-sm text-slate-600 mt-0.5">{ml}</div>}
      </div>
      <div className="text-2xl sm:text-3xl font-black text-amber-500/30">{no}</div>
    </div>
  );
}

function IntroPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col bg-gradient-to-br from-white via-amber-50/30 to-white">
      <PageHeader no="01" title="Company Introduction" ml="കമ്പനി പരിചയം" />
      <p className="text-sm sm:text-[15px] leading-relaxed text-slate-700 mb-3">
        <span className="font-bold text-slate-900">EI SOLUTIONS</span> കഴിഞ്ഞ <span className="font-bold text-amber-600">7+ വർഷമായി</span> digital services, retailer network, e-governance, PAN, finance, training, startup support എന്നിവ നൽകി വരുന്ന <span className="font-bold">trusted company</span> ആണ്.
      </p>
      <p className="text-xs sm:text-sm text-slate-600 italic mb-4">
        For the past 7+ years EI Solutions has been a trusted name delivering digital services, retailer networks and e-governance solutions across Kerala and beyond.
      </p>
      <div className="grid grid-cols-2 gap-3 mt-2">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3 sm:p-4">
            <div className="text-2xl sm:text-3xl font-black text-amber-600">{s.number}</div>
            <div className="text-xs font-semibold text-slate-800">{s.label}</div>
            <div className="text-[10px] text-slate-500">{s.labelMl}</div>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-4">
        <div className="rounded-xl bg-slate-900 text-white p-3 sm:p-4">
          <div className="text-[10px] tracking-widest text-amber-300 font-bold mb-1">OUR MISSION</div>
          <div className="text-xs sm:text-sm">എല്ലാ ഗ്രാമത്തിലും ഒരു digital service center — സാധാരണക്കാർക്ക് വിശ്വാസമുള്ള സേവനം.</div>
        </div>
      </div>
    </div>
  );
}

function RegistrationsPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col bg-white">
      <PageHeader no="02" title="Registrations & Affiliations" ml="രജിസ്ട്രേഷനുകളും അഫിലിയേഷനുകളും" />
      <p className="text-xs sm:text-sm text-slate-600 mb-4">Officially registered & recognized across multiple government & industry bodies.</p>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {REGISTRATIONS.map((r) => (
          <div key={r.short} className="rounded-xl border-2 p-3 flex items-center gap-3" style={{ borderColor: r.color + "40", background: r.color + "08" }}>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center text-white font-black text-[11px] sm:text-xs flex-shrink-0" style={{ background: r.color }}>{r.short}</div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight">{r.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> Verified</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-4 text-center text-[10px] text-slate-500">All listings shown are representative of EI Solutions' affiliations & alignments with national digital initiatives.</div>
    </div>
  );
}

function ServicesPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col bg-gradient-to-br from-indigo-50 via-white to-rose-50">
      <PageHeader no="03" title="Our Services" ml="നമ്മുടെ സേവനങ്ങൾ" />
      <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1">
        {SERVICES.map((s) => (
          <div key={s.name} className="rounded-xl bg-white border border-slate-200 hover:border-amber-400 transition p-2.5 sm:p-3 flex items-center gap-2.5 shadow-sm">
            <div className="text-2xl flex-shrink-0">{s.icon}</div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight">{s.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{s.ml}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EarningsPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      <PageHeader no="04" title="Earnings / Profit Model" ml="വരുമാന മാതൃക" />
      <p className="text-xs sm:text-sm text-slate-600 mb-3">Multiple revenue streams — combined earning potential per active center:</p>
      <div className="rounded-xl border-2 border-emerald-200 overflow-hidden mb-3">
        <table className="w-full text-[11px] sm:text-xs">
          <thead className="bg-emerald-600 text-white">
            <tr><th className="text-left px-2.5 py-2">Service</th><th className="text-left px-2.5 py-2">Earning</th><th className="text-right px-2.5 py-2">Monthly*</th></tr>
          </thead>
          <tbody>
            {EARNINGS.map((e, i) => (
              <tr key={e.service} className={i % 2 ? "bg-emerald-50/50" : "bg-white"}>
                <td className="px-2.5 py-1.5 font-semibold text-slate-800">{e.service}</td>
                <td className="px-2.5 py-1.5 text-slate-600">{e.per}</td>
                <td className="px-2.5 py-1.5 text-right font-bold text-emerald-700">{e.monthly}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-3 sm:p-4 text-center">
        <div className="text-[10px] tracking-widest text-emerald-100 font-bold">COMBINED POTENTIAL</div>
        <div className="text-2xl sm:text-3xl font-black mt-1">₹50,000 – ₹1,00,000+</div>
        <div className="text-[10px] text-emerald-100 mt-1">per month, per active center</div>
      </div>
      <div className="mt-2 text-[9px] text-slate-500 italic">*Indicative figures based on average active retailer performance. Actual earnings depend on customer footfall, locality & effort.</div>
    </div>
  );
}

function ModulesPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col bg-white">
      <PageHeader no="05" title="Software Modules" ml="സോഫ്റ്റ്‌വെയർ മൊഡ്യൂളുകൾ" />
      <div className="space-y-3 flex-1">
        {MODULES.map((m) => (
          <div key={m.name} className="rounded-xl border-l-4 bg-gradient-to-r from-slate-50 to-white p-3 sm:p-4" style={{ borderLeftColor: m.color }}>
            <div className="flex items-baseline justify-between mb-1">
              <div className="font-black text-sm sm:text-base text-slate-900">{m.name}</div>
              <div className="text-[10px] text-slate-500">{m.ml}</div>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 mb-2">{m.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {m.features.map((f) => (
                <span key={f} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: m.color + "15", color: m.color }}>{f}</span>
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
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col bg-gradient-to-br from-amber-50 via-white to-rose-50">
      <PageHeader no="06" title="Why Join Us" ml="എന്തുകൊണ്ട് ഞങ്ങളെ തിരഞ്ഞെടുക്കണം" />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 flex-1">
        {WHY_JOIN.map((w) => (
          <div key={w.title} className="rounded-xl bg-white border border-amber-200 p-2.5 sm:p-3 shadow-sm">
            <div className="text-2xl mb-1">{w.icon}</div>
            <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight">{w.title}</div>
            <div className="text-[10px] text-amber-700 font-semibold mb-1">{w.ml}</div>
            <div className="text-[10px] sm:text-[11px] text-slate-600 leading-snug">{w.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewsPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col bg-gradient-to-br from-slate-50 to-white">
      <PageHeader no="07" title="Customer Reviews" ml="ഉപഭോക്താക്കളുടെ അഭിപ്രായം" />
      <div className="space-y-3 flex-1">
        {REVIEWS.map((r) => (
          <div key={r.name} className="rounded-xl bg-white border border-slate-200 p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-1 mb-1.5">
              {Array.from({ length: r.stars }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-[11px] sm:text-[13px] text-slate-700 italic leading-relaxed">"{r.text}"</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center text-white text-[10px] font-bold">
                {r.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-900">{r.name}</div>
                <div className="text-[9px] text-slate-500">{r.place} · Verified Retailer</div>
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
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <PageHeader no="08" title="Franchise / Retailer Join" ml="ഫ്രാഞ്ചൈസി ജോയിൻ ചെയ്യൂ" />
      <div className="text-center mb-3">
        <div className="text-sm sm:text-base font-black text-slate-900">"നിങ്ങളും സ്വന്തം Digital Service Center ആരംഭിക്കൂ"</div>
        <div className="text-[10px] text-slate-500 italic">Start your own Digital Service Center today</div>
      </div>
      <div className="space-y-1.5 mb-3">
        {JOIN_STEPS.map((s) => (
          <div key={s.step} className="flex items-start gap-2.5 rounded-lg bg-white border border-rose-200 p-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0">{s.step}</div>
            <div className="flex-1">
              <div className="text-[12px] font-bold text-slate-900">{s.title} <span className="text-[10px] text-slate-500 font-normal">· {s.ml}</span></div>
              <div className="text-[10px] text-slate-600">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-slate-900 text-white p-3 mb-3">
        <div className="text-[10px] tracking-widest text-amber-300 font-bold mb-1.5">REQUIRED DOCUMENTS</div>
        <div className="flex flex-wrap gap-1.5">
          {REQUIRED_DOCS.map((d) => (
            <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/20">{d}</span>
          ))}
        </div>
      </div>
      <a href="/welcome" className="block text-center rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black py-3 shadow-lg hover:shadow-xl transition">
        APPLY NOW · ഇപ്പോൾ അപേക്ഷിക്കുക →
      </a>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8 flex flex-col bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white">
      <div className="flex items-end justify-between mb-5 pb-3 border-b-2 border-amber-400">
        <div>
          <div className="text-[10px] tracking-[0.3em] text-amber-300 font-bold">CHAPTER · 09</div>
          <h2 className="text-lg sm:text-2xl font-black leading-tight">Contact Us</h2>
          <div className="text-xs sm:text-sm text-white/70 mt-0.5">ഞങ്ങളെ ബന്ധപ്പെടുക</div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-amber-400/30">09</div>
      </div>
      <div className="space-y-2.5 flex-1">
        <a href={`tel:${COMPANY.phone}`} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 p-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center"><Phone className="h-5 w-5 text-emerald-300" /></div>
          <div><div className="text-[10px] text-white/50 uppercase tracking-wider">Call</div><div className="font-bold text-sm">{COMPANY.phone}</div></div>
        </a>
        <a href={`https://wa.me/${COMPANY.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 p-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center"><MessageCircle className="h-5 w-5 text-green-300" /></div>
          <div><div className="text-[10px] text-white/50 uppercase tracking-wider">WhatsApp</div><div className="font-bold text-sm">{COMPANY.phone}</div></div>
        </a>
        <a href={`mailto:${COMPANY.email}`} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 p-3">
          <div className="h-10 w-10 rounded-lg bg-rose-500/20 flex items-center justify-center"><Mail className="h-5 w-5 text-rose-300" /></div>
          <div><div className="text-[10px] text-white/50 uppercase tracking-wider">Email</div><div className="font-bold text-sm">{COMPANY.email}</div></div>
        </a>
        <a href={COMPANY.website} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 p-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-500/20 flex items-center justify-center"><Globe className="h-5 w-5 text-indigo-300" /></div>
          <div><div className="text-[10px] text-white/50 uppercase tracking-wider">Website</div><div className="font-bold text-sm">{COMPANY.website.replace("https://", "")}</div></div>
        </a>
        <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0"><MapPin className="h-5 w-5 text-amber-300" /></div>
          <div><div className="text-[10px] text-white/50 uppercase tracking-wider">Office</div><div className="font-bold text-xs sm:text-sm">{COMPANY.address}</div></div>
        </div>
      </div>
    </div>
  );
}

function BackCoverPage() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center"
      style={{ background: "radial-gradient(ellipse at bottom, #1e3a8a, #0f172a 60%, #020617)" }}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 70% 80%, #ec4899 0%, transparent 50%)" }} />
      <div className="relative">
        <div className="text-5xl sm:text-7xl mb-4">🙏</div>
        <h2 className="text-2xl sm:text-4xl font-black mb-3">Thank You</h2>
        <div className="mx-auto w-16 h-px bg-amber-400/60 my-4" />
        <p className="text-sm sm:text-base text-amber-100/90 max-w-md">EI SOLUTIONS-ന്റെ family-യിലേക്ക് സ്വാഗതം. നിങ്ങളുടെ digital business journey ഇപ്പോൾ തുടങ്ങാം.</p>
        <p className="mt-2 text-[11px] text-white/50 italic">Welcome to the EI Solutions family. Begin your digital business journey today.</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a href={`https://wa.me/${COMPANY.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-2.5 text-sm">
            <MessageCircle className="h-4 w-4" /> WhatsApp Us
          </a>
          <a href="/welcome" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold px-5 py-2.5 text-sm">
            Apply Now →
          </a>
        </div>
        <div className="mt-10 text-[10px] text-white/40 tracking-widest">© {new Date().getFullYear()} {COMPANY.brand} · ALL RIGHTS RESERVED</div>
      </div>
    </div>
  );
}

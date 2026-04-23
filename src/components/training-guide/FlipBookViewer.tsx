import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen, Home, Menu, X, Lightbulb, AlertTriangle, FileText, Clock, Wallet, AlertCircle, Download, Sparkles, Loader2 } from "lucide-react";
import { GUIDE_CHAPTERS, type GuideChapter, type GuideStep } from "@/lib/training-guide-content";
import { downloadTrainingGuidePdf } from "@/lib/training-guide-pdf";
import { toast } from "sonner";

/**
 * Internal page model — every chapter expands into:
 *   1 cover page + N step pages + 1 reference page (if any extras)
 * Cover page is special (full-bleed). Step pages are bilingual side-by-side.
 */
type Page =
  | { kind: "front-cover" }
  | { kind: "toc" }
  | { kind: "chapter-cover"; chapter: GuideChapter }
  | { kind: "step"; chapter: GuideChapter; step: GuideStep; stepIndex: number; totalSteps: number }
  | { kind: "chapter-extras"; chapter: GuideChapter }
  | { kind: "back-cover" };

function buildPages(): Page[] {
  const pages: Page[] = [{ kind: "front-cover" }, { kind: "toc" }];
  for (const ch of GUIDE_CHAPTERS) {
    pages.push({ kind: "chapter-cover", chapter: ch });
    ch.steps.forEach((step, i) => {
      pages.push({ kind: "step", chapter: ch, step, stepIndex: i, totalSteps: ch.steps.length });
    });
    if (ch.documents || ch.charges || ch.approvalTime || ch.errors?.length) {
      pages.push({ kind: "chapter-extras", chapter: ch });
    }
  }
  pages.push({ kind: "back-cover" });
  return pages;
}

export function FlipBookViewer() {
  const allPages = useMemo(buildPages, []);
  const total = allPages.length;
  const [index, setIndex] = useState(0);
  const [flipping, setFlipping] = useState<"next" | "prev" | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      // tiny defer so spinner paints before the (synchronous) jsPDF work begins
      await new Promise((r) => setTimeout(r, 30));
      downloadTrainingGuidePdf();
      toast.success("Training Guide PDF download started");
    } catch (e) {
      console.error(e);
      toast.error("Could not generate PDF — please try again");
    } finally {
      setDownloading(false);
    }
  };

  const goNext = () => {
    if (index >= total - 1 || flipping) return;
    setFlipping("next");
    setTimeout(() => {
      setIndex((i) => Math.min(i + 1, total - 1));
      setFlipping(null);
    }, 450);
  };
  const goPrev = () => {
    if (index <= 0 || flipping) return;
    setFlipping("prev");
    setTimeout(() => {
      setIndex((i) => Math.max(i - 1, 0));
      setFlipping(null);
    }, 450);
  };
  const goTo = (i: number) => {
    if (flipping || i === index) return;
    setFlipping(i > index ? "next" : "prev");
    setTimeout(() => {
      setIndex(i);
      setFlipping(null);
    }, 450);
  };

  // keyboard arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // swipe (touch)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startX = 0;
    const onStart = (e: TouchEvent) => (startX = e.touches[0].clientX);
    const onEnd = (e: TouchEvent) => {
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 60) {
        if (diff < 0) goNext();
        else goPrev();
      }
    };
    el.addEventListener("touchstart", onStart);
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  });

  const currentPage = allPages[index];

  // chapter index links (for TOC)
  const chapterStartIndices = useMemo(() => {
    const map: { chapter: GuideChapter; pageIndex: number }[] = [];
    allPages.forEach((p, i) => {
      if (p.kind === "chapter-cover") map.push({ chapter: p.chapter, pageIndex: i });
    });
    return map;
  }, [allPages]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-100 via-amber-50 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-3 sm:p-6">
      {/* Top bar */}
      <div className="max-w-6xl mx-auto mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-base sm:text-lg font-bold text-foreground">EI SOLUTIONS — Training Guide</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTocOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border border-border text-xs sm:text-sm hover:bg-muted transition-colors"
          >
            <Menu className="w-4 h-4" /> Chapters
          </button>
          <button
            onClick={() => goTo(0)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border border-border text-xs sm:text-sm hover:bg-muted transition-colors"
          >
            <Home className="w-4 h-4" /> Cover
          </button>
        </div>
      </div>

      {/* Book stage */}
      <div ref={containerRef} className="max-w-6xl mx-auto perspective-[2400px] select-none">
        <div
          className={`relative mx-auto bg-white dark:bg-slate-800 rounded-r-xl rounded-l-md shadow-2xl border border-amber-200/50 dark:border-slate-700 transition-transform duration-[450ms] ease-in-out ${
            flipping === "next" ? "[transform:rotateY(-8deg)]" : flipping === "prev" ? "[transform:rotateY(8deg)]" : ""
          }`}
          style={{
            width: "100%",
            maxWidth: "1100px",
            minHeight: "min(78vh, 760px)",
            transformStyle: "preserve-3d",
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0) 30px), linear-gradient(to left, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0) 30px)",
          }}
        >
          {/* Spine shadow */}
          <div className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-1.5 bg-gradient-to-r from-transparent via-amber-900/20 to-transparent pointer-events-none rounded-full" />

          <div className="p-4 sm:p-8 md:p-10 min-h-[inherit] flex flex-col">
            <PageRenderer page={currentPage} pageNumber={index + 1} totalPages={total} />
          </div>
        </div>

        {/* Footer controls */}
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            onClick={goPrev}
            disabled={index === 0 || !!flipping}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-br from-gov-blue to-gov-blue-dark text-white font-semibold shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform"
          >
            <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Previous</span>
          </button>
          <div className="text-xs sm:text-sm font-mono text-muted-foreground bg-card px-3 py-1.5 rounded-full border border-border">
            Page {index + 1} / {total}
          </div>
          <button
            onClick={goNext}
            disabled={index === total - 1 || !!flipping}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-br from-gov-saffron to-gov-gold text-white font-semibold shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform"
          >
            <span className="hidden sm:inline">Next</span> <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-2">
          Tip: Use ← → arrow keys, or swipe on mobile
        </p>
      </div>

      {/* TOC drawer */}
      {tocOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex" onClick={() => setTocOpen(false)}>
          <div
            className="ml-auto w-full max-w-md h-full bg-card border-l border-border shadow-2xl overflow-y-auto animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-gov-blue text-white">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <h2 className="font-bold">Chapters</h2>
              </div>
              <button onClick={() => setTocOpen(false)} className="p-1.5 rounded hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  goTo(0);
                  setTocOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 rounded-md hover:bg-muted text-sm flex items-center gap-2"
              >
                <Home className="w-4 h-4 text-primary" /> Front Cover
              </button>
              {chapterStartIndices.map(({ chapter, pageIndex }) => {
                const ChIcon = chapter.icon;
                return (
                  <button
                    key={chapter.number}
                    onClick={() => {
                      goTo(pageIndex);
                      setTocOpen(false);
                    }}
                    className={`w-full text-left px-3 py-3 rounded-md hover:bg-muted text-sm flex items-start gap-3 border-l-4 mt-1 transition-colors ${
                      index >= pageIndex && (chapterStartIndices.find((c) => c.pageIndex > pageIndex)?.pageIndex ?? total) > index
                        ? `border-[hsl(var(--${chapter.themeColor}))] bg-muted/50`
                        : "border-transparent"
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white"
                      style={{ background: `hsl(var(--${chapter.themeColor}))` }}
                    >
                      <ChIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm leading-tight">
                        Ch {chapter.number}. {chapter.titleEn}
                        {chapter.comingSoon && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">soon</span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{chapter.titleMl}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── Page renderers ─────────

function PageRenderer({ page, pageNumber, totalPages }: { page: Page; pageNumber: number; totalPages: number }) {
  switch (page.kind) {
    case "front-cover":
      return <FrontCover />;
    case "toc":
      return <TocPage pageNumber={pageNumber} totalPages={totalPages} />;
    case "chapter-cover":
      return <ChapterCover chapter={page.chapter} pageNumber={pageNumber} totalPages={totalPages} />;
    case "step":
      return (
        <StepPage
          chapter={page.chapter}
          step={page.step}
          stepIndex={page.stepIndex}
          totalSteps={page.totalSteps}
          pageNumber={pageNumber}
          totalPages={totalPages}
        />
      );
    case "chapter-extras":
      return <ChapterExtras chapter={page.chapter} pageNumber={pageNumber} totalPages={totalPages} />;
    case "back-cover":
      return <BackCover />;
  }
}

function PageFooter({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
  return (
    <div className="mt-auto pt-6 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground border-t border-dashed border-border/60">
      <span>EI SOLUTIONS · Training Guide</span>
      <span className="font-mono">— {pageNumber} / {totalPages} —</span>
    </div>
  );
}

function FrontCover() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden rounded-md min-h-[60vh]">
      <div className="absolute inset-0 bg-gradient-to-br from-gov-blue via-primary to-gov-blue-dark" />
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: "radial-gradient(circle at 20% 30%, white 0px, transparent 2px), radial-gradient(circle at 80% 70%, white 0px, transparent 2px), radial-gradient(circle at 60% 20%, white 0px, transparent 2px)",
        backgroundSize: "120px 120px, 200px 200px, 80px 80px",
      }} />
      {/* Tricolor */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gov-saffron" />
      <div className="absolute top-2 left-0 right-0 h-2 bg-white" />
      <div className="absolute top-4 left-0 right-0 h-2 bg-gov-green" />

      <div className="relative z-10 text-white p-8">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-6 border border-white/30">
          <BookOpen className="w-10 h-10" />
        </div>
        <p className="text-xs sm:text-sm tracking-[0.4em] uppercase opacity-80 mb-3">Empowering Bharat</p>
        <h1 className="text-4xl sm:text-6xl font-black mb-2 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
          EI SOLUTIONS
        </h1>
        <p className="text-base sm:text-lg opacity-90 mb-8">Digital India Franchise Portal</p>
        <div className="inline-block px-6 py-3 bg-gov-gold/90 rounded-lg shadow-lg">
          <p className="text-xs uppercase tracking-widest opacity-80">Volume I</p>
          <p className="text-xl sm:text-2xl font-bold">Training Session Guide</p>
        </div>
        <p className="mt-8 text-sm opacity-75 max-w-md mx-auto">
          Retailer-മാർക്ക് വേണ്ടി Step-by-Step Bilingual Manual · For Retailers — Step-by-step bilingual manual
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gov-saffron" />
      <div className="absolute bottom-2 left-0 right-0 h-2 bg-white" />
      <div className="absolute bottom-4 left-0 right-0 h-2 bg-gov-green" />
    </div>
  );
}

function TocPage({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
  return (
    <>
      <div className="border-b-2 border-gov-blue pb-3 mb-5">
        <p className="text-[10px] tracking-widest uppercase text-gov-saffron font-bold">Index · ഉള്ളടക്കം</p>
        <h2 className="text-3xl font-black text-gov-blue" style={{ fontFamily: "Georgia, serif" }}>
          Table of Contents
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
        {GUIDE_CHAPTERS.map((ch) => {
          const ChIcon = ch.icon;
          return (
            <div key={ch.number} className="flex items-baseline gap-2 py-1.5 border-b border-dotted border-border/50">
              <div
                className="w-6 h-6 rounded shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: `hsl(var(--${ch.themeColor}))` }}
              >
                <ChIcon className="w-3 h-3" />
              </div>
              <span className="font-bold text-foreground shrink-0">Ch {ch.number}.</span>
              <span className="text-foreground truncate flex-1">
                {ch.titleEn} <span className="text-muted-foreground text-xs">· {ch.titleMl}</span>
              </span>
              {ch.comingSoon && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 shrink-0">soon</span>
              )}
            </div>
          );
        })}
      </div>
      <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
    </>
  );
}

function ChapterCover({ chapter, pageNumber, totalPages }: { chapter: GuideChapter; pageNumber: number; totalPages: number }) {
  const Icon = chapter.icon;
  return (
    <div className="flex-1 flex flex-col">
      <div
        className="rounded-2xl p-8 sm:p-12 text-white relative overflow-hidden flex-1 flex flex-col justify-center min-h-[50vh]"
        style={{
          background: `linear-gradient(135deg, hsl(var(--${chapter.themeColor})), hsl(var(--gov-blue-dark)))`,
        }}
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/5 blur-3xl" />
        <div className="relative z-10">
          <p className="text-xs sm:text-sm tracking-[0.3em] uppercase opacity-80">Chapter {chapter.number}</p>
          <div className="w-16 h-16 sm:w-20 sm:h-20 my-5 rounded-2xl bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center">
            <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black mb-2" style={{ fontFamily: "Georgia, serif" }}>
            {chapter.titleEn}
          </h2>
          <h3 className="text-xl sm:text-3xl font-bold opacity-90 mb-5">{chapter.titleMl}</h3>
          <div className="h-1 w-16 bg-white/60 rounded mb-4" />
          <p className="text-sm sm:text-base opacity-90 max-w-md">{chapter.subtitleEn}</p>
          <p className="text-sm opacity-75 max-w-md">{chapter.subtitleMl}</p>
          {chapter.comingSoon && (
            <span className="inline-block mt-4 px-3 py-1 rounded-full bg-amber-300 text-amber-900 text-xs font-bold">
              COMING SOON
            </span>
          )}
        </div>
      </div>
      <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
    </div>
  );
}

function StepPage({
  chapter,
  step,
  stepIndex,
  totalSteps,
  pageNumber,
  totalPages,
}: {
  chapter: GuideChapter;
  step: GuideStep;
  stepIndex: number;
  totalSteps: number;
  pageNumber: number;
  totalPages: number;
}) {
  const StepIcon = step.icon || chapter.icon;
  const ChIcon = chapter.icon;
  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 mb-5 border-b-2" style={{ borderColor: `hsl(var(--${chapter.themeColor}))` }}>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
          style={{ background: `hsl(var(--${chapter.themeColor}))` }}
        >
          <ChIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Chapter {chapter.number} · Step {stepIndex + 1} / {totalSteps}
          </p>
          <p className="text-sm sm:text-base font-bold text-foreground truncate">{chapter.titleEn} · {chapter.titleMl}</p>
        </div>
      </div>

      {/* Big step number + icon */}
      <div className="flex items-start gap-5 mb-6">
        <div
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center text-white shrink-0 shadow-lg"
          style={{ background: `linear-gradient(135deg, hsl(var(--${chapter.themeColor})), hsl(var(--gov-blue-dark)))` }}
        >
          <StepIcon className="w-6 h-6 mb-0.5" />
          <span className="text-[10px] font-bold opacity-90">STEP {stepIndex + 1}</span>
        </div>
        <div className="flex-1 grid sm:grid-cols-2 gap-4">
          {/* Malayalam */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4 border-l-4 border-gov-saffron">
            <p className="text-[10px] uppercase tracking-widest text-gov-saffron font-bold mb-2">മലയാളം</p>
            <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed">{step.ml}</p>
          </div>
          {/* English */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 border-l-4 border-gov-blue">
            <p className="text-[10px] uppercase tracking-widest text-gov-blue font-bold mb-2">English</p>
            <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed">{step.en}</p>
          </div>
        </div>
      </div>

      {/* Tip */}
      {step.tip && (
        <div className="rounded-lg p-3 mb-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex gap-2">
          <Lightbulb className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-bold mb-0.5">Tip · നുറുങ്ങ്</p>
            <p className="text-sm text-emerald-900 dark:text-emerald-100">{step.tip}</p>
          </div>
        </div>
      )}

      {/* Note */}
      {step.note && (
        <div className="rounded-lg p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold mb-0.5">Important · പ്രധാനം</p>
            <p className="text-sm text-amber-900 dark:text-amber-100">{step.note}</p>
          </div>
        </div>
      )}

      <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
    </>
  );
}

function ChapterExtras({ chapter, pageNumber, totalPages }: { chapter: GuideChapter; pageNumber: number; totalPages: number }) {
  return (
    <>
      <div className="pb-3 mb-5 border-b-2" style={{ borderColor: `hsl(var(--${chapter.themeColor}))` }}>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Chapter {chapter.number} · Quick Reference</p>
        <h3 className="text-2xl font-bold text-foreground">റഫറൻസ് · Reference</h3>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {chapter.documents && (
          <InfoCard icon={FileText} title="Required Documents · ആവശ്യ രേഖകൾ" tone="blue">
            <ul className="space-y-1.5">
              {chapter.documents.map((d, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-gov-blue">•</span> {d}
                </li>
              ))}
            </ul>
          </InfoCard>
        )}
        {chapter.charges && (
          <InfoCard icon={Wallet} title="Charges · ഫീസ്" tone="green">
            <p className="text-sm">{chapter.charges}</p>
          </InfoCard>
        )}
        {chapter.approvalTime && (
          <InfoCard icon={Clock} title="Approval Time · സമയം" tone="saffron">
            <p className="text-sm">{chapter.approvalTime}</p>
          </InfoCard>
        )}
        {chapter.errors && chapter.errors.length > 0 && (
          <InfoCard icon={AlertCircle} title="Errors & Solutions · പ്രശ്നങ്ങൾ" tone="red">
            <ul className="space-y-2">
              {chapter.errors.map((e, i) => (
                <li key={i} className="text-xs">
                  <p className="font-semibold text-red-700 dark:text-red-400">❌ {e.problem}</p>
                  <p className="text-foreground/80 pl-4">✓ {e.solution}</p>
                </li>
              ))}
            </ul>
          </InfoCard>
        )}
      </div>
      <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
    </>
  );
}

function InfoCard({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: React.ElementType;
  title: string;
  tone: "blue" | "green" | "saffron" | "red";
  children: React.ReactNode;
}) {
  const styles = {
    blue: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800/50 text-gov-blue",
    green: "from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800/50 text-gov-green",
    saffron: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800/50 text-gov-saffron",
    red: "from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800/50 text-red-600",
  }[tone];
  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br border ${styles}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <p className="text-[11px] uppercase tracking-widest font-bold">{title}</p>
      </div>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

function BackCover() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden rounded-md min-h-[60vh]">
      <div className="absolute inset-0 bg-gradient-to-br from-gov-blue-dark via-primary to-gov-blue" />
      <div className="absolute top-0 left-0 right-0 h-2 bg-gov-saffron" />
      <div className="absolute top-2 left-0 right-0 h-2 bg-white" />
      <div className="absolute top-4 left-0 right-0 h-2 bg-gov-green" />
      <div className="relative z-10 text-white p-8 max-w-md">
        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-80" />
        <h2 className="text-3xl font-black mb-3" style={{ fontFamily: "Georgia, serif" }}>
          നന്ദി · Thank You
        </h2>
        <p className="opacity-90 mb-6 text-sm">
          ഈ guide complete ചെയ്തതിൽ വളരെ നന്ദി. എല്ലാ services-ഉം നിങ്ങൾക്ക് confidence-ഓടെ deliver ചെയ്യാം.
        </p>
        <div className="border-t border-white/30 pt-5 mt-5 space-y-1 text-sm opacity-90">
          <p>Support: support@eisoluions.xyz</p>
          <p>Web: www.eisoluions.xyz</p>
          <p className="text-xs opacity-70 mt-3">© EI SOLUTIONS · Digital India Franchise</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gov-saffron" />
      <div className="absolute bottom-2 left-0 right-0 h-2 bg-white" />
      <div className="absolute bottom-4 left-0 right-0 h-2 bg-gov-green" />
    </div>
  );
}

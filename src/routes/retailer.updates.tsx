/**
 * Retailer "Updates" page — Live Kerala feeds:
 *  - Daily Lottery Result (with branded PDF download)
 *  - Kerala PSC notifications & press releases
 *  - Government of India press releases (PIB Kerala)
 *
 * Wrapped in ServicePageShell to match the My Services aesthetic.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ServicePageShell, ServiceSectionCard } from "@/components/ServicePageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Newspaper, Download, RefreshCw, ExternalLink, Sparkles,
  Trophy, Building2, Globe2, AlertCircle, Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchLotteryResult, fetchPSCNotifications, fetchGovtNotifications,
  type FeedItem, type LotteryDraw,
} from "@/lib/updates.functions";
import { generateLotteryPDF } from "@/lib/lottery-pdf";
import {
  InlineArticleViewer, type ArticleRequest,
} from "@/components/updates/InlineArticleViewer";

export const Route = createFileRoute("/retailer/updates")({
  ssr: false,
  component: UpdatesPage,
});

function UpdatesPage() {
  const [lottery, setLottery] = useState<LotteryDraw | null>(null);
  const [lotteryErr, setLotteryErr] = useState<string | null>(null);
  const [lotteryLoading, setLotteryLoading] = useState(true);

  const [psc, setPsc] = useState<FeedItem[]>([]);
  const [pscErr, setPscErr] = useState<string | null>(null);
  const [pscLoading, setPscLoading] = useState(true);

  const [govt, setGovt] = useState<FeedItem[]>([]);
  const [govtErr, setGovtErr] = useState<string | null>(null);
  const [govtLoading, setGovtLoading] = useState(true);

  // Inline viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerReq, setViewerReq] = useState<ArticleRequest | null>(null);

  const openInline = (item: FeedItem) => {
    setViewerReq({ url: item.link, title: item.title, source: item.source });
    setViewerOpen(true);
  };

  const loadLottery = async () => {
    setLotteryLoading(true);
    try {
      const r = await fetchLotteryResult();
      setLottery(r.draw);
      setLotteryErr(r.error);
    } catch (e: any) {
      setLotteryErr(e?.message || "Failed to fetch lottery result");
    } finally {
      setLotteryLoading(false);
    }
  };

  const loadPSC = async () => {
    setPscLoading(true);
    try {
      const r = await fetchPSCNotifications();
      setPsc(r.items);
      setPscErr(r.error);
    } catch (e: any) {
      setPscErr(e?.message || "Failed to fetch PSC");
    } finally {
      setPscLoading(false);
    }
  };

  const loadGovt = async () => {
    setGovtLoading(true);
    try {
      const r = await fetchGovtNotifications();
      setGovt(r.items);
      setGovtErr(r.error);
    } catch (e: any) {
      setGovtErr(e?.message || "Failed to fetch notifications");
    } finally {
      setGovtLoading(false);
    }
  };

  useEffect(() => {
    loadLottery();
    loadPSC();
    loadGovt();
  }, []);

  const handleDownloadPDF = () => {
    if (!lottery) return;
    try {
      const pdf = generateLotteryPDF(lottery);
      const filename = `KeralaLottery_${lottery.name}_${lottery.number || "latest"}.pdf`;
      pdf.save(filename);
      toast.success("Lottery result PDF downloaded");
    } catch (e: any) {
      toast.error(e?.message || "PDF generation failed");
    }
  };

  const refreshAll = () => {
    loadLottery();
    loadPSC();
    loadGovt();
    toast.info("Refreshing all updates…");
  };

  return (
    <ServicePageShell
      icon={Newspaper}
      title="Live Updates"
      subtitle="Kerala Lottery Result · PSC Notifications · Government Press Releases"
      eyebrow="Daily Bulletin"
      gradient="from-rose-600 via-orange-600 to-amber-500"
      hideWallet
      headerAction={
        <Button
          size="sm"
          onClick={refreshAll}
          className="bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-xl font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      }
      stats={[
        { icon: Trophy, label: "Lottery", value: lottery?.number || "—", accent: "from-amber-400 to-yellow-500" },
        { icon: Building2, label: "PSC Items", value: psc.length, accent: "from-blue-400 to-indigo-500" },
        { icon: Globe2, label: "Govt Press", value: govt.length, accent: "from-emerald-400 to-teal-500" },
      ]}
    >
      <Tabs defaultValue="lottery" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl mb-4">
          <TabsTrigger value="lottery">
            <Trophy className="w-4 h-4 mr-1.5" /> Lottery
          </TabsTrigger>
          <TabsTrigger value="psc">
            <Building2 className="w-4 h-4 mr-1.5" /> Kerala PSC
          </TabsTrigger>
          <TabsTrigger value="govt">
            <Globe2 className="w-4 h-4 mr-1.5" /> Govt Press
          </TabsTrigger>
        </TabsList>

        {/* ───── LOTTERY ───── */}
        <TabsContent value="lottery" className="space-y-4">
          <ServiceSectionCard
            title="Today's Kerala Lottery Result"
            icon={Sparkles}
            accent="from-amber-500 to-orange-600"
            right={
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={loadLottery} disabled={lotteryLoading}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${lotteryLoading ? "animate-spin" : ""}`} />
                  Reload
                </Button>
                {lottery && (
                  <Button
                    size="sm"
                    onClick={handleDownloadPDF}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
                  </Button>
                )}
              </div>
            }
          >
            {lotteryLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : lottery ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/60 dark:border-amber-700/40 p-4">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-200">
                      {lottery.name}
                    </h3>
                    {lottery.number && (
                      <Badge className="bg-amber-600 text-white">{lottery.number}</Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      Draw Date: <strong>{lottery.date}</strong>
                    </span>
                  </div>
                  {lotteryErr && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{lotteryErr}</span>
                    </div>
                  )}
                </div>

                {lottery.prizes.length > 0 ? (
                  <div className="space-y-2">
                    {lottery.prizes.map((p, i) => (
                      <div key={i} className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-bold">
                              {p.rank}
                            </Badge>
                            {p.amount && (
                              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                ₹{Number(p.amount).toLocaleString("en-IN")}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {p.tickets.length} winner{p.tickets.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                        {p.tickets.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {p.tickets.map((t, j) => (
                              <code
                                key={j}
                                className="text-xs px-2 py-0.5 rounded bg-muted font-mono"
                              >
                                {t}
                              </code>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground p-4 rounded-lg border border-dashed">
                    Result page detected but prize details could not be extracted.
                    Please use the official link below to verify.
                  </div>
                )}

                <a
                  href={lottery.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View on official Kerala Lotteries site
                </a>
              </div>
            ) : (
              <EmptyState
                icon={Trophy}
                message={lotteryErr || "Result not yet published. Check back after 3 PM."}
                actionLabel="Visit official site"
                actionHref="https://www.keralalotteries.com/"
              />
            )}
          </ServiceSectionCard>
        </TabsContent>

        {/* ───── PSC ───── */}
        <TabsContent value="psc">
          <ServiceSectionCard
            title="Kerala PSC — Notifications & Press Releases"
            icon={Building2}
            accent="from-blue-500 to-indigo-600"
            right={
              <Button size="sm" variant="outline" onClick={loadPSC} disabled={pscLoading}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${pscLoading ? "animate-spin" : ""}`} />
                Reload
              </Button>
            }
          >
            <FeedList
              loading={pscLoading}
              items={psc}
              error={pscErr}
              emptyMsg="No new PSC items found right now."
              fallbackHref="https://www.keralapsc.gov.in/"
              fallbackLabel="Open keralapsc.gov.in"
              onOpen={openInline}
            />
          </ServiceSectionCard>
        </TabsContent>

        {/* ───── GOVT ───── */}
        <TabsContent value="govt">
          <ServiceSectionCard
            title="Government of India — Press Releases (Kerala)"
            icon={Globe2}
            accent="from-emerald-500 to-teal-600"
            right={
              <Button size="sm" variant="outline" onClick={loadGovt} disabled={govtLoading}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${govtLoading ? "animate-spin" : ""}`} />
                Reload
              </Button>
            }
          >
            <FeedList
              loading={govtLoading}
              items={govt}
              error={govtErr}
              emptyMsg="No press releases available right now."
              fallbackHref="https://pib.gov.in/AllRelease.aspx?reg=24"
              fallbackLabel="Open PIB Kerala"
              onOpen={openInline}
            />
          </ServiceSectionCard>
        </TabsContent>
      </Tabs>

      <InlineArticleViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        request={viewerReq}
      />
    </ServicePageShell>
  );
}

function FeedList({
  loading, items, error, emptyMsg, fallbackHref, fallbackLabel,
}: {
  loading: boolean;
  items: FeedItem[];
  error: string | null;
  emptyMsg: string;
  fallbackHref: string;
  fallbackLabel: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (!items.length) {
    return (
      <EmptyState
        icon={AlertCircle}
        message={error || emptyMsg}
        actionLabel={fallbackLabel}
        actionHref={fallbackHref}
      />
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i}>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border bg-card p-3 hover:bg-accent transition-colors"
          >
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                {item.source}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm leading-snug">{item.title}</div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                {item.pubDate && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {item.pubDate}
                  </div>
                )}
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({
  icon: Icon, message, actionLabel, actionHref,
}: {
  icon: React.ElementType;
  message: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="text-center py-8 px-4">
      <Icon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <a href={actionHref} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm">
          <ExternalLink className="w-3.5 h-3.5 mr-1" />
          {actionLabel}
        </Button>
      </a>
    </div>
  );
}

/**
 * Inline article viewer — scrapes the source URL via Firecrawl and renders
 * the full content as markdown inside our portal. Users never leave the app.
 */
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, AlertCircle, Globe2, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  mirrorArticle, type ArticleContent,
} from "@/lib/updates.functions";

export type ArticleRequest = {
  url: string;
  title: string;
  source: string;
};

export function InlineArticleViewer({
  open, onOpenChange, request,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  request: ArticleRequest | null;
}) {
  const [content, setContent] = useState<ArticleContent | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!request) return;
    setLoading(true);
    setContent(null);
    try {
      const res = await mirrorArticle({ data: request });
      setContent(res);
    } catch (e: any) {
      setContent({
        title: request.title,
        markdown: `**Failed to load:** ${e?.message || "Unknown error"}`,
        sourceUrl: request.url,
        sourceTitle: request.source,
        error: e?.message || "Failed",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && request) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request?.url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b bg-gradient-to-r from-rose-50 via-orange-50 to-amber-50 dark:from-rose-950/40 dark:via-orange-950/40 dark:to-amber-950/40">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center shrink-0">
              <Globe2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base leading-snug pr-6">
                {content?.title || request?.title || "Loading…"}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">
                    {request?.source || "External"}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                    {request?.url ? new URL(request.url).hostname : ""}
                  </span>
                  {content?.publishedAt && (
                    <span className="text-[11px] text-muted-foreground">
                      · {new Date(content.publishedAt).toLocaleDateString("en-IN")}
                    </span>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : content?.error ? (
            <div className="flex flex-col items-center text-center py-8">
              <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">{content.error}</p>
              <p className="text-xs text-muted-foreground">
                You can still view it on the source site.
              </p>
            </div>
          ) : content?.markdown ? (
            <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-rose-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content.markdown}
              </ReactMarkdown>
            </article>
          ) : null}
        </ScrollArea>

        <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
          {request?.url && (
            <a href={request.url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline">
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Open original
              </Button>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

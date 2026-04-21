/**
 * Server functions for the Retailer "Updates" page.
 *
 * Strategy: Firecrawl for everything — search returns real-time results;
 * scrape mirrors the full article content inside our portal so users never
 * leave the app. Falls back to Google News RSS if Firecrawl is rate-limited.
 */
import { createServerFn } from "@tanstack/react-start";
import { XMLParser } from "fast-xml-parser";
import Firecrawl from "@mendable/firecrawl-js";

export type FeedItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
};

export type LotteryDraw = {
  name: string;
  number: string;
  date: string;
  prizes: Array<{ rank: string; amount: string; tickets: string[] }>;
  source: string;
  officialUrl: string;
};

export type ArticleContent = {
  title: string;
  markdown: string;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt?: string;
  error?: string | null;
};

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8,ml;q=0.7",
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function stripHtml(html: string) {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string, timeoutMs = 20000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function parseRssItems(xml: string, source: string, max = 25): FeedItem[] {
  try {
    const obj: any = parser.parse(xml);
    const channel = obj?.rss?.channel ?? obj?.feed;
    if (!channel) return [];
    const rawItems = channel.item ?? channel.entry ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    return items
      .slice(0, max)
      .map((it: any) => {
        const title = stripHtml(String(it.title?.["#text"] ?? it.title ?? ""));
        let link = "";
        if (typeof it.link === "string") link = it.link;
        else if (Array.isArray(it.link))
          link = it.link[0]?.["@_href"] ?? it.link[0]?.["#text"] ?? "";
        else link = it.link?.["@_href"] ?? it.link?.["#text"] ?? "";
        const pubDateRaw = String(it.pubDate ?? it.published ?? it.updated ?? "");
        const pubDate = pubDateRaw
          ? new Date(pubDateRaw).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "";
        const description = stripHtml(
          String(it.description ?? it.summary ?? it.content ?? ""),
        ).slice(0, 300);
        return { title, link, pubDate, description, source };
      })
      .filter((i) => i.title && i.link);
  } catch {
    return [];
  }
}

function googleNewsRss(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
}

function getFirecrawl(): Firecrawl | null {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;
  return new Firecrawl({ apiKey });
}

// ──────────────── Firecrawl Search (primary) ────────────────
async function firecrawlSearchItems(
  query: string,
  source: string,
  limit = 15,
): Promise<FeedItem[]> {
  const fc = getFirecrawl();
  if (!fc) return [];
  try {
    const res: any = await fc.search(query, {
      limit,
      lang: "en",
      country: "in",
      tbs: "qdr:w", // last week
    });
    const results = res?.web ?? res?.data ?? res?.results?.web ?? [];
    return (Array.isArray(results) ? results : [])
      .map((r: any) => ({
        title: r.title ?? "",
        link: r.url ?? r.link ?? "",
        pubDate: r.date ?? r.publishedAt ?? "",
        description: (r.description ?? r.snippet ?? "").slice(0, 300),
        source,
      }))
      .filter((i: FeedItem) => i.title && i.link);
  } catch (e) {
    console.error("Firecrawl search failed:", e);
    return [];
  }
}

// ──────────────── PSC ────────────────
export const fetchPSCNotifications = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: FeedItem[]; error: string | null }> => {
    const items: FeedItem[] = [];
    let lastErr: string | null = null;

    // Primary: Firecrawl search
    const fcItems = await firecrawlSearchItems(
      "Kerala PSC notification recruitment exam",
      "Kerala PSC",
      20,
    );
    items.push(...fcItems);

    // Fallback: Google News RSS
    if (items.length < 5) {
      try {
        const xml = await fetchText(
          googleNewsRss("Kerala PSC notification recruitment"),
        );
        items.push(...parseRssItems(xml, "Kerala PSC News", 20));
      } catch (e: any) {
        lastErr = e?.message || "Fallback fetch failed";
      }
    }

    const seen = new Set<string>();
    const dedup = items.filter((i) => {
      if (seen.has(i.link)) return false;
      seen.add(i.link);
      return true;
    });

    return {
      items: dedup.slice(0, 30),
      error: dedup.length === 0 ? lastErr || "No items found" : null,
    };
  },
);

// ──────────────── Government Notifications ────────────────
export const fetchGovtNotifications = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: FeedItem[]; error: string | null }> => {
    const items: FeedItem[] = [];
    let lastErr: string | null = null;

    // Primary: Firecrawl
    const fcItems = await firecrawlSearchItems(
      "Kerala government notification announcement scheme",
      "Govt News (Kerala)",
      20,
    );
    items.push(...fcItems);

    // Fallback: Google News RSS
    if (items.length < 5) {
      const queries = [
        "Kerala government notification announcement",
        "Kerala state press release",
      ];
      for (const q of queries) {
        try {
          const xml = await fetchText(googleNewsRss(q));
          items.push(...parseRssItems(xml, "Govt News (Kerala)", 15));
        } catch (e: any) {
          lastErr = e?.message || "Fetch failed";
        }
      }
    }

    const seen = new Set<string>();
    const dedup = items.filter((i) => {
      const k = i.link || i.title;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    dedup.sort((a, b) => {
      const ta = Date.parse(a.pubDate) || 0;
      const tb = Date.parse(b.pubDate) || 0;
      return tb - ta;
    });

    return {
      items: dedup.slice(0, 30),
      error: dedup.length === 0 ? lastErr || "No notifications found" : null,
    };
  },
);

// ──────────────── Lottery ────────────────
export const fetchLotteryResult = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ draw: LotteryDraw | null; error: string | null }> => {
    // Try Firecrawl scrape of official site first (best chance with anti-bot)
    const fc = getFirecrawl();
    if (fc) {
      try {
        const res: any = await fc.scrape(
          "https://www.keralalotteries.com/index.php/quick_view/index",
          { formats: ["markdown", "html"], onlyMainContent: true },
        );
        const md = res?.markdown ?? res?.data?.markdown ?? "";
        const html = res?.html ?? res?.data?.html ?? "";
        const combined = `${md}\n${html}`;
        const parsed = parseLotteryFromText(combined, "https://www.keralalotteries.com/");
        if (parsed) return { draw: parsed.draw, error: parsed.error };
      } catch (e) {
        console.error("Firecrawl lottery scrape failed:", e);
      }
    }

    // Fallback to direct fetches
    const tryUrls = [
      "https://www.keralalotteries.com/index.php/quick_view/index",
      "https://statelottery.kerala.gov.in/index.php/lottery_result_view",
      "https://www.keralalotteries.com/",
    ];
    let lastErr: string | null = null;
    for (const url of tryUrls) {
      try {
        const html = await fetchText(url, 25000);
        const parsed = parseLotteryFromText(html, url);
        if (parsed) return { draw: parsed.draw, error: parsed.error };
      } catch (e: any) {
        lastErr = e?.message || "Fetch failed";
      }
    }

    return {
      draw: null,
      error:
        lastErr ||
        "Could not fetch lottery result. Try again after 3 PM IST.",
    };
  },
);

function parseLotteryFromText(
  raw: string,
  sourceUrl: string,
): { draw: LotteryDraw; error: string | null } | null {
  const titleM = raw.match(
    /(STHREE[-\s]?SAKTHI|AKSHAYA|KARUNYA(?:\s+PLUS)?|NIRMAL|WIN[-\s]?WIN|SUVARNA[-\s]?KERALAM|FIFTY[-\s]?FIFTY|BHAGYATHARA|DHANALEKSHMI)[^A-Za-z]{0,30}([A-Z]{1,4}[-\s]?\d{2,4})/i,
  );
  const dateM = raw.match(
    /(\d{1,2}[-./\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-./\s]\d{2,4})/i,
  );

  const text = stripHtml(raw);
  const prizes: LotteryDraw["prizes"] = [];
  const lines = text.split(/\.\s+(?=\d)|\n+/);
  let cur: { rank: string; amount: string; tickets: string[] } | null = null;
  for (const ln of lines) {
    const head = ln.match(
      /^\s*(\d+(?:st|nd|rd|th)|FOR\s+THE\s+TICKETS|Cons\w*|Consolation)[^\d]*?(?:Rs|₹)?\s*[:\-]?\s*([\d,]+)?/i,
    );
    if (head) {
      if (cur && cur.tickets.length) prizes.push(cur);
      cur = {
        rank: head[1].toUpperCase(),
        amount: head[2] ? head[2].replace(/,/g, "") : "",
        tickets: [],
      };
      const rest = ln.slice(head[0].length);
      const tk = rest.match(/[A-Z]{2}\s?\d{4,7}/g);
      if (tk && cur) cur.tickets.push(...tk);
    } else if (cur) {
      const tk = ln.match(/[A-Z]{2}\s?\d{4,7}/g);
      if (tk) cur.tickets.push(...tk);
    }
  }
  if (cur && cur.tickets.length) prizes.push(cur);

  if (!titleM && prizes.length === 0) return null;
  return {
    draw: {
      name: titleM ? titleM[1].toUpperCase() : "Kerala Lottery",
      number: titleM ? titleM[2].toUpperCase().replace(/\s/g, "-") : "",
      date: dateM ? dateM[1] : new Date().toLocaleDateString("en-IN"),
      prizes,
      source: sourceUrl,
      officialUrl: "https://www.keralalotteries.com/",
    },
    error:
      prizes.length === 0
        ? "Result page found but prize details could not be parsed."
        : null,
  };
}

// ──────────────── Mirror Article (full-page scrape inside portal) ────────────────
export const mirrorArticle = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string; title?: string; source?: string }) => d)
  .handler(async ({ data }): Promise<ArticleContent> => {
    const fc = getFirecrawl();
    const fallbackTitle = data.title || "Article";
    const sourceTitle = data.source || new URL(data.url).hostname;

    if (!fc) {
      return {
        title: fallbackTitle,
        markdown:
          "**Inline preview unavailable** — Firecrawl is not configured. Please use the external link.",
        sourceUrl: data.url,
        sourceTitle,
        error: "FIRECRAWL_API_KEY missing",
      };
    }

    try {
      const res: any = await fc.scrape(data.url, {
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 1500,
      });
      const markdown =
        res?.markdown ?? res?.data?.markdown ?? "";
      const meta = res?.metadata ?? res?.data?.metadata ?? {};
      if (!markdown.trim()) {
        return {
          title: fallbackTitle,
          markdown: "_The page returned no readable content._",
          sourceUrl: data.url,
          sourceTitle,
          error: "Empty content",
        };
      }
      return {
        title: meta.title || fallbackTitle,
        markdown,
        sourceUrl: data.url,
        sourceTitle,
        publishedAt: meta.publishedTime || meta.publishedAt,
        error: null,
      };
    } catch (e: any) {
      return {
        title: fallbackTitle,
        markdown: `**Could not load article inline.**\n\nError: ${e?.message || "Unknown error"}`,
        sourceUrl: data.url,
        sourceTitle,
        error: e?.message || "Scrape failed",
      };
    }
  });

/**
 * Server functions for the Retailer "Updates" page.
 *
 * Strategy (after observing real-world failures):
 *  - Direct Govt sources block bots (PIB returns 403, PSC ratelimits).
 *  - Solution: route through Google News RSS — always reachable, returns
 *    fresh, real items with dates and links to original publishers.
 *  - Lottery: use multiple keralalotteries.com endpoints + Google News fallback.
 */
import { createServerFn } from "@tanstack/react-start";
import { XMLParser } from "fast-xml-parser";

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

// Realistic browser headers — many gov sites block default fetch UA.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8,ml;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
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

async function fetchText(url: string, timeoutMs = 25000): Promise<string> {
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
        const pubDateRaw = String(
          it.pubDate ?? it.published ?? it.updated ?? "",
        );
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

// Helper: query Google News RSS — most reliable cross-site aggregator.
function googleNewsRss(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
}

// ──────────────── PSC (via Google News + direct site fallback) ────────────────
export const fetchPSCNotifications = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: FeedItem[]; error: string | null }> => {
    const items: FeedItem[] = [];
    let lastErr: string | null = null;

    // Primary: Google News RSS for PSC
    try {
      const xml = await fetchText(
        googleNewsRss("Kerala PSC notification OR exam OR result site:keralapsc.gov.in OR site:psc.kerala.gov.in"),
      );
      items.push(...parseRssItems(xml, "Kerala PSC", 20));
    } catch (e: any) {
      lastErr = e?.message || "Google News fetch failed";
    }

    // Secondary: broader Kerala PSC news query
    if (items.length < 5) {
      try {
        const xml = await fetchText(googleNewsRss("Kerala PSC recruitment notification"));
        items.push(...parseRssItems(xml, "Kerala PSC News", 15));
      } catch {
        /* ignore */
      }
    }

    // Tertiary: try direct PSC site (often works from server even if RSS fails)
    try {
      const html = await fetchText("https://www.keralapsc.gov.in/notifications", 15000);
      const anchorRe =
        /<a[^>]+href="([^"]+\.(?:pdf|html?|aspx?)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      let m: RegExpExecArray | null;
      let count = 0;
      while ((m = anchorRe.exec(html)) && count < 20) {
        const href = m[1].startsWith("http")
          ? m[1]
          : `https://www.keralapsc.gov.in${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
        const title = stripHtml(m[2]);
        if (
          title.length > 8 &&
          !/^(home|about|contact|next|prev|click|here|read more|download)$/i.test(
            title,
          )
        ) {
          items.push({
            title,
            link: href,
            pubDate: "",
            description: "",
            source: "PSC Official",
          });
          count++;
        }
      }
    } catch {
      /* ignore — Google News covers this */
    }

    const seen = new Set<string>();
    const dedup = items.filter((i) => {
      const k = i.link;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    return {
      items: dedup.slice(0, 30),
      error: dedup.length === 0 ? lastErr || "No items found" : null,
    };
  },
);

// ──────────────── Government Notifications (Google News RSS — bypasses PIB 403) ────
export const fetchGovtNotifications = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: FeedItem[]; error: string | null }> => {
    const items: FeedItem[] = [];
    let lastErr: string | null = null;

    // Multi-query for diverse Kerala govt coverage
    const queries = [
      "Kerala government notification announcement",
      "Kerala state press release",
      "PIB Kerala Thiruvananthapuram",
    ];

    for (const q of queries) {
      try {
        const xml = await fetchText(googleNewsRss(q));
        items.push(...parseRssItems(xml, "Govt News (Kerala)", 15));
      } catch (e: any) {
        lastErr = e?.message || "Fetch failed";
      }
    }

    const seen = new Set<string>();
    const dedup = items.filter((i) => {
      const k = i.link || i.title;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Sort by pubDate desc when available
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

// ──────────────── Kerala Lottery (latest result) ────────────────
export const fetchLotteryResult = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ draw: LotteryDraw | null; error: string | null }> => {
    const tryUrls = [
      "https://www.keralalotteries.com/index.php/quick_view/index",
      "https://statelottery.kerala.gov.in/index.php/lottery_result_view",
      "https://www.keralalotteries.com/",
      "https://keralalotteryresult.net/",
    ];
    let lastErr: string | null = null;

    for (const url of tryUrls) {
      try {
        const html = await fetchText(url, 25000);

        // Match draw name + number — broader pattern
        const titleM = html.match(
          /(STHREE[-\s]?SAKTHI|AKSHAYA|KARUNYA(?:\s+PLUS)?|NIRMAL|WIN[-\s]?WIN|SUVARNA[-\s]?KERALAM|FIFTY[-\s]?FIFTY|BHAGYATHARA|DHANALEKSHMI)[^A-Za-z]{0,30}([A-Z]{1,4}[-\s]?\d{2,4})/i,
        );
        const dateM = html.match(
          /(\d{1,2}[-./\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-./\s]\d{2,4})/i,
        );

        const preM = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
        const block = preM ? stripHtml(preM[1]) : stripHtml(html);

        const prizes: LotteryDraw["prizes"] = [];
        if (block) {
          const lines = block.split(/\n+|\.\s+(?=\d)/);
          let cur: { rank: string; amount: string; tickets: string[] } | null =
            null;
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
        }

        if (titleM || prizes.length) {
          return {
            draw: {
              name: titleM ? titleM[1].toUpperCase() : "Kerala Lottery",
              number: titleM ? titleM[2].toUpperCase().replace(/\s/g, "-") : "",
              date: dateM ? dateM[1] : new Date().toLocaleDateString("en-IN"),
              prizes,
              source: url,
              officialUrl: "https://www.keralalotteries.com/",
            },
            error:
              prizes.length === 0
                ? "Result page found but prize details could not be parsed automatically. Please verify on the official site."
                : null,
          };
        }
      } catch (e: any) {
        lastErr = e?.message || "Fetch failed";
      }
    }

    // Final fallback: Google News for latest Kerala lottery result
    try {
      const xml = await fetchText(
        googleNewsRss("Kerala lottery result today"),
        15000,
      );
      const items = parseRssItems(xml, "Kerala Lottery News", 1);
      if (items.length > 0) {
        return {
          draw: {
            name: items[0].title.slice(0, 60),
            number: "",
            date: items[0].pubDate || new Date().toLocaleDateString("en-IN"),
            prizes: [],
            source: items[0].link,
            officialUrl: "https://www.keralalotteries.com/",
          },
          error:
            "Could not fetch full result — showing latest news. Click 'View on official site' to see complete prize list.",
        };
      }
    } catch {
      /* ignore */
    }

    return {
      draw: null,
      error:
        lastErr ||
        "Could not fetch lottery result. Visit keralalotteries.com directly.",
    };
  },
);

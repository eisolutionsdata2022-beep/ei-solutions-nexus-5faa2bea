/**
 * Server functions for the Retailer "Updates" page.
 *
 * Fetches:
 *  - Kerala Lottery Result (latest) — community mirror RSS + scraping fallback
 *  - Kerala PSC press releases / notifications — keralapsc.gov.in
 *  - Government of India press releases (Kerala-relevant) — PIB Kerala RSS
 *
 * All endpoints run server-side to avoid browser CORS issues. Real-time on
 * page load (no caching layer beyond fetch's default).
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

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; EISolutionsBot/1.0; +https://eisoluions.xyz)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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

async function fetchText(url: string, timeoutMs = 12000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: COMMON_HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function parseRssItems(xml: string, source: string, max = 20): FeedItem[] {
  try {
    const obj: any = parser.parse(xml);
    const channel = obj?.rss?.channel ?? obj?.feed;
    if (!channel) return [];
    const rawItems = channel.item ?? channel.entry ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    return items.slice(0, max).map((it: any) => {
      const title = stripHtml(String(it.title?.["#text"] ?? it.title ?? ""));
      const link =
        typeof it.link === "string"
          ? it.link
          : (it.link?.["@_href"] ?? it.link?.["#text"] ?? "");
      const pubDate = String(
        it.pubDate ?? it.published ?? it.updated ?? new Date().toISOString(),
      );
      const description = stripHtml(
        String(it.description ?? it.summary ?? it.content ?? ""),
      ).slice(0, 400);
      return { title, link, pubDate, description, source };
    });
  } catch {
    return [];
  }
}

// ──────────────── PSC ────────────────
export const fetchPSCNotifications = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: FeedItem[]; error: string | null }> => {
    // PSC main news/notification page (HTML scrape — no official RSS)
    const sources = [
      "https://www.keralapsc.gov.in/notifications",
      "https://www.keralapsc.gov.in/press-release",
    ];
    const items: FeedItem[] = [];
    let lastErr: string | null = null;
    for (const url of sources) {
      try {
        const html = await fetchText(url);
        // Find anchor + nearby date patterns. PSC uses <li> or <tr> blocks.
        const anchorRe =
          /<a[^>]+href="([^"]+\.(?:pdf|html?|aspx?))"[^>]*>([\s\S]*?)<\/a>/gi;
        let m: RegExpExecArray | null;
        let count = 0;
        while ((m = anchorRe.exec(html)) && count < 30) {
          const href = m[1].startsWith("http")
            ? m[1]
            : `https://www.keralapsc.gov.in${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
          const title = stripHtml(m[2]);
          if (
            title.length > 8 &&
            !/^(home|about|contact|next|prev|click|here|read more)$/i.test(title)
          ) {
            items.push({
              title,
              link: href,
              pubDate: "",
              description: "",
              source: url.includes("press") ? "PSC Press Release" : "PSC Notification",
            });
            count++;
          }
        }
      } catch (e: any) {
        lastErr = e?.message || "Failed to fetch PSC";
      }
    }
    // Deduplicate by link
    const seen = new Set<string>();
    const dedup = items.filter((i) => {
      if (seen.has(i.link)) return false;
      seen.add(i.link);
      return true;
    });
    return {
      items: dedup.slice(0, 25),
      error: dedup.length === 0 ? lastErr || "No items found" : null,
    };
  },
);

// ──────────────── Government Notifications (PIB Kerala) ────────────────
export const fetchGovtNotifications = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: FeedItem[]; error: string | null }> => {
    // PIB regional RSS for Kerala (Thiruvananthapuram)
    const candidates = [
      "https://pib.gov.in/RssMain.aspx?ModId=8&Lang=1&RegId=24",
      "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&RegId=24",
    ];
    let items: FeedItem[] = [];
    let lastErr: string | null = null;
    for (const url of candidates) {
      try {
        const xml = await fetchText(url);
        const parsed = parseRssItems(xml, "PIB Kerala", 20);
        if (parsed.length) {
          items = items.concat(parsed);
        }
      } catch (e: any) {
        lastErr = e?.message || "Failed to fetch PIB";
      }
    }
    const seen = new Set<string>();
    const dedup = items.filter((i) => {
      const k = i.link || i.title;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return {
      items: dedup.slice(0, 25),
      error: dedup.length === 0 ? lastErr || "No notifications found" : null,
    };
  },
);

// ──────────────── Kerala Lottery (latest result) ────────────────
/**
 * keralalotteries.com publishes the latest result on its homepage. We scrape
 * it and parse the canonical structure: draw name + number + prize blocks.
 */
export const fetchLotteryResult = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ draw: LotteryDraw | null; error: string | null }> => {
    const tryUrls = [
      "https://www.keralalotteries.com/index.php/quick_view/index",
      "https://statelottery.kerala.gov.in/index.php/lottery_result_view",
      "https://www.keralalotteries.com/",
    ];
    let lastErr: string | null = null;
    for (const url of tryUrls) {
      try {
        const html = await fetchText(url);

        // Heuristic extraction — Kerala Lotteries pages embed result inside <pre> or <div class="result">
        // Pattern: "Kerala Lottery Result" + draw name + draw no + date.
        const titleM = html.match(
          /(STHREE[-\s]?SAKTHI|AKSHAYA|KARUNYA(?:\s+PLUS)?|NIRMAL|WIN[-\s]?WIN|SUVARNA[-\s]?KERALAM|FIFTY[-\s]?FIFTY|BHAGYATHARA)[^A-Za-z]*?(?:Lottery|LOTTERY)?[^A-Za-z]*?(?:No|NO|Result)?[^\dA-Za-z]*?([A-Z]{2,4}[-\s]?\d{2,4})/i,
        );
        const dateM = html.match(/(\d{1,2}[-./\s][A-Za-z0-9]{2,9}[-./\s]\d{2,4})/);

        // Pull <pre> block (Kerala Lottery quick view uses <pre>)
        const preM = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
        const block = preM ? stripHtml(preM[1]) : "";

        // Parse prize lines: "1st Prize Rs :7000000/- ... TICKET NO ..."
        const prizes: LotteryDraw["prizes"] = [];
        if (block) {
          const lines = block.split(/\n+/);
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
                ? "Result page found but prize details could not be parsed. Use the official link below."
                : null,
          };
        }
      } catch (e: any) {
        lastErr = e?.message || "Fetch failed";
      }
    }
    return {
      draw: null,
      error:
        lastErr ||
        "Could not fetch lottery result. Visit keralalotteries.com directly.",
    };
  },
);

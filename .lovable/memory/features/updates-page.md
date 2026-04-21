---
name: Updates Page (Retailer)
description: In-portal mirror of Kerala Lottery, PSC, and Govt updates — Firecrawl-powered scraping renders full article content inline, no external nav
type: feature
---
`src/routes/retailer.updates.tsx` — Tabs UI inside ServicePageShell with inline article viewer (no external nav).

**Server functions** (`src/lib/updates.functions.ts`):
- `fetchLotteryResult` — Firecrawl scrape of keralalotteries.com (anti-bot bypass) + direct fetch fallback
- `fetchPSCNotifications` — Firecrawl search (`tbs: qdr:w`) + Google News RSS fallback
- `fetchGovtNotifications` — Firecrawl search + Google News RSS fallback (PIB blocks bots directly)
- `mirrorArticle` — POST endpoint, scrapes any URL via Firecrawl `scrape({ formats: ["markdown"], onlyMainContent: true })` and returns markdown

**Inline viewer** (`src/components/updates/InlineArticleViewer.tsx`):
- Dialog with ScrollArea
- Renders scraped markdown via `react-markdown` + `remark-gfm` (Tailwind `prose` classes)
- "Open original" fallback button
- All feed list items are buttons that open the viewer (no `target="_blank"` for items)

**PDF**: `src/lib/lottery-pdf.ts` — `generateLotteryPDF(draw)` builds branded jsPDF with tricolor strip, navy header, jspdf-autotable prize table.

**Connector**: Firecrawl (FIRECRAWL_API_KEY) — server-only, never exposed to browser.

**Refresh**: real-time on page load. Each tab + global Refresh.

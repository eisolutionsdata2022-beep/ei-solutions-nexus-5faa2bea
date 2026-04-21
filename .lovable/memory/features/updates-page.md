---
name: Updates Page (Retailer)
description: Live Kerala feeds — Lottery Result, PSC notifications, Govt press releases with branded PDF download
type: feature
---
`src/routes/retailer.updates.tsx` — Tabs UI inside ServicePageShell.

Server functions in `src/lib/updates.functions.ts`:
- `fetchLotteryResult` — scrapes keralalotteries.com / statelottery.kerala.gov.in (no official RSS), parses prize blocks via `<pre>` regex
- `fetchPSCNotifications` — scrapes keralapsc.gov.in/notifications + /press-release (anchor regex)
- `fetchGovtNotifications` — PIB Kerala RSS (RegId=24) parsed via fast-xml-parser

PDF: `src/lib/lottery-pdf.ts` — `generateLotteryPDF(draw)` builds branded jsPDF with tricolor strip, navy header, jspdf-autotable prize table.

Refresh: real-time on page load (no Firestore caching). Each tab has its own Reload button + global Refresh in shell header.

Sidebar entry added at top of retailer nav with `tag: "new"`.

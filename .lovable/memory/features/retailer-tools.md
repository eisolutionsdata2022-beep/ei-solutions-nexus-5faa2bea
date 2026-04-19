---
name: Retailer Tools
description: Page Tools hub at /retailer/page-tools — Poster Editor (80 templates × 8 styles × WhatsApp share + Story/Square formats), CV Builder (57 templates), JPG-to-PDF, Service Billing
type: feature
---

# Retailer Tools (`/retailer/page-tools`)

Tab hub with three tools: **Poster Editor**, **JPG to PDF**, **Service Billing**.

## Poster Editor

### Template Engine — `src/lib/poster-template-engine.ts`
**80 templates** built programmatically from:
- **8 layout styles**: `modern`, `trust`, `festive`, `urgent`, `corporate`, `minimal`, `tricolor`, `circuit`
- **15 palettes** (navyGold, saffronEmerald, marigold, goldOnBlack, etc.)
- **15 service categories** (PAN, Money Transfer, AEPS, Recharge, Bill Payment, Insurance, Loan, Travel, PVC, Aadhaar, GST, Banking, Education, Health Card, Job Services) + 5 "All Services" hero variants

Each `PosterTemplate` exposes `render(data, custom?)` (HTML string) and `thumbnail()` (SVG).
`CATEGORY_DEFAULTS` maps each category to its subHeading + 6-default-services list — auto-populates form when user picks a template.

### AI Backgrounds (5 hero images in `src/assets/`)
- `poster-bg-banking.jpg` — navy + gold corporate
- `poster-bg-festival.jpg` — diya + marigold (festive style)
- `poster-bg-digital.jpg` — circuit/cyan (circuit style)
- `poster-bg-urgent.jpg` — red/yellow burst (urgent style)
- `poster-bg-govt.jpg` — tricolor + Ashoka chakra (tricolor style)

### UX Flow (2 phases)
1. **Gallery phase** — `PosterTemplateGallery` shows 80 cards with SVG thumbnails. Search + 16 category pills + 8 quick filter chips (Office/Festival/Urgent/Premium/Trust/Govt/Digital/Minimal). Premium/Festival/Urgent badges shown on cards.
2. **Editor phase** — split layout: left form (CSP ID, heading, sub-heading, tagline, brand name, services textarea, contact, WhatsApp, location, logo upload, accent color picker) + right live preview (scaled 0.85 in viewport).

### Customization
- **Logo upload**: data URL, max 1.5MB, replaces the "EI" text mark
- **Accent color**: 15 presets + reset; overrides `palette.accent` in render
- **Format toggle**: A4 (595×842) / Story 9:16 (540×960) / Square 1:1 (720×720)

### Output (uses html-to-image + jspdf, dynamic imports)
- **PDF**: `jsPDF` with custom `[w,h]` format matching the canvas
- **PNG**: `toPng` at 3× pixel ratio
- **WhatsApp Share**: `navigator.share({files})` if supported, else download + open `wa.me/?text=...`
- **Print**: opens new window, auto-prints A4

### Key Files
- `src/lib/poster-template-engine.ts` — engine + 80 templates
- `src/components/tools/PosterTemplateGallery.tsx` — gallery with search/filters
- `src/routes/retailer.page-tools.tsx` — orchestrator (gallery ↔ editor phases)

## CV Builder Studio (`/retailer/cv-builder`)
See `mem://features/cv-builder-studio` (separate file).
- 57 templates × 16 categories
- Template-first gallery → 5-tab form with live preview iframe
- ₹10 paid PDF download via `atomicDebit` + `platformFees/cv_builder`
- Drafts persisted in `cvDrafts/{uid}` Firestore doc

## Other tools (in same /retailer/page-tools route)
- `JpgToPdfConverter` — multi-image to PDF
- `ServiceBilling` — quick GST-style invoice generator

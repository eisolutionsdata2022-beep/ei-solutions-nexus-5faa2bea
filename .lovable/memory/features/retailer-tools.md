---
name: CV Builder Studio
description: 50+ professional CV templates across 16 categories with template-first gallery, live preview, font/color customization, draft persistence, ₹10 paid PDF download
type: feature
---

# CV Builder Studio (`/retailer/cv-builder`)

## Architecture
Template engine in `src/lib/cv-template-engine.ts` builds **57 templates** from:
- 7 layout renderers: `classic`, `sidebar-left`, `sidebar-right`, `header-band`, `split-top`, `minimal-line`, `card-stack`
- 20 color palettes (navy, ocean, emerald, ruby, violet, etc.)
- 10 Google Font pairs (Inter, Source Sans, Playfair, Space Grotesk, etc.)
- 16 categories: Modern, Corporate, Creative, Fresher, Executive, IT, Healthcare, Gulf Job, Driver, Teacher, Accountant, Sales, Minimal, Colorful, ATS, International

Each `CVTemplate` exposes `generateHTML(data, customization?)` and `generatePreviewSVG()` for thumbnails.

## UX Flow (2 phases)
1. **Gallery phase** — `TemplateGallery` shows all 57 cards with SVG thumbnails, search, category filter, quick tag filter (Fresher/Gulf/Office/Designer/Healthcare/Simple/Premium/ATS/Tech). Click card → template selected. "Continue" → enters form.
2. **Form phase** — split layout: 5-tab form (Personal/Work/Education/Skills/Style) on left, sticky live-preview iframe on right (debounced 150ms). Fullscreen preview button opens modal. Sticky top bar: Back, Save Draft, Download.

## Customization (`CustomizationPanel`)
- Font scale slider 85–120%
- 16 accent color presets + reset to template default
- Section reorder via up/down arrows (objective/experience/education/skills/languages/certifications/additional)

## Persistence
- `src/lib/cv-draft.ts` — `saveCVDraft` / `loadCVDraft` write to `cvDrafts/{uid}` Firestore doc
- Draft auto-restored on mount
- One draft per user (overwrites)

## Monetization
- Fee from `platformFees/cv_builder` doc, default ₹10 (admin-configurable)
- `atomicDebit` on download, then `window.open` + `print()` for PDF via browser
- Photo + signature stored as base64 data URLs (no Storage upload needed)

## Files
- `src/lib/cv-template-engine.ts` — template registry (57 templates)
- `src/lib/cv-draft.ts` — Firestore draft persistence
- `src/components/cv/TemplateGallery.tsx` — gallery with search/filters
- `src/components/cv/CustomizationPanel.tsx` — font/color/order controls
- `src/routes/retailer.cv-builder.tsx` — main route, 2-phase orchestrator

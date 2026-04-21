---
name: ServicePageShell
description: Shared premium glass+gradient hero wrapper for retailer service dashboards — mirrors My Services hub
type: design
---
`src/components/ServicePageShell.tsx` is the canonical premium wrapper for every individual retailer service dashboard so the look matches the My Services hub.

Props: icon, title, subtitle, eyebrow, gradient (tailwind classes), stats[], headerAction (right-side node), hideWallet, hideBack, children.
Auto-renders: gradient hero with floating blobs, icon tile, eyebrow chip, live wallet chip (Firestore wallets/{uid}), Hub back link, Top-up link, optional stat chips.

Already wrapped: recharge, ei-pay, pan-portal, matrimony, money-transfer, horoscope, ippb, cv-builder (gallery phase), forms, trainings, jobs, page-tools.

Rule: every NEW retailer service route must wrap its top-level container in `<ServicePageShell>` for visual consistency.

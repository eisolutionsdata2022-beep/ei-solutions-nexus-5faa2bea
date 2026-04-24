---
name: PAN Legacy Wallet Migration
description: One-time carry-forward of mallikarecharge old portal balances. 300 retailers / ₹2.08L total. Admin imports seed JSON, retailer requests transfer when linking PSA, admin approves, atomic credit to wallet.
type: feature
---

# PAN Legacy Wallet Migration

## Problem
Old mallikarecharge portal had 300 retailers with non-zero wallet balances (total ₹2,08,502.65). When migrating to EI Solutions, those balances must be carried forward — but only with admin verification (no auto-credit, no double claim).

## Data
- Source: `Users_Lists_8.xlsx` — exported, filtered to balance > 0, written to `public/data/legacy-pan-balances.json` (300 records).
- Match key: `Username` (e.g. `RMPMCST-9447175704`) which equals legacy "VLE ID" / PSA ID.
- Verification key: `Mobile` (10-digit, must match the one entered at link time).

## Firestore
- `pan_legacy_balances/{username}` — master record. Fields: `username`, `mobile`, `name`, `balance`, `remaining`, `claimed`, `claimedBy`, `claimedAt`. Doc id = uppercased username.
- `pan_legacy_transfers/{LWT<ts><uid>}` — per-retailer request. Fields: `retailerId`, `legacyUsername`, `legacyMobile`, `legacyName`, `amount`, `status` (pending/approved/rejected), `remarks`, processed metadata.

## Flow
1. **Admin import** — `/admin/pan-legacy-balances` → "Import / Re-sync Seed" button reads `/data/legacy-pan-balances.json` and upserts each record into `pan_legacy_balances`. Idempotent.
2. **Retailer link** — `/retailer/pan-portal` → "Link Existing ID" form has a "Check Balance" button. After lookup, found amount appears with confirmation. PSA ID is linked **immediately** (no admin wait). The transfer **request** is the only thing that goes pending.
3. **Admin approval** — same admin page. On approve: atomically deducts from `remaining` + marks `claimed` + calls `atomicCredit(retailerId, amount, {source: "pan_legacy_transfer"})` + updates request status. On reject: just updates status.
4. **Separate visibility** — `LegacyTransferStatusCard` on the retailer PAN portal shows pending/credited/rejected amounts above the tabs, distinct from the main wallet balance card.

## Files
- `src/lib/pan-legacy-balance-types.ts`
- `src/lib/pan-legacy-balance.ts`
- `src/routes/admin.pan-legacy-balances.tsx`
- `public/data/legacy-pan-balances.json` (seed)
- Hooks added to `src/routes/retailer.pan-portal.tsx`: `handleLookupLegacy`, `LegacyTransferStatusCard`, transfer creation in `handleLinkExisting`.

## Guards
- Mobile must match the legacy record (prevents claiming someone else's PSA).
- `claimed` flag + `runTransaction` on approval prevents double credit.
- Client-side check: same legacy username can't have multiple pending/approved requests across users.
- PSA linking and balance transfer are decoupled — link succeeds even if no legacy balance found.

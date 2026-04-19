---
name: PSA Auto-ID Generation
description: Automatically generates a unique PSA ID for any user once they complete 2 successful coupon-buy transactions, with profile display, dashboard banner notification, and admin monitor page
type: feature
---
# PSA Auto-ID Generation

When a retailer/VLE successfully purchases their **2nd coupon** (PAN Portal → Coupon Buy → status="success"), the system automatically generates a unique, persistent **PSA ID** for them — replicating the legacy portal behavior.

## Logic (`src/lib/psa-auto-id.ts`)
- `countSuccessfulCouponPurchases(uid)` — counts `pan_transactions` where `serviceKey="coupon-buy"` AND `status="success"`. Refunded/failed are excluded.
- `maybeGeneratePsaId({ uid, email, name, phone })` — uses `runTransaction` on `psa_ids/{uid}`:
  - If doc exists → return existing (no duplicate possible)
  - If `successCount < PSA_AUTO_THRESHOLD (=2)` → no-op
  - Else → write `{ psaId: generateVleId(uid), status:"active", generatedAt, successfulCouponCount, ... }` atomically
- PSA ID format = same FNV-1a deterministic VLE ID (`PSA######`) — guaranteed unique per uid, never duplicates.

## Trigger point
`src/routes/retailer.pan-portal.tsx` — inside the success branch of `executePanService`, only when `service.key === "coupon-buy"` AND no `redirectUrl`. On first generation, shows toast: `"🎉 Congratulations! Your PSA ID PSA###### has been generated successfully."`

## UI surfaces
- **Retailer Dashboard** (`/retailer`) — green gradient banner with congratulations message, PSA ID, generated date. Dismissible (stored in localStorage as `psa-banner-seen-{psaId}`).
- **Profile page** (`/retailer/profile`) — PSA ID card showing PSA ID, ACTIVE badge, generated date. Shows progress (`X/2 successful`) when not yet generated.
- **Admin Monitor** (`/admin/psa-ids`) — table of all eligible users with name, email, mobile, successful coupon count, PSA ID, status (ACTIVE / Pending sync / Not eligible), generated date. Search across name/email/mobile/PSA ID. Stat cards for totals.

## Firestore
- Collection: `psa_ids`, doc id = `uid` (one PSA per user)
- Schema: `{ uid, psaId, status:"active", generatedAt:ISO, successfulCouponCount, email, name, phone }`

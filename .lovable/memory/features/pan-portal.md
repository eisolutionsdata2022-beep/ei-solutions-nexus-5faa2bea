---
name: PAN PORTAL
description: 11 PAN/PSA/NSDL services under EI SOLUTIONS brand, AES-GCM encrypted API key, per-service fee, NSDL eKYC redirect callback, VLE ID resolved from psa_ids/{uid} (legacy claim) with deterministic fallback
type: feature
---
# PAN PORTAL

Dedicated retailer page (`/retailer/pan-portal`) integrating mallikacyberzone PAN APIs with the same architecture as EI SOLUTIONS PAY (CSC).

## Services (11)
New PAN Apply, PAN Correction, Instant eKYC PAN, NSDL PAN (eSign), UTI PAN, PAN Track, ePAN Download, PSA ID Create, PSA Password Reset, Coupon Buy, Coupon Status.

## Architecture
- `src/lib/pan-types.ts` — PanMasterConfig (apiKeyCipher, urls, feeOverrides), PanTransaction
- `src/lib/pan-services.ts` — PAN_SERVICES catalog with per-service endpoint, method, fields, extras
- `src/lib/pan-vle-id.ts` — `generateVleId(uid, mobile?)` deterministic FNV-1a hash → `PSA######-<mobile>` (fallback only)
- `src/lib/psa-auto-id.ts` — `psa_ids/{uid}` doc, `claimLegacyPsaId()` for legacy migration, `maybeGeneratePsaId()` after 2 successful coupons
- `src/lib/pan.functions.ts` — `encryptPanApiKey` + `executePanService` server functions (AES-GCM, key derived from LOVABLE_API_KEY with `pan-api|` domain separator)
- `src/routes/admin.pan-settings.tsx` — encrypted API key, 8 endpoint URLs, per-service fee/toggle
- `src/routes/retailer.pan-portal.tsx` — service grid, execution dialog, wallet debit + auto-refund on failure, **VLE ID resolved live from `psa_ids/{uid}` (legacy or auto), falls back to `generateVleId()` when none stored**
- `src/routes/retailer.profile.tsx` — "I have an existing PSA ID" dialog → `claimLegacyPsaId()` writes `psa_ids/{uid}` with `source:"legacy"`
- `src/routes/nsdl-callback.tsx` — `/nsdl-callback?tx=...&status=...&ack_no=...` updates pan_transactions

## VLE ID resolution priority (CRITICAL)
1. `psa_ids/{uid}.psaId` if present (legacy claim OR auto-generated) — used in all upstream calls
2. Deterministic `generateVleId(uid, phone)` fallback (PSA + 6-digit FNV hash + mobile)

Hero card shows badge: `Legacy linked` (green) / `Auto` (amber) / nothing for fallback. When source is "generated", the page shows a sky-blue banner inviting users to link their existing PSA ID via Profile — this is REQUIRED for users migrated from the old portal because mallikacyberzone won't recognize the auto-generated ID.

## Branding
All retailer-facing copy uses "EI SOLUTIONS" — upstream provider name (mallikacyberzone) is never shown to retailers.

## Wallet
- Only the convenience fee is debited (admin sets per service in admin.pan-settings)
- Auto-refund via atomicCredit if upstream returns FAILED or fetch errors
- Status check services (PAN Track, ePAN Download, Coupon Status) default fee = 0

## Firestore rules + indexes
- `firestore.rules` allows: `pan_config` (admin only), `pan_transactions` (own + admin), `psa_ids` (owner + admin)
- `firestore.indexes.json` composite index: `pan_transactions(retailerId ASC, createdAt DESC)` + `(retailerId ASC, serviceKey ASC, status ASC)`
- Must run `firebase deploy --only firestore:rules,firestore:indexes` to apply

## NSDL eKYC redirect flow
1. Client generates `pOrderId = EISP{ts}{rand}` and `redirectUrl = /nsdl-callback?tx={txDocId}`
2. Server POSTs to nsdlAuth, receives `data.authorization` JWT
3. Server returns `redirectUrl = https://sso-nsdl-ekyc-app.pages.dev/sso_nsdl_ekyc_redirect?type={49A|CR}&authorization={jwt}`
4. Client opens in new tab; transaction marked "pending" until user returns to `/nsdl-callback`

## Pending (later phases)
- Bulk Excel/CSV user migration tool (admin) — auto-link users to legacy PSA IDs
- Commission split for PAN services


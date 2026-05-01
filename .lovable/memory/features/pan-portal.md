---
name: PAN Portal (UTI)
description: Rebuilt Apr 2026 — UTI PSA registration + coupon purchase only. Provider mallikacyberzone.com. Supports linking existing old-portal VLE IDs.
type: feature
---

# PAN Portal — UTI PSA + Coupon (Rebuilt Apr 2026)

## Scope
NSDL eKYC + Legacy Wallet feature **removed**. Only two flows:
1. **PSA Registration** — new VLE registration with UTI via `psa_create` (or link an existing old-portal VLE without re-registration).
2. **Coupon Purchase** — buy UTI PAN application coupons via `coupon_buy`.

## Provider
- Base URL: `https://mallikacyberzone.com/api` (admin-configurable)
- API Key + Secret stored encrypted (AES-GCM, key from `LOVABLE_API_KEY`) in `pan_config/master.credCipher`.
- Endpoints used: `/psa_create`, `/coupon_buy`, `/coupon_status`, `/psa_password` (all GET with `api_key` in query).

## Files
- `src/lib/pan-portal-types.ts` — `PanPsaRecord`, `PanCouponOrder`, `PanPortalConfig`.
- `src/lib/pan-portal-firebase.ts` — Firestore helpers, `isVleIdTaken` uniqueness guard, client-side ordering for orders.
- `src/lib/pan-portal.functions.ts` — server functions: `encryptPanCredentials`, `panPsaCreate`, `panCouponBuy`, `panCouponStatus`, `panPsaPasswordReset`.
- `src/routes/retailer.pan-portal.tsx` — single retailer page with PSA / Buy / History tabs.
- `src/routes/admin.pan-portal-settings.tsx` — admin page for credentials + fees + base URL.

## Firestore collections
- `pan_config/master` — provider URL, encrypted creds, retailer fee, provider cost.
- `pan_psa_records/{retailerId}` — one VLE record per retailer; `linkedExisting: true` for old-portal users.
- `pan_coupon_orders/{auto}` — coupon purchase log; debit + provider call + auto-refund on failure via `atomicDebit` / `atomicCredit`.

## Link Existing flow
Trust-based: user enters old VLE ID + UTI-registered mobile, Firestore records `linkedExisting: true`, `status: approved`. No upstream verification (UTI has no VLE-lookup endpoint). If the first coupon purchase fails with "VLE Data Not Exist", wallet is auto-refunded and user is told to re-register via "New PSA Registration" tab.

## VLE ID format
- New registrations: `RMPMCST-<10-digit-mobile>` via `generateVleId()` from `src/lib/vle-id.ts`.
- Linked-existing: whatever the user entered (e.g. legacy `PSAxxxxxx`).
Uniqueness enforced via `isVleIdTaken()` before insert.

## Pricing
Per-coupon retailer fee + provider cost configured in admin settings page. Margin = fee − cost (tracked by reading `pan_coupon_orders.unitFee/unitProviderCost`). Wallet debit = `qty × unitFee` at purchase time; full amount refunded on provider failure.

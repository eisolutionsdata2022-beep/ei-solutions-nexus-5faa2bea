---
name: PAN PORTAL
description: 11 PAN/PSA/NSDL services via mallikacyberzone API, AES-GCM encrypted API key, per-service fee, NSDL eKYC redirect callback
type: feature
---
# PAN PORTAL

Dedicated retailer page (`/retailer/pan-portal`) integrating mallikacyberzone PAN APIs with the same architecture as EI SOLUTIONS PAY (CSC).

## Services (11)
New PAN Apply, PAN Correction, Instant eKYC PAN, NSDL PAN (eSign), UTI PAN, PAN Track, ePAN Download, PSA ID Create, PSA Password Reset, Coupon Buy, Coupon Status.

## Architecture
- `src/lib/pan-types.ts` — PanMasterConfig (apiKeyCipher, urls, feeOverrides), PanTransaction
- `src/lib/pan-services.ts` — PAN_SERVICES catalog with per-service endpoint, method, fields, extras
- `src/lib/pan.functions.ts` — `encryptPanApiKey` + `executePanService` server functions (AES-GCM, key derived from LOVABLE_API_KEY with `pan-api|` domain separator)
- `src/routes/admin.pan-settings.tsx` — encrypted API key, 8 endpoint URLs, per-service fee/toggle
- `src/routes/retailer.pan-portal.tsx` — service grid, execution dialog, wallet debit + auto-refund on failure
- `src/routes/nsdl-callback.tsx` — `/nsdl-callback?tx=...&status=...&ack_no=...` updates pan_transactions

## Wallet
- Only the convenience fee is debited (admin sets per service in admin.pan-settings)
- Auto-refund via atomicCredit if upstream returns FAILED or fetch errors
- Status check services (PAN Track, ePAN Download, Coupon Status) default fee = 0

## NSDL eKYC redirect flow
1. Client generates `pOrderId = EISP{ts}{rand}` and `redirectUrl = /nsdl-callback?tx={txDocId}`
2. Server POSTs to nsdlAuth, receives `data.authorization` JWT
3. Server returns `redirectUrl = https://sso-nsdl-ekyc-app.pages.dev/sso_nsdl_ekyc_redirect?type={49A|CR}&authorization={jwt}`
4. Client opens in new tab; transaction marked "pending" until user returns to `/nsdl-callback`

## Pending (later phases)
- Bulk Excel/CSV user migration tool (admin)
- Commission split for PAN services

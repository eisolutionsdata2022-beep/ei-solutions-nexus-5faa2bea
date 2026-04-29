---
name: PAN Portal (PSA + NSDL eKYC)
description: Cloned from legacy mallikarecharge/utibot PHP portal. Two services — PSA Auto-ID (VLE registration) and NSDL eKYC PAN Application (Form 49A). Admin-managed credentials + flat margin (no 4-tier cascade).
type: feature
---

# PAN Portal — clone of legacy mallikarecharge/utibot system

## Source
Legacy PHP source preserved at `.lovable/legacy-pan/` (extracted from old portal ZIP). Reference: `psa_create.php`, `psa_password.php`, `nsdlekycpan.php`, `app/ekycpanNsdl.php`, `nsdl_webhook.php`.

## Two services
1. **PSA Auto-ID** (`/retailer/pan-portal` → "PSA" tab)
   - Registers retailer as a UTI PSA agent via `botapi_url/api/psa_create`.
   - Reset PSA password via `botapi_url/api/psa_password`.
   - One-time activation only — sets `loginusers.vle_id` + `psa_reg_code`.

2. **NSDL eKYC PAN** (`/retailer/pan-portal` → "PAN Application" tab)
   - Service activation: charges `nsdlIdCharge` (admin-set) once → flips `nsdlActive=YES` on user.
   - Per application: debits `panFee` (admin-set retailer charge) → calls `mallikarecharge.in/portallogin/nsdlAuth` (or admin-configured URL) → SSO redirect to NSDL → user completes form on NSDL → NSDL POSTs to `/api/public/pan-portal/nsdl-webhook`.
   - On webhook success: mark order Success, no refund. On failure: refund retailer.

## Architecture
- **Firestore collections:**
  - `pan_config/master` — admin credentials (encrypted), provider URLs, fees, margins.
  - `pan_psa_records/{retailerId}` — PSA registration state.
  - `pan_orders/{orderId}` — eKYC PAN applications.
  - `pan_transactions/...` (uses standard `transactions` collection with source=`pan-portal`).
- **Server functions** (`pan-portal.functions.ts`):
  - `encryptPanCredentials` — admin-only, AES-GCM encrypts API key + secret.
  - `panPsaCreate` / `panPsaPasswordReset` — proxy to botapi.
  - `panNsdlGetAuthorization` — proxy to nsdlAuth, returns SSO authorization token.
- **Webhook**: `/api/public/pan-portal/nsdl-webhook` — verifies HMAC + processes status, no commission cascade (margin auto-credited to admin via accounting view).

## Commission model
**Flat admin-managed margin** (per user decision Apr 2026, NOT 4-tier cascade):
- Admin sets `panProviderCost` (₹ paid to upstream) and `panRetailerFee` (₹ charged to retailer).
- Margin = retailer fee − provider cost. Tracked in admin transactions report; no per-tier credit logic.
- Same model as EI Solutions Pay (CSC).

## Provider config
- Default URLs: `https://mallikarecharge.in/portallogin/nsdlAuth`, `https://utibot.in/api/nsdl/get_authorization` (legacy values, admin can override).
- Default API key + secret: NEW values entered by admin (legacy values from `nsdlekycauth.json` are illustrative only — DO NOT hardcode).
- Admin enters credentials in `/admin/pan-portal-settings`, encrypted at rest with AES-GCM (key derived from LOVABLE_API_KEY).

## VLE ID
**CRITICAL**: VLE ID must be `RMPMCST-<10-digit-mobile>` everywhere — both in PSA Create AND in UTI coupon purchase. Use `generateVleId(uid, phone)` from `src/lib/vle-id.ts`. Sending different IDs (e.g. raw Firebase uid for register, RMPMCST for purchase) causes provider to return `"Vle Data Not Exist"` on every coupon purchase. Coupon purchase is now blocked client-side until `psa.status === "approved"`.

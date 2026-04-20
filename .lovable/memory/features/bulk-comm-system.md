---
name: bulk-comm-system
description: Admin Bulk Communication system at /admin/crm-bulk-comm — unified contacts (retailers/enquiries/CRM leads/uploaded), CSV upload, Resend email campaigns with personalization, open tracking, opt-outs
type: feature
---
# Bulk Communication System

**Route:** `/admin/crm-bulk-comm` (admin only)

## Architecture
- **Email provider:** Resend (RESEND_API_KEY + BULK_EMAIL_FROM_ADDRESS secrets)
- **Sending:** TanStack server function `sendBulkEmailBatch` in `src/lib/bulk-email.functions.ts` — chunks of 25, 600ms delay between sends, ~100/min throughput
- **Auth:** firebaseAuthMiddleware required on send functions

## Firestore collections
- `landingEnquiries` — public landing-page form submissions (CTASection)
- `uploadedLeads` — admin CSV/Excel imported leads (deduped by email)
- `bulkEmailCampaigns` — campaign metadata, counters
- `bulkEmailRecipients` — per-recipient delivery status (status: pending/sent/failed/opened)
- `bulkEmailOptOuts` — suppression list keyed by email (lowercase)

## Audience sources (UnifiedContact)
- `retailer` — pulled from `users` collection where role=retailer; active=lastLoginAt within 30 days
- `enquiry` — landingEnquiries
- `crmLead` — existing crmLeads (Lead Management page)
- `uploaded` — uploadedLeads

## Tracking
- Open pixel: `/api/email/open?c=campaignId&r=recipientId` returns 1x1 GIF, increments openedCount
- Unsubscribe: `/api/email/unsubscribe?e=email` adds to bulkEmailOptOuts, returns branded HTML page
- Both routes use anonymous Firebase init (no auth) since called from email clients

## Personalization
- `{{name}}` token in subject + body replaced server-side with recipient name
- Auto-appended unsubscribe footer + tracking pixel — DO NOT add manually in template

## Constraints
- WhatsApp NOT yet implemented (Phase 2 — needs WhatsApp Cloud API token + template approval)
- State/district filtering NOT in v1 (AppUser type lacks these fields)
- Sending happens on the client tab — admin must keep tab open until complete (next phase: queue + cron)

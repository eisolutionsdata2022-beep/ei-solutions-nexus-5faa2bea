---
name: whatsapp-bridge
description: WhatsApp Web bridge — VPS-hosted whatsapp-web.js service + portal Inbox at /admin/whatsapp + /staff/whatsapp + Bulk tab in /admin/crm-bulk-comm + auto-drip
type: feature
---
# WhatsApp Bridge System

⚠️ **Unofficial bridge** — uses whatsapp-web.js, violates Meta ToS. Ban risk acknowledged.

## Architecture
- **Bridge runs on VPS** (`native/whatsapp-bridge-vps/`) — Cloudflare Worker SSR cannot host Chromium/persistent process
- Bridge uses Firebase Admin SDK service account → writes directly to Firestore
- Portal calls bridge via HMAC-signed server functions (`src/lib/whatsapp-bridge.functions.ts`)
- Secrets: `WA_BRIDGE_BASE_URL`, `WA_BRIDGE_HMAC_SECRET`

## Endpoints (bridge)
- `GET /health` (unauth) — liveness
- `GET /status` (HMAC) — connection state + QR data-URL
- `POST /send` (HMAC) — single message `{phone, body, mediaBase64?, mediaMime?, caption?}`
- `POST /bulk` (HMAC) — `{campaignId, messages[]}` background runner with rate limits
- `POST /restart` (HMAC) — restart, optional `purgeSession:true` for fresh QR

## Hard rate limits (in bridge .env)
- `WA_RATE_PER_MIN=5`, `WA_RATE_PER_DAY=100`
- `WA_SEND_DELAY_MIN_MS=8000`, `WA_SEND_DELAY_MAX_MS=18000` (jittered human delay)
- Portal also enforces `HARD_CAP_PER_DISPATCH=100` client-side
- Drip sends share the SAME daily counter (drip pauses tick when daily cap hit)

## Firestore collections
- `whatsappSessions/default` — bridge writes status/QR; staff read-only
- `whatsappContacts/{phone}` — chat list, `assignedTo`/`unreadCount` writable by staff
- `whatsappMessages/{auto}` — full history (incl. `mediaUrl`, `mediaMime`, `mediaPath`), bridge-write only
- `whatsappCampaigns/{id}` + `recipients/{id}` subcollection — admin creates parent, bridge updates
- `whatsappTemplates/{id}` — admin-managed quick replies
- `whatsappDripSequences/default` — single admin-managed sequence (steps[], leadSources[], enabled)
- `whatsappDripEnrollments/{leadId}` — one per lead, status: active/stopped_replied/stopped_status/stopped_manual/completed/failed

## Media handling
- Inbox composer: image (`image/*`) or PDF picker, ≤12 MB, base64-encoded in browser → sent via `/send` with `mediaBase64` + `mediaMime` + optional `caption`
- Inbound + outbound media is downloaded by bridge via `msg.downloadMedia()` and uploaded to Firebase Storage at `whatsappMedia/{phone}/{messageId}.{ext}` with a 30-day signed URL stored as `mediaUrl` on the message doc
- Bridge env: `FIREBASE_STORAGE_BUCKET` (default `<project>.appspot.com`), `WA_MEDIA_URL_TTL_DAYS=30`
- Storage rules: `whatsappMedia/{phone}/**` readable by staff/manager/admin only; browser write blocked (bridge-only via Admin SDK)

## Routes
- `/admin/whatsapp` — Connection (QR, status, restart) + Inbox (all chats, assign dropdown) + Templates (admin CRUD for quick replies) + Drip (sequence editor, stats, recent enrollments)
- `/staff/whatsapp` — only chats `assignedTo == currentUser.uid`
- `/admin/crm-bulk-comm` → "WhatsApp Bulk" tab — reuses email audience resolver, dispatches to bridge

## Quick-reply templates
- `whatsappTemplates/{id}` — `{title, body, category?, createdBy, createdAt, updatedAt}` (admin write, staffish read)
- Composer has lightning-bolt picker → popover with search + category grouping
- `{{name}}` token replaced with active contact's `displayName` (fallback "there") via `applyTemplateTokens()`
- Title ≤60 chars, body ≤4096 chars (WhatsApp limit)

## Inbox scope rules
- Admin sees ALL contacts; can assign via dropdown to any admin/staff/manager
- Staff/manager sees ONLY contacts where `assignedTo == their uid`
- Operator role: no WhatsApp access

## Auto-CRM-lead from new chats
- Bridge detects first inbound from a brand-new contact (`whatsappContacts/{phone}` did not exist) and inserts into `crmLeads` with: `leadId=LD-XXXX`, `name=notifyName||"WhatsApp <last10>"`, `phone=last10`, `leadSource="WhatsApp"`, `status="New"`, remarks = first message snippet (≤200 chars), `createdBy="whatsapp-bridge"`
- Idempotent: skips if any existing lead matches the phone (full or last-10)
- Logic lives in `autoCreateCrmLead()` in `native/whatsapp-bridge-vps/server.js`
- Auto-created leads are immediately enrolled in the default drip if enabled

## Auto-drip sequences
- Single admin-managed sequence (`whatsappDripSequences/default`) with N steps `{dayOffset, hourOfDay (IST), body}`
- `enabled` toggle (off by default — admin must turn on after editing); `leadSources` filter (empty = all sources)
- **Triggers enrollment**:
  - Bridge `autoCreateCrmLead()` → `enrollInDrip()` for new WhatsApp leads
  - Portal `addLead()` (in `crm-firebase.ts`) → lazy-imports `enrollLead()` for manual + bulk + landing leads
- **Stops enrollment**:
  - Inbound WhatsApp message → `stopDripOnReply(phone)` flips active enrollments to `stopped_replied`
  - Lead status moves away from "New" → `stopEnrollmentForStatusChange()` flips to `stopped_status`
  - `optOutDrip:true` flag set on lead → `stopEnrollmentManual()` flips to `stopped_manual`
  - "Stop drip" button in lead detail dialog (LeadDripStatus component)
- **Scheduler**: `setInterval` in bridge ticks every 60s (`WA_DRIP_TICK_MS`), queries `where status=active and nextSendAt<=now limit 20`, sends via `waClient.sendMessage`, advances `currentStep`, recomputes `nextSendAt = enrolledAt + steps[next].dayOffset days @ hourOfDay IST`
- Shares the same daily rate counter as `/send` + `/bulk` (drip pauses tick when daily cap hit)
- Default seed: 3 steps in Malayalam+English (Day 0/2/5)
- Token: `{{name}}` replaced per-lead

## Personalization
- Bulk supports `{{name}}` token, replaced server-side per recipient
- Test send prepends "🧪 [TEST]" prefix
- Drip steps support `{{name}}` token

## Security
- Bridge HMAC: `HMAC-SHA256(secret, "${ts}.${rawBody}")` → `X-Signature` header, `X-Timestamp` ±300s
- Service account JSON lives at `/opt/whatsapp-bridge/firebase-service-account.json` (chmod 600)
- Browser NEVER calls bridge directly — only via TanStack server fns (HMAC stays on Worker)

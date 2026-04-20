---
name: whatsapp-bridge
description: WhatsApp Web bridge — VPS-hosted whatsapp-web.js service + portal Inbox at /admin/whatsapp + /staff/whatsapp + Bulk tab in /admin/crm-bulk-comm
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

## Firestore collections
- `whatsappSessions/default` — bridge writes status/QR; staff read-only
- `whatsappContacts/{phone}` — chat list, `assignedTo`/`unreadCount` writable by staff
- `whatsappMessages/{auto}` — full history, bridge-write only
- `whatsappCampaigns/{id}` + `recipients/{id}` subcollection — admin creates parent, bridge updates

## Routes
- `/admin/whatsapp` — Connection (QR, status, restart) + Inbox (all chats, assign dropdown)
- `/staff/whatsapp` — only chats `assignedTo == currentUser.uid`
- `/admin/crm-bulk-comm` → "WhatsApp Bulk" tab — reuses email audience resolver, dispatches to bridge

## Inbox scope rules
- Admin sees ALL contacts; can assign via dropdown to any admin/staff/manager
- Staff/manager sees ONLY contacts where `assignedTo == their uid`
- Operator role: no WhatsApp access

## Personalization
- Bulk supports `{{name}}` token, replaced server-side per recipient
- Test send prepends "🧪 [TEST]" prefix

## Security
- Bridge HMAC: `HMAC-SHA256(secret, "${ts}.${rawBody}")` → `X-Signature` header, `X-Timestamp` ±300s
- Service account JSON lives at `/opt/whatsapp-bridge/firebase-service-account.json` (chmod 600)
- Browser NEVER calls bridge directly — only via TanStack server fns (HMAC stays on Worker)

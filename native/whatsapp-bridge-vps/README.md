# EI SOLUTIONS — WhatsApp Web bridge (VPS)

⚠️ **WARNING — UNOFFICIAL**: This bridge uses [whatsapp-web.js](https://wwebjs.dev/),
which automates the WhatsApp Web client. **It violates Meta's Terms of Service.**
Your number CAN be banned without warning. Use only a dedicated business number you
can afford to lose. Bulk sending dramatically increases ban risk.

## What it does

A small Node.js service that runs alongside `csc-bridge` on your VPS:

- Connects to WhatsApp by QR scan (one-time, persists via `LocalAuth`)
- Mirrors all incoming/outgoing messages into Firestore (`whatsappMessages`)
- Maintains a contact list (`whatsappContacts`) with last-message metadata
- Exposes an HMAC-protected REST API the Lovable portal calls to send messages
- Runs bulk campaigns with strict human-like rate limits (5/min, 100/day default)

## Endpoints

| Method | Path        | Auth | Purpose                                                  |
|-------:|-------------|------|----------------------------------------------------------|
| GET    | `/health`   | —    | Liveness probe (for nginx / monitoring)                  |
| GET    | `/status`   | HMAC | Connection state + QR data-URL (when not yet linked)     |
| POST   | `/restart`  | HMAC | Restart WA client. Body `{purgeSession:true}` re-scans   |
| POST   | `/send`     | HMAC | Send one message: `{phone, body, mediaBase64?, mediaMime?, caption?}` |
| POST   | `/bulk`     | HMAC | Queue many messages: `{campaignId, messages: [{phone, body, name?, recipientId?}]}` |

### HMAC

All authed endpoints require headers:

- `X-Timestamp`: unix seconds (within ±300s)
- `X-Signature`: hex `HMAC-SHA256(HMAC_SECRET, "${ts}.${rawBody}")`

Use the same shared secret on both sides. The Lovable portal stores it as
`WA_BRIDGE_HMAC_SECRET`.

## Install on the VPS (alongside csc-bridge)

```bash
# 1) System deps
apt-get update && apt-get install -y \
  curl chromium chromium-driver libgbm1 libnss3 libxss1 libasound2

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 2) Code + npm install
mkdir -p /opt/whatsapp-bridge && cd /opt/whatsapp-bridge
# Copy the contents of native/whatsapp-bridge-vps/ here (server.js, package.json, .env.example)
npm ci --omit=dev || npm install --omit=dev

# 3) Firestore service account
# In Firebase console → Project Settings → Service Accounts → Generate new key.
# Save the JSON as /opt/whatsapp-bridge/firebase-service-account.json (chmod 600)
chmod 600 /opt/whatsapp-bridge/firebase-service-account.json

# 4) .env
cp .env.example .env
# Generate a strong secret:
openssl rand -hex 32
# Edit .env → paste secret into HMAC_SECRET
# Also paste this same value into Lovable secret WA_BRIDGE_HMAC_SECRET

# 5) Systemd unit
cp whatsapp-bridge.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now whatsapp-bridge
journalctl -u whatsapp-bridge -f
```

### First-time QR scan

The first time the service runs (no saved session), it prints a QR in the journal:

```bash
journalctl -u whatsapp-bridge -f
```

Scan it from your dedicated WhatsApp Business app:
**Settings → Linked Devices → Link a Device**.

After scanning, the session persists in `/opt/whatsapp-bridge/.wwebjs_auth/`.
On crash/restart it auto-resumes — you do **not** need to scan again unless
you call `POST /restart {purgeSession:true}`.

You can also see the QR + connection status from the Lovable admin portal at
`/admin/whatsapp` (it polls `GET /status`).

### nginx (proxy + TLS)

If you already host `csc-bridge` behind nginx, add a sibling location:

```nginx
location /wa/ {
  proxy_pass http://127.0.0.1:8788/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $remote_addr;
  client_max_body_size 25m;
  proxy_read_timeout 120s;
}
```

Then set the Lovable secret `WA_BRIDGE_BASE_URL=https://your-vps-domain/wa`.

## Environment

See `.env.example` for the full list. Key knobs:

- `HMAC_SECRET` — must match the portal secret `WA_BRIDGE_HMAC_SECRET`
- `WA_RATE_PER_MIN=5` and `WA_RATE_PER_DAY=100` — **do NOT increase** these.
  Higher values almost guarantee a ban within hours.
- `WA_SEND_DELAY_MIN_MS=8000` / `WA_SEND_DELAY_MAX_MS=18000` — randomized
  human-like delay between bulk sends.

## Health checks

```bash
curl -s http://127.0.0.1:8788/health
# {"ok":true,"ready":true,"uptimeSec":123}
```

## Troubleshooting

- **QR never appears**: chromium can't launch. `journalctl -u whatsapp-bridge -e`
  should mention `--no-sandbox`. We pass it already; ensure you're running as
  root or have proper sandbox setup.
- **"Execution context was destroyed"**: WA Web silently changed its DOM.
  Update `whatsapp-web.js` (`npm i whatsapp-web.js@latest`) and restart.
- **Number banned**: Mostly happens after >100 bulk msgs/day or sending to
  non-contacts. Recover by getting a new SIM. The portal will detect status
  flipping to `disconnected` / `auth_failure` and surface it on `/admin/whatsapp`.

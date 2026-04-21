# EI SOLUTIONS — PAN Bridge VPS

A tiny Node/Express proxy that lets the Lovable Cloud Worker call
**mallikacyberzone**'s PAN API from a **fixed, whitelisted IP**.

## Why this exists

Lovable Cloud server functions run on Cloudflare Workers. The egress IP
changes per request, so providers that require IP whitelisting (like
mallikacyberzone) reject the calls. This bridge runs on a small VPS with
a static IP, accepts HMAC-signed requests from the Worker, and forwards
them to the provider from the whitelisted IP.

```
Browser → Lovable Worker (executePanService)
              │  POST /proxy/pan  (HMAC-signed)
              ▼
        VPS bridge (this repo)        ← static IP whitelisted at provider
              │
              ▼
       mallikacyberzone.com
```

## What you need

- A small VPS (DigitalOcean, Hetzner, Contabo — anything ~$5/mo with a
  permanent IPv4). Ubuntu 22.04 LTS works out of the box.
- A subdomain you control (e.g. `pan-bridge.eisoluions.xyz`).
- The mallikacyberzone Developer API page open so you can whitelist the
  VPS IP.

## Install (one-time)

```bash
# 1. Install Node 20 + nginx + certbot
sudo apt update
sudo apt install -y curl nginx python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Create a dedicated user + drop the bridge into /opt
sudo useradd -r -m -d /opt/ei-pan-bridge -s /usr/sbin/nologin panbridge
sudo mkdir -p /opt/ei-pan-bridge /var/log/ei-pan-bridge
sudo chown -R panbridge:panbridge /opt/ei-pan-bridge /var/log/ei-pan-bridge

# 3. Copy this folder onto the VPS (scp / git clone / rsync) into
#    /opt/ei-pan-bridge so server.js, package.json, .env.example all live there.

# 4. Generate a strong HMAC secret. KEEP THIS — you will paste it into
#    the Lovable Admin → PAN Settings page in the next section.
openssl rand -hex 32

# 5. Create .env from the template, paste the secret you just generated.
sudo -u panbridge cp /opt/ei-pan-bridge/.env.example /opt/ei-pan-bridge/.env
sudo -u panbridge nano /opt/ei-pan-bridge/.env

# 6. Install deps + start the service
cd /opt/ei-pan-bridge
sudo -u panbridge npm install --omit=dev
sudo cp pan-bridge.service /etc/systemd/system/pan-bridge.service
sudo systemctl daemon-reload
sudo systemctl enable --now pan-bridge

# 7. Configure nginx + TLS
sudo cp nginx-pan.conf.example /etc/nginx/sites-available/pan-bridge
sudo ln -s /etc/nginx/sites-available/pan-bridge /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d pan-bridge.eisoluions.xyz

# 8. Sanity check
curl https://pan-bridge.eisoluions.xyz/health
# → {"status":"ok",...}
```

## Whitelist the VPS IP at the provider

1. Find the VPS public IPv4: `curl ifconfig.me`
2. Log in to https://mallikacyberzone.com/ → **Developers API → API
   Credentials**
3. Replace the existing IP (`185.158.133.1`) with the VPS IP and **Submit**.

## Wire it into Lovable

1. Open **Admin → PAN Settings** in the EI Solutions portal.
2. Paste:
   - **API Key** — `b4b599-...-a0d8fb`
   - **API Secret** — `wS4othL5rDlYmOMHJk7L`
   - **VPS Bridge URL** — `https://pan-bridge.eisoluions.xyz/proxy/pan`
   - **VPS Bridge Secret** — the same value you put in the VPS `.env`
3. Click **Encrypt & Save** for each. The portal AES-GCM-encrypts every
   secret and stores only the cipher; the plaintext never leaves the
   server function.

From now on, every retailer-triggered PAN call automatically routes
through the bridge.

## Operations

- **Logs**: `journalctl -u pan-bridge -f` or `/var/log/ei-pan-bridge/`
- **Restart**: `sudo systemctl restart pan-bridge`
- **Update**: pull new code, `npm install --omit=dev`, restart.
- **Rotate HMAC secret**: change `.env`, restart, then update the cipher
  in Admin → PAN Settings.

## Security notes

- Only HMAC-signed requests are accepted. Replay window is 5 minutes.
- Only `mallikacyberzone.com` (and `www.`) are allowed as upstream
  hosts. Edit `ALLOWED_HOSTS` in `.env` if the provider domain changes.
- Rate-limited to 60 req/min/IP.
- Bridge stores **nothing** — no secrets, no PII, no transaction data.
  All persistence stays in Firestore.

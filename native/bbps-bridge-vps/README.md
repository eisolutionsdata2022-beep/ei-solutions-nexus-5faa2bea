# EI SOLUTIONS — Bharat Connect (BBPS) Bridge

A tiny Node.js + Express HMAC proxy that forwards Bharat Connect (AceNeoBank)
API calls through a **static IP**. The Lovable app runs on Cloudflare Workers
which has no fixed egress IP — providers that demand IP whitelisting (such as
Radiant AceMoney) cannot work directly from the Worker. This bridge solves
that with ~150 lines of code.

> ✅ This bridge is **dumb on purpose** — it never sees credentials in plain
> form, never knows about bill amounts or customers. All business logic
> (encryption, payload shapes, wallet debit) lives in the Lovable server fns.

---

## 1. VPS (one-time)

Smallest possible droplet works (256 MB RAM, no Chromium needed):

```bash
sudo apt update && sudo apt -y upgrade
sudo apt install -y curl git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Find your static IP — give this to the provider
curl -4 ifconfig.me
```

## 2. Deploy

```bash
sudo mkdir -p /opt/bbps-bridge
sudo chown $USER:$USER /opt/bbps-bridge

# Copy files from this repo:
scp -r native/bbps-bridge-vps/* user@your-vps:/opt/bbps-bridge/

cd /opt/bbps-bridge
npm install --production

cp .env.example .env
# Generate a strong HMAC secret:
openssl rand -hex 32
# Paste it into .env as HMAC_SECRET (and copy the same value into Lovable secrets later).
nano .env
```

## 3. Reverse proxy + HTTPS

```bash
sudo tee /etc/nginx/sites-available/bbps-bridge >/dev/null <<'NGINX'
server {
    listen 80;
    server_name bbps-bridge.eisoluions.xyz;

    location / {
        proxy_pass         http://127.0.0.1:8788;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
NGINX

sudo ln -s /etc/nginx/sites-available/bbps-bridge /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d bbps-bridge.eisoluions.xyz
```

## 4. systemd service (auto-restart)

```bash
sudo cp /opt/bbps-bridge/bbps-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bbps-bridge
sudo systemctl status bbps-bridge
```

## 5. Lovable Cloud secrets

In **Settings → Secrets**, add:

| Secret | Value |
|---|---|
| `BBPS_BRIDGE_BASE_URL` | `https://bbps-bridge.eisoluions.xyz` |
| `BBPS_BRIDGE_HMAC_SECRET` | the same hex string from `/opt/bbps-bridge/.env` |
| `BBPS_CLIENT_ID` | (from provider, after IP whitelisting) |
| `BBPS_CLIENT_SECRET` | (from provider) |
| `BBPS_AES_KEY` | (from provider) |

## 6. Tell the provider

Reply to their email with:

> Please whitelist our static IP **`<IP from step 1>`** for both UAT and
> Production environments. Once whitelisted, kindly share the UAT
> credentials.

## 7. Health check

```bash
curl https://bbps-bridge.eisoluions.xyz/health
# → {"status":"ok","baseUrl":"https://aceneobank.dev.acepe.co.in/apiService","uptimeSec":12}
```

## 8. Logs

```bash
sudo journalctl -u bbps-bridge -f --since "10 min ago"
```

## 9. Switching to production

Edit `/opt/bbps-bridge/.env`, set `BBPS_BASE_URL` to the production endpoint
(provider will share when go-live), then:

```bash
sudo systemctl restart bbps-bridge
```

No app changes required.

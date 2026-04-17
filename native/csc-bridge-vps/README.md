# EI SOLUTIONS PAY — VPS Bridge Server

Production-ready Node.js + Express + Puppeteer bridge that exposes a single
HMAC-authenticated `/execute` endpoint for the EI SOLUTIONS PAY web app to
call. Internally it logs into the CSC Connect portal with the retailer's
master credentials, performs the requested service, and returns a structured
JSON receipt.

> ⚠️ **CSC ToS**: This bridge automates the CSC web UI. Doing so may violate
> CSC terms of service and result in your account being suspended. Use at
> your own risk.

---

## 1. VPS Provisioning

Recommended: **DigitalOcean Basic Droplet 2 GB RAM** (₹500/mo) or
**Hetzner CX22 4 GB** (₹400/mo). India region preferred.

```bash
# Ubuntu 22.04 LTS
sudo apt update && sudo apt -y upgrade
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Puppeteer dependencies
sudo apt install -y \
  chromium-browser \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libpango-1.0-0 libcairo2 libasound2
```

## 2. Deploy the bridge

```bash
sudo mkdir -p /opt/csc-bridge
sudo chown $USER:$USER /opt/csc-bridge
cd /opt/csc-bridge

# Copy these files from native/csc-bridge-vps/ to the VPS:
#   server.js
#   package.json
#   .env.example
#   csc-bridge.service
scp -r native/csc-bridge-vps/* user@your-vps:/opt/csc-bridge/

cd /opt/csc-bridge
npm install --production

cp .env.example .env
# Edit .env and set HMAC_SECRET (must match Lovable Cloud admin panel).
# openssl rand -hex 32   ← use this to generate.
nano .env
```

## 3. Reverse proxy + HTTPS

Free subdomain: register at https://www.duckdns.org and point e.g.
`eipay-bridge.duckdns.org` → your VPS IP.

```bash
sudo tee /etc/nginx/sites-available/csc-bridge >/dev/null <<'NGINX'
server {
    listen 80;
    server_name eipay-bridge.duckdns.org;

    location / {
        proxy_pass         http://127.0.0.1:8787;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }

    # Rate limit: 30 req/min per IP
    limit_req zone=eipay burst=10 nodelay;
}
NGINX

# Add the rate-limit zone (one-time, in /etc/nginx/nginx.conf inside http {}):
#   limit_req_zone $binary_remote_addr zone=eipay:10m rate=30r/m;

sudo ln -s /etc/nginx/sites-available/csc-bridge /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d eipay-bridge.duckdns.org
```

## 4. systemd service (auto-restart)

```bash
sudo cp /opt/csc-bridge/csc-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now csc-bridge
sudo systemctl status csc-bridge
```

## 5. Configure the Lovable Cloud admin panel

Open `/admin/csc-settings`:

1. **Bridge URL**: `https://eipay-bridge.duckdns.org/execute`
2. **HMAC Shared Secret**: paste the same value from `/opt/csc-bridge/.env`
3. **CSC Username/Password**: enter master CSC Connect credentials
4. Click *Encrypt & Save*

## 6. Health check

```bash
curl https://eipay-bridge.duckdns.org/health
# → {"status":"ok","cscLoggedIn":true,"uptimeSec":1234}
```

If `cscLoggedIn` is false, the bridge will attempt re-login on the next
`/execute` call.

## 7. Logs

```bash
sudo journalctl -u csc-bridge -f --since "10 min ago"
```

## 8. Adding new services

Open `server.js` and add a new entry to the `serviceHandlers` object. Each
handler receives `{ page, fields, amount }` and must return
`{ success: true, ref, message }` or throw.

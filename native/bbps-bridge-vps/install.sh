#!/usr/bin/env bash
###############################################################################
# EI SOLUTIONS — BBPS Bridge: Fresh install on new Bangalore VPS
# -----------------------------------------------------------------------------
# Run as root on a fresh Ubuntu 22.04 / 24.04 droplet:
#
#   curl -fsSL https://raw.githubusercontent.com/<your-repo>/main/native/bbps-bridge-vps/install.sh | bash
#
# Or copy this file to the VPS and run:
#   chmod +x install.sh && ./install.sh
#
# What it does (idempotent — safe to re-run):
#   1. Installs Node.js 20, nginx, certbot
#   2. Drops the bridge into /opt/bbps-bridge
#   3. Generates HMAC_SECRET (or reuses existing)
#   4. Creates systemd service + nginx vhost
#   5. Issues Let's Encrypt cert for $DOMAIN
#   6. Prints HMAC_SECRET + outbound IP for you to paste into Lovable secrets
###############################################################################
set -euo pipefail

# ─── EDIT THESE ───────────────────────────────────────────────────────────────
DOMAIN="${DOMAIN:-bbps-bridge.eisoluions.xyz}"
EMAIL="${EMAIL:-eisoultionswork@outlook.com}"
BBPS_BASE_URL="${BBPS_BASE_URL:-https://aceneobank.dev.acepe.co.in/apiService}"
APP_DIR="/opt/bbps-bridge"
PORT="8788"
# ──────────────────────────────────────────────────────────────────────────────

echo "▶ Installing system packages…"
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg ufw nginx certbot python3-certbot-nginx

if ! command -v node >/dev/null || [[ "$(node -v)" != v20* ]]; then
  echo "▶ Installing Node.js 20…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

echo "▶ Setting up firewall…"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null || true

mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "▶ Writing package.json…"
cat > package.json <<'JSON'
{
  "name": "bbps-bridge-vps",
  "version": "1.0.0",
  "private": true,
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "dotenv": "^16.4.5",
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0"
  }
}
JSON

echo "▶ Downloading server.js (paste/scp it here if running offline)…"
if [[ ! -f server.js ]]; then
  cat > server.js <<'NEEDS_SERVER_JS'
// Replace this file with native/bbps-bridge-vps/server.js from the repo.
// scp native/bbps-bridge-vps/server.js root@<vps-ip>:/opt/bbps-bridge/server.js
console.error("server.js placeholder — copy the real one from the repo");
process.exit(1);
NEEDS_SERVER_JS
  echo "  ⚠ Placeholder server.js written. Copy real server.js before starting."
fi

echo "▶ Installing npm deps…"
npm install --omit=dev --silent

# HMAC secret — preserve existing if present
if [[ -f .env ]] && grep -q '^HMAC_SECRET=' .env; then
  HMAC_SECRET="$(grep '^HMAC_SECRET=' .env | cut -d= -f2-)"
  echo "▶ Reusing existing HMAC_SECRET from .env"
else
  HMAC_SECRET="$(openssl rand -hex 32)"
  echo "▶ Generated fresh HMAC_SECRET"
fi

cat > .env <<ENV
HMAC_SECRET=$HMAC_SECRET
PORT=$PORT
BBPS_BASE_URL=$BBPS_BASE_URL
HMAC_MAX_SKEW_SEC=300
PROVIDER_TIMEOUT_MS=45000
ENV
chmod 600 .env

echo "▶ Writing systemd service…"
cat > /etc/systemd/system/bbps-bridge.service <<UNIT
[Unit]
Description=EI SOLUTIONS — BBPS HMAC Proxy Bridge
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable bbps-bridge >/dev/null
systemctl restart bbps-bridge

echo "▶ Writing nginx vhost for $DOMAIN…"
cat > /etc/nginx/sites-available/bbps-bridge <<NGINX
server {
  listen 80;
  server_name $DOMAIN;

  client_max_body_size 1m;

  location / {
    proxy_pass http://127.0.0.1:$PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 60s;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/bbps-bridge /etc/nginx/sites-enabled/bbps-bridge
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "▶ Issuing Let's Encrypt cert (requires DNS for $DOMAIN to point here)…"
if ! certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
  certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos --non-interactive --redirect || {
    echo "  ⚠ Certbot failed. Make sure DNS A record for $DOMAIN points to this VPS, then re-run:"
    echo "    certbot --nginx -d $DOMAIN -m $EMAIL --agree-tos --redirect"
  }
else
  echo "  ✔ Cert already exists for $DOMAIN"
fi

# ─── Smoke test + summary ────────────────────────────────────────────────────
sleep 2
echo
echo "═══════════════════════════════════════════════════════════════════════"
echo "  BBPS BRIDGE INSTALL COMPLETE"
echo "═══════════════════════════════════════════════════════════════════════"
echo
echo "  Domain:        https://$DOMAIN"
echo "  Service:       systemctl status bbps-bridge"
echo "  Logs:          journalctl -u bbps-bridge -f"
echo
echo "  HMAC_SECRET (paste into Lovable → BBPS_BRIDGE_HMAC_SECRET):"
echo "    $HMAC_SECRET"
echo
echo "  BBPS_BRIDGE_BASE_URL (paste into Lovable):"
echo "    https://$DOMAIN"
echo
echo "  Outbound IP (must match provider whitelist):"
curl -s --max-time 5 https://api.ipify.org || echo "(unable to fetch)"
echo
echo
echo "  Health check:"
curl -s --max-time 5 "https://$DOMAIN/health" || echo "(not reachable yet — check DNS / certbot)"
echo
echo "═══════════════════════════════════════════════════════════════════════"

#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/whatsapp-bridge"
SERVICE_NAME="whatsapp-bridge"

echo "[1/7] Installing system dependencies..."
apt-get update
apt-get install -y curl chromium chromium-driver libgbm1 libnss3 libxss1 libasound2 ca-certificates

if ! command -v node >/dev/null 2>&1; then
  echo "[2/7] Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "[2/7] Node.js already installed: $(node -v)"
fi

echo "[3/7] Preparing app directory..."
mkdir -p "$APP_DIR"

echo "[4/7] Copy bridge files into $APP_DIR before continuing."
echo "Required files: server.js, package.json, .env, whatsapp-bridge.service"

if [ ! -f "$APP_DIR/package.json" ] || [ ! -f "$APP_DIR/server.js" ] || [ ! -f "$APP_DIR/.env" ]; then
  echo "Missing required files in $APP_DIR."
  echo "Copy the contents of native/whatsapp-bridge-vps/ into $APP_DIR first, then re-run this script."
  exit 1
fi

echo "[5/7] Installing npm dependencies..."
cd "$APP_DIR"
npm install --omit=dev

echo "[6/7] Installing systemd service..."
cp "$APP_DIR/whatsapp-bridge.service" "/etc/systemd/system/$SERVICE_NAME.service"
systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"

echo "[7/7] Health checks..."
sleep 2
systemctl --no-pager --full status "$SERVICE_NAME" || true
curl -sf "http://127.0.0.1:8788/health" || true

echo
echo "Bridge install finished."
echo "If /health did not return JSON, inspect logs with:"
echo "  journalctl -u $SERVICE_NAME -n 100 --no-pager"
echo
echo "Important:"
echo "  1) Set WA_BRIDGE_BASE_URL to your public bridge URL ending in /wa if using nginx proxy"
echo "  2) Set the same HMAC secret in both VPS .env and Lovable secrets"
echo "  3) Ensure Cloudflare/DNS points to the correct VPS IP"
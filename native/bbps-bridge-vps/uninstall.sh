#!/usr/bin/env bash
###############################################################################
# EI SOLUTIONS — BBPS Bridge: COMPLETE WIPE from old VPS
# -----------------------------------------------------------------------------
# Run this on the OLD New Jersey VPS (146.190.74.49) to remove every trace
# of the bridge before decommissioning.
#
# Usage:
#   chmod +x uninstall.sh && ./uninstall.sh
#
# What it removes:
#   • systemd service (bbps-bridge)
#   • /opt/bbps-bridge directory (code, .env, HMAC secret)
#   • nginx vhost + symlink
#   • Let's Encrypt cert for the bridge domain
#   • UFW rules added for the bridge (kept Nginx Full + SSH)
###############################################################################
set -euo pipefail

DOMAIN="${DOMAIN:-bbps-bridge.eisoluions.xyz}"
APP_DIR="/opt/bbps-bridge"

echo "▶ Stopping & disabling systemd service…"
systemctl stop bbps-bridge 2>/dev/null || true
systemctl disable bbps-bridge 2>/dev/null || true
rm -f /etc/systemd/system/bbps-bridge.service
systemctl daemon-reload

echo "▶ Removing app directory $APP_DIR…"
rm -rf "$APP_DIR"

echo "▶ Removing nginx vhost…"
rm -f /etc/nginx/sites-enabled/bbps-bridge
rm -f /etc/nginx/sites-available/bbps-bridge
nginx -t && systemctl reload nginx || true

echo "▶ Revoking & deleting Let's Encrypt cert for $DOMAIN…"
if command -v certbot >/dev/null && certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
  certbot revoke --cert-name "$DOMAIN" --non-interactive || true
  certbot delete --cert-name "$DOMAIN" --non-interactive || true
fi

echo "▶ Done. This VPS no longer hosts the BBPS bridge."
echo "  Remember to:"
echo "    1. Update DNS: $DOMAIN → new Bangalore VPS IP (139.59.13.241)"
echo "    2. Update Lovable secret BBPS_BRIDGE_HMAC_SECRET to the new value"
echo "    3. Destroy this droplet from DigitalOcean console once DNS has migrated"

#!/usr/bin/env bash
set -euo pipefail

DOMAIN="wa.eisoluions.xyz"
SITE_PATH="/etc/nginx/sites-available/${DOMAIN}"
SITE_LINK="/etc/nginx/sites-enabled/${DOMAIN}"
BRIDGE_EXAMPLE="/opt/whatsapp-bridge/nginx-wa.eisoluions.xyz.conf.example"
BRIDGE_PORT="127.0.0.1:8788"
EMAIL="admin@eisoluions.xyz"

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx is not installed"
  exit 1
fi

if ! command -v certbot >/dev/null 2>&1; then
  apt-get update
  apt-get install -y certbot python3-certbot-nginx
fi

echo "[1/7] Checking local WhatsApp bridge"
if ! curl -fsS "http://${BRIDGE_PORT}/health"; then
  echo
  echo "Local bridge is not responding on ${BRIDGE_PORT}. Fix the whatsapp-bridge service first:"
  echo "  sudo systemctl status whatsapp-bridge --no-pager"
  echo "  sudo journalctl -u whatsapp-bridge -n 100 --no-pager"
  exit 1
fi

echo
printf "[2/7] Installing nginx site for %s\n" "$DOMAIN"
if [ -f "$BRIDGE_EXAMPLE" ]; then
  cp "$BRIDGE_EXAMPLE" "$SITE_PATH"
else
  cat > "$SITE_PATH" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name wa.eisoluions.xyz;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass         http://127.0.0.1:8788;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        client_max_body_size 25m;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
NGINX
fi

ln -sf "$SITE_PATH" "$SITE_LINK"
nginx -t
systemctl reload nginx

echo
printf "[3/7] Checking public HTTP for %s\n" "$DOMAIN"
curl -i "http://${DOMAIN}/health" || true

echo
printf "[4/7] Issuing Let's Encrypt certificate for %s\n" "$DOMAIN"
certbot --nginx -d "$DOMAIN" --redirect --agree-tos -m "$EMAIL" --non-interactive


echo
printf "[5/7] Reloading nginx\n"
nginx -t
systemctl reload nginx

echo
printf "[6/7] Verifying HTTPS health endpoint\n"
curl -i "https://${DOMAIN}/health"

echo
printf "[7/7] If the response above is not WhatsApp JSON, check DNS / proxy mismatch.\n"
echo "Expected body shape: {\"ok\":true,...} from the WhatsApp bridge, not CSC bridge JSON."

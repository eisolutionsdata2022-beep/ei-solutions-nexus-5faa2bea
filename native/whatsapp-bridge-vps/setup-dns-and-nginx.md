# Setup `wa.eisoluions.xyz` — DNS + nginx + SSL (production checklist)

Goal: make `https://wa.eisoluions.xyz/health` return `{"ok":true,...}` so the
Lovable admin → WhatsApp page can finally pull the QR code.

You only run this **once** per VPS. After that, the bridge stays online via
`systemctl` (already configured by `install.sh`).

---

## 0. Pre-flight (do these on the VPS)

```bash
# Confirm the bridge is actually listening on 127.0.0.1:8788
sudo systemctl status whatsapp-bridge --no-pager
curl -s http://127.0.0.1:8788/health
# → {"ok":true,"ready":false,"uptimeSec":...}
```

If this fails, fix the bridge first (see `README.md` → Install on the VPS).
There is no point setting up DNS until the local service answers.

Also note your **public IPv4** of the VPS:

```bash
curl -4 -s ifconfig.me ; echo
# e.g. 185.158.133.1
```

---

## 1. Add the DNS A-record

At your domain registrar / DNS provider for `eisoluions.xyz` (Cloudflare,
Namecheap, GoDaddy, Hostinger, etc.) add:

| Type | Name | Value (your VPS IPv4) | TTL  | Proxy |
|------|------|------------------------|------|-------|
| A    | wa   | 185.158.133.1          | Auto | **DNS only** (grey cloud) for now |

> Important: keep it **DNS only / grey cloud** until certbot finishes
> issuing the SSL cert. You can switch the orange cloud back on after `https://`
> is working — Cloudflare's HTTP/2 + cert handshake otherwise blocks the
> Let's Encrypt HTTP-01 challenge.

Verify propagation from anywhere:

```bash
dig +short wa.eisoluions.xyz @1.1.1.1
# should print 185.158.133.1
```

If `dig` returns nothing, wait 5–15 minutes and retry. Don't continue until
this resolves to your VPS IP.

---

## 2. Drop in the nginx site

On the VPS:

```bash
# Copy the example file shipped in this folder (or paste it manually).
sudo cp /opt/whatsapp-bridge/nginx-wa.eisoluions.xyz.conf.example \
        /etc/nginx/sites-available/wa.eisoluions.xyz

sudo ln -sf /etc/nginx/sites-available/wa.eisoluions.xyz \
            /etc/nginx/sites-enabled/wa.eisoluions.xyz

sudo nginx -t           # must say "syntax is ok" + "test is successful"
sudo systemctl reload nginx
```

Sanity check over plain HTTP **before** SSL:

```bash
curl -i http://wa.eisoluions.xyz/health
# HTTP/1.1 200 OK
# {"ok":true,"ready":false,"uptimeSec":...}
```

If you get `502 Bad Gateway`, the bridge isn't running on 127.0.0.1:8788.
If you get `404`, nginx loaded the wrong site — re-check the symlink.
If you get a connection timeout from the public internet, the firewall is
blocking ports 80/443:

```bash
sudo ufw allow 80,443/tcp
sudo ufw reload
```

---

## 3. Issue the Let's Encrypt SSL certificate

```bash
# Install certbot once (Debian / Ubuntu)
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Issue + auto-install the cert into the nginx site
sudo certbot --nginx -d wa.eisoluions.xyz \
    --redirect --agree-tos -m admin@eisoluions.xyz --non-interactive

# Verify
sudo certbot certificates
sudo systemctl reload nginx
```

Now confirm HTTPS works publicly:

```bash
curl -i https://wa.eisoluions.xyz/health
# HTTP/2 200
# {"ok":true,"ready":false,...}
```

(Optional) If you use Cloudflare and want the orange cloud back on:
set the SSL/TLS mode to **Full (strict)** so Cloudflare validates the
Let's Encrypt cert end-to-end.

---

## 4. Re-test from the Lovable portal

1. Open **/admin/whatsapp** in the Lovable preview.
2. Click **Diagnose**. The banner should switch from
   _"Cloudflare 530 — origin VPS not responding"_ to a green
   **"Bridge /health is responding ✅"** toast.
3. The QR card will fetch and display the code (status doc is written by the
   bridge into Firestore `whatsappSessions/default`).

If it still fails, the diagnostic banner now prints the exact stage
(`network` / `cloudflare` / `proxy`) plus a one-line hint and a list of
every URL the portal tried. Fix the layer it points at and re-run Diagnose.

---

## 5. Nice-to-have hardening (optional)

- **Fail2ban** for repeated 401s on `/send` (HMAC mismatch attempts).
- **Cloudflare Access / IP allowlist** in front of `wa.eisoluions.xyz` so only
  the Lovable Worker egress IPs can hit `/send`, `/bulk`, `/restart`. The
  Lovable side already signs every request with HMAC-SHA256 → so even a
  publicly-exposed bridge is safe, but defence-in-depth never hurts.
- **Auto-renew test:** `sudo certbot renew --dry-run`.
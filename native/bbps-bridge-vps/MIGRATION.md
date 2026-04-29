# BBPS Bridge — Migration to new Bangalore VPS

Provider whitelisted IP: **139.59.13.241** (DigitalOcean BLR1)
Old (decommission): **146.190.74.49** (DigitalOcean NYC)
Domain: `bbps-bridge.eisoluions.xyz`

---

## Step 1 — Install on new Bangalore VPS

SSH into the new droplet (139.59.13.241) as root and run:

```bash
# Copy install + server files to the VPS first:
#   scp native/bbps-bridge-vps/{install.sh,uninstall.sh,server.js} root@139.59.13.241:/root/

cd /root
chmod +x install.sh
./install.sh
# Then copy the real server.js into /opt/bbps-bridge/server.js and restart:
cp /root/server.js /opt/bbps-bridge/server.js
systemctl restart bbps-bridge
```

The script prints the new **HMAC_SECRET** and outbound IP at the end. Save these.

---

## Step 2 — Update DNS

In your DNS provider:

| Type | Name              | Value          |
|------|-------------------|----------------|
| A    | bbps-bridge       | 139.59.13.241  |

Wait 1–5 minutes for propagation (`dig bbps-bridge.eisoluions.xyz +short`).

---

## Step 3 — Update Lovable secrets

Admin → Lovable Cloud → Secrets:

- `BBPS_BRIDGE_BASE_URL` → `https://bbps-bridge.eisoluions.xyz` (no change if domain stays)
- `BBPS_BRIDGE_HMAC_SECRET` → paste the new HMAC printed by `install.sh`

---

## Step 4 — Verify

```bash
# From your laptop:
curl https://bbps-bridge.eisoluions.xyz/health
curl https://bbps-bridge.eisoluions.xyz/whoami
# Expect outboundIp: "139.59.13.241", geo.region: "Karnataka"
```

Then in the app: **Admin → BBPS Settings → Run Test Now**.
A `200` response (or anything other than `403`) means the provider's whitelist is now seeing the correct IP.

---

## Step 5 — Decommission old NJ VPS

SSH into 146.190.74.49 and run:

```bash
scp native/bbps-bridge-vps/uninstall.sh root@146.190.74.49:/root/
chmod +x uninstall.sh && ./uninstall.sh
```

Then destroy the droplet from the DigitalOcean console.

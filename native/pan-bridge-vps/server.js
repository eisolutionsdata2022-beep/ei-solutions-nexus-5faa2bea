/**
 * EI SOLUTIONS — PAN Bridge VPS
 * ----------------------------------------------------------------------
 * Single endpoint:  POST /proxy/pan
 *
 * Accepts an HMAC-signed request from the Lovable Cloud Worker that runs
 * `executePanService()`, then forwards the inner payload to the upstream
 * mallikacyberzone API from this VPS's static IP. The provider's IP
 * whitelist is configured to allow this VPS, so requests succeed even
 * though the original Worker IP changes per request.
 *
 * Wire format from the Worker:
 *   POST /proxy/pan
 *   Content-Type: application/json
 *   X-Timestamp: <ms-since-epoch>
 *   X-Signature: <hex(hmac-sha256(HMAC_SECRET, ts + "." + rawBody))>
 *
 *   Body: { method: "GET" | "POST", url: "<upstream URL>", payload: {...} }
 *
 * Response:
 *   200 — { upstreamStatus, upstream }   ← upstream is the parsed JSON
 *   401 — bad/missing signature, replayed timestamp
 *   400 — disallowed host, malformed body
 *   502 — upstream unreachable / non-JSON
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const PORT = Number(process.env.PORT || 8788);
const HMAC_SECRET = process.env.HMAC_SECRET;
const MAX_SKEW = Number(process.env.HMAC_MAX_SKEW_SEC || 300);
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || 'mallikacyberzone.com,www.mallikacyberzone.com')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

if (!HMAC_SECRET || HMAC_SECRET.length < 16) {
  console.error('[fatal] HMAC_SECRET missing or too short. Set it in .env (>=16 chars).');
  process.exit(1);
}

const STARTED_AT = Date.now();
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false }));

// Capture raw body for HMAC verification.
app.use(
  express.json({
    limit: '64kb',
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  }),
);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptimeSec: Math.round((Date.now() - STARTED_AT) / 1000),
    allowedHosts: ALLOWED_HOSTS,
  });
});

function verifyHmac(req, res, next) {
  const signature = req.get('X-Signature') || '';
  const timestamp = req.get('X-Timestamp') || '';
  const raw = req.rawBody || '';

  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing signature' });
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW * 1000) {
    return res.status(401).json({ error: 'Timestamp out of window' });
  }
  const expected = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(timestamp + '.' + raw)
    .digest('hex');
  const a = Buffer.from(expected, 'hex');
  let b;
  try {
    b = Buffer.from(signature, 'hex');
  } catch {
    return res.status(401).json({ error: 'Bad signature encoding' });
  }
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Bad signature' });
  }
  next();
}

app.post('/proxy/pan', verifyHmac, async (req, res) => {
  const { method, url, payload } = req.body || {};

  if (!method || !url || !payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Missing method/url/payload' });
  }
  if (method !== 'GET' && method !== 'POST') {
    return res.status(400).json({ error: 'method must be GET or POST' });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid url' });
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname.toLowerCase())) {
    return res.status(400).json({
      error: `Host not allowed: ${parsed.hostname}`,
      allowed: ALLOWED_HOSTS,
    });
  }

  try {
    let upstreamRes;
    if (method === 'GET') {
      const qs = new URLSearchParams(payload).toString();
      const fullUrl = qs ? `${url}?${qs}` : url;
      upstreamRes = await fetch(fullUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(45_000),
      });
    } else {
      upstreamRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45_000),
      });
    }

    const text = await upstreamRes.text();
    let upstream;
    try {
      upstream = JSON.parse(text);
    } catch {
      // Provider returned non-JSON. Keep the raw text for debugging.
      upstream = { raw: text.slice(0, 4000) };
    }
    return res.status(200).json({
      upstreamStatus: upstreamRes.status,
      upstream,
    });
  } catch (err) {
    const msg = err?.message || String(err);
    console.error('[proxy/pan] fetch error:', msg);
    return res.status(502).json({
      error: msg.includes('timeout')
        ? 'Upstream timed out (>45s)'
        : `Upstream unreachable: ${msg}`,
    });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`[pan-bridge] listening on :${PORT}`);
  console.log(`[pan-bridge] allowed hosts: ${ALLOWED_HOSTS.join(', ')}`);
});

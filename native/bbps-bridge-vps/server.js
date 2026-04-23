/**
 * EI SOLUTIONS — Bharat Connect (BBPS) HMAC Proxy Bridge
 * ------------------------------------------------------------------
 * Why this exists
 *   The provider (Radiant AceMoney / AceNeoBank) requires a static IP to
 *   be whitelisted before they release UAT credentials. Cloudflare Workers
 *   (where the Lovable app runs) does not expose a stable egress IP, so we
 *   proxy provider calls through this VPS, which has a fixed IP.
 *
 * What it does
 *   • Single endpoint: POST /provider/:path
 *     ↳ Forwards the body verbatim to `${BBPS_BASE_URL}/${path}` and returns
 *       whatever the provider responds with (JSON or text).
 *   • Auth: HMAC-SHA256 over the raw request body, sent in X-Signature.
 *           Replay-protected by X-Timestamp (±5 min default).
 *   • No knowledge of provider business logic — encryption, payload shapes
 *     and credentials all live in the Lovable app (server functions).
 *
 * Endpoints
 *   GET  /health                 — liveness check
 *   POST /provider/:apiPath(*)   — HMAC-protected forward to provider
 */
import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 8788);
const HMAC_SECRET = process.env.HMAC_SECRET;
const MAX_SKEW = Number(process.env.HMAC_MAX_SKEW_SEC || 300);
const BASE_URL = (process.env.BBPS_BASE_URL || 'https://aceneobank.dev.acepe.co.in/apiService').replace(/\/+$/, '');
const PROVIDER_TIMEOUT_MS = Number(process.env.PROVIDER_TIMEOUT_MS || 45_000);

if (!HMAC_SECRET || HMAC_SECRET.length < 16) {
  console.error('[fatal] HMAC_SECRET missing or too short. Set it in .env');
  process.exit(1);
}

const STARTED_AT = Date.now();

// ─── HMAC verification middleware ─────────────────────────────────────
function verifyHmac(req, res, next) {
  const signature = req.get('X-Signature') || '';
  const timestamp = req.get('X-Timestamp') || '';
  const raw = req.rawBody || '';

  if (!signature || !timestamp) {
    return res.status(401).json({ success: false, error: 'Missing signature' });
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW * 1000) {
    return res.status(401).json({ success: false, error: 'Timestamp out of window' });
  }
  const expected = crypto.createHmac('sha256', HMAC_SECRET).update(raw).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ success: false, error: 'Bad signature' });
  }
  next();
}

// ─── Express app ──────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
app.use(rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false }));

// Capture raw body for HMAC
app.use(express.json({
  limit: '256kb',
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    baseUrl: BASE_URL,
    uptimeSec: Math.round((Date.now() - STARTED_AT) / 1000),
  });
});

/**
 * Forward to provider. Path is appended after BASE_URL.
 *   POST /provider/billpay/bill-category   →   ${BASE_URL}/billpay/bill-category
 *
 * The Lovable server fn passes provider-specific headers via
 *   body.__headers   (object — merged into outbound request)
 *   body.__payload   (object — sent as the actual provider body)
 * This keeps the bridge dumb: it never inspects business fields.
 */
app.post('/provider/*', verifyHmac, async (req, res) => {
  const apiPath = req.params[0] || '';
  if (!apiPath || apiPath.includes('..')) {
    return res.status(400).json({ success: false, error: 'Invalid path' });
  }

  const { __headers = {}, __payload = {} } = req.body || {};
  const url = `${BASE_URL}/${apiPath.replace(/^\/+/, '')}`;
  const outboundBody = JSON.stringify(__payload);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    console.log(`[bbps] → ${apiPath} (${outboundBody.length}b)`);
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...__headers,
      },
      body: outboundBody,
      signal: controller.signal,
    });

    const text = await upstream.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /* not json */ }

    console.log(`[bbps] ← ${apiPath} ${upstream.status} (${text.length}b)`);

    res.status(200).json({
      success: upstream.ok,
      status: upstream.status,
      statusText: upstream.statusText,
      body: parsed ?? text,
    });
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    console.error(`[bbps] ✗ ${apiPath}:`, err?.message || err);
    res.status(502).json({
      success: false,
      error: aborted ? `Provider timeout (>${PROVIDER_TIMEOUT_MS}ms)` : (err?.message || 'Bridge fetch failed'),
    });
  } finally {
    clearTimeout(timer);
  }
});

app.listen(PORT, () => {
  console.log(`[bbps-bridge] listening on :${PORT} → ${BASE_URL}`);
});

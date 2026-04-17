/**
 * EI SOLUTIONS PAY — VPS bridge server
 * ------------------------------------------------------------------
 *  • Single endpoint: POST /execute
 *  • Auth: HMAC-SHA256 over the raw request body, sent in X-Signature.
 *          Replay-protected by X-Timestamp (±5 min default).
 *  • Re-uses a single logged-in Chromium instance for all requests.
 *  • Per-service handlers map a payload onto a CSC Connect navigation
 *    flow. Add new services by adding entries to `serviceHandlers`.
 *
 * Endpoints
 *   GET  /health   — liveness + CSC login state
 *   POST /execute  — HMAC-protected service execution
 */
import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer';

const PORT = Number(process.env.PORT || 8787);
const HMAC_SECRET = process.env.HMAC_SECRET;
const MAX_SKEW = Number(process.env.HMAC_MAX_SKEW_SEC || 300);
const HEADLESS = process.env.HEADLESS !== 'false';

if (!HMAC_SECRET || HMAC_SECRET.length < 16) {
  console.error('[fatal] HMAC_SECRET missing or too short. Set it in .env');
  process.exit(1);
}

const STARTED_AT = Date.now();

// ─── Browser pool (1 browser, 1 page per request) ─────────────────────
let browserPromise = null;
let cscLoggedIn = false;

async function getBrowser() {
  if (browserPromise) return browserPromise;
  browserPromise = puppeteer.launch({
    headless: HEADLESS ? 'new' : false,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1366,900',
    ],
    defaultViewport: { width: 1366, height: 900 },
  });
  const browser = await browserPromise;
  browser.on('disconnected', () => {
    console.warn('[browser] disconnected — will relaunch on next request');
    browserPromise = null;
    cscLoggedIn = false;
  });
  return browser;
}

// ─── CSC login ────────────────────────────────────────────────────────
async function ensureCscLogin(page, username, password) {
  // Detect if we're already on a logged-in page
  const url = page.url();
  if (cscLoggedIn && url.includes('connect.csc.gov.in') && !url.includes('login')) {
    return;
  }
  console.log('[csc] logging in as', username.slice(0, 3) + '***');
  await page.goto('https://connect.csc.gov.in/account/login', { waitUntil: 'networkidle2', timeout: 60_000 });

  // Selectors below are placeholders — they vary by CSC UI version.
  // Inspect the live page once and update these to match.
  await page.waitForSelector('input[name="username"]', { timeout: 30_000 });
  await page.type('input[name="username"]', username, { delay: 30 });
  await page.type('input[name="password"]', password, { delay: 30 });
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60_000 }),
  ]);

  if (page.url().includes('login')) {
    throw new Error('CSC login failed (still on login page). Check credentials.');
  }
  cscLoggedIn = true;
  console.log('[csc] login OK');
}

// ─── Service handlers ─────────────────────────────────────────────────
// Each handler must return { success: true, ref, message }.
// Throw to signal failure (the framework refunds the wallet).
const serviceHandlers = {
  electricity_bill: async ({ page, fields, amount }) => {
    // TODO: navigate to BBPS → Electricity, fill consumer no., pay
    return demoReceipt('ELEC', fields, amount);
  },
  water_bill: async ({ page, fields, amount }) => {
    return demoReceipt('WATR', fields, amount);
  },
  mobile_recharge: async ({ page, fields, amount }) => {
    return demoReceipt('MOB', fields, amount);
  },
  dth_recharge: async ({ page, fields, amount }) => {
    return demoReceipt('DTH', fields, amount);
  },
  lpg_booking: async ({ page, fields, amount }) => {
    return demoReceipt('LPG', fields, amount);
  },
  insurance_premium: async ({ page, fields, amount }) => {
    return demoReceipt('INS', fields, amount);
  },
  // Add more here. Match keys from src/lib/csc-services.ts
};

function demoReceipt(prefix, fields, amount) {
  const ref = `${prefix}${Date.now().toString(36).toUpperCase()}`;
  return {
    success: true,
    ref,
    message: `${prefix} processed for ₹${amount}`,
    fields,
  };
}

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
  const expected = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(raw)
    .digest('hex');
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
app.use(rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false }));

// Capture raw body for HMAC
app.use(express.json({
  limit: '64kb',
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    cscLoggedIn,
    uptimeSec: Math.round((Date.now() - STARTED_AT) / 1000),
  });
});

app.post('/execute', verifyHmac, async (req, res) => {
  const { service, fields, amount, cscUsername, cscPassword } = req.body || {};
  if (!service || !fields || !amount || !cscUsername || !cscPassword) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  const handler = serviceHandlers[service];
  if (!handler) {
    return res.status(400).json({ success: false, error: `Unknown service: ${service}` });
  }

  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await ensureCscLogin(page, cscUsername, cscPassword);
    const result = await handler({ page, fields, amount });
    res.json(result);
  } catch (err) {
    console.error('[execute]', service, err);
    res.status(502).json({
      success: false,
      error: err?.message || 'Bridge execution failed',
    });
  } finally {
    if (page) await page.close().catch(() => {});
  }
});

app.listen(PORT, () => {
  console.log(`[csc-bridge] listening on :${PORT} (headless=${HEADLESS})`);
});

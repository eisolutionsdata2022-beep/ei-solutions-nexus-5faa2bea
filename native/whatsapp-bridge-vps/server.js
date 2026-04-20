/**
 * EI SOLUTIONS — WhatsApp Web bridge (VPS)
 * ------------------------------------------------------------------
 * Single Node process that:
 *   • Logs in to WhatsApp by QR (whatsapp-web.js + LocalAuth)
 *   • Mirrors session status, contacts, and messages into Firestore
 *   • Exposes a small HMAC-protected REST API for the Lovable portal
 *
 *   POST /send       → send a single text/media message
 *   POST /bulk       → enqueue a list of messages with hard rate limits
 *   GET  /status     → liveness + WA connection state + last QR (data URL)
 *   POST /restart    → restart WA client (re-auth, force new QR)
 *   GET  /health     → unauthenticated liveness probe (for nginx)
 *
 * Auth: HMAC-SHA256 over the raw request body, sent in X-Signature.
 *       Replay-protected by X-Timestamp (±HMAC_MAX_SKEW_SEC).
 */

import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import qrTerm from 'qrcode-terminal';
import wweb from 'whatsapp-web.js';
import admin from 'firebase-admin';

const { Client, LocalAuth, MessageMedia } = wweb;

// ─── Env ───────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 8788);
const HMAC_SECRET = process.env.HMAC_SECRET;
const MAX_SKEW = Number(process.env.HMAC_MAX_SKEW_SEC || 300);
const HEADLESS = process.env.HEADLESS !== 'false';
const SESSION_DIR = process.env.WA_SESSION_DIR || './.wwebjs_auth';
const CLIENT_NAME = process.env.WA_CLIENT_NAME || 'EI Solutions Portal';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
const MEDIA_URL_TTL_DAYS = Number(process.env.WA_MEDIA_URL_TTL_DAYS || 30);

const RATE_PER_MIN = Number(process.env.WA_RATE_PER_MIN || 5);
const RATE_PER_DAY = Number(process.env.WA_RATE_PER_DAY || 100);
const DELAY_MIN = Number(process.env.WA_SEND_DELAY_MIN_MS || 8000);
const DELAY_MAX = Number(process.env.WA_SEND_DELAY_MAX_MS || 18000);

if (!HMAC_SECRET || HMAC_SECRET.length < 16) {
  console.error('[fatal] HMAC_SECRET missing or too short. Set it in .env');
  process.exit(1);
}
if (!FIREBASE_PROJECT_ID) {
  console.error('[fatal] FIREBASE_PROJECT_ID missing. Set it in .env');
  process.exit(1);
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('[fatal] GOOGLE_APPLICATION_CREDENTIALS missing. Point to service-account JSON.');
  process.exit(1);
}

// ─── Firestore Admin init ──────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
});
const fs_db = admin.firestore();
const bucket = admin.storage().bucket();
console.log('[firestore] connected to project', FIREBASE_PROJECT_ID);
console.log('[storage] using bucket', FIREBASE_STORAGE_BUCKET);

// Convenience refs
const sessionRef = fs_db.collection('whatsappSessions').doc('default');
const contactsCol = fs_db.collection('whatsappContacts');
const messagesCol = fs_db.collection('whatsappMessages');
const campaignsCol = fs_db.collection('whatsappCampaigns');

// ─── HMAC verification ────────────────────────────────────────────────
function verifyHmac(req, res, next) {
  try {
    const sig = req.header('X-Signature') || '';
    const ts = Number(req.header('X-Timestamp') || 0);
    if (!sig || !ts) return res.status(401).json({ error: 'Missing X-Signature/X-Timestamp' });
    const skew = Math.abs(Date.now() / 1000 - ts);
    if (skew > MAX_SKEW) return res.status(401).json({ error: 'Timestamp skew too large' });

    const body = req.rawBody || '';
    const expected = crypto.createHmac('sha256', HMAC_SECRET)
      .update(`${ts}.${body}`)
      .digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
      return res.status(401).json({ error: 'Bad signature' });
    }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'HMAC verify failed' });
  }
}

// ─── Express app ───────────────────────────────────────────────────────
const app = express();
app.use(express.json({
  limit: '20mb',
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));
app.use(rateLimit({ windowMs: 60_000, max: 200 }));

// ─── WhatsApp client state ─────────────────────────────────────────────
let waClient = null;
let waReady = false;
let waInfo = null;       // { wid, pushname, platform }
let lastQrDataUrl = null;
let lastQrAt = null;

async function setSession(patch) {
  await sessionRef.set({
    ...patch,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

function jidToPhone(jid) {
  // 919876543210@c.us → 919876543210
  return String(jid || '').split('@')[0];
}

function phoneToJid(phone) {
  const digits = String(phone || '').replace(/\D+/g, '');
  if (!digits) return null;
  // Default to India country code if 10-digit
  const full = digits.length === 10 ? `91${digits}` : digits;
  return `${full}@c.us`;
}

async function upsertContact(jid, name) {
  const phone = jidToPhone(jid);
  if (!phone) return { phone: null, isNew: false };
  const ref = contactsCol.doc(phone);
  const snap = await ref.get();
  const isNew = !snap.exists;
  await ref.set({
    phone,
    jid,
    displayName: name || snap.data()?.displayName || phone,
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return { phone, isNew };
}

// Auto-create a CRM lead the first time a brand-new WhatsApp number messages us.
// Idempotent: skips if a crmLeads doc already exists for this phone (or any
// 10-digit suffix match), or if the contact was already known.
const crmLeadsCol = fs_db.collection('crmLeads');
async function autoCreateCrmLead({ phone, displayName, firstMessage }) {
  try {
    if (!phone) return;
    const last10 = phone.slice(-10);
    // Check existing leads — match on either the full phone or the last-10 form.
    const [exactQ, suffixQ] = await Promise.all([
      crmLeadsCol.where('phone', '==', phone).limit(1).get(),
      last10 && last10 !== phone
        ? crmLeadsCol.where('phone', '==', last10).limit(1).get()
        : Promise.resolve({ empty: true }),
    ]);
    if (!exactQ.empty || !suffixQ.empty) return;

    // Compute the next LD-XXXX id (best-effort, matches src/lib/crm-firebase.ts logic).
    const allSnap = await crmLeadsCol.get();
    const leadId = `LD-${String(allSnap.size + 1).padStart(4, '0')}`;
    const snippet = (firstMessage || '').toString().slice(0, 200);
    const nowIso = new Date().toISOString();

    await crmLeadsCol.add({
      leadId,
      name: (displayName || '').trim() || `WhatsApp ${last10}`,
      phone: last10 || phone,
      alternatePhone: '',
      location: '',
      courseInterested: '',
      leadSource: 'WhatsApp',
      assignedStaffId: '',
      assignedStaffName: '',
      status: 'New',
      followUpDate: '',
      followUpTime: '',
      remarks: snippet ? `First WhatsApp message: "${snippet}"` : 'Auto-created from WhatsApp inbox',
      paymentStatus: 'Pending',
      applicationStatus: 'Not Started',
      documents: [],
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: 'whatsapp-bridge',
    });
    console.log(`[crm] auto-created lead ${leadId} from WhatsApp ${phone}`);
  } catch (err) {
    console.error('[crm] autoCreateCrmLead failed', err.message);
  }
}

function extFromMime(mime) {
  if (!mime) return 'bin';
  const map = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/gif': 'gif',
    'application/pdf': 'pdf',
    'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a',
    'video/mp4': 'mp4', 'video/3gpp': '3gp', 'video/quicktime': 'mov',
  };
  return map[mime.toLowerCase()] || (mime.split('/')[1] || 'bin').slice(0, 6);
}

async function uploadMediaToStorage({ phone, messageId, base64, mime }) {
  if (!base64 || !mime) return { mediaUrl: null, mediaPath: null };
  try {
    const ext = extFromMime(mime);
    const safeId = (messageId || `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).replace(/[^A-Za-z0-9._-]/g, '_');
    const objectPath = `whatsappMedia/${phone}/${safeId}.${ext}`;
    const file = bucket.file(objectPath);
    const buf = Buffer.from(base64, 'base64');
    await file.save(buf, {
      contentType: mime,
      resumable: false,
      metadata: { cacheControl: 'private, max-age=2592000' },
    });
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + MEDIA_URL_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
    return { mediaUrl: url, mediaPath: objectPath };
  } catch (err) {
    console.error('[uploadMedia]', err.message);
    return { mediaUrl: null, mediaPath: null };
  }
}

async function persistMessage(msg, direction, opts = {}) {
  try {
    const fromJid = msg.from;
    const toJid = msg.to;
    const counterpartyJid = direction === 'in' ? fromJid : toJid;
    const counterpartyPhone = jidToPhone(counterpartyJid);
    if (!counterpartyPhone) return;

    const hasMedia = !!msg.hasMedia;
    let mediaUrl = null;
    let mediaMime = null;
    let mediaPath = null;
    const messageId = msg.id?._serialized || msg.id?.id || null;

    // For outbound, we may already know the media (we just sent it base64)
    if (direction === 'out' && opts.mediaBase64 && opts.mediaMime) {
      mediaMime = opts.mediaMime;
      const up = await uploadMediaToStorage({
        phone: counterpartyPhone, messageId, base64: opts.mediaBase64, mime: opts.mediaMime,
      });
      mediaUrl = up.mediaUrl; mediaPath = up.mediaPath;
    } else if (hasMedia) {
      try {
        const dl = await msg.downloadMedia();
        if (dl?.data && dl?.mimetype) {
          mediaMime = dl.mimetype;
          const up = await uploadMediaToStorage({
            phone: counterpartyPhone, messageId, base64: dl.data, mime: dl.mimetype,
          });
          mediaUrl = up.mediaUrl; mediaPath = up.mediaPath;
        }
      } catch (e) {
        console.warn('[wa] downloadMedia failed', e.message);
      }
    }

    await messagesCol.add({
      messageId,
      direction,                       // "in" | "out"
      contactPhone: counterpartyPhone, // doc-id key for chat thread
      counterpartyJid,
      fromJid,
      toJid,
      type: msg.type || 'chat',
      body: msg.body || opts.caption || '',
      hasMedia,
      mediaMime,
      mediaUrl,
      mediaPath,
      ack: msg.ack ?? null,
      timestamp: msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update contact summary
    const summary = msg.body || opts.caption || (hasMedia ? '📎 Media' : '');
    await contactsCol.doc(counterpartyPhone).set({
      phone: counterpartyPhone,
      jid: counterpartyJid,
      lastMessage: summary.slice(0, 200),
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      lastDirection: direction,
      unreadCount: direction === 'in'
        ? admin.firestore.FieldValue.increment(1)
        : admin.firestore.FieldValue.increment(0),
    }, { merge: true });
  } catch (err) {
    console.error('[persistMessage]', err.message);
  }
}

async function startWaClient() {
  console.log('[wa] starting client...');
  waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
    puppeteer: {
      headless: HEADLESS,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
    webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1023153602.html' },
  });

  waClient.on('qr', async (qr) => {
    console.log('[wa] QR received — scan from WhatsApp app → Linked Devices');
    qrTerm.generate(qr, { small: true });
    try {
      lastQrDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 1 });
      lastQrAt = new Date().toISOString();
      await setSession({
        status: 'qr',
        clientName: CLIENT_NAME,
        qrDataUrl: lastQrDataUrl,
        qrIssuedAt: lastQrAt,
        ready: false,
      });
    } catch (e) { console.error('[qr] dataUrl error', e.message); }
  });

  waClient.on('authenticated', async () => {
    console.log('[wa] authenticated');
    await setSession({ status: 'authenticated', ready: false });
  });

  waClient.on('auth_failure', async (m) => {
    console.error('[wa] auth_failure', m);
    await setSession({ status: 'auth_failure', error: String(m), ready: false });
  });

  waClient.on('ready', async () => {
    waReady = true;
    waInfo = waClient.info;
    console.log('[wa] READY as', waInfo?.wid?._serialized);
    lastQrDataUrl = null;
    await setSession({
      status: 'ready',
      ready: true,
      myJid: waInfo?.wid?._serialized || null,
      myPhone: jidToPhone(waInfo?.wid?._serialized),
      pushname: waInfo?.pushname || null,
      platform: waInfo?.platform || null,
      qrDataUrl: null,
      readyAt: new Date().toISOString(),
    });
  });

  waClient.on('disconnected', async (reason) => {
    waReady = false;
    waInfo = null;
    console.warn('[wa] disconnected:', reason);
    await setSession({ status: 'disconnected', ready: false, lastDisconnectReason: String(reason) });
    // Auto-restart after 5 s
    setTimeout(() => startWaClient().catch((e) => console.error('[wa] restart error', e)), 5000);
  });

  waClient.on('message', async (msg) => {
    if (msg.fromMe) return; // outbound echoes handled separately
    const notifyName = msg._data?.notifyName || '';
    const { phone, isNew } = await upsertContact(msg.from, notifyName);
    await persistMessage(msg, 'in');
    if (isNew && phone) {
      await autoCreateCrmLead({
        phone,
        displayName: notifyName,
        firstMessage: msg.body || (msg.hasMedia ? '[media attachment]' : ''),
      });
    }
  });

  waClient.on('message_create', async (msg) => {
    if (!msg.fromMe) return; // record outbound only here
    await upsertContact(msg.to, '');
    await persistMessage(msg, 'out');
  });

  waClient.on('message_ack', async (msg) => {
    try {
      // Update most-recent message with this ID
      const id = msg.id?._serialized || msg.id?.id;
      if (!id) return;
      const snap = await messagesCol.where('messageId', '==', id).limit(1).get();
      snap.forEach((d) => d.ref.set({ ack: msg.ack }, { merge: true }));
    } catch (e) { /* ignore */ }
  });

  await waClient.initialize();
}

// ─── Routes ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, ready: waReady, uptimeSec: Math.round(process.uptime()) });
});

app.get('/status', verifyHmac, (_req, res) => {
  res.json({
    ok: true,
    ready: waReady,
    myJid: waInfo?.wid?._serialized || null,
    pushname: waInfo?.pushname || null,
    platform: waInfo?.platform || null,
    qrDataUrl: waReady ? null : lastQrDataUrl,
    qrIssuedAt: lastQrAt,
  });
});

app.post('/restart', verifyHmac, async (req, res) => {
  try {
    if (waClient) {
      try { await waClient.destroy(); } catch {}
    }
    waReady = false;
    if (req.body?.purgeSession) {
      await fs.rm(SESSION_DIR, { recursive: true, force: true });
      console.log('[wa] session purged');
    }
    await startWaClient();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/send', verifyHmac, async (req, res) => {
  if (!waReady) return res.status(503).json({ ok: false, error: 'WA not ready' });
  const { phone, body, mediaBase64, mediaMime, caption } = req.body || {};
  const jid = phoneToJid(phone);
  if (!jid) return res.status(400).json({ ok: false, error: 'Invalid phone' });

  try {
    let sent;
    if (mediaBase64 && mediaMime) {
      const media = new MessageMedia(mediaMime, mediaBase64.replace(/^data:[^;]+;base64,/, ''));
      sent = await waClient.sendMessage(jid, media, { caption: caption || body || undefined });
    } else {
      sent = await waClient.sendMessage(jid, body || '');
    }
    res.json({ ok: true, messageId: sent?.id?._serialized || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Bulk: synchronous loop with strict rate limits + jittered delay
const dailyCounter = { date: '', count: 0 };
function todayKey() { return new Date().toISOString().slice(0, 10); }
function bumpDaily(n = 1) {
  if (dailyCounter.date !== todayKey()) { dailyCounter.date = todayKey(); dailyCounter.count = 0; }
  dailyCounter.count += n;
}
function dailyRemaining() {
  if (dailyCounter.date !== todayKey()) return RATE_PER_DAY;
  return Math.max(0, RATE_PER_DAY - dailyCounter.count);
}
function jitterDelay() {
  return DELAY_MIN + Math.floor(Math.random() * Math.max(1, DELAY_MAX - DELAY_MIN));
}

app.post('/bulk', verifyHmac, async (req, res) => {
  if (!waReady) return res.status(503).json({ ok: false, error: 'WA not ready' });
  const { campaignId, messages } = req.body || {};
  if (!campaignId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ ok: false, error: 'campaignId + messages[] required' });
  }
  const remaining = dailyRemaining();
  if (messages.length > remaining) {
    return res.status(429).json({
      ok: false,
      error: `Daily cap exceeded. Remaining today: ${remaining}/${RATE_PER_DAY}.`,
    });
  }

  // Respond immediately, run in background (campaign progress mirrored to Firestore)
  res.json({ ok: true, accepted: messages.length, willTakeMs: messages.length * (DELAY_MIN + DELAY_MAX) / 2 });

  (async () => {
    await campaignsCol.doc(campaignId).set({
      status: 'sending',
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      total: messages.length,
      sent: 0,
      failed: 0,
    }, { merge: true });

    let sent = 0, failed = 0, perMin = 0, minStart = Date.now();

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      // Per-minute rate limiter
      if (perMin >= RATE_PER_MIN) {
        const waitMs = Math.max(0, 60_000 - (Date.now() - minStart));
        await new Promise((r) => setTimeout(r, waitMs));
        perMin = 0; minStart = Date.now();
      }

      const jid = phoneToJid(m.phone);
      try {
        if (!jid) throw new Error('Invalid phone');
        let outMsg;
        if (m.mediaBase64 && m.mediaMime) {
          const media = new MessageMedia(m.mediaMime, m.mediaBase64.replace(/^data:[^;]+;base64,/, ''));
          outMsg = await waClient.sendMessage(jid, media, { caption: m.caption || m.body || undefined });
        } else {
          outMsg = await waClient.sendMessage(jid, m.body || '');
        }
        sent += 1;
        bumpDaily(1);
        perMin += 1;
        await campaignsCol.doc(campaignId).collection('recipients').doc(m.recipientId || `r-${i}`).set({
          phone: m.phone,
          name: m.name || '',
          status: 'sent',
          messageId: outMsg?.id?._serialized || null,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        failed += 1;
        await campaignsCol.doc(campaignId).collection('recipients').doc(m.recipientId || `r-${i}`).set({
          phone: m.phone,
          name: m.name || '',
          status: 'failed',
          error: e.message,
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      await campaignsCol.doc(campaignId).set({ sent, failed }, { merge: true });

      // Jittered human-like delay between sends
      if (i < messages.length - 1) {
        await new Promise((r) => setTimeout(r, jitterDelay()));
      }
    }

    await campaignsCol.doc(campaignId).set({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`[bulk] campaign ${campaignId} done — ${sent} sent / ${failed} failed`);
  })().catch((e) => console.error('[bulk] runner error', e));
});

// ─── Boot ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[bridge] listening on :${PORT}`);
  startWaClient().catch((e) => {
    console.error('[wa] startup error', e);
    process.exit(1);
  });
});

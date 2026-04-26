// ─── Client-side Firestore helpers for WhatsApp inbox ─────────────────
import {
  collection, doc, onSnapshot, orderBy, query, where, limit,
  updateDoc, setDoc, addDoc, deleteDoc, serverTimestamp, getDocs, getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { WaContact, WaMessage, WaSessionDoc, WaCampaign, WaTemplate } from "./whatsapp-types";

// ── Session ────────────────────────────────────────────────────────────
export function subscribeSession(cb: (s: WaSessionDoc | null) => void) {
  return onSnapshot(doc(db, "whatsappSessions", "default"), (snap) => {
    cb(snap.exists() ? (snap.data() as WaSessionDoc) : null);
  });
}

// ── Contacts (chat list) ───────────────────────────────────────────────
export function subscribeContacts(
  cb: (rows: WaContact[]) => void,
  opts: { assignedTo?: string | null } = {}
) {
  // Order by lastMessageAt desc, take 200
  const q = query(
    collection(db, "whatsappContacts"),
    orderBy("lastMessageAt", "desc"),
    limit(200)
  );
  return onSnapshot(q, (snap) => {
    let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WaContact));
    if (opts.assignedTo) {
      rows = rows.filter((c) => c.assignedTo === opts.assignedTo);
    }
    cb(rows);
  });
}

// ── Messages for a single contact thread ───────────────────────────────
// NOTE: We deliberately avoid orderBy() here so Firestore does not require a
// composite index (contactPhone ASC + timestamp ASC). Sorting is done client-
// side after the snapshot lands. Last 500 messages are loaded.
export function subscribeMessages(contactPhone: string, cb: (rows: WaMessage[]) => void) {
  const q = query(
    collection(db, "whatsappMessages"),
    where("contactPhone", "==", contactPhone),
    limit(500)
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WaMessage));
      rows.sort((a, b) => {
        const ta = typeof a.timestamp === "number" ? a.timestamp : Date.parse(String(a.timestamp || 0));
        const tb = typeof b.timestamp === "number" ? b.timestamp : Date.parse(String(b.timestamp || 0));
        return ta - tb;
      });
      cb(rows);
    },
    (err) => {
      console.error("[whatsapp] subscribeMessages error:", err);
      cb([]);
    }
  );
}

export async function markContactRead(phone: string) {
  await updateDoc(doc(db, "whatsappContacts", phone), { unreadCount: 0 });
}

export async function assignContact(
  phone: string,
  staffId: string | null,
  staffName: string | null
) {
  await updateDoc(doc(db, "whatsappContacts", phone), {
    assignedTo: staffId,
    assignedToName: staffName,
  });
}

// ── Campaigns ──────────────────────────────────────────────────────────
export function subscribeCampaigns(cb: (rows: WaCampaign[]) => void) {
  const q = query(
    collection(db, "whatsappCampaigns"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WaCampaign)));
  });
}

export async function createWaCampaign(input: {
  campaignId: string;
  name: string;
  body: string;
  total: number;
  createdBy: string;
}) {
  await setDoc(doc(db, "whatsappCampaigns", input.campaignId), {
    name: input.name,
    body: input.body,
    status: "queued",
    total: input.total,
    sent: 0,
    failed: 0,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  });
}

// Used by Staff dashboards to load list of admin/staff for assignment dropdown
export async function listAssignableUsers() {
  const snap = await getDocs(query(
    collection(db, "users"),
    where("role", "in", ["admin", "staff", "manager"])
  ));
  return snap.docs.map((d) => {
    const u = d.data();
    return { id: d.id, name: u.name || u.email, role: u.role as string };
  });
}

// ── Quick-reply templates ──────────────────────────────────────────────
export function subscribeTemplates(cb: (rows: WaTemplate[]) => void) {
  const q = query(collection(db, "whatsappTemplates"), orderBy("title", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WaTemplate)));
  });
}

export async function createTemplate(input: {
  title: string;
  body: string;
  category?: string;
  createdBy: string;
}) {
  await addDoc(collection(db, "whatsappTemplates"), {
    title: input.title.trim(),
    body: input.body.trim(),
    category: input.category?.trim() || "",
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTemplate(id: string, patch: { title: string; body: string; category?: string }) {
  await updateDoc(doc(db, "whatsappTemplates", id), {
    title: patch.title.trim(),
    body: patch.body.trim(),
    category: patch.category?.trim() || "",
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTemplate(id: string) {
  await deleteDoc(doc(db, "whatsappTemplates", id));
}

/** Replace {{name}} (case-insensitive, with surrounding whitespace) with a safe value. */
export function applyTemplateTokens(body: string, ctx: { name?: string }) {
  const safe = (ctx.name || "there").trim() || "there";
  return body.replace(/\{\{\s*name\s*\}\}/gi, safe);
}

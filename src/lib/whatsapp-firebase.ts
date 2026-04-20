// ─── Client-side Firestore helpers for WhatsApp inbox ─────────────────
import {
  collection, doc, onSnapshot, orderBy, query, where, limit,
  updateDoc, setDoc, addDoc, deleteDoc, serverTimestamp, getDocs,
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
export function subscribeMessages(contactPhone: string, cb: (rows: WaMessage[]) => void) {
  const q = query(
    collection(db, "whatsappMessages"),
    where("contactPhone", "==", contactPhone),
    orderBy("timestamp", "asc"),
    limit(500)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WaMessage)));
  });
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

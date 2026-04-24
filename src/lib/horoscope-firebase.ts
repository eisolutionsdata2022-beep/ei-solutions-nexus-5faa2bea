/**
 * Horoscope Firestore helpers — collections: horoscopeRequests, horoscopeSettings/global.
 */
import {
  collection, doc, addDoc, updateDoc, onSnapshot, query, where,
  orderBy, getDoc, getDocs, setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { HoroscopeRequest, HoroscopeSettings } from "./horoscope-types";
import { DEFAULT_SETTINGS } from "./horoscope-types";

// ── Settings ──
export async function getHoroscopeSettings(): Promise<HoroscopeSettings> {
  const snap = await getDoc(doc(db, "horoscopeSettings", "global"));
  if (!snap.exists()) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(snap.data() as HoroscopeSettings) };
}

export async function updateHoroscopeSettings(patch: Partial<HoroscopeSettings>) {
  await setDoc(doc(db, "horoscopeSettings", "global"), patch, { merge: true });
}

export function subscribeHoroscopeSettings(cb: (s: HoroscopeSettings) => void) {
  return onSnapshot(doc(db, "horoscopeSettings", "global"), (snap) => {
    cb(snap.exists() ? { ...DEFAULT_SETTINGS, ...(snap.data() as HoroscopeSettings) } : DEFAULT_SETTINGS);
  });
}

// ── Requests ──
export async function addHoroscopeRequest(req: Omit<HoroscopeRequest, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "horoscopeRequests"), req);
  return ref.id;
}

export async function updateHoroscopeRequest(id: string, patch: Partial<HoroscopeRequest>) {
  await updateDoc(doc(db, "horoscopeRequests", id), {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export async function getHoroscopeRequest(id: string): Promise<HoroscopeRequest | null> {
  const snap = await getDoc(doc(db, "horoscopeRequests", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<HoroscopeRequest, "id">) };
}

export function subscribeHoroscopeRequests(
  cb: (rows: HoroscopeRequest[]) => void,
  userId?: string,
) {
  // When filtered by user we sort client-side to avoid a composite index requirement.
  const q = userId
    ? query(collection(db, "horoscopeRequests"), where("userId", "==", userId))
    : query(collection(db, "horoscopeRequests"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HoroscopeRequest, "id">) }));
    if (userId) rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    cb(rows);
  });
}

export async function getHoroscopeStats(userId?: string) {
  const ref = collection(db, "horoscopeRequests");
  const q = userId ? query(ref, where("userId", "==", userId)) : query(ref);
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => d.data() as HoroscopeRequest);
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === "Pending").length,
    generated: rows.filter((r) => r.status !== "Pending").length,
    revenue: rows.reduce((s, r) => s + (r.amount || 0), 0),
  };
}
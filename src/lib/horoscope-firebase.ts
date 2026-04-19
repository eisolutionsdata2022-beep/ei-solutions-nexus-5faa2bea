import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, where, getDocs, getDoc, setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { HoroscopeRequest, HoroscopeSettings } from "./horoscope-types";
import { DEFAULT_SETTINGS } from "./horoscope-types";

// ─── Settings ───
export async function getHoroscopeSettings(): Promise<HoroscopeSettings> {
  const docRef = doc(db, "horoscopeSettings", "global");
  const snap = await getDoc(docRef);
  if (!snap.exists()) return DEFAULT_SETTINGS;
  return snap.data() as HoroscopeSettings;
}

export async function updateHoroscopeSettings(settings: Partial<HoroscopeSettings>) {
  const docRef = doc(db, "horoscopeSettings", "global");
  await setDoc(docRef, settings, { merge: true });
}

export function subscribeHoroscopeSettings(callback: (s: HoroscopeSettings) => void) {
  return onSnapshot(doc(db, "horoscopeSettings", "global"), (snap) => {
    callback(snap.exists() ? (snap.data() as HoroscopeSettings) : DEFAULT_SETTINGS);
  });
}

// ─── Requests ───
export function subscribeHoroscopeRequests(
  callback: (reqs: HoroscopeRequest[]) => void,
  userId?: string
) {
  // NOTE: when filtering by userId we deliberately skip server-side orderBy
  // to avoid requiring a composite Firestore index. Sort client-side instead.
  const q = userId
    ? query(collection(db, "horoscopeRequests"), where("userId", "==", userId))
    : query(collection(db, "horoscopeRequests"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as HoroscopeRequest));
    if (userId) {
      rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    }
    callback(rows);
  });
}

export async function addHoroscopeRequest(req: Omit<HoroscopeRequest, "id">) {
  return addDoc(collection(db, "horoscopeRequests"), req);
}

export async function updateHoroscopeRequest(id: string, data: Partial<HoroscopeRequest>) {
  return updateDoc(doc(db, "horoscopeRequests", id), { ...data, updatedAt: new Date().toISOString() });
}

export async function getHoroscopeStats(userId?: string) {
  const ref = collection(db, "horoscopeRequests");
  const q = userId ? query(ref, where("userId", "==", userId)) : query(ref);
  const snap = await getDocs(q);
  const reqs = snap.docs.map((d) => d.data() as HoroscopeRequest);

  return {
    total: reqs.length,
    pending: reqs.filter((r) => r.status === "Pending").length,
    processing: reqs.filter((r) => r.status === "Processing").length,
    generated: reqs.filter((r) => r.status === "Generated").length,
    delivered: reqs.filter((r) => r.status === "Delivered").length,
    totalRevenue: reqs.reduce((sum, r) => sum + (r.amount || 0), 0),
  };
}

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, getDocs, getDoc, setDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type { MatrimonyProfile, MatrimonyRequest, MatrimonyPricing } from "./matrimony-types";
import { DEFAULT_PRICING } from "./matrimony-types";

// ─── Profiles ───
export function subscribeMatrimonyProfiles(
  callback: (profiles: MatrimonyProfile[]) => void,
  franchiseId?: string
) {
  const q = franchiseId
    ? query(collection(db, "matrimonyProfiles"), where("franchiseId", "==", franchiseId), orderBy("createdAt", "desc"))
    : query(collection(db, "matrimonyProfiles"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatrimonyProfile)));
  });
}

export async function addMatrimonyProfile(profile: Omit<MatrimonyProfile, "id">) {
  return addDoc(collection(db, "matrimonyProfiles"), profile);
}

export async function updateMatrimonyProfile(id: string, data: Partial<MatrimonyProfile>) {
  return updateDoc(doc(db, "matrimonyProfiles", id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteMatrimonyProfile(id: string) {
  return deleteDoc(doc(db, "matrimonyProfiles", id));
}

export async function uploadProfilePhoto(file: File, profileId: string): Promise<string> {
  const path = `matrimony-photos/${profileId}_${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// ─── Requests ───
export function subscribeMatrimonyRequests(
  callback: (requests: MatrimonyRequest[]) => void,
  profileIds?: string[]
) {
  const q = query(collection(db, "matrimonyRequests"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    let requests = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatrimonyRequest));
    if (profileIds && profileIds.length > 0) {
      requests = requests.filter(r => profileIds.includes(r.profileId));
    }
    callback(requests);
  });
}

export async function addMatrimonyRequest(request: Omit<MatrimonyRequest, "id">) {
  return addDoc(collection(db, "matrimonyRequests"), request);
}

// ─── Pricing ───
export async function getMatrimonyPricing(): Promise<MatrimonyPricing> {
  const docRef = doc(db, "settings", "matrimonyPricing");
  const snap = await getDoc(docRef);
  if (snap.exists()) return snap.data() as MatrimonyPricing;
  return DEFAULT_PRICING;
}

export async function saveMatrimonyPricing(pricing: MatrimonyPricing) {
  return setDoc(doc(db, "settings", "matrimonyPricing"), pricing);
}

// ─── Demo Profiles ───
export async function deleteDemoProfiles() {
  const q = query(collection(db, "matrimonyProfiles"), where("isDemo", "==", true));
  const snap = await getDocs(q);
  const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletePromises);
  return snap.size;
}

export async function getDemoProfileCount(): Promise<number> {
  const q = query(collection(db, "matrimonyProfiles"), where("isDemo", "==", true));
  const snap = await getDocs(q);
  return snap.size;
}

/**
 * Profile editing utilities — name/address/photo/password updates with audit log.
 * Edits are logged to userEdits/{uid}/log/{autoId} for admin review.
 */
import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, db, storage } from "./firebase";

export interface UserEditLog {
  id: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

async function logEdit(uid: string, field: string, oldValue: any, newValue: any) {
  await addDoc(collection(db, "userEdits", uid, "log"), {
    field,
    oldValue: oldValue ?? "",
    newValue: newValue ?? "",
    timestamp: new Date().toISOString(),
  });
}

export async function updateProfileName(uid: string, oldName: string, name: string) {
  await updateDoc(doc(db, "users", uid), { name });
  await logEdit(uid, "name", oldName, name);
}

export async function updateProfileAddress(uid: string, oldAddr: string, address: string) {
  await updateDoc(doc(db, "users", uid), { address });
  await logEdit(uid, "address", oldAddr, address);
}

export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const r = storageRef(storage, `profilePhotos/${uid}.${ext}`);
  await uploadBytes(r, file);
  const url = await getDownloadURL(r);
  await updateDoc(doc(db, "users", uid), { photoURL: url });
  await logEdit(uid, "photoURL", "", url);
  return url;
}

export async function changeUserPassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("Not signed in");
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
  await logEdit(user.uid, "password", "", "***changed***");
}

export async function getEditHistory(uid: string): Promise<UserEditLog[]> {
  const q = query(collection(db, "userEdits", uid, "log"), orderBy("timestamp", "desc"));
  const snap = await getDocs(q);
  const out: UserEditLog[] = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() } as UserEditLog));
  return out;
}

export async function recordLoginActivity(uid: string) {
  await addDoc(collection(db, "userLogins", uid, "log"), {
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : "",
  });
  await updateDoc(doc(db, "users", uid), { lastLoginAt: new Date().toISOString() }).catch(() => {});
}

export async function getRecentLogins(uid: string, max = 20): Promise<{ id: string; timestamp: string }[]> {
  const q = query(collection(db, "userLogins", uid, "log"), orderBy("timestamp", "desc"));
  const snap = await getDocs(q);
  const out: { id: string; timestamp: string }[] = [];
  snap.forEach((d) => out.push({ id: d.id, ...(d.data() as any) }));
  return out.slice(0, max);
}

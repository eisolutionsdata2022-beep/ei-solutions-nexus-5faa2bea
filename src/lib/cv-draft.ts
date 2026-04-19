/**
 * CV Builder draft persistence — saves form state per-user in Firestore.
 * Allows users to leave the wizard and resume later.
 */
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { CVData, TemplateCustomization } from "./cv-template-engine";

export interface CVDraft {
  templateId: string;
  data: CVData;
  customization: TemplateCustomization;
  sectionOrder: string[];
  updatedAt?: any;
}

export async function saveCVDraft(uid: string, draft: CVDraft) {
  await setDoc(doc(db, "cvDrafts", uid), {
    ...draft,
    updatedAt: serverTimestamp(),
  });
}

export async function loadCVDraft(uid: string): Promise<CVDraft | null> {
  const snap = await getDoc(doc(db, "cvDrafts", uid));
  if (!snap.exists()) return null;
  return snap.data() as CVDraft;
}

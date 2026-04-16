import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export interface JobRatingDoc {
  id: string;
  jobId: string;
  jobTitle: string;
  workerId: string;
  workerName: string;
  uploaderId: string;
  uploaderName: string;
  rating: number; // 1..5
  review: string;
  createdAt: string;
}

export async function submitRating(input: Omit<JobRatingDoc, "id" | "createdAt">) {
  if (input.rating < 1 || input.rating > 5) throw new Error("Rating must be 1-5");
  // Save the rating
  await addDoc(collection(db, "jobRatings"), {
    ...input,
    createdAt: new Date().toISOString(),
  });
  // Recompute aggregate on worker profile
  await recomputeWorkerRating(input.workerId);
}

export async function recomputeWorkerRating(workerId: string) {
  const snap = await getDocs(
    query(collection(db, "jobRatings"), where("workerId", "==", workerId))
  );
  let total = 0;
  let count = 0;
  snap.forEach((d) => {
    const data = d.data() as JobRatingDoc;
    total += Number(data.rating) || 0;
    count += 1;
  });
  const avg = count > 0 ? Number((total / count).toFixed(2)) : 0;
  await setDoc(
    doc(db, "users", workerId),
    { ratingAvg: avg, ratingCount: count },
    { merge: true }
  );
  return { avg, count };
}

export async function getRatingForJob(jobId: string): Promise<JobRatingDoc | null> {
  const snap = await getDocs(
    query(collection(db, "jobRatings"), where("jobId", "==", jobId))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as any) };
}

export async function getWorkerRatings(workerId: string): Promise<JobRatingDoc[]> {
  const snap = await getDocs(
    query(collection(db, "jobRatings"), where("workerId", "==", workerId))
  );
  const list: JobRatingDoc[] = [];
  snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return list;
}

export async function getWorkerProfile(workerId: string) {
  const snap = await getDoc(doc(db, "users", workerId));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...(snap.data() as any) };
}

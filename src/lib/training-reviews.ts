import { collection, addDoc, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface TrainingReview {
  id: string;
  trainingId: string;
  trainingTitle: string;
  trainerId: string;
  trainerName: string;
  retailerId: string;
  retailerName: string;
  rating: number; // 1-5
  comments: string;
  createdAt: string;
}

export async function submitReview(input: Omit<TrainingReview, "id" | "createdAt">): Promise<string> {
  // prevent duplicate per (trainingId, retailerId)
  const existing = await getDocs(
    query(
      collection(db, "trainingReviews"),
      where("trainingId", "==", input.trainingId),
      where("retailerId", "==", input.retailerId)
    )
  );
  if (!existing.empty) {
    throw new Error("You have already reviewed this session.");
  }
  const ref = await addDoc(collection(db, "trainingReviews"), {
    ...input,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function getReviewByRetailer(trainingId: string, retailerId: string): Promise<TrainingReview | null> {
  const snap = await getDocs(
    query(
      collection(db, "trainingReviews"),
      where("trainingId", "==", trainingId),
      where("retailerId", "==", retailerId)
    )
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as any) };
}

export async function listAllReviews(): Promise<TrainingReview[]> {
  const snap = await getDocs(collection(db, "trainingReviews"));
  const list: TrainingReview[] = [];
  snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list;
}

export async function listReviewsForTrainer(trainerId: string): Promise<TrainingReview[]> {
  const snap = await getDocs(query(collection(db, "trainingReviews"), where("trainerId", "==", trainerId)));
  const list: TrainingReview[] = [];
  snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list;
}

export function avgRating(reviews: TrainingReview[]): number {
  if (reviews.length === 0) return 0;
  return Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
}

export async function getTrainingMeta(trainingId: string): Promise<{ title: string; trainerId: string; trainerName: string } | null> {
  const snap = await getDoc(doc(db, "trainings", trainingId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    title: d.title || "Training",
    trainerId: d.trainerId || "",
    trainerName: d.trainerName || "Trainer",
  };
}

import { collection, addDoc, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type QualityLevel = "good" | "medium" | "poor";

export interface SessionQualitySample {
  id: string;
  trainingId: string;
  trainingTitle?: string;
  hostId: string;        // trainer id
  hostName?: string;
  viewerId: string;      // retailer / student uid
  viewerName?: string;
  viewerRole?: string;
  rtt: number;           // ms
  jitter: number;        // ms
  loss: number;          // %
  quality: QualityLevel;
  reason: "interval" | "change";
  createdAt: string;     // ISO
}

export type LogQualityInput = Omit<SessionQualitySample, "id" | "createdAt">;

/**
 * Append a single quality sample. Designed to be safe to fire-and-forget
 * from the WebRTC viewer tile — never throws.
 */
export async function logSessionQualitySample(input: LogQualityInput): Promise<void> {
  try {
    await addDoc(collection(db, "sessionQualityLogs"), {
      ...input,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("logSessionQualitySample failed", err);
  }
}

/** All samples for a training, oldest → newest. */
export async function getQualityLogsForTraining(trainingId: string): Promise<SessionQualitySample[]> {
  const snap = await getDocs(
    query(collection(db, "sessionQualityLogs"), where("trainingId", "==", trainingId))
  );
  const list: SessionQualitySample[] = [];
  snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
  list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return list;
}

/** Recent samples across all sessions (admin overview). */
export async function getRecentQualityLogs(max = 500): Promise<SessionQualitySample[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "sessionQualityLogs"), orderBy("createdAt", "desc"), limit(max))
    );
    const list: SessionQualitySample[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
    return list;
  } catch {
    // Fallback if index missing: client-side sort
    const snap = await getDocs(collection(db, "sessionQualityLogs"));
    const list: SessionQualitySample[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list.slice(0, max);
  }
}

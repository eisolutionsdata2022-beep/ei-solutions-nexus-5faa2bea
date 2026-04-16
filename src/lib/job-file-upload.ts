import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "@/lib/firebase";

export interface UploadedJobFile {
  url: string;
  name: string;
  contentType: string;
  size: number;
}

const MAX_ATTEMPTS = 3;

function sanitize(value: string, fallback: string) {
  const s = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return s || fallback;
}

async function refreshAuth() {
  const u = auth.currentUser;
  if (!u) return;
  try { await u.getIdToken(true); } catch (e) { console.warn("[job-upload] token refresh:", e); }
}

export async function uploadJobFiles({
  jobId,
  userId,
  kind,
  files,
}: {
  jobId: string;
  userId: string;
  kind: "doc-upload" | "submission";
  files: File[];
}): Promise<UploadedJobFile[]> {
  if (files.length === 0) return [];
  await refreshAuth();
  const out: UploadedJobFile[] = [];

  for (const [i, file] of files.entries()) {
    const path = [
      "jobFiles",
      sanitize(jobId, "job"),
      kind,
      `${Date.now()}-${i}-${sanitize(userId, "user")}-${sanitize(file.name, "file")}`,
    ].join("/");

    let lastErr: any;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const r = ref(storage, path);
        const snap = await uploadBytes(r, file, {
          contentType: file.type || "application/octet-stream",
          customMetadata: { originalFileName: file.name },
        });
        const url = await getDownloadURL(snap.ref);
        out.push({ url, name: file.name, contentType: file.type, size: file.size });
        break;
      } catch (e: any) {
        lastErr = e;
        if (e?.code === "storage/unauthorized" || e?.code === "storage/canceled") break;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, attempt * 1500));
          await refreshAuth();
        }
      }
    }
    if (out.length <= i) throw new Error(lastErr?.message || `Upload failed: ${file.name}`);
  }
  return out;
}

export function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$)/i.test(url);
}

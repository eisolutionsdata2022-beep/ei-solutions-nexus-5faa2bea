import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "@/lib/firebase";

interface ServiceDocumentInput {
  name: string;
  file: File | null;
}

interface UploadedServiceDocument {
  name: string;
  url: string;
  fileName: string;
}

const MAX_UPLOAD_ATTEMPTS = 3;

function sanitizeSegment(value: string, fallback: string) {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return sanitized || fallback;
}

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim();
  const lastDotIndex = trimmed.lastIndexOf(".");
  if (lastDotIndex <= 0) return sanitizeSegment(trimmed, "document");
  const baseName = sanitizeSegment(trimmed.slice(0, lastDotIndex), "document");
  const extension = sanitizeSegment(trimmed.slice(lastDotIndex + 1), "file");
  return `${baseName}.${extension}`;
}

async function ensureStorageAuthReady() {
  const currentUser = auth.currentUser;
  if (!currentUser) return;
  try {
    await currentUser.getIdToken(true);
  } catch (error) {
    console.warn("[E-dis] Failed to refresh auth token:", error);
  }
}

async function uploadSingleDocument(storagePath: string, file: File, label: string) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
    try {
      console.log(`[E-dis] Upload attempt ${attempt}/${MAX_UPLOAD_ATTEMPTS} for ${label} (${file.size} bytes)`);
      
      const storageRef = ref(storage, storagePath);
      
      // Use simple uploadBytes (single PUT) instead of resumable upload
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || "application/octet-stream",
        customMetadata: { originalFileName: file.name },
      });

      console.log(`[E-dis] Upload complete for ${label}, getting download URL...`);
      const url = await getDownloadURL(snapshot.ref);
      console.log(`[E-dis] Got download URL for ${label}`);
      return url;
    } catch (error: any) {
      lastError = error;
      console.error(`[E-dis] Upload attempt ${attempt} failed for ${label}:`, error?.code, error?.message);

      // Don't retry permission errors
      if (error?.code === "storage/unauthorized" || error?.code === "storage/canceled") {
        break;
      }

      if (attempt < MAX_UPLOAD_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        // Refresh auth token before retry
        await ensureStorageAuthReady();
      }
    }
  }

  const msg = lastError instanceof Error ? lastError.message : `${label} upload failed.`;
  throw new Error(msg);
}

export async function uploadServiceDocuments({
  appNo,
  documents,
  userId,
}: {
  appNo: string;
  documents: ServiceDocumentInput[];
  userId: string;
}): Promise<UploadedServiceDocument[]> {
  const docsToUpload = documents.filter((doc) => doc.file);
  if (docsToUpload.length === 0) return [];

  await ensureStorageAuthReady();

  const uploadedDocs: UploadedServiceDocument[] = [];

  for (const [index, docItem] of docsToUpload.entries()) {
    const file = docItem.file;
    if (!file) continue;

    const storagePath = [
      "serviceDocuments",
      sanitizeSegment(userId, "user"),
      sanitizeSegment(appNo, "application"),
      `${index + 1}-${sanitizeSegment(docItem.name, "document")}-${sanitizeFileName(file.name)}`,
    ].join("/");

    console.log(`[E-dis] Uploading document ${index + 1}/${docsToUpload.length}: ${docItem.name} (${file.size} bytes)`);

    const url = await uploadSingleDocument(storagePath, file, docItem.name);

    uploadedDocs.push({
      name: docItem.name,
      url,
      fileName: file.name,
    });

    console.log(`[E-dis] Document ${index + 1}/${docsToUpload.length} uploaded successfully`);
  }

  return uploadedDocs;
}

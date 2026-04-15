import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface ServiceDocumentInput {
  name: string;
  file: File | null;
}

interface UploadedServiceDocument {
  name: string;
  url: string;
  fileName: string;
}

const UPLOAD_TIMEOUT_MS = 120_000;

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

  if (lastDotIndex <= 0) {
    return sanitizeSegment(trimmed, "document");
  }

  const baseName = sanitizeSegment(trimmed.slice(0, lastDotIndex), "document");
  const extension = sanitizeSegment(trimmed.slice(lastDotIndex + 1), "file");

  return `${baseName}.${extension}`;
}

function withTimeout<T>(promise: Promise<T>, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label} upload timed out. Please try again with a smaller file or a better network.`));
    }, UPLOAD_TIMEOUT_MS);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function toFriendlyUploadError(error: unknown, label: string) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const message = typeof error === "object" && error && "message" in error ? String(error.message) : "";

  if (code === "storage/unauthorized") {
    return new Error(`${label} upload permission denied. Please check Firebase Storage rules.`);
  }

  if (code === "storage/canceled") {
    return new Error(`${label} upload was cancelled.`);
  }

  if (code === "storage/retry-limit-exceeded") {
    return new Error(`${label} upload failed after multiple retries. Please try again.`);
  }

  return new Error(message || `${label} upload failed.`);
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

  if (docsToUpload.length === 0) {
    return [];
  }

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

    try {
      console.log(`[E-dis] Uploading document ${index + 1}/${docsToUpload.length}:`, {
        name: docItem.name,
        fileName: file.name,
        size: file.size,
        type: file.type,
      });

      const storageRef = ref(storage, storagePath);
      await withTimeout(uploadBytes(storageRef, file), docItem.name);
      const url = await withTimeout(getDownloadURL(storageRef), docItem.name);

      uploadedDocs.push({
        name: docItem.name,
        url,
        fileName: file.name,
      });

      console.log(`[E-dis] Uploaded document ${index + 1}/${docsToUpload.length}:`, docItem.name);
    } catch (error) {
      console.error("[E-dis] Document upload failed:", {
        name: docItem.name,
        fileName: file.name,
        storagePath,
        error,
      });
      throw toFriendlyUploadError(error, docItem.name);
    }
  }

  return uploadedDocs;
}
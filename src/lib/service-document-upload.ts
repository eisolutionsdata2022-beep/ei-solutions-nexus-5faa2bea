import { getDownloadURL, ref, uploadBytesResumable, type UploadTask } from "firebase/storage";
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

const UPLOAD_TIMEOUT_MS = 300_000;
const UPLOAD_STALL_MS = 45_000;
const DOWNLOAD_URL_TIMEOUT_MS = 30_000;
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

  if (lastDotIndex <= 0) {
    return sanitizeSegment(trimmed, "document");
  }

  const baseName = sanitizeSegment(trimmed.slice(0, lastDotIndex), "document");
  const extension = sanitizeSegment(trimmed.slice(lastDotIndex + 1), "file");

  return `${baseName}.${extension}`;
}

function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs = UPLOAD_TIMEOUT_MS) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

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

function waitForTaskCompletion(task: UploadTask, label: string) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    let overallTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (stallTimer) clearTimeout(stallTimer);
      if (overallTimer) clearTimeout(overallTimer);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimers();
      try {
        task.cancel();
      } catch {
        // no-op
      }
      reject(error);
    };

    const resetStallTimer = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        fail(new Error(`${label} upload timed out. Firebase Storage did not respond in time.`));
      }, UPLOAD_STALL_MS);
    };

    overallTimer = setTimeout(() => {
      fail(new Error(`${label} upload timed out. Please try again with a smaller file or a better network.`));
    }, UPLOAD_TIMEOUT_MS);

    resetStallTimer();

    task.on(
      "state_changed",
      () => {
        resetStallTimer();
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimers();
        reject(error);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimers();
        resolve();
      }
    );
  });
}

function isRetryableUploadError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const message = typeof error === "object" && error && "message" in error ? String(error.message).toLowerCase() : "";

  if (code === "storage/unauthorized" || code === "storage/canceled") {
    return false;
  }

  return (
    !code ||
    code === "storage/unknown" ||
    code === "storage/retry-limit-exceeded" ||
    code === "storage/quota-exceeded" ||
    code === "storage/cannot-slice-blob" ||
    message.includes("timed out") ||
    message.includes("network")
  );
}

async function ensureStorageAuthReady() {
  const currentUser = auth.currentUser;

  if (!currentUser) return;

  try {
    await withTimeout(
      currentUser.getIdToken(),
      "Authentication timed out while preparing the upload. Please sign in again and retry.",
      15_000
    );
  } catch (error) {
    console.warn("[E-dis] Failed to warm Firebase auth token before upload:", error);
  }
}

async function uploadSingleDocument(storagePath: string, file: File, label: string) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || undefined,
        customMetadata: {
          originalFileName: file.name,
        },
      });

      await waitForTaskCompletion(uploadTask, label);

      return await withTimeout(
        getDownloadURL(storageRef),
        `${label} upload finished, but the file link could not be generated in time. Please retry.`,
        DOWNLOAD_URL_TIMEOUT_MS
      );
    } catch (error) {
      lastError = error;

      if (attempt >= MAX_UPLOAD_ATTEMPTS || !isRetryableUploadError(error)) {
        break;
      }

      console.warn(`[E-dis] Retrying document upload (${attempt}/${MAX_UPLOAD_ATTEMPTS}) for ${label}:`, error);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  throw toFriendlyUploadError(lastError, label);
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

    try {
      console.log(`[E-dis] Uploading document ${index + 1}/${docsToUpload.length}:`, {
        name: docItem.name,
        fileName: file.name,
        size: file.size,
        type: file.type,
      });

      const url = await uploadSingleDocument(storagePath, file, docItem.name);

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
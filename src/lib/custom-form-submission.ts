import { addDoc, collection } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { AppUser } from "@/lib/auth-context";
import type { CustomForm } from "@/lib/custom-forms";
import { auth, db, storage } from "@/lib/firebase";

const FILE_UPLOAD_TIMEOUT_MS = 60000;
const DOWNLOAD_URL_TIMEOUT_MS = 15000;
const SUBMISSION_TIMEOUT_MS = 30000;

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
    console.warn("[Custom Forms] Failed to refresh auth token:", error);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function uploadFormFiles(userId: string, fileInputs: Record<string, File | null>) {
  await ensureStorageAuthReady();

  const uploadedFiles: { fieldId: string; fileName: string; url: string }[] = [];

  for (const [fieldId, file] of Object.entries(fileInputs)) {
    if (!file) continue;

    const storagePath = [
      "customFormUploads",
      sanitizeSegment(userId, "user"),
      `${Date.now()}-${sanitizeSegment(fieldId, "field")}-${sanitizeFileName(file.name)}`,
    ].join("/");

    try {
      const storageRef = ref(storage, storagePath);
      const snapshot = await withTimeout(
        uploadBytes(storageRef, file, {
          contentType: file.type || "application/octet-stream",
          customMetadata: {
            originalFileName: file.name,
            fieldId,
          },
        }),
        FILE_UPLOAD_TIMEOUT_MS,
        `File \"${file.name}\" upload timed out.`,
      );

      const url = await withTimeout(
        getDownloadURL(snapshot.ref),
        DOWNLOAD_URL_TIMEOUT_MS,
        `File \"${file.name}\" URL generation timed out.`,
      );

      uploadedFiles.push({ fieldId, fileName: file.name, url });
    } catch (error: any) {
      console.error("[Custom Forms] File upload failed:", error);

      if (error?.code === "storage/unauthorized") {
        throw new Error(`File \"${file.name}\" upload permission denied.`);
      }

      if (error?.code === "storage/canceled") {
        throw new Error(`File \"${file.name}\" upload was canceled.`);
      }

      throw new Error(error?.message || `File \"${file.name}\" upload failed.`);
    }
  }

  return uploadedFiles;
}

export async function createCustomFormSubmission({
  appUser,
  form,
  formData,
  fileInputs,
}: {
  appUser: AppUser;
  form: CustomForm;
  formData: Record<string, string>;
  fileInputs: Record<string, File | null>;
}) {
  const fileUrls = await uploadFormFiles(appUser.uid, fileInputs);
  const now = new Date().toISOString();

  await withTimeout(
    addDoc(collection(db, "formSubmissions"), {
      formId: form.id,
      formTitle: form.title,
      userId: appUser.uid,
      userEmail: appUser.email || "",
      userName: appUser.name || appUser.email || "",
      userPhone: appUser.phone || "",
      data: formData,
      fileUrls,
      status: "Pending",
      applicationNo: "",
      staffRemark: "",
      reviewedBy: "",
      reviewedAt: "",
      createdAt: now,
    }),
    SUBMISSION_TIMEOUT_MS,
    "Form submission timed out. Please try again.",
  );
}

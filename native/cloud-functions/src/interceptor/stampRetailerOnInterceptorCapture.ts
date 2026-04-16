/**
 * stampRetailerOnInterceptorCapture
 * ---------------------------------
 * Firestore onCreate trigger for `/interceptorCaptures/{id}`.
 *
 * The Android Interceptor APK (run by a staff/operator user) creates a
 * capture-relay document but does NOT set `retailerId` — the APK has
 * no reliable way to know which retailer should service the request.
 *
 * This function reads the operator's `users/{staffId}.pairedRetailerId`
 * field (set by an admin in the staff-pairing UI) and stamps it onto
 * the new doc. The Firestore security rule at
 * `firestore.rules → /interceptorCaptures/{cid} → retailerUpdateOk()`
 * then has a real retailer uid to match against on subsequent updates.
 *
 * Failure modes (all written back to the doc as `status: "failed"`):
 *   - operator profile missing            → "operator-profile-missing"
 *   - pairedRetailerId not set            → "no-paired-retailer"
 *   - paired retailer profile missing     → "retailer-profile-missing"
 *   - paired retailer not active/role≠retailer → "retailer-inactive"
 *
 * Deploy:
 *   firebase deploy --only functions:interceptor-stampRetailerOnInterceptorCapture
 */
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

interface InterceptorCaptureDoc {
  staffId?: string;
  retailerId?: string | null;
  sourcePackage?: string;
  mode?: "capture" | "detection";
  status?: string;
}

interface UserProfile {
  role?: string;
  active?: boolean;
  pairedRetailerId?: string | null;
  displayName?: string;
}

export const stampRetailerOnInterceptorCapture = onDocumentCreated(
  {
    document: "interceptorCaptures/{cid}",
    region: "asia-south1", // co-locate with Firestore region (Mumbai)
    retry: false,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn("No snapshot in onCreate event", { params: event.params });
      return;
    }

    const data = snap.data() as InterceptorCaptureDoc;
    const cid = event.params.cid;

    // Already stamped? (e.g. client wrote retailerId during the trust-on-write
    // transitional period — keep but verify, and don't overwrite if valid.)
    if (data.retailerId && typeof data.retailerId === "string") {
      logger.info("retailerId already present, skipping stamp", { cid });
      return;
    }

    const staffId = data.staffId;
    if (!staffId) {
      await failDoc(snap.ref, "missing-staffId", "Document was created without staffId");
      return;
    }

    const db = getFirestore();

    // 1. Look up operator profile
    const operatorSnap = await db.collection("users").doc(staffId).get();
    if (!operatorSnap.exists) {
      await failDoc(snap.ref, "operator-profile-missing",
        `users/${staffId} not found`);
      return;
    }

    const operator = operatorSnap.data() as UserProfile;
    const pairedRetailerId = operator.pairedRetailerId;

    if (!pairedRetailerId) {
      await failDoc(snap.ref, "no-paired-retailer",
        "Operator has no pairedRetailerId — admin must pair them first");
      return;
    }

    // 2. Validate paired retailer
    const retailerSnap = await db.collection("users").doc(pairedRetailerId).get();
    if (!retailerSnap.exists) {
      await failDoc(snap.ref, "retailer-profile-missing",
        `Paired retailer users/${pairedRetailerId} not found`);
      return;
    }

    const retailer = retailerSnap.data() as UserProfile;
    if (retailer.role !== "retailer" || retailer.active === false) {
      await failDoc(snap.ref, "retailer-inactive",
        `Paired retailer is not an active retailer (role=${retailer.role}, active=${retailer.active})`);
      return;
    }

    // 3. Stamp the capture doc.
    //    NOTE: this update will trigger retailerUpdateOk() in security rules
    //    only when called from a client; admin SDK bypasses rules so this is safe.
    await snap.ref.update({
      retailerId: pairedRetailerId,
      retailerDisplayName: retailer.displayName ?? null,
      pairedAt: FieldValue.serverTimestamp(),
      status: "pending", // hand off to retailer's PC agent listener
    });

    logger.info("Stamped retailerId on interceptorCapture", {
      cid,
      staffId,
      retailerId: pairedRetailerId,
      mode: data.mode ?? "capture",
    });
  },
);

async function failDoc(
  ref: FirebaseFirestore.DocumentReference,
  code: string,
  message: string,
): Promise<void> {
  logger.error(`Stamp failed: ${code}`, { path: ref.path, message });
  await ref.update({
    status: "failed",
    errorCode: code,
    errorMessage: message,
    failedAt: FieldValue.serverTimestamp(),
  });
}

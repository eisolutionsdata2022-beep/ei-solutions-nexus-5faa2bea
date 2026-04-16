package com.eisolutions.ippb.biometric

import com.eisolutions.ippb.data.Biometric
import com.eisolutions.ippb.data.nowIso
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * BiometricRelay
 * --------------
 * The single integration point with the retailer's PC agent. Mirrors
 * src/lib/ippb-biometric-relay.ts in the web app.
 *
 * Flow:
 *   1. createCaptureRequest()  → addDoc, status="requested"
 *   2. captureFlow()           → onSnapshot(doc) until status terminal
 *   3. cancel()                → status="cancelled"
 *
 * The PC agent (.NET WPF) listens on the same captureRequests collection
 * via collectionGroup query and writes back the hash.
 */
@Singleton
class BiometricRelay @Inject constructor(private val db: FirebaseFirestore) {

    private val timeoutMs = 90_000L

    suspend fun createCaptureRequest(
        ippbRequestId: String,
        staffId: String,
        retailerId: String,
    ): String {
        val now = System.currentTimeMillis()
        val doc = db.collection("ippbRequests").document(ippbRequestId)
            .collection("captureRequests")
            .add(mapOf(
                "ippbRequestId" to ippbRequestId,
                "staffId" to staffId,
                "retailerId" to retailerId,
                "status" to "requested",
                "requestedAt" to nowIso(),
                "expiresAt" to java.time.Instant.ofEpochMilli(now + timeoutMs).toString(),
                "_clientVersion" to "apk/1.0.0",
            )).await()
        return doc.id
    }

    fun captureFlow(ippbRequestId: String, captureId: String): Flow<CaptureSnapshot> = callbackFlow {
        val ref = db.collection("ippbRequests").document(ippbRequestId)
            .collection("captureRequests").document(captureId)
        val reg = ref.addSnapshotListener { snap, _ ->
            val data = snap?.data ?: return@addSnapshotListener
            trySend(CaptureSnapshot(
                status = data["status"] as? String ?: "requested",
                mode = data["mode"] as? String,
                hash = data["hash"] as? String,
                deviceModel = data["deviceModel"] as? String,
                errorCode = data["errorCode"] as? String,
                errorMessage = data["errorMessage"] as? String,
                capturedAt = data["capturedAt"] as? String,
            ))
        }
        awaitClose { reg.remove() }
    }

    suspend fun cancel(ippbRequestId: String, captureId: String) {
        db.collection("ippbRequests").document(ippbRequestId)
            .collection("captureRequests").document(captureId)
            .update("status", "cancelled").await()
    }

    /** Convert a captured snapshot into the Biometric value to save on the IPPB request. */
    fun toBiometric(snap: CaptureSnapshot): Biometric = Biometric(
        mode = if (snap.mode == "L2_RD_SERVICE") "L2_DEVICE" else "L1_SIMULATION",
        capturedAt = snap.capturedAt ?: nowIso(),
        hash = snap.hash ?: error("Missing hash"),
        deviceId = snap.deviceModel,
        staffConfirmed = true,
    )
}

data class CaptureSnapshot(
    val status: String,
    val mode: String? = null,
    val hash: String? = null,
    val deviceModel: String? = null,
    val errorCode: String? = null,
    val errorMessage: String? = null,
    val capturedAt: String? = null,
) {
    val isTerminal: Boolean get() = status in setOf("captured", "failed", "timeout", "cancelled")
}

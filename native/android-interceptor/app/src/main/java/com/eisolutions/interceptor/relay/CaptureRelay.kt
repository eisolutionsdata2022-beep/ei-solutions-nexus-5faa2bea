package com.eisolutions.interceptor.relay

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

/**
 * CaptureRelay
 * ------------
 * Bridge between this Accessibility-driven interceptor and the retailer's
 * PC agent. Mirrors the contract used by:
 *   - native/android-apk/.../biometric/BiometricRelay.kt
 *   - src/lib/ippb-biometric-relay.ts
 *
 * Documents land in /interceptorCaptures/{id} so the PC agent can listen
 * via a single collectionGroup query alongside its existing
 * /ippbRequests/{rid}/captureRequests/{cid} channel.
 */
@Singleton
class CaptureRelay @Inject constructor(
    private val db: FirebaseFirestore,
    private val auth: FirebaseAuth,
) {
    fun requestCapture(sourcePackage: String, pidOptionsXml: String): Flow<Result> = callbackFlow {
        val staffId = auth.currentUser?.uid ?: error("Not signed in")
        val now = System.currentTimeMillis()
        val expiresAt = Instant.ofEpochMilli(now + 90_000L).toString()

        val docRef = db.collection("interceptorCaptures").add(mapOf(
            "staffId" to staffId,
            "sourcePackage" to sourcePackage,
            "pidOptionsXml" to pidOptionsXml,
            "status" to "requested",
            "requestedAt" to Instant.ofEpochMilli(now).toString(),
            "expiresAt" to expiresAt,
            "_clientVersion" to "interceptor/1.0.0",
        )).await()

        val reg = docRef.addSnapshotListener { snap, err ->
            if (err != null) { close(err); return@addSnapshotListener }
            val d = snap?.data ?: return@addSnapshotListener
            trySend(Result(
                status = d["status"] as? String ?: "requested",
                pidXml = d["pidXml"] as? String,
                hash = d["hash"] as? String,
                deviceModel = d["deviceModel"] as? String,
                errorMessage = d["errorMessage"] as? String,
            ))
        }
        awaitClose { reg.remove() }
    }

    data class Result(
        val status: String,
        val pidXml: String? = null,
        val hash: String? = null,
        val deviceModel: String? = null,
        val errorMessage: String? = null,
    ) {
        val isTerminal: Boolean get() = status in setOf("captured", "failed", "timeout", "cancelled")
    }
}

package com.eisolutions.ippb.data

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Firestore wrapper for the staff (APK) side of the IPPB workflow.
 * Mirrors src/lib/ippb-firebase.ts in the web app.
 */
@Singleton
class IppbRepository @Inject constructor(private val db: FirebaseFirestore) {

    fun staffQueueFlow(staffId: String): Flow<List<IppbRequest>> = callbackFlow {
        val reg = db.collection("ippbRequests")
            .whereIn("status", listOf(
                "pending", "mobile_entered", "otp_relayed",
                "otp_verified", "details_filled", "biometric_captured", "submitted"
            ))
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snap, err ->
                if (err != null || snap == null) return@addSnapshotListener
                val rows = snap.documents.mapNotNull { doc ->
                    runCatching { doc.toIppbRequest() }.getOrNull()
                }.filter { it.staffId == null || it.staffId == staffId }
                trySend(rows)
            }
        awaitClose { reg.remove() }
    }

    suspend fun claim(requestId: String, staffId: String, staffName: String) {
        db.runTransaction { tx ->
            val ref = db.collection("ippbRequests").document(requestId)
            val snap = tx.get(ref)
            require(snap.getString("status") == "pending") { "Already claimed" }
            tx.update(ref, mapOf(
                "staffId" to staffId,
                "staffName" to staffName,
                "status" to "mobile_entered",
                "updatedAt" to nowIso(),
            ))
        }.await()
    }

    suspend fun setMobile(requestId: String, mobile: String) {
        db.collection("ippbRequests").document(requestId)
            .update("mobileNumber", mobile, "updatedAt", nowIso()).await()
    }

    suspend fun verifyOtp(requestId: String) {
        db.collection("ippbRequests").document(requestId)
            .update(mapOf(
                "status" to "otp_verified",
                "otpVerifiedAt" to nowIso(),
                "updatedAt" to nowIso(),
            )).await()
    }

    suspend fun saveDetails(requestId: String, details: CustomerDetails) {
        db.collection("ippbRequests").document(requestId)
            .update(mapOf(
                "customerDetails" to details.asMap(),
                "status" to "details_filled",
                "updatedAt" to nowIso(),
            )).await()
    }

    suspend fun saveBiometric(requestId: String, bio: Biometric) {
        db.collection("ippbRequests").document(requestId)
            .update(mapOf(
                "biometric" to bio.asMap(),
                "status" to "biometric_captured",
                "updatedAt" to nowIso(),
            )).await()
    }

    suspend fun submit(requestId: String, accountNumber: String) {
        db.collection("ippbRequests").document(requestId)
            .update(mapOf(
                "status" to "success",
                "accountNumber" to accountNumber,
                "updatedAt" to nowIso(),
            )).await()
    }
}

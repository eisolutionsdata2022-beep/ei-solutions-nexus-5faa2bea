package com.eisolutions.interceptor.relay

import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * PackageWhitelist
 * ----------------
 * Reads Firestore `config/interceptor.whitelistedPackages` and keeps an
 * in-memory copy for cheap O(1) checks on every AccessibilityEvent.
 *
 * Default fallback covers the four most common IPPB / Aadhaar apps in
 * Kerala field deployments.
 */
@Singleton
class PackageWhitelist @Inject constructor(db: FirebaseFirestore) {

    @Volatile private var packages: Set<String> = DEFAULT
    @Volatile var enabled: Boolean = true; private set

    init {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        scope.launch {
            db.collection("config").document("interceptor")
                .addSnapshotListener { snap, _ ->
                    val data = snap?.data ?: return@addSnapshotListener
                    @Suppress("UNCHECKED_CAST")
                    val list = (data["whitelistedPackages"] as? List<String>)?.toSet()
                    if (!list.isNullOrEmpty()) packages = list
                    enabled = (data["enabled"] as? Boolean) ?: true
                }
        }
    }

    fun isAllowed(pkg: String): Boolean = enabled && pkg in packages

    companion object {
        private val DEFAULT = setOf(
            "com.ippb.bcas",
            "com.csc.vle",
            "in.gov.uidai.aadhaarfacerd",
            "com.mantra.rdservice",
            "com.scl.rdservice",
        )
    }
}

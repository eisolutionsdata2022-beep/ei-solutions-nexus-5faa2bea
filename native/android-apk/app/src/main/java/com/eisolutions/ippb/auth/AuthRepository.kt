package com.eisolutions.ippb.auth

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Authenticates against Firebase using a custom token issued by the
 * EI Solutions backend (see web app: src/lib/native-auth.functions.ts).
 *
 * Flow:
 *   1. POST email+password to https://eisoluions.xyz/api/native-token
 *   2. Receive { token, expiresIn }
 *   3. signInWithCustomToken(token)
 *   4. Firebase SDK refreshes the resulting ID token automatically.
 */
@Singleton
class AuthRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val tokenApi: NativeTokenApi,
) {
    val currentUser: FirebaseUser? get() = auth.currentUser

    fun userFlow(): Flow<FirebaseUser?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { trySend(it.currentUser) }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    suspend fun signIn(email: String, password: String): FirebaseUser {
        val res = tokenApi.issue(email, password)
        return auth.signInWithCustomToken(res.token).await().user!!
    }

    suspend fun signOut() = auth.signOut()
}

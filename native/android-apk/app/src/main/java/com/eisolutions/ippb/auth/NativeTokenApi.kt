package com.eisolutions.ippb.auth

import kotlinx.serialization.Serializable

@Serializable
data class TokenResponse(val token: String, val expiresIn: Long)

interface NativeTokenApi {
    suspend fun issue(email: String, password: String): TokenResponse
}

/**
 * Concrete impl uses OkHttp + Kotlinx Serialization. Kept minimal here —
 * see docs/API_CONTRACT.md §6 for the wire format.
 */
class NativeTokenApiImpl(private val baseUrl: String) : NativeTokenApi {
    override suspend fun issue(email: String, password: String): TokenResponse {
        // Implementation: POST {baseUrl}/api/native-token
        // Body: {"email":"...","password":"..."}
        // Response: {"token":"<jwt>","expiresIn":3600}
        TODO("Implement with OkHttp — left as exercise to keep file size manageable")
    }
}

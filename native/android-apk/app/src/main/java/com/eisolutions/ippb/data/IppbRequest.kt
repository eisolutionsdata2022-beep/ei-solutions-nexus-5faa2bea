package com.eisolutions.ippb.data

import kotlinx.serialization.Serializable

enum class IppbStatus {
    pending, mobile_entered, otp_relayed, otp_verified,
    details_filled, biometric_captured, submitted,
    success, failed, cancelled
}

@Serializable
data class CustomerDetails(
    val fullName: String,
    val dob: String,
    val address: String,
    val aadhaar: String,
    val pan: String,
    val occupation: String? = null,
    val income: String? = null,
    val nomineeName: String? = null,
    val nomineeRelation: String? = null,
    val initialDeposit: Double? = null,
    val dbtMapping: Boolean? = null,
)

@Serializable
data class Biometric(
    val mode: String,           // "L1_SIMULATION" | "L2_DEVICE"
    val capturedAt: String,
    val hash: String,
    val deviceId: String? = null,
    val staffConfirmed: Boolean = true,
)

data class IppbRequest(
    val id: String,
    val requestNo: String,
    val retailerId: String,
    val retailerName: String,
    val staffId: String? = null,
    val status: IppbStatus,
    val mobileNumber: String? = null,
    val otpRelayed: String? = null,
    val customerDetails: CustomerDetails? = null,
    val biometric: Biometric? = null,
    val accountNumber: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

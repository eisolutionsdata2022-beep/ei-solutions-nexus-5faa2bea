package com.eisolutions.ippb.data

import com.google.firebase.firestore.DocumentSnapshot
import java.time.Instant

internal fun nowIso(): String = Instant.now().toString()

internal fun DocumentSnapshot.toIppbRequest(): IppbRequest {
    val statusStr = getString("status") ?: "pending"
    return IppbRequest(
        id = id,
        requestNo = getString("requestNo") ?: id,
        retailerId = getString("retailerId") ?: "",
        retailerName = getString("retailerName") ?: "",
        staffId = getString("staffId"),
        status = IppbStatus.valueOf(statusStr),
        mobileNumber = getString("mobileNumber"),
        otpRelayed = getString("otpRelayed"),
        customerDetails = (get("customerDetails") as? Map<*, *>)?.toCustomerDetails(),
        biometric = (get("biometric") as? Map<*, *>)?.toBiometric(),
        accountNumber = getString("accountNumber"),
        createdAt = getString("createdAt") ?: nowIso(),
        updatedAt = getString("updatedAt") ?: nowIso(),
    )
}

internal fun CustomerDetails.asMap(): Map<String, Any?> = mapOf(
    "fullName" to fullName, "dob" to dob, "address" to address,
    "aadhaar" to aadhaar, "pan" to pan, "occupation" to occupation,
    "income" to income, "nomineeName" to nomineeName,
    "nomineeRelation" to nomineeRelation, "initialDeposit" to initialDeposit,
    "dbtMapping" to dbtMapping,
)

internal fun Biometric.asMap(): Map<String, Any?> = mapOf(
    "mode" to mode, "capturedAt" to capturedAt, "hash" to hash,
    "deviceId" to deviceId, "staffConfirmed" to staffConfirmed,
)

internal fun Map<*, *>.toCustomerDetails() = CustomerDetails(
    fullName = this["fullName"] as? String ?: "",
    dob = this["dob"] as? String ?: "",
    address = this["address"] as? String ?: "",
    aadhaar = this["aadhaar"] as? String ?: "",
    pan = this["pan"] as? String ?: "",
    occupation = this["occupation"] as? String,
    income = this["income"] as? String,
    nomineeName = this["nomineeName"] as? String,
    nomineeRelation = this["nomineeRelation"] as? String,
    initialDeposit = (this["initialDeposit"] as? Number)?.toDouble(),
    dbtMapping = this["dbtMapping"] as? Boolean,
)

internal fun Map<*, *>.toBiometric() = Biometric(
    mode = this["mode"] as? String ?: "L1_SIMULATION",
    capturedAt = this["capturedAt"] as? String ?: nowIso(),
    hash = this["hash"] as? String ?: "",
    deviceId = this["deviceId"] as? String,
    staffConfirmed = this["staffConfirmed"] as? Boolean ?: true,
)

# IPPB Native API Contract v1.0

**Audience:** developers building the Android APK and the Windows PC agent.
**Source of truth:** this file + `src/lib/ippb-biometric-relay.ts` in the web app.

---

## 1. Transport

All three actors (web app, APK, PC agent) talk to the **same Firestore project**
using the **Firebase Client SDK** authenticated with **Firebase Auth**.

There is no custom HTTP API. Firestore IS the API — its real-time `onSnapshot`
listeners replace WebSockets, and its security rules replace per-endpoint
authorization.

| Concern | Mechanism |
|---|---|
| Discovery | Firestore collection paths (below) |
| Real-time push | `onSnapshot` |
| Auth | Firebase Auth ID token (auto-attached by SDK) |
| Authorization | Firestore security rules |
| Encryption in transit | TLS 1.2+ (enforced by Firebase SDK) |
| Encryption at rest | Firestore default + payload-level AES-GCM (see SECURITY.md) |

---

## 2. Collections

```
users/{uid}
  role: "admin" | "manager" | "staff" | "retailer" | "distributor" | "trainer"
  displayName, email, ...

ippbRequests/{ippbRequestId}
  retailerId, retailerName, retailerEmail
  staffId?, staffName?
  status: IPPBStatus            // see §3
  mobileNumber?, otpRelayed?
  customerDetails?: {...}
  biometric?: {...}
  history: [{status, at, by, note?}]
  createdAt, updatedAt

ippbRequests/{ippbRequestId}/captureRequests/{captureId}
  ippbRequestId
  retailerId, staffId
  status: CaptureStatus         // see §4
  mode?: "L1_SIMULATION" | "L2_RD_SERVICE"
  hash?: string                 // base64(SHA-256(pidBlock || captureId))
  encryptedPayload?: string     // base64 AES-GCM(pidBlock) — optional, not used by web
  iv?: string                   // base64 12-byte nonce
  deviceModel?, rdServiceVersion?
  errorCode?, errorMessage?
  requestedAt, capturingAt?, capturedAt?
  expiresAt                     // requestedAt + 90s
```

---

## 3. IPPBStatus state machine

```
pending
  → mobile_entered      (staff enters customer mobile)
    → otp_relayed       (retailer types OTP from customer)
      → otp_verified    (staff confirms OTP correct in IPPB app)
        → details_filled
          → biometric_captured
            → submitted
              → success | failed
  → cancelled           (any stage, by retailer or staff)
```

Only forward transitions are allowed. Use `runTransaction` to enforce.

---

## 4. CaptureStatus state machine (biometric subcollection)

```
requested   → capturing → captured
            ↘            ↘ failed
                          ↘ timeout (after expiresAt)
            ↘ cancelled (by staff)
```

Owners:
- `requested` → written by **staff** (APK or web).
- `capturing`, `captured`, `failed` → written by **retailer** (PC agent or web).
- `cancelled` → written by **staff**.
- `timeout` → written by anyone after `Date.now() > expiresAt`.

---

## 5. Operations (pseudo-API)

These are the only operations either native component needs.

### 5.1 APK — Staff side

| Op | Firestore call |
|---|---|
| Login | `signInWithCustomToken(jwt)` from your auth backend |
| List my pending IPPB requests | `query(collection("ippbRequests"), where("staffId","==",uid), where("status","in",[...active]))` |
| Claim a `pending` request | `runTransaction` setting `staffId=uid, status="mobile_entered"` |
| Send mobile + OTP via IPPB app | (out of band, native IPPB UI flow) |
| Read OTP relayed by retailer | `onSnapshot(doc("ippbRequests/{id}"))` → read `otpRelayed` |
| Mark OTP verified | update `status="otp_verified", otpVerifiedAt=now` |
| Save customer details | update `customerDetails={...}, status="details_filled"` |
| Trigger biometric on retailer PC | `addDoc("ippbRequests/{id}/captureRequests", {status:"requested", ...})` |
| Wait for capture | `onSnapshot(doc(captureRequest))` — resolve when `status=="captured"` |
| Save biometric to IPPB request | update `biometric={mode,hash,...}, status="biometric_captured"` |
| Submit | update `status="submitted"`, then `success` / `failed` |

### 5.2 PC Agent — Retailer side

| Op | Firestore call |
|---|---|
| Login | `signInWithCustomToken(jwt)` |
| Listen for new captures | `query(collectionGroup("captureRequests"), where("retailerId","==",uid), where("status","in",["requested","capturing"]))` |
| Accept | `runTransaction` setting `status="capturing", capturingAt=now` |
| Call RD Service | HTTP `RDSERVICE` to `127.0.0.1:11100..11102`, then `CAPTURE` |
| Hash | `base64(SHA-256(pidBlock + captureId))` |
| Submit success | update `status="captured", mode, hash, deviceModel, rdServiceVersion, capturedAt=now` |
| Submit failure | update `status="failed", errorCode, errorMessage, capturedAt=now` |

---

## 6. Authentication

Native components MUST NOT ship Firebase service-account JSON.
Instead:

1. EI Solutions backend exposes `POST /auth/native-token` (TanStack Start
   server function) that verifies the user's email/password and returns a
   short-lived **Firebase custom token** (1 h).
2. Native app calls `FirebaseAuth.signInWithCustomToken(jwt)`.
3. SDK automatically refreshes the resulting ID token every 50 minutes.
4. Native app stores the **refresh token** encrypted:
   - Android → EncryptedSharedPreferences (Tink, AES-256-GCM, master key in
     Android Keystore).
   - Windows → DPAPI `ProtectedData.Protect(..., DataProtectionScope.CurrentUser)`.

---

## 7. Error codes

| Code | Meaning | Retry? |
|---|---|---|
| `RD_NOT_FOUND` | No RD Service on ports 11100–11102 | No, ask user to install |
| `RD_TIMEOUT` | Service did not respond in 30s | Yes, max 2 |
| `USER_REJECTED` | Customer pulled finger / cancelled | Yes |
| `LOW_QUALITY` | NFIQ score below threshold | Yes |
| `LICENSE_EXPIRED` | RD Service license expired | No |
| `NETWORK` | Firestore unreachable | Yes with backoff |
| `EXPIRED` | `Date.now() > expiresAt` | No, staff must restart |

---

## 8. Versioning

- This contract is **v1.0** — published 2026-04.
- Bump the **minor** version for additive changes (new optional fields).
- Bump the **major** version for breaking changes (new required fields,
  status enum changes). Native apps MUST send their version in the
  user-agent string of every Firestore write via `setLogLevel` metadata or
  in the document field `_clientVersion`.


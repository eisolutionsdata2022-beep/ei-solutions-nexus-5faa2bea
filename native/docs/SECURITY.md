# IPPB Native — Security Specification

## 1. Threat model

| Asset | Threat | Control |
|---|---|---|
| Customer biometric (PID block) | Theft from disk / network | Never persisted; only SHA-256 hash stored |
| Aadhaar number | Leakage in logs | Mask to last 4 in all logs; redact at sink |
| Firebase ID token | Replay | 1 h TTL, refresh token in OS keystore |
| Capture request | Spoofing / wrong retailer answers | Firestore rules pin retailerId == auth.uid |
| RD Service license | Abuse from another machine | License is bound to host MAC by vendor |

## 2. Encryption

### 2.1 Payload-level (optional, for L2 production)

Even though Firestore traffic is TLS, defense-in-depth requires that the PID
block hash AND any optional encrypted payload be wrapped:

```
ciphertext = AES-256-GCM(
  key  = sessionKey,            // 256-bit, derived per capture
  iv   = random12Bytes,         // unique per message
  aad  = captureId,             // binds ciphertext to its document
  data = pidBlock || metadata
)
```

Store on the doc:
- `encryptedPayload`: base64(ciphertext || authTag)
- `iv`: base64(iv)
- `hash`: base64(SHA-256(pidBlock || captureId))   ← always required

**Key exchange:** Staff APK generates an ephemeral RSA-2048 keypair per
IPPB request, writes the **public** key to `ippbRequests/{id}.staffPubKey`.
PC agent reads it, generates a random 256-bit session key, encrypts it with
RSA-OAEP-SHA-256, writes it to `captureRequests/{cid}.wrappedKey`. APK
unwraps with its private key.

This is OPTIONAL because Firestore TLS already protects in transit, and the
hash by itself is non-reversible. Enable only if your AUA/KUA contract or
internal compliance requires it.

### 2.2 At-rest on the PC agent

- Refresh token → DPAPI scoped to `CurrentUser`.
- RD Service license cache → DPAPI scoped to `LocalMachine`.
- Logs → write to `%LOCALAPPDATA%\EISolutions\IppbAgent\logs\` with
  ACL = current user only.

### 2.3 At-rest on the APK

- Refresh token + customer PII cache → `EncryptedSharedPreferences` with a
  master key bound to the Android Keystore (StrongBox if available).
- App private storage only — never write to external storage.
- Disable backup: `android:allowBackup="false"` in manifest.

## 3. Network

- All Firestore traffic uses TLS 1.2+ enforced by the Firebase SDK.
- No plaintext HTTP except `http://127.0.0.1:1110x/` for RD Service
  (loopback only — never resolves outside the device).
- Certificate pinning (Android): pin `*.googleapis.com` and
  `*.firebaseio.com` via `network_security_config.xml`.

## 4. Firestore security rules (production)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function isAuthed() { return request.auth != null; }
    function role() {
      return get(/databases/$(db)/documents/users/$(request.auth.uid)).data.role;
    }
    function isStaffish() { return role() in ["staff","manager","admin"]; }
    function isRetailer() { return role() == "retailer"; }

    match /ippbRequests/{rid} {
      allow read:   if isAuthed() && (
                      resource.data.retailerId == request.auth.uid
                   || resource.data.staffId    == request.auth.uid
                   || isStaffish());
      allow create: if isAuthed() && isRetailer()
                    && request.resource.data.retailerId == request.auth.uid
                    && request.resource.data.status == "pending";
      allow update: if isAuthed() && (
                      (resource.data.staffId    == request.auth.uid && isStaffish())
                   || (resource.data.retailerId == request.auth.uid));
      allow delete: if false;

      match /captureRequests/{cid} {
        allow create: if isAuthed() && isStaffish()
                      && request.resource.data.staffId == request.auth.uid;
        allow read:   if isAuthed() && (
                        resource.data.retailerId == request.auth.uid
                     || resource.data.staffId    == request.auth.uid);
        allow update: if isAuthed() && (
                        (resource.data.staffId    == request.auth.uid
                         && request.resource.data.status == "cancelled")
                     || (resource.data.retailerId == request.auth.uid
                         && request.resource.data.status in
                            ["capturing","captured","failed"]));
        allow delete: if false;
      }
    }
  }
}
```

Deploy with `firebase deploy --only firestore:rules`.

## 5. Logging & redaction

Every native log line MUST pass through a redactor:

```
- mobile:     keep first 2 + last 2, mask middle  → 90****12
- aadhaar:    keep last 4                          → XXXX-XXXX-1234
- pan:        keep first 2 + last 1                → AB*****1Z
- otp:        REMOVE entirely
- hash:       keep first 8 chars                   → 3f8a91c0…
- pidBlock:   never log
```

## 6. Compliance checklist

- [ ] AUA/KUA license obtained from UIDAI
- [ ] RD Service procured from registered vendor (Mantra/Morpho/Startek)
- [ ] Privacy policy updated to disclose biometric flow
- [ ] DPDP Act 2023 consent screen shown before first capture
- [ ] Retention policy: capture docs auto-deleted at 24 h via Cloud Function
- [ ] SOC 2 / ISO 27001 audit trail (Firestore audit logs enabled)
- [ ] Penetration test before public rollout

## 7. Cross-device PID injection — why it is unreliable

> **TL;DR** — The Android Interceptor APK
> (`native/android-interceptor/`) can detect a third-party IPPB / CSC /
> Aadhaar app's "Capture Fingerprint" event and relay it to the
> retailer's PC, but **injecting the resulting PID XML back into the
> third-party app is unreliable and will be rejected by UIDAI in the
> overwhelming majority of cases**. Future contributors: do not spend
> engineering effort trying to "fix" this — it is an architectural
> constraint of UIDAI's Aadhaar Authentication ecosystem.

### 7.1 Why detection works but injection does not

UIDAI's L1-certified RD Service produces a PID block bound to **the
physical device that scanned the finger**. Three independent
mechanisms enforce this:

| Binding | What it does | Why injection fails |
|---|---|---|
| **Device-bound RSA signature** | RD Service signs PID with a key fused into the L1 sensor's secure element; signature includes device serial. | A PID block signed on the retailer's MFS110/Morpho is rejected when presented from a different device — UIDAI validates the signature against the device certificate registered for that AUA transaction. |
| **WADH (Wadh Hash)** | Host app generates a session-unique `wadh` and seeds it into `PidOptions` *before* capture. RD Service incorporates wadh into the signed payload. | Tablet computes `wadhA`; retailer device computes `wadhB` (no way to know `wadhA`). UIDAI sees `wadhA ≠ wadhB` → `K-540` / `K-541`. |
| **Session ticket / txnId** | Per-transaction `txnId` must round-trip with the PID block. | Retailer's RD Service has no knowledge of the tablet's `txnId`; injecting a foreign-session payload yields `K-200` or `K-561`. |

### 7.2 Additional Android-side blockers

1. **Hardened input fields.** Newer IPPB BCAS releases (post-2024)
   mark PID `EditText`s as `IMPORTANT_FOR_ACCESSIBILITY = no` and
   reject `ACTION_SET_TEXT` from non-IME sources.
2. **Direct Intent return path.** Most modern IPPB / Aadhaar apps
   read PID from `onActivityResult`'s `pid_data` extra.
   AccessibilityService cannot forge `onActivityResult` into another
   process — **technically impossible**, not merely restricted.

### 7.3 Supported alternative — Detection-only mode

```
config/interceptor {
  enabled: true,
  detectionOnly: true,
  whitelistedPackages: [...]
}
```

When `detectionOnly = true`, `CaptureRelay.requestCapture(detectionOnly=true)`
writes a doc with `mode: "detection"` to `/interceptorCaptures/{id}`.
The retailer's PC agent shows a notification ("Customer needs
fingerprint at IPPB BCAS"), ACKs with `status: "acknowledged"`, and
the interceptor shows the overlay without attempting injection. The
on-tablet operator completes the scan on the tablet's own RD device,
where signature/wadh/txnId all match.

**Default production posture:** ship with `detectionOnly = true`.

## 8. interceptorCaptures security rules

The Android Interceptor APK writes capture-relay documents to a
top-level collection `/interceptorCaptures/{id}`. Rules pin the
creator to `staffId == auth.uid` and only let the matching retailer
update result fields (`status`, `pidXml`, `hash`, `errorMessage`).
Staff can only cancel their own in-flight requests; nobody can
delete (retention is enforced by a scheduled Cloud Function that
purges docs older than 24 h).

```
match /interceptorCaptures/{cid} {
  allow read: if isAuthed() && (
                resource.data.staffId    == request.auth.uid
             || resource.data.retailerId == request.auth.uid
             || isStaffish());

  allow create: if isAuthed()
                && request.resource.data.staffId == request.auth.uid
                && request.resource.data.status == "requested"
                && request.resource.data.mode in ["capture","detection"];

  function retailerUpdateOk() {
    return resource.data.retailerId == request.auth.uid
        && request.resource.data.status in
           ["capturing","captured","acknowledged","failed","timeout"]
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(["status","pidXml","hash","deviceModel",
                       "errorMessage","completedAt","retailerId"]);
  }
  function staffCancelOk() {
    return resource.data.staffId == request.auth.uid
        && request.resource.data.status == "cancelled"
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(["status","cancelledAt"]);
  }

  allow update: if isAuthed() && (retailerUpdateOk() || staffCancelOk());
  allow delete: if false;
}
```

The full ruleset (ippbRequests + interceptorCaptures) lives in
`firestore.rules` at the repo root. Deploy with:

```
firebase deploy --only firestore:rules
```

### 8.1 Pairing retailerId to a capture

`retailerId` is **not** set by the staff/operator at create time —
the Interceptor APK doesn't know which retailer should service the
request. Two supported binding strategies:

1. **Static pairing (recommended for v1):** the operator's user
   profile has a `pairedRetailerId` field set by an admin. A Cloud
   Function `onCreate(/interceptorCaptures/{id})` reads that field
   and stamps `retailerId` on the new doc. The rule above then lets
   only that retailer update it.
2. **Open queue (future):** the doc is created with
   `retailerId: null` and a `claimedAt` flow lets any online
   retailer of the right tier claim it via a callable function. The
   rule then needs a small extension to allow the claim transition.

Until the Cloud Function is deployed, the v1 client-side workaround
is for the APK to read `pairedRetailerId` from the operator's
`/users/{uid}` doc and include it in the create payload — but this
is trust-on-write and MUST be replaced by the server-side stamp
before production rollout.


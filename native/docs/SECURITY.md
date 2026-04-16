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

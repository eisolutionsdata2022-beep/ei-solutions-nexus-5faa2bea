# IPPB Biometric Relay – API Contract

This document is the integration spec for the **native components** that will
eventually replace the browser-only flow:

1. **Custom Android APK** running on the staff Samsung tablet that intercepts
   IPPB biometric calls.
2. **Windows PC agent** running on the retailer machine that drives the
   signed RD Service (Mantra / Morpho / Startek …).

Both pieces talk to the same Firestore collection used by the web app, so
they are interoperable from day one.

---

## 1. Data model

Collection path:

```
ippbRequests/{ippbRequestId}/captureRequests/{captureId}
```

Document shape (TypeScript):

```ts
interface CaptureRequest {
  ippbRequestId: string;
  retailerId: string;          // Firebase Auth uid of the retailer
  staffId: string;             // Firebase Auth uid of the staff/operator
  status:
    | "requested"              // staff/APK created the row
    | "capturing"              // retailer/PC agent started capture
    | "captured"               // retailer/PC agent returned hash
    | "failed"
    | "timeout"
    | "cancelled";
  mode?: "L1_SIMULATION" | "L2_RD_SERVICE";
  hash?: string;               // SHA-256 (or PID-block hash). NEVER raw biometric.
  deviceModel?: string;        // e.g. "Mantra MFS100"
  rdServiceVersion?: string;   // from RD Service info ping
  errorCode?: string;          // e.g. "730", "USER_REJECTED"
  errorMessage?: string;
  requestedAt: string;         // ISO
  capturingAt?: string;
  capturedAt?: string;
  expiresAt: string;           // requestedAt + 90 s
}
```

---

## 2. End-to-end sequence

```
+------------------+       +--------------------+        +-------------------+
|  IPPB app on     |  (a)  |  Custom APK         |  (b)  |  Firestore relay  |
|  Samsung tablet  |------>|  (intercepts        |------>|  captureRequests  |
+------------------+       |   biometric call)   |       +---------+---------+
                           +--------------------+                 |
                                                                  | (c) onSnapshot
                                                                  v
                                                         +-------------------+
                                                         | Retailer PC agent |
                                                         |  + RD Service     |
                                                         +---------+---------+
                                                                   |
                                                                   | (d) capture
                                                                   v
                                                         +-------------------+
                                                         | Fingerprint device|
                                                         +---------+---------+
                                                                   |
                                                                   | (e) PID block
                                                                   v
                                                         +-------------------+
                                                         | Hash + sign       |
                                                         | upload to relay   |
                                                         +---------+---------+
                                                                   |
                              +-----------------------+ (f) snapshot|
                              |  APK gets capture     |<------------+
                              |  payload, returns it  |
                              |  to IPPB app          |
                              +-----------------------+
```

### Step a — APK intercepts biometric request

The APK registers itself as the device's RD-Service-compatible provider (or
as an accessibility-service shim) so any IPPB capture intent lands in the APK
instead of the device's local fingerprint sensor.

When intercepted, build a `CaptureRequest` doc:

```jsonc
{
  "ippbRequestId": "<the active IPPB request id>",
  "retailerId":    "<retailer uid the customer is in front of>",
  "staffId":       "<staff uid signed into APK>",
  "status":        "requested",
  "requestedAt":   "<ISO now>",
  "expiresAt":     "<ISO now + 90s>"
}
```

`addDoc(ippbRequests/{id}/captureRequests, ...)`

### Step b — relay persists it

Firestore security rules (see §4) ensure only the matching staff and
retailer can see / mutate the document.

### Step c — PC agent listens

The PC agent (Electron/Node/.NET service) is signed in as the retailer and
runs a `collectionGroup("captureRequests")` query filtered to
`retailerId == myUid && status in ["requested","capturing"]`.

It SHOULD show a tray notification when a new `requested` arrives.

### Step d — capture via RD Service

The PC agent makes the standard RD Service flow:

1. `RDSERVICE` HTTP verb to `http://127.0.0.1:11100..11102/`
2. `CAPTURE` to the discovered port with the standard PID options XML.
3. Read back the PID block.

### Step e — hash + upload

NEVER upload the raw PID block to Firestore. Instead:

```
hash = base64( SHA-256( pidBlock || captureId ) )
```

(Concatenating `captureId` prevents replay across requests.)

Update the doc:

```jsonc
{
  "status":           "captured",
  "mode":             "L2_RD_SERVICE",
  "hash":             "<base64 sha256>",
  "deviceModel":      "<from RD info>",
  "rdServiceVersion": "<from RD info>",
  "capturedAt":       "<ISO now>"
}
```

If anything fails, set `status: "failed"` with `errorCode` / `errorMessage`.

### Step f — APK polls

The APK has an active `onSnapshot` on its capture document. As soon as
`status == "captured"`, it constructs a synthetic biometric response in the
exact shape the IPPB app expected and returns it to the IPPB activity.

---

## 3. Authentication

Every actor (APK, PC agent, web app) authenticates with **Firebase Auth**.

- APK: signs in as the staff user (email/password or custom token issued by
  the EI Solutions backend).
- PC agent: signs in as the retailer user. Use a long-lived refresh token
  stored encrypted in the OS keychain (Windows DPAPI / macOS Keychain).
- Web app: existing browser session.

Do **NOT** ship service-account JSON to the APK or PC agent.

---

## 4. Firestore security rules (recommended)

```
match /ippbRequests/{rid}/captureRequests/{cid} {
  allow create: if request.auth != null
                && request.resource.data.staffId == request.auth.uid
                && exists(/databases/$(database)/documents/users/$(request.auth.uid))
                && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ["staff","manager","admin"];

  allow read:   if request.auth != null
                && (resource.data.staffId == request.auth.uid
                 || resource.data.retailerId == request.auth.uid);

  allow update: if request.auth != null
                && (
                     // staff can only cancel
                     (resource.data.staffId == request.auth.uid
                      && request.resource.data.status == "cancelled")
                  || // retailer can move requested → capturing → captured/failed
                     (resource.data.retailerId == request.auth.uid
                      && request.resource.data.status in ["capturing","captured","failed"])
                   );

  allow delete: if false;
}
```

Add this rule to your Firestore rules file when you go to production.

---

## 5. Timeouts and retries

- `expiresAt` = `requestedAt + 90s`. If the PC agent does not see the
  request within 90 s, the APK should mark it `timeout` and surface a retry
  to the operator.
- Max 3 retries per IPPB request; after that, force fallback to manual L1
  capture on the tablet and log the incident.

---

## 6. Encryption & privacy

- The PID block is **never** sent over the wire to Firestore or the APK.
  Only its SHA-256 hash is.
- All transport is HTTPS (Firestore SDK enforces this).
- Hashes auto-expire: a Cloud Function (recommended) deletes
  `captureRequests` documents older than 24 h.
- Logs must redact `hash` to its first 8 chars when written to disk.

---

## 7. Compliance notes

- Real production use requires UIDAI AUA/KUA licensing for the RD Service
  invocation. The PC agent vendor must be a registered ASA/AUA partner.
- Direct interception of the IPPB official app's biometric call may not be
  permitted under your IPPB CSP agreement. Confirm with IPPB before
  deploying the APK in production.
- This codebase ships only the relay + simulation. Native components and
  AUA/KUA licensing are the integrator's responsibility.

---

## 8. Reference web implementation

| Concern | File |
|---|---|
| Data + Firestore transactions | `src/lib/ippb-biometric-relay.ts` |
| Retailer modal + RD detection + sim | `src/components/ippb/BiometricCaptureListener.tsx` |
| Staff trigger + live status | `src/components/ippb/RemoteCapturePanel.tsx` |
| Mounted globally for retailers | `src/components/DashboardLayout.tsx` |

Use these as the canonical reference when porting to native.

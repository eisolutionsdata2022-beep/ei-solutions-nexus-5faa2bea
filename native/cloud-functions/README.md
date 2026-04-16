# EI Solutions — Cloud Functions

Firebase Cloud Functions (2nd gen) supporting the native APKs and PC agent.

## Layout

```
src/
  index.ts                      # entrypoint, initializes admin SDK
  interceptor/
    index.ts                    # re-exports
    stampRetailerOnInterceptorCapture.ts  # Firestore onCreate trigger
```

## Functions

### `interceptor-stampRetailerOnInterceptorCapture`

**Trigger:** Firestore `onCreate` at `/interceptorCaptures/{cid}`
**Region:** `asia-south1` (Mumbai — co-located with Firestore)

When the Android Interceptor APK creates a capture-relay document, it
does not know which retailer should service the request. This function
reads the operator's `users/{staffId}.pairedRetailerId` field and
stamps it onto the doc, then transitions `status` from `requested`
→ `pending` so the retailer's PC agent picks it up.

Failure paths (all set `status: "failed"` + `errorCode` on the doc):

| Code | Cause |
|---|---|
| `missing-staffId` | Doc created without `staffId` (rules should prevent this) |
| `operator-profile-missing` | `users/{staffId}` doesn't exist |
| `no-paired-retailer` | `pairedRetailerId` is null/empty — admin must pair |
| `retailer-profile-missing` | `users/{pairedRetailerId}` doesn't exist |
| `retailer-inactive` | Paired user is not `role=retailer` or `active=false` |

**Idempotency:** If `retailerId` is already a string on the doc when
the trigger fires (e.g. trust-on-write client stamp during transition),
the function logs and returns without overwriting.

## Pairing operators to retailers

An admin must set `pairedRetailerId` on the operator's user profile:

```
users/{operatorUid} {
  role: "staff",
  active: true,
  pairedRetailerId: "<retailerUid>",
  ...
}
```

A future admin UI (`/admin/interceptor-config`) will provide a
searchable picker for this; for now, set it manually in Firestore
console or via a one-off script.

## Setup (one-time)

```bash
cd native/cloud-functions
npm install
firebase login
firebase use <your-project-id>
```

`firebase.json` at the repo root must include:

```json
{
  "functions": [{
    "source": "native/cloud-functions",
    "codebase": "default",
    "runtime": "nodejs20"
  }]
}
```

## Deploy

```bash
# all functions
npm run deploy

# just the interceptor group
firebase deploy --only functions:interceptor

# just one function
firebase deploy --only functions:interceptor-stampRetailerOnInterceptorCapture
```

## Local emulator

```bash
npm run serve
```

Then create a doc via the Firestore emulator UI or CLI to trigger.

## Logs

```bash
npm run logs -- --only interceptor-stampRetailerOnInterceptorCapture
```

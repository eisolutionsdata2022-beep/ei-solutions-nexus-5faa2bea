# Production Rollout — Next Steps

## Phase 0 — Prerequisites (do these BEFORE building binaries)

1. **Firebase production project**
   - Create separate `eisolutions-prod` Firebase project (not the dev one).
   - Enable Firestore (Native mode), Auth (Email/Password + Custom Token),
     App Check (Play Integrity for Android, custom for WPF).
   - Deploy `firestore.rules` from `docs/SECURITY.md` §4.
2. **Auth backend endpoint** in this web app:
   `src/lib/native-auth.functions.ts` exposing `issueCustomToken(email, password)`
   that returns `{ token, expiresIn }`. Use `firebase-admin` with a service
   account stored as a Lovable Cloud secret.
3. **AUA/KUA license** from UIDAI — required for L2 RD Service in production.
4. **RD Service vendor agreement** (Mantra / Morpho / Startek).
5. **Code-signing certificates**:
   - Android: upload key (Play App Signing handles release key).
   - Windows: EV Authenticode cert from DigiCert / Sectigo (~₹35k/yr).

## Phase 1 — Build & sign

| Artifact | Command | Output |
|---|---|---|
| APK release AAB | `cd native/android-apk && ./gradlew bundleRelease` | `app/build/outputs/bundle/release/app-release.aab` |
| WPF MSIX installer | `cd native/pc-agent-wpf && dotnet publish -c Release -r win-x64 --self-contained` then MSIX Packaging Tool | `EISolutions.IppbAgent.msix` |

Sign both BEFORE distribution:
- `jarsigner` / Play App Signing for AAB.
- `signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a EISolutions.IppbAgent.msix`.

## Phase 2 — Pilot (1 retailer + 1 staff)

1. Side-load APK on staff Samsung tablet (`adb install`).
2. Install PC agent MSIX on retailer Windows PC.
3. Plug in Mantra MFS100 USB sensor → install vendor RD Service.
4. Run end-to-end: pending → mobile → otp → details → **L2 capture** → submit.
5. Watch Firestore audit logs for errors.

## Phase 3 — Limited rollout (10 retailers)

- Distribute APK via Firebase App Distribution (closed track).
- Distribute PC agent via signed MSIX on `https://download.eisoluions.xyz/agent`.
- Auto-update channel: APK uses Play Internal Track, agent uses Squirrel.Windows.
- Monitor Firestore Usage dashboard — set budget alerts at ₹1k/day.

## Phase 4 — General availability

- Publish APK to Play Store (closed → open testing → production).
- Publish PC agent to Microsoft Store (optional) and direct MSIX download.
- Enable App Check enforcement (rejects un-attested clients).
- Turn on Cloud Function `cleanupCaptureRequests` (TTL 24 h).
- Add Cloud Function `monitorStuckRequests` to alert on requests stuck
  >5 min in `submitted` state.

## Phase 5 — Ongoing operations

- Quarterly: rotate Firebase service account, refresh signing certs.
- Monthly: review failed-capture metrics, tune RD Service timeout.
- On every IPPB API change: bump contract version (see `API_CONTRACT.md` §8).

## Estimated timeline

| Phase | Duration | Owner |
|---|---|---|
| 0 — Prereqs | 2–4 weeks | Compliance + DevOps |
| 1 — Build & sign | 3 days | Native devs |
| 2 — Pilot | 1 week | QA + 1 partner |
| 3 — Limited | 2 weeks | Ops |
| 4 — GA | 1 week | Marketing + Ops |

Total: **~2 months** from kickoff to production GA.

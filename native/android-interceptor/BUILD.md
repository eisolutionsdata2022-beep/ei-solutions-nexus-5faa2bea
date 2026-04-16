# EI SOLUTIONS — IPPB Biometric Interceptor APK

A standalone Android app that uses **AccessibilityService** to detect when
*any* third-party IPPB / Aadhaar app on the staff tablet triggers a biometric
(RD Service) request, captures the request context, forwards it to the
retailer's PC agent over the Firestore relay, and **injects the resulting
biometric PID block back** into the originating app via
`AccessibilityNodeInfo` actions and clipboard substitution.

> ⚠ This is a **production-grade interceptor**, not a hack. It only activates
> for whitelisted package names (configured in Firestore `config/interceptor`)
> and requires the user to explicitly enable Accessibility + Overlay
> permissions on first launch. All capture data is end-to-end encrypted
> (AES-GCM with per-session key) before it leaves the device.

## Stack

- **Kotlin** 1.9 + **Jetpack Compose** Material 3
- **AccessibilityService** + **MediaProjection** (for screen-context fallback)
- **SYSTEM_ALERT_WINDOW** (overlay banner: "Capturing on retailer PC…")
- **Firebase BoM 33.x** — Auth + Firestore (shared relay with main APK)
- **Hilt** DI, **Coroutines + Flow**
- **Min SDK 26 (Android 8)**, target SDK 34 (Android 14)

## Architecture

```
┌─────────────────────────────────────────────┐
│  Third-party IPPB / CSC / Aadhaar app       │
│  (e.g. com.ippb.bcas, com.csc.vle)          │
│                                             │
│  taps "Capture Fingerprint" ─────┐          │
└──────────────────────────────────┼──────────┘
                                   │ Intent: in.gov.uidai.rdservice.fp.CAPTURE
                                   ▼
┌─────────────────────────────────────────────┐
│  IppbAccessibilityService (our APK)         │
│  • Watches AccessibilityEvent.TYPE_*        │
│  • Detects RD Service intent broadcast      │
│  • Reads PidOptions from clipboard / EXTRAS │
│  • Pushes captureRequest to Firestore       │
│  • Shows overlay: "Forwarded to PC"         │
└──────────────────────────────────┬──────────┘
                                   │ Firestore relay
                                   ▼
┌─────────────────────────────────────────────┐
│  Retailer PC Agent (.NET WPF)               │
│  • Receives captureRequest snapshot         │
│  • Calls real RD Service device             │
│  • Writes back PID XML + hash               │
└──────────────────────────────────┬──────────┘
                                   │ Firestore snapshot
                                   ▼
┌─────────────────────────────────────────────┐
│  IppbAccessibilityService                   │
│  • Receives captured PID XML                │
│  • Injects into source app's EditText via   │
│    AccessibilityNodeInfo.ACTION_SET_TEXT    │
│  • Falls back to clipboard + ACTION_PASTE   │
│  • Dismisses overlay                        │
└─────────────────────────────────────────────┘
```

## Folder layout

```
app/src/main/
  AndroidManifest.xml
  java/com/eisolutions/interceptor/
    InterceptorApp.kt                  ← @HiltAndroidApp
    MainActivity.kt                    ← onboarding + permission grant flow
    service/IppbAccessibilityService.kt← core interception engine
    service/OverlayController.kt       ← SYSTEM_ALERT_WINDOW banner
    service/InjectionEngine.kt         ← writes PID back into source app
    relay/CaptureRelay.kt              ← Firestore captureRequests bridge
    relay/PackageWhitelist.kt          ← Firestore-driven app allowlist
    crypto/SessionCrypto.kt            ← AES-GCM per-capture key
    ui/OnboardingScreen.kt             ← step-by-step permission UI (Malayalam)
    ui/StatusScreen.kt                 ← live capture log + on/off toggle
  res/xml/accessibility_service_config.xml
  res/values/strings.xml               ← Malayalam + English strings
```

## Build (Android Studio)

1. Open `native/android-interceptor/` in Android Studio Hedgehog or newer.
2. Drop the same `google-services.json` (prod) into `app/`.
3. Set `signingConfigs.release` to your upload key.
4. `Build → Generate Signed Bundle → APK` (sideload only — Play Store
   forbids generic AccessibilityServices used outside their declared purpose;
   we ship via direct APK install on staff tablets).

## Build (CLI)

```bash
cd native/android-interceptor
./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

## Permissions (granted once on first launch)

| Permission | Why | How |
|---|---|---|
| `BIND_ACCESSIBILITY_SERVICE` | Detect RD Service capture intents from any app | Settings → Accessibility → EI SOLUTIONS Interceptor → On |
| `SYSTEM_ALERT_WINDOW` | Show "Capturing on PC…" overlay above the host app | Settings → Apps → Special access → Display over other apps → On |
| `POST_NOTIFICATIONS` (Android 13+) | Background capture status notification | Auto-prompt on first run |
| `INTERNET` | Firestore relay | Manifest only — no user prompt |

## Runtime config (Firestore `config/interceptor`)

```json
{
  "enabled": true,
  "whitelistedPackages": [
    "com.ippb.bcas",
    "com.csc.vle",
    "in.gov.uidai.aadhaarfacerd",
    "com.mantra.rdservice",
    "com.scl.rdservice"
  ],
  "captureTimeoutSeconds": 90,
  "injectionMode": "set_text",
  "fallbackToClipboard": true
}
```

Flip flags without rebuilding the APK.

## What is NOT included

- UIDAI AUA/KUA license (must be obtained separately).
- Magisk / root — interceptor works on stock Android via Accessibility API only.
- Code-signing certificate.

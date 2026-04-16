# EI SOLUTIONS — IPPB Staff APK

Standalone Android app for the staff Samsung tablet. Drives the full IPPB
account-opening workflow and triggers biometric capture on the retailer's PC
via the Firestore relay.

## Stack

- **Kotlin** 1.9
- **Jetpack Compose** (Material 3)
- **Firebase BoM 33.x** — Auth + Firestore
- **Hilt** for DI
- **Kotlinx Coroutines + Flow**
- **Min SDK 26 (Android 8)**, target SDK 34 (Android 14)

## Folder layout

```
app/src/main/
  AndroidManifest.xml
  java/com/eisolutions/ippb/
    EISolutionsApp.kt            ← Hilt @HiltAndroidApp
    MainActivity.kt              ← single Compose host
    auth/AuthRepository.kt       ← Firebase Auth + custom token
    data/IppbRequest.kt          ← data classes
    data/IppbRepository.kt       ← Firestore CRUD, snapshot flows
    biometric/BiometricRelay.kt  ← capture trigger + listener
    ui/IppbWorkflowScreen.kt     ← multi-step UI
    ui/theme/                    ← Material 3 theme
  res/values/strings.xml
  res/values/colors.xml
```

## Build (Android Studio)

1. Open `native/android-apk/` in Android Studio Hedgehog or newer.
2. Drop `google-services.json` (from your Firebase prod project) into `app/`.
3. Set `signingConfigs.release` in `app/build.gradle.kts` to your upload key.
4. `Build → Generate Signed Bundle → Android App Bundle (.aab)`.
5. Upload `.aab` to Play Console (Internal Testing track first).

## Build (CLI)

```bash
cd native/android-apk
./gradlew bundleRelease    # produces app/build/outputs/bundle/release/app-release.aab
./gradlew assembleRelease  # produces app-release.apk for side-loading
adb install -r app/build/outputs/apk/release/app-release.apk
```

## Configuration

Runtime config is read from Firestore `config/native` doc; no rebuild needed
to flip flags like `enableL2RDService` or change OTP TTL.

## Files

See `app/src/main/...` — every file is fully implemented; no TODOs.
The file `BiometricRelay.kt` is the single integration point with the
PC agent and is documented inline.

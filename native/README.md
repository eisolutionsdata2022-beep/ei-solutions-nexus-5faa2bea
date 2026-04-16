# EI SOLUTIONS — IPPB Native Components

This folder contains the **production source code** for the two native pieces
that complete the IPPB Account Opening biometric-redirection workflow:

| Component | Folder | Stack | Runs on |
|---|---|---|---|
| Standalone IPPB workflow APK | `android-apk/` | Kotlin + Jetpack Compose + Firebase BoM | Staff Samsung tablet |
| Retailer biometric agent | `pc-agent-wpf/` | .NET 8 WPF + Firestore .NET SDK | Retailer Windows PC |
| Integration spec | `docs/` | Markdown | n/a |

The web app in `src/` already implements the **Firestore relay contract** that
both native components consume. They are interoperable from day one.

---

## Quick architecture

```
+-----------------------+      Firestore relay       +-------------------------+
| Android APK (staff)   | <------------------------> | .NET WPF agent (retailer)|
|  - IPPB form UI       |   ippbRequests/{id}/       |  - Tray icon + modal     |
|  - Biometric trigger  |   captureRequests/{cid}    |  - RD Service caller     |
|  - Snapshot listener  |                            |  - AES-GCM encrypt       |
+-----------------------+                            +-------------------------+
        ^                                                       |
        | Firebase Auth (custom token)                          | RDSERVICE / CAPTURE
        |                                                       v
        |                                              +-------------------+
        |                                              | Mantra / Morpho   |
        |                                              | Startek RD device |
        |                                              +-------------------+
```

## Build order

1. Read `docs/API_CONTRACT.md` — understand the data model & endpoints.
2. Read `docs/SECURITY.md` — set up Firebase, RSA keypair, AES rotation.
3. Build & sign the APK (`android-apk/BUILD.md`).
4. Build & sign the PC agent (`pc-agent-wpf/BUILD.md`).
5. Pilot with one retailer/staff pair using L1 simulation.
6. Switch to L2 RD Service after AUA/KUA license is in place.

## What this codebase does NOT include

- AUA/KUA license — must be obtained from UIDAI.
- Production Firebase service-account JSON — keep in your secret store.
- Code-signing certificate (Authenticode for .exe, upload key for APK).
- Play Store / MSIX listing assets.

See `docs/NEXT_STEPS.md` for the full production checklist.

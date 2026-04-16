# EI SOLUTIONS — IPPB PC Agent (.NET 8 WPF)

Windows tray application that runs on the **retailer's PC** and bridges the
Firestore relay to the locally-installed **RD Service** (Mantra / Morpho /
Startek). When the staff tablet APK requests a biometric capture, this agent:

1. Pops a tray notification + modal with customer details.
2. Calls the RD Service over `127.0.0.1:1110x`.
3. Hashes the PID block (SHA-256) and writes it back to Firestore.
4. Auto-starts at Windows login as a per-user app.

## Stack

- **.NET 8** (LTS) + **WPF** (Windows-only as requested).
- **Google.Cloud.Firestore** 3.x (gRPC under the hood).
- **CommunityToolkit.Mvvm** for INotifyPropertyChanged.
- **H.NotifyIcon.Wpf** for tray icon.
- **MSIX** packaging for distribution + auto-update.

## Folder layout

```
EISolutions.IppbAgent/
  EISolutions.IppbAgent.csproj
  App.xaml / App.xaml.cs                   ← startup, DI bootstrap
  appsettings.json                         ← config (Firebase project id, etc.)
  Models/
    CaptureRequest.cs
    RdServiceInfo.cs
  Services/
    AuthService.cs                         ← Firebase custom-token sign-in
    FirestoreListener.cs                   ← collectionGroup snapshot listener
    RdServiceClient.cs                     ← RDSERVICE + CAPTURE HTTP calls
    BiometricProcessor.cs                  ← orchestrates capture + hash + upload
    SecureStorage.cs                       ← DPAPI for refresh token
    NotificationService.cs                 ← toast + modal
  Views/
    LoginWindow.xaml                       ← initial sign-in
    CaptureModal.xaml                      ← Accept / Reject prompt
    TrayMenu.xaml                          ← right-click menu
```

## Build

Prerequisites: Windows 10/11, .NET 8 SDK, Visual Studio 2022 17.8+.

```powershell
cd native\pc-agent-wpf
dotnet restore
dotnet build -c Release
dotnet publish EISolutions.IppbAgent -c Release -r win-x64 --self-contained true `
  -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
```

Output: `EISolutions.IppbAgent\bin\Release\net8.0-windows\win-x64\publish\EISolutions.IppbAgent.exe`

## Sign

```powershell
signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a `
  EISolutions.IppbAgent.exe
```

Then wrap in MSIX with the **MSIX Packaging Tool** (free from Microsoft Store)
for clean install/uninstall and auto-update via `AppInstaller`.

## Distribute

Host the signed `.msix` + `.appinstaller` at
`https://download.eisoluions.xyz/agent/`. Retailers double-click the
`.appinstaller` file once; Windows handles all future updates automatically.

## Configuration

`appsettings.json` is read at startup. The Firebase project id and the
backend custom-token endpoint live there. Secrets (refresh token) are stored
via DPAPI in `%LOCALAPPDATA%\EISolutions\IppbAgent\creds.dat`.

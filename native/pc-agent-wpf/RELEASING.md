# PC Agent CI/CD — Releasing a New Version

The build workflow lives at the repo root: `.github/workflows/pc-agent-build.yml`.
It uses a `windows-latest` GitHub-hosted runner, so **you do not need a local
Windows machine** to produce the `.exe`.

## Triggering a release

```bash
# 1. Bump version in the csproj if you want (optional — workflow stamps it from the tag)
# 2. Tag and push:
git tag pc-agent-v1.0.0
git push origin pc-agent-v1.0.0
```

The workflow will:
1. Spin up a Windows runner.
2. Restore + publish a self-contained single-file exe (`win-x64`, ~25 MB).
3. (Optional) Code-sign the exe if signing secrets are configured.
4. Compute SHA-256 alongside the exe.
5. Create a GitHub Release named `PC Agent 1.0.0` with the exe + checksum attached.

The download URL referenced by `/install` and `/retailer/ippb`:
```
https://github.com/<owner>/<repo>/releases/latest/download/EISolutions.IppbAgent.Setup.exe
```
…will go live automatically once the release is published.

## Test build without releasing

Go to **Actions → Build & Release WPF PC Agent → Run workflow**.
Output appears in the run's *Artifacts* section (kept 30 days, no Release created).

## Code signing (recommended for production)

Without signing, Windows SmartScreen will warn users on first install.
To eliminate the warning, buy an OV/EV code-signing certificate
(Sectigo / DigiCert / SSL.com — ~₹15,000–50,000/year), then:

1. Export the cert as a `.pfx` file with a password.
2. Base64-encode it:
   ```bash
   base64 -w 0 codesign.pfx > codesign.pfx.b64
   ```
3. In the GitHub repo → **Settings → Secrets and variables → Actions**, add:
   - `CODE_SIGN_PFX_BASE64` — paste the contents of `codesign.pfx.b64`
   - `CODE_SIGN_PFX_PASSWORD` — the .pfx password

The workflow auto-detects these and signs the exe with a Sectigo timestamp.
If the secrets are absent, the build still succeeds — just unsigned.

## Updating the download link

The current link in `src/routes/install.tsx` and `src/routes/retailer.ippb.tsx`
points to:
```
https://github.com/eisolutionsdata2022-beep/ei-solutions-nexus-49a3c1e4/releases/latest/download/...
```

Replace `eisolutionsdata2022-beep/ei-solutions-nexus-49a3c1e4` with the actual `<owner>/<repo>` of the
GitHub repo that hosts this codebase (the one connected via Lovable's GitHub
integration). The `/releases/latest/download/...` pattern always serves the
newest release, so you never need to update the URL again after that.

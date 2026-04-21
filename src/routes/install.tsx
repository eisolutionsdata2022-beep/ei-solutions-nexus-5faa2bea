import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  Monitor,
  Apple,
  Download,
  Share2,
  CheckCircle2,
  Banknote,
  Fingerprint,
  Cpu,
  AlertTriangle,
  ShieldCheck,
  Terminal,
  Loader2,
  ExternalLink,
  XCircle,
  RefreshCw,
  Activity,
  HelpCircle,
} from "lucide-react";

// GitHub repo that hosts the PC Agent releases (built by .github/workflows/pc-agent-build.yml)
const GH_OWNER = "eisolutionsdata2022-beep";
const GH_REPO = "ei-solutions-nexus-49a3c1e4";
const GH_API_LATEST = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/releases/latest`;
const GH_RELEASES_PAGE = `https://github.com/${GH_OWNER}/${GH_REPO}/releases`;
const GH_ACTIONS_PAGE = `https://github.com/${GH_OWNER}/${GH_REPO}/actions/workflows/pc-agent-build.yml`;
const ASSET_NAME = "EISolutions.IppbAgent.Setup.exe";

interface ReleaseInfo {
  status: "loading" | "ready" | "missing" | "error";
  version?: string;
  downloadUrl?: string;
  sizeMB?: string;
  publishedAt?: string;
  errorMsg?: string;
}

function useLatestRelease(): ReleaseInfo {
  const [info, setInfo] = useState<ReleaseInfo>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(GH_API_LATEST, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (cancelled) return;
        if (res.status === 404) {
          setInfo({ status: "missing" });
          return;
        }
        if (!res.ok) {
          setInfo({ status: "error", errorMsg: `HTTP ${res.status}` });
          return;
        }
        const data = await res.json();
        const asset = (data.assets || []).find(
          (a: { name: string }) => a.name === ASSET_NAME,
        );
        if (!asset) {
          setInfo({
            status: "missing",
            errorMsg: "Release exists but .exe asset not uploaded yet.",
          });
          return;
        }
        setInfo({
          status: "ready",
          version: data.tag_name?.replace(/^pc-agent-v/, "") || data.name,
          downloadUrl: asset.browser_download_url,
          sizeMB: (asset.size / 1024 / 1024).toFixed(1),
          publishedAt: data.published_at,
        });
      } catch (err) {
        if (cancelled) return;
        setInfo({
          status: "error",
          errorMsg: err instanceof Error ? err.message : "Network error",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}

export const Route = createFileRoute("/install")({
  ssr: false,
  component: InstallPage,
  head: () => ({
    meta: [
      { title: "Install EI SOLUTIONS App" },
      {
        name: "description",
        content:
          "Install EI SOLUTIONS as a native-feel app on Samsung tablets, Android phones, Windows PCs, and iPads — no Play Store needed.",
      },
    ],
  }),
});

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-gov-blue text-white flex items-center justify-center text-sm font-bold">
        {n}
      </div>
      <div className="flex-1 text-sm pt-0.5">{children}</div>
    </div>
  );
}

function ReleaseDownloadCard() {
  const release = useLatestRelease();

  if (release.status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <Loader2 className="w-4 h-4 animate-spin" />
        GitHub-ൽ release status check ചെയ്യുന്നു…
      </div>
    );
  }

  if (release.status === "ready" && release.downloadUrl) {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        <a
          href={release.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border-2 border-amber-500 bg-amber-500 hover:bg-amber-600 text-white p-4 transition-colors"
        >
          <Download className="w-6 h-6 shrink-0" />
          <div className="flex-1">
            <div className="font-bold text-sm">PC Agent Download (.exe)</div>
            <div className="text-[11px] opacity-90">
              v{release.version} · {release.sizeMB} MB · Windows 10/11
            </div>
          </div>
        </a>
        <a
          href={GH_RELEASES_PAGE}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border-2 border-gov-blue/40 bg-white hover:bg-gov-blue/5 p-4 transition-colors"
        >
          <Terminal className="w-6 h-6 shrink-0 text-gov-blue" />
          <div className="flex-1">
            <div className="font-bold text-sm text-gov-blue">All Releases / Source</div>
            <div className="text-[11px] text-muted-foreground">
              GitHub · പഴയ versions + SHA-256 checksum
            </div>
          </div>
        </a>
      </div>
    );
  }

  // status === "missing" or "error"
  return (
    <div className="space-y-3">
      <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4 text-sm text-red-900">
        <p className="font-bold flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4" />
          PC Agent .exe ഇതുവരെ publish ചെയ്തിട്ടില്ല
        </p>
        <p className="text-xs leading-relaxed">
          GitHub repository-യിൽ <code className="bg-white/60 px-1 rounded">pc-agent-v*</code>{" "}
          tag push ചെയ്യുമ്പോൾ automatic build + release ആകും. ഇതുവരെ ആ tag push ചെയ്തിട്ടില്ല,
          അല്ലെങ്കിൽ workflow run പൂർത്തിയായിട്ടില്ല.
          {release.errorMsg && (
            <span className="block mt-1 opacity-75">Detail: {release.errorMsg}</span>
          )}
        </p>
      </div>

      <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4 text-sm text-blue-900 space-y-2">
        <p className="font-bold">🛠️ Repository owner-നുള്ള fix:</p>
        <ol className="list-decimal pl-5 space-y-1 text-xs">
          <li>
            GitHub repo-യിൽ പോകുക → <strong>Actions</strong> tab open ചെയ്യുക.
          </li>
          <li>
            <strong>"Build &amp; Release WPF PC Agent"</strong> workflow select ചെയ്യുക.
          </li>
          <li>
            <strong>"Run workflow"</strong> button click ചെയ്ത് manually trigger ചെയ്യുക,
            അല്ലെങ്കിൽ terminal-ൽ:
            <pre className="bg-white/70 p-2 rounded mt-1 overflow-x-auto text-[10px]">
              git tag pc-agent-v1.0.0{"\n"}git push origin pc-agent-v1.0.0
            </pre>
          </li>
          <li>
            ~5 minutes കാത്തിരിക്കുക → release publish ആകും → ഈ page reload ചെയ്യുക.
          </li>
        </ol>
        <div className="flex flex-wrap gap-2 pt-2">
          <a
            href={GH_ACTIONS_PAGE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded bg-gov-blue text-white px-3 py-1.5 text-xs font-medium hover:bg-gov-blue/90"
          >
            <ExternalLink className="w-3 h-3" />
            Open GitHub Actions
          </a>
          <a
            href={GH_RELEASES_PAGE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded border border-gov-blue text-gov-blue px-3 py-1.5 text-xs font-medium hover:bg-gov-blue/5"
          >
            <ExternalLink className="w-3 h-3" />
            View Releases Page
          </a>
        </div>
      </div>

      <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-xs text-green-900 flex gap-2">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>അതുവരെ:</strong> Browser-based <strong>L1 simulation</strong> ഉപയോഗിച്ച്
          IPPB workflow test ചെയ്യാം. Real MFS110 LED activation-ന് മാത്രമേ ഈ .exe ആവശ്യമുള്ളൂ.
        </span>
      </div>
    </div>
  );
}

function InstallPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gov-blue/5 to-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gov-blue text-white mb-2">
            <Download className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold">EI SOLUTIONS App ഇൻസ്റ്റാൾ ചെയ്യുക</h1>
          <p className="text-muted-foreground">
            Play Store വേണ്ട — Browser-ൽ നിന്ന് നേരിട്ട് APK പോലെ install ചെയ്യാം.
          </p>
        </div>

        {/* Android / Samsung Tablet */}
        <Card className="border-gov-blue/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-gov-blue" />
              Samsung Tablet / Android Phone (Staff)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Step n={1}>
              Tablet-ൽ <strong>Chrome browser</strong> open ചെയ്യുക.
            </Step>
            <Step n={2}>
              ഈ URL type ചെയ്യുക:{" "}
              <code className="bg-muted px-2 py-0.5 rounded text-xs">
                eisoluions.xyz/install
              </code>
            </Step>
            <Step n={3}>
              Browser-ന്റെ menu (⋮) tap ചെയ്ത് <strong>"Install app"</strong> അല്ലെങ്കിൽ{" "}
              <strong>"Add to Home screen"</strong> select ചെയ്യുക.
            </Step>
            <Step n={4}>
              Home screen-ൽ <strong>EI SOLUTIONS</strong> icon വരും. അത് tap
              ചെയ്താൽ APK പോലെ fullscreen open ആകും.
            </Step>
            <Step n={5}>
              Login ചെയ്ത് <Link to="/staff" className="text-gov-blue underline">
                Staff Dashboard
              </Link>{" "}
              → IPPB workflow ഉപയോഗിക്കുക.
            </Step>
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-900 flex gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              Updates automatic. APK reinstall ചെയ്യേണ്ട ആവശ്യമില്ല.
            </div>
          </CardContent>
        </Card>

        {/* Windows PC */}
        <Card className="border-gov-blue/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-gov-blue" />
              Retailer PC (Windows / Mac / Linux)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Step n={1}>
              <strong>Chrome</strong> അല്ലെങ്കിൽ <strong>Edge</strong> browser-ൽ{" "}
              <code className="bg-muted px-2 py-0.5 rounded text-xs">
                eisoluions.xyz
              </code>{" "}
              open ചെയ്യുക.
            </Step>
            <Step n={2}>
              Address bar-ന്റെ വലത് വശത്ത് <strong>install icon (⊕)</strong> click
              ചെയ്യുക, അല്ലെങ്കിൽ menu → <strong>"Install EI SOLUTIONS"</strong>.
            </Step>
            <Step n={3}>
              Desktop-ൽ shortcut വരും. Open ചെയ്ത് retailer account-ൽ login ചെയ്യുക.
            </Step>
            <Step n={4}>
              <Link to="/retailer/ippb" className="text-gov-blue underline">
                Retailer IPPB page
              </Link>{" "}
              background-ൽ open ആയി ഇടുക — Staff biometric request അയക്കുമ്പോൾ{" "}
              <Fingerprint className="inline w-4 h-4 text-gov-blue" /> modal pops + beep!
            </Step>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              💡 <strong>Tip:</strong> Browser tab close ചെയ്യരുത് — biometric requests
              receive ചെയ്യാൻ page open ആയിരിക്കണം.
            </div>
          </CardContent>
        </Card>

        {/* iOS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Apple className="w-5 h-5 text-gov-blue" />
              iPad / iPhone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Step n={1}>
              <strong>Safari</strong> browser-ൽ open ചെയ്യുക (Chrome iOS-ൽ install support
              ചെയ്യില്ല).
            </Step>
            <Step n={2}>
              <Share2 className="inline w-4 h-4" /> <strong>Share</strong> button tap
              ചെയ്ത് → <strong>"Add to Home Screen"</strong> select ചെയ്യുക.
            </Step>
          </CardContent>
        </Card>

        {/* WPF PC Agent — Real MFS110 LED activation */}
        <Card className="border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-600" />
              Real Fingerprint Device Agent (Optional)
              <span className="ml-auto text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                MFS110 LED ON
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-white border border-amber-200 p-3 text-sm">
              <p className="font-semibold text-amber-900 mb-1">എന്തിനാണ് ഇത്?</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Browser-ന് MFS110 / Mantra / Morpho fingerprint device-മായി direct
                connect ചെയ്യാൻ കഴിയില്ല (CORS restriction). Real <strong>LED light</strong>{" "}
                തെളിയണമെങ്കിലും, customer-ന്റെ <strong>real fingerprint</strong> capture
                ചെയ്യണമെങ്കിലും, ഈ <strong>PC Agent (.exe)</strong> retailer PC-യിൽ ഒരു തവണ
                install ചെയ്യണം. ഇല്ലെങ്കിൽ system <strong>L1 simulation hash</strong> മാത്രം
                return ചെയ്യും (testing-ന് മതി, real IPPB submit-ന് പോര).
              </p>
            </div>

            {/* Live release detector — replaces hardcoded 404 link */}
            <ReleaseDownloadCard />

            {/* DETAILED Install steps — step by step */}
            <div className="space-y-3 rounded-lg border-2 border-gov-blue/30 bg-white p-4">
              <p className="text-base font-bold text-gov-blue flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download &amp; Install — Step-by-Step Guide
              </p>

              <Step n={1}>
                <strong>Browser open ചെയ്യുക</strong> (Chrome / Edge) retailer PC-യിൽ.
              </Step>

              <Step n={2}>
                മുകളിലെ orange <strong>"PC Agent Download (.exe)"</strong> button click ചെയ്യുക.
                ഇത് നേരിട്ട് GitHub-ൽ നിന്ന്{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs break-all">
                  EISolutions.IppbAgent.Setup.exe
                </code>{" "}
                file (~25 MB) download ചെയ്യും.
              </Step>

              <Step n={3}>
                Browser-ന്റെ താഴെ <strong>"Keep"</strong> അല്ലെങ്കിൽ <strong>"Download anyway"</strong>{" "}
                click ചെയ്യുക (Chrome ചിലപ്പോൾ unsigned exe block ചെയ്യും — ഇത് normal ആണ്).
              </Step>

              <Step n={4}>
                Download folder open ചെയ്ത് <strong>EISolutions.IppbAgent.Setup.exe</strong>-ൽ{" "}
                <strong>double-click</strong> ചെയ്യുക.
              </Step>

              <Step n={5}>
                Windows <strong>SmartScreen warning</strong> വരും → <strong>"More info"</strong>{" "}
                click ചെയ്ത് → <strong>"Run anyway"</strong> അമർത്തുക.
                <span className="block text-xs text-muted-foreground mt-1">
                  (Code-signing certificate add ചെയ്യുന്നതുവരെ ഈ warning കാണിക്കും — safe ആണ്.)
                </span>
              </Step>

              <Step n={6}>
                <strong>UAC prompt</strong> (Yes/No window) വന്നാൽ → <strong>"Yes"</strong> click ചെയ്യുക.
              </Step>

              <Step n={7}>
                Installer wizard വരും → <strong>"Next → Install → Finish"</strong> click ചെയ്യുക.
                Default install location <code className="bg-muted px-1.5 py-0.5 rounded text-xs">C:\Program Files\EI Solutions\IPPB Agent\</code>.
              </Step>

              <Step n={8}>
                Desktop-ൽ <strong>EI IPPB Agent</strong> icon വരും → <strong>double-click</strong>{" "}
                ചെയ്ത് open ചെയ്യുക.
              </Step>

              <Step n={9}>
                Login window-ൽ portal-ലെ <strong>same retailer email + password</strong> enter
                ചെയ്ത് <strong>"Sign In"</strong> click ചെയ്യുക.
              </Step>

              <Step n={10}>
                <strong>MFS110 / Mantra / Morpho fingerprint device</strong> USB port-ൽ connect
                ചെയ്യുക. <em>Mantra RD Service driver</em> installed ആണെങ്കിൽ agent automatic
                detect ചെയ്യും ("Device: Connected ✅").
                <span className="block text-xs text-muted-foreground mt-1">
                  Driver ഇല്ലെങ്കിൽ:{" "}
                  <a
                    href="https://download.mantratecmis.com/Downloads/RDService/MFS110/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gov-blue underline"
                  >
                    Mantra RD Service download ചെയ്യുക
                  </a>{" "}
                  → install → PC restart.
                </span>
              </Step>

              <Step n={11}>
                Agent window-ൽ താഴെ <ShieldCheck className="inline w-3.5 h-3.5 text-green-600" />{" "}
                <strong className="text-green-700">"Listening for capture requests…"</strong>{" "}
                എന്ന് കാണിക്കണം. System tray-ലും (clock-ന്റെ അടുത്ത്) green icon വരും.
              </Step>

              <Step n={12}>
                Agent <strong>minimize</strong> ചെയ്യാം — background-ൽ silently run ചെയ്യും.
                Tray icon right-click → <strong>"Start with Windows"</strong> enable ചെയ്താൽ
                PC restart ആയാലും automatic start ആകും.
              </Step>

              <Step n={13}>
                <strong>Test:</strong> Browser-ൽ{" "}
                <Link to="/retailer/ippb" className="text-gov-blue underline font-semibold">
                  /retailer/ippb
                </Link>{" "}
                open ചെയ്ത് വയ്ക്കുക. Staff biometric request അയക്കുമ്പോൾ:
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
                  <li>🔔 Browser-ൽ beep + capture modal pops</li>
                  <li>💡 MFS110 LED <strong>blue/red</strong> ആയി തെളിയും</li>
                  <li>👆 Customer finger വയ്ക്കുമ്പോൾ real PID XML capture ആകും</li>
                  <li>✅ Hash automatic ആയി staff tablet-ലേക്ക് relay ആകും</li>
                </ul>
              </Step>
            </div>

            {/* Troubleshooting */}
            <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900">
              <p className="font-bold text-sm">🔧 Common Issues / Troubleshooting:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>"Device: Not detected"</strong> → Mantra RD Service running ആണോ check
                  ചെയ്യുക (Services.msc → "Mantra RD Service" → Start). USB cable replug ചെയ്യുക.
                </li>
                <li>
                  <strong>Login fail ആകുന്നു</strong> → Portal-ൽ same email/password work
                  ചെയ്യുന്നുണ്ടോ test ചെയ്യുക. Internet connection check ചെയ്യുക.
                </li>
                <li>
                  <strong>"Listening" കാണുന്നില്ല</strong> → Windows Firewall-ൽ EI IPPB Agent-ന്
                  permission allow ചെയ്യുക. Antivirus temporarily disable ചെയ്ത് retry.
                </li>
                <li>
                  <strong>Modal pop ആകുന്നില്ല</strong> → Browser tab active ആയിരിക്കണം. Same
                  retailer account-ൽ login ആണോ confirm ചെയ്യുക.
                </li>
                <li>
                  <strong>Update ചെയ്യാൻ:</strong> പുതിയ release വന്നാൽ വീണ്ടും download → install
                  (overwrite). Settings retain ആകും.
                </li>
              </ul>
            </div>

            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-900 flex gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Security:</strong> Raw fingerprint ഒരിക്കലും store ചെയ്യില്ല.
                SHA-256 encrypted hash മാത്രം Firestore-ലൂടെ relay ചെയ്യും. AES + HTTPS.
              </span>
            </div>
          </CardContent>
        </Card>


        <Card className="bg-gov-blue text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Banknote className="w-5 h-5" />
              IPPB Biometric Relay Workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>1.</strong> Staff (tablet PWA) → Customer details + L2 Remote Capture click
            </p>
            <p>
              <strong>2.</strong> Retailer PC (browser PWA) → Modal pops + beep 🔔
            </p>
            <p>
              <strong>3.</strong> Retailer → Fingerprint capture (RD Service auto-detect, അല്ലെങ്കിൽ L1 simulation)
            </p>
            <p>
              <strong>4.</strong> Hash → real-time Firestore relay → Staff tablet
            </p>
            <p>
              <strong>5.</strong> Staff → Submit → IPPB account created ✅
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

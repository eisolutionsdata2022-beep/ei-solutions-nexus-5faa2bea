import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";

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

            {/* Download buttons */}
            <div className="grid sm:grid-cols-2 gap-3">
              <a
                href="https://github.com/eisolutions/ippb-pc-agent/releases/latest/download/EISolutions.IppbAgent.Setup.exe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border-2 border-amber-500 bg-amber-500 hover:bg-amber-600 text-white p-4 transition-colors"
              >
                <Download className="w-6 h-6 shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-sm">PC Agent Download</div>
                  <div className="text-[11px] opacity-90">Windows 10/11 · ~25 MB</div>
                </div>
              </a>
              <a
                href="https://github.com/eisolutions/ippb-pc-agent"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border-2 border-gov-blue/40 bg-white hover:bg-gov-blue/5 p-4 transition-colors"
              >
                <Terminal className="w-6 h-6 shrink-0 text-gov-blue" />
                <div className="flex-1">
                  <div className="font-bold text-sm text-gov-blue">Source Code</div>
                  <div className="text-[11px] text-muted-foreground">.NET 8 WPF · self-build</div>
                </div>
              </a>
            </div>

            <div className="rounded-lg bg-amber-100 border border-amber-300 p-3 text-xs text-amber-900 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Status:</strong> Installer build pending. ഇപ്പോൾ source code മാത്രമേ
                ലഭ്യമുള്ളൂ (<code className="bg-white/60 px-1 rounded">native/pc-agent-wpf/</code>).
                Admin team build ചെയ്ത് signed installer release ചെയ്യുന്നതുവരെ retailer-മാർ
                <strong> L1 simulation</strong> mode-ൽ continue ചെയ്യാം.
              </span>
            </div>

            {/* Install steps */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gov-blue">Installation Steps:</p>
              <Step n={1}>
                മുകളിലെ <strong>"PC Agent Download"</strong> button click ചെയ്ത്{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  EISolutions.IppbAgent.Setup.exe
                </code>{" "}
                download ചെയ്യുക.
              </Step>
              <Step n={2}>
                Windows-ൽ <strong>SmartScreen warning</strong> വന്നാൽ → "More info" →{" "}
                <strong>"Run anyway"</strong> click ചെയ്യുക (signed certificate add ചെയ്യുന്നതുവരെ).
              </Step>
              <Step n={3}>
                Installer follow ചെയ്യുക → Desktop-ൽ <strong>EI IPPB Agent</strong> shortcut വരും.
              </Step>
              <Step n={4}>
                Agent open ചെയ്യുക → retailer email + password type ചെയ്ത് login ചെയ്യുക
                (PWA-യിലെ same credentials).
              </Step>
              <Step n={5}>
                <strong>MFS110 device</strong> USB-യിൽ connect ചെയ്യുക → Mantra RD Service
                driver install ചെയ്യപ്പെട്ടിട്ടുണ്ടെങ്കിൽ agent automatic detect ചെയ്യും.
              </Step>
              <Step n={6}>
                Agent system tray-ൽ <ShieldCheck className="inline w-3.5 h-3.5 text-green-600" />{" "}
                <strong>"Listening"</strong> എന്ന് കാണിക്കും — ഇനി Staff biometric request
                അയക്കുമ്പോൾ <strong>MFS110 LED തെളിയും</strong> + real PID block capture
                ചെയ്ത് IPPB-യിലേക്ക് auto-inject ചെയ്യും. ✅
              </Step>
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

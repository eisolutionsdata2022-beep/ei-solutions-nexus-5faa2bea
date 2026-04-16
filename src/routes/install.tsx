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

        {/* Workflow summary */}
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

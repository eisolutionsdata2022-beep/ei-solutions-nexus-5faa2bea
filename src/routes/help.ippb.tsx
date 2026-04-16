import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote, Users, UserCog, Shield, ArrowLeft, Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getIPPBFeeConfig, netRetailerCost, type IPPBFeeConfig, DEFAULT_IPPB_FEE } from "@/lib/ippb-fee-config";

export const Route = createFileRoute("/help/ippb")({
  ssr: false,
  component: IPPBHelpPage,
});

function IPPBHelpPage() {
  const [cfg, setCfg] = useState<IPPBFeeConfig>(DEFAULT_IPPB_FEE);
  useEffect(() => { getIPPBFeeConfig().then(setCfg); }, []);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Banknote className="w-8 h-8 text-gov-blue" /> IPPB അക്കൗണ്ട് ഓപ്പണിങ് — Help
        </h1>
        <p className="text-muted-foreground mt-1">
          Retailer + Staff workflow, fees, commissions — എല്ലാം മലയാളത്തിൽ.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-gov-blue" /> ഫീ വിശദാംശങ്ങൾ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>ഒരു IPPB അക്കൗണ്ട് successful ആയി ഓപ്പൺ ചെയ്യുമ്പോൾ:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Retailer wallet-ൽ നിന്ന് <strong>₹{cfg.serviceCharge}</strong> debit ആകും</li>
            <li>Retailer-ന് തിരികെ commission: <strong>₹{cfg.retailerCommission}</strong></li>
            <li>Staff-ന് commission: <strong>₹{cfg.staffCommission}</strong></li>
            <li>Admin-ന്: <strong>₹{cfg.adminCommission}</strong></li>
            <li><strong>Retailer-ന്റെ net cost = ₹{netRetailerCost(cfg)}</strong></li>
          </ul>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
            ⚠ Failed / Cancelled ആയാൽ <strong>ഒരു rupee-യും charge ആകില്ല</strong>. Success-നു മാത്രമേ debit നടക്കൂ.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gov-saffron" /> Retailer-ന്റെ steps
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Customer വന്നാൽ</strong> /retailer/ippb തുറക്കുക → "New Request" click.</li>
            <li>Staff request claim ചെയ്യും. Staff customer-ന്റെ mobile number type ചെയ്യും.</li>
            <li>Customer-ന്റെ phone-ൽ OTP വരും. <strong>Customer-നോട് OTP ചോദിച്ച്</strong> retailer dashboard-ൽ enter ചെയ്യുക.</li>
            <li>Staff OTP verify ചെയ്ത്, customer details + biometric capture ചെയ്യും.</li>
            <li>Real fingerprint device (MFS110) ഉണ്ടെങ്കിൽ <Link to="/install" className="text-gov-blue underline">PC Agent install ചെയ്യുക</Link>. ഇല്ലെങ്കിൽ L1 simulation ഉപയോഗിക്കും.</li>
            <li>Account number വന്ന് success ആകുമ്പോൾ wallet-ൽ നിന്ന് charge + commission distribute ആകും.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-gov-green" /> Staff-ന്റെ steps
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ol className="list-decimal pl-5 space-y-2">
            <li>/staff/ippb തുറന്ന് <strong>Active</strong> tab-ൽ pending requests നോക്കുക.</li>
            <li>ഒരു request click ചെയ്ത് <strong>"Claim This Request"</strong> button അമർത്തുക.</li>
            <li>Customer-ന്റെ 10-digit mobile enter ചെയ്ത് <strong>"Send OTP"</strong>. (Real IPPB tablet-ൽ ഇത് type ചെയ്യണം.)</li>
            <li>Retailer OTP relay ചെയ്യുമ്പോൾ ദുപ്പിച്ച fonts-ൽ display ആകും → IPPB tablet-ൽ enter ചെയ്ത് <strong>"Verified"</strong> press ചെയ്യുക.</li>
            <li>Customer details (Name, DOB, Aadhaar, PAN, Address, Nominee) ഫിൽ ചെയ്യുക.</li>
            <li>Biometric capture: Remote PC Agent (real device) അല്ലെങ്കിൽ L1 simulation.</li>
            <li>IPPB account number വന്നാൽ enter ചെയ്ത് <strong>"Mark Success"</strong>. ഈ moment-ൽ retailer wallet debit + എല്ലാ commissions auto-credit ആകും.</li>
            <li>Failed ആയാൽ <strong>"Mark Failed"</strong> — റീടെയിലർക്ക് <strong>charge ഇല്ല</strong>.</li>
          </ol>
        </CardContent>
      </Card>

      <Card className="border-gov-saffron/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-gov-saffron" /> Tablet Interceptor APK — Install Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p>
            Staff tablet-ൽ <strong>വേറെ ഏതെങ്കിലും IPPB / CSC / Aadhaar app</strong> (ഉദാ: IPPB BCAS, CSC VLE) ഉപയോഗിക്കുമ്പോഴും, അതിൻ്റെ fingerprint capture call <strong>retailer-ൻ്റെ Windows PC</strong> യിലേക്ക് redirect ചെയ്യാൻ ഈ <strong>EI SOLUTIONS Interceptor APK</strong> install ചെയ്യണം.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="font-semibold text-blue-900 mb-2">📥 Install Steps:</p>
            <ol className="list-decimal pl-5 space-y-1 text-blue-900">
              <li>Tablet-ൽ <strong>Settings → Security → Unknown Sources / Install unknown apps</strong> ഓൺ ചെയ്യുക.</li>
              <li><code>EISolutionsInterceptor.apk</code> download ചെയ്ത് tap ചെയ്ത് install ചെയ്യുക.</li>
              <li>App തുറന്ന് staff email + password (main IPPB APK-ലെ same credentials) sign in ചെയ്യുക.</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded p-3">
            <p className="font-semibold text-amber-900 mb-2">🔐 Permission Steps (നിർബന്ധം):</p>
            <ol className="list-decimal pl-5 space-y-2 text-amber-900">
              <li>
                <strong>Accessibility Service:</strong><br />
                Settings → Accessibility → <em>EI SOLUTIONS Interceptor</em> → ഓൺ ചെയ്യുക.<br />
                <span className="text-xs">→ ഇതാണ് മറ്റു apps-ലെ "Capture Fingerprint" button detect ചെയ്യുന്നത്.</span>
              </li>
              <li>
                <strong>Display over other apps:</strong><br />
                Settings → Apps → Special access → Display over other apps → <em>EI SOLUTIONS Interceptor</em> → Allow.<br />
                <span className="text-xs">→ "🔒 Retailer PC യിൽ capture നടക്കുന്നു…" overlay banner കാണിക്കാൻ.</span>
              </li>
              <li>
                <strong>Notifications</strong> (Android 13+): App തുറക്കുമ്പോൾ prompt വരും → Allow.
              </li>
              <li>
                <strong>Battery optimization</strong> ഒഴിവാക്കുക: Settings → Battery → App battery usage → Interceptor → <em>Unrestricted</em>.<br />
                <span className="text-xs">→ Background-ൽ kill ആകാതിരിക്കാൻ.</span>
              </li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="font-semibold text-green-900 mb-2">✅ Verify it works:</p>
            <ol className="list-decimal pl-5 space-y-1 text-green-900">
              <li>Retailer-ൻ്റെ PC യിൽ <Link to="/install" className="underline">EI SOLUTIONS PC Agent</Link> run ചെയ്യുന്നുണ്ടെന്ന് ഉറപ്പാക്കുക + MFS110 / Mantra device plug ചെയ്യുക.</li>
              <li>Tablet-ൽ ഏതെങ്കിലും whitelisted IPPB app തുറന്ന് "Capture Fingerprint" press ചെയ്യുക.</li>
              <li>Tablet-ൻ്റെ മുകളിൽ <strong>"🔒 Retailer PC യിൽ capture നടക്കുന്നു…"</strong> banner വരണം.</li>
              <li>Retailer-ൻ്റെ PC യിൽ capture modal pop-up ആകും → finger വയ്ക്കുക.</li>
              <li>Captured PID XML automatic ആയി tablet-ലെ source app-ലേക്ക് <strong>inject</strong> ആകും.</li>
            </ol>
          </div>

          <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900">
            <p className="font-semibold mb-1">⚠ Important Notes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Whitelist Admin <Link to="/admin/ippb-settings" className="underline">/admin/ippb-settings</Link> ലൂടെ control ചെയ്യാം — Firestore <code>config/interceptor.whitelistedPackages</code>.</li>
              <li>Default whitelist: <code>com.ippb.bcas</code>, <code>com.csc.vle</code>, <code>in.gov.uidai.aadhaarfacerd</code>, <code>com.mantra.rdservice</code>, <code>com.scl.rdservice</code>.</li>
              <li>Play Store-ൽ ഈ APK ഇല്ല — generic AccessibilityService-കൾ ban ചെയ്തിട്ടുണ്ട്. <strong>Direct sideload മാത്രം</strong>.</li>
              <li>Capture data end-to-end AES-GCM encrypted ആണ് — Firestore-ൽ plaintext store ആവില്ല.</li>
            </ul>
          </div>

          <Button asChild variant="default" className="w-full">
            <a
              href="https://github.com/eisolutions/ippb-interceptor/releases/latest/download/EISolutionsInterceptor.apk"
              target="_blank"
              rel="noreferrer"
            >
              <Download className="w-4 h-4 mr-2" /> Download Interceptor APK
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gov-blue" /> Admin Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            Admin <Link to="/admin/ippb-settings" className="text-gov-blue underline font-medium">/admin/ippb-settings</Link> ലൂടെ:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Service charge (debit amount) മാറ്റാം</li>
            <li>Retailer / Staff / Admin commission split control ചെയ്യാം</li>
            <li>Live preview-ൽ retailer-ന്റെ net cost കാണാം</li>
            <li>Splits service charge-ൽ കൂടരുത് — system block ചെയ്യും</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

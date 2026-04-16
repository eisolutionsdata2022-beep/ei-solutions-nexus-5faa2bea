/**
 * Install PWA prompt — small floating banner that appears when the browser
 * fires `beforeinstallprompt`. Lets staff install the app on Samsung tablets
 * (and retailers on PCs) like a native APK, without going through Play Store.
 *
 * - Hidden inside Lovable preview iframes (avoids editor noise).
 * - Dismissible; remembers dismissal for 7 days via localStorage.
 * - No service worker is registered (per platform constraints).
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "ei_pwa_install_dismissed_at";
const DISMISS_DAYS = 7;

function isInsideIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost() {
  const h = window.location.hostname;
  return (
    h.includes("id-preview--") ||
    h.includes("lovableproject.com") ||
    h.includes("lovable.app") && h.includes("id-preview")
  );
}

function recentlyDismissed() {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    const ts = Number(v);
    if (!ts) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function InstallPWAPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isInsideIframe() || isPreviewHost()) return;
    if (recentlyDismissed()) return;

    // Already installed → don't prompt
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;
    if ((navigator as any).standalone === true) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari does not fire beforeinstallprompt — show manual hint
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    if (isIOS && isSafari) {
      setIosHint(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setEvt(null);
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[min(92vw,420px)] rounded-xl border border-gov-blue/30 bg-white shadow-2xl p-4 flex items-start gap-3">
      <div className="rounded-lg bg-gov-blue/10 p-2 shrink-0">
        <Smartphone className="w-6 h-6 text-gov-blue" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gov-blue">Install EI SOLUTIONS</p>
        {iosHint ? (
          <p className="text-xs text-muted-foreground mt-1">
            Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to install this app on your iPad / iPhone.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            Install on your tablet / PC to use it like a native app — fullscreen, fast, with a home-screen icon.
          </p>
        )}
        {!iosHint && (
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleInstall} className="h-8">
              <Download className="w-4 h-4" /> Install
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss} className="h-8">
              Later
            </Button>
          </div>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

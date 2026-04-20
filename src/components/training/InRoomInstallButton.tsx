/**
 * In-room "Install App" call-to-action for mobile students.
 * - Triggers PWA install prompt when available.
 * - Falls back to /install page link.
 * - Hidden inside Lovable preview iframe.
 */
import { useEffect, useState } from "react";
import { Smartphone, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isInsideIframe() {
  try { return window.self !== window.top; } catch { return true; }
}

export function InRoomInstallButton() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isInsideIframe()) return;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;
    if (window.matchMedia?.("(display-mode: standalone)").matches) { setInstalled(true); return; }
    if ((navigator as any).standalone === true) { setInstalled(true); return; }

    setShow(true);
    const onBI = (e: Event) => { e.preventDefault(); setEvt(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", onBI);
    return () => window.removeEventListener("beforeinstallprompt", onBI);
  }, []);

  const install = async () => {
    if (evt) {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setShow(false);
      }
      setEvt(null);
    } else {
      // fallback — open the Install page in a new tab with manual instructions
      window.open("/install", "_blank", "noopener");
    }
  };

  if (!show || installed) return null;

  return (
    <button
      onClick={install}
      title="Install for the smoothest experience"
      className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 hover:from-emerald-500/30 hover:to-blue-500/30 border border-emerald-400/40 text-emerald-100 text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all"
    >
      <Smartphone className="w-3 h-3" />
      <span className="hidden sm:inline">Install app</span>
      <Download className="w-3 h-3 sm:hidden" />
    </button>
  );
}

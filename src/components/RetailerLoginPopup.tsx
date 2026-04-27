import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeLoginPopupConfig,
  shouldShowLoginPopup,
  loginPopupSeenKey,
  type LoginPopupConfig,
} from "@/lib/login-popup-config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";

/**
 * Auto-shown popup for retailers right after login.
 * Renders nothing for non-retailers or when popup is disabled / already dismissed for this version.
 */
export function RetailerLoginPopup() {
  const { appUser } = useAuth();
  const [cfg, setCfg] = useState<LoginPopupConfig | null>(null);
  const [open, setOpen] = useState(false);

  // Subscribe to admin-managed config
  useEffect(() => {
    if (!appUser || appUser.role !== "retailer") return;
    const unsub = subscribeLoginPopupConfig(setCfg);
    return unsub;
  }, [appUser?.uid, appUser?.role]);

  // Decide visibility whenever config or user changes
  useEffect(() => {
    if (!appUser || appUser.role !== "retailer" || !cfg) {
      setOpen(false);
      return;
    }
    if (!shouldShowLoginPopup(cfg, appUser.uid)) {
      setOpen(false);
      return;
    }
    try {
      const key = loginPopupSeenKey(appUser.uid);
      const lastSeen = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (lastSeen === cfg.version && cfg.version !== "") {
        setOpen(false);
        return;
      }
    } catch {
      // ignore storage errors – still show the popup
    }
    setOpen(true);
  }, [appUser?.uid, appUser?.role, cfg]);

  const handleClose = () => {
    setOpen(false);
    if (appUser && cfg?.version) {
      try {
        window.localStorage.setItem(loginPopupSeenKey(appUser.uid), cfg.version);
      } catch {
        // ignore
      }
    }
  };

  if (!appUser || appUser.role !== "retailer" || !cfg) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gov-blue">
            <Megaphone className="w-5 h-5" />
            {cfg.title || "Announcement"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Message from administrator
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed py-2">
          {cfg.message}
        </div>
        <DialogFooter>
          <Button onClick={handleClose} className="bg-gov-blue text-white font-bold">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

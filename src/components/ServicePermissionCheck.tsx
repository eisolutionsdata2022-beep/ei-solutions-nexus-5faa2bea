import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PLATFORM_SERVICES } from "@/lib/platform-services";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

/**
 * Hook to get set of disabled service keys from platformServices collection.
 * Also checks legacy "services" collection for backward compatibility.
 */
export function useDisabledServices() {
  const [disabledKeys, setDisabledKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Listen to platformServices collection
    const unsub = onSnapshot(
      collection(db, "platformServices"),
      (snap) => {
        const disabled = new Set<string>();
        snap.forEach((d) => {
          const data = d.data();
          if (data.enabled === false) {
            disabled.add(d.id); // key like "recharge-bbps"
          }
        });
        setDisabledKeys(disabled);
      },
      (error) => {
        console.warn("[ServicePermissionCheck] platformServices listener skipped:", error.message);
        setDisabledKeys(new Set());
      },
    );
    return unsub;
  }, []);

  return disabledKeys;
}

/**
 * Check if a retailer route is blocked based on disabled service keys.
 */
export function isRouteBlocked(pathname: string, disabledKeys: Set<string>): string | null {
  for (const svc of PLATFORM_SERVICES) {
    if (svc.route && pathname.startsWith(svc.route) && disabledKeys.has(svc.key)) {
      return svc.name;
    }
  }
  return null;
}

/**
 * Dialog shown when a retailer tries to use a disabled service
 */
export function ServiceBlockedDialog({
  open,
  onClose,
  serviceName,
}: {
  open: boolean;
  onClose: () => void;
  serviceName: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldX className="w-5 h-5" />
            No Permission
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{serviceName || "This service"}</strong> is currently disabled by the administrator. 
            Please contact admin for more details.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose}>OK</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

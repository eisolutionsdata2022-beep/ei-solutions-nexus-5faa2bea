import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

interface DisabledService {
  id: string;
  name: string;
  enabled: boolean;
}

/**
 * Hook to get list of disabled services (admin-controlled)
 */
export function useDisabledServices() {
  const [disabledServices, setDisabledServices] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "services"), (snap) => {
      const disabled = new Set<string>();
      snap.forEach((d) => {
        const data = d.data();
        if (data.enabled === false) {
          disabled.add(data.name);
        }
      });
      setDisabledServices(disabled);
    });
    return unsub;
  }, []);

  return disabledServices;
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

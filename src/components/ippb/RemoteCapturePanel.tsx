/**
 * Staff-side panel: trigger biometric capture on retailer's PC and watch the
 * Firestore relay until the retailer returns a hash, then write it into the
 * IPPB request via staffCaptureBiometric.
 */
import { useEffect, useRef, useState } from "react";
import {
  staffCancelCaptureRequest,
  staffCreateCaptureRequest,
  subscribeCaptureRequest,
  type CaptureRequest,
} from "@/lib/ippb-biometric-relay";
import {
  staffCaptureBiometric1,
  staffCaptureBiometric2,
  staffCaptureBiometricFinal,
} from "@/lib/ippb-firebase";
import type { IPPBStep } from "@/lib/ippb-types";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2, Radio, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  ippbRequestId: string;
  staffId: string;
  retailerId: string;
  alreadyCaptured?: boolean;
  disabled?: boolean;
}

export function RemoteCapturePanel({
  ippbRequestId,
  staffId,
  retailerId,
  alreadyCaptured,
  disabled,
}: Props) {
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [row, setRow] = useState<CaptureRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const handled = useRef(false);

  useEffect(() => {
    if (!captureId) return;
    handled.current = false;
    return subscribeCaptureRequest(ippbRequestId, captureId, setRow);
  }, [ippbRequestId, captureId]);

  // Once retailer returns the capture, persist into the IPPB request once.
  useEffect(() => {
    if (!row || handled.current) return;
    if (row.status === "captured" && row.hash) {
      handled.current = true;
      (async () => {
        try {
          await staffCaptureBiometric(ippbRequestId, staffId, {
            mode: row.mode === "L2_RD_SERVICE" ? "L2_DEVICE" : "L1_SIMULATION",
            capturedAt: row.capturedAt ?? new Date().toISOString(),
            hash: row.hash!,
            deviceId: row.deviceModel,
            staffConfirmed: true,
          });
          toast.success(
            row.mode === "L2_RD_SERVICE"
              ? "Biometric received from retailer (L2 RD Service)"
              : "Biometric received from retailer (L1 simulation)"
          );
          setCaptureId(null);
          setRow(null);
        } catch (e: any) {
          toast.error(e.message ?? "Failed to save biometric");
        }
      })();
    }
    if (row.status === "failed" || row.status === "timeout" || row.status === "cancelled") {
      handled.current = true;
      toast.error(`Capture ${row.status}: ${row.errorMessage ?? "no response"}`);
      setCaptureId(null);
      setRow(null);
    }
  }, [row, ippbRequestId, staffId]);

  const trigger = async () => {
    setBusy(true);
    try {
      const id = await staffCreateCaptureRequest(ippbRequestId, staffId, retailerId);
      setCaptureId(id);
      toast.info("Capture request sent to retailer device");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!captureId) return;
    try {
      await staffCancelCaptureRequest(ippbRequestId, captureId, staffId);
    } catch {}
    setCaptureId(null);
    setRow(null);
  };

  if (captureId) {
    return (
      <div className="rounded-lg border-2 border-gov-blue/40 bg-gov-blue/5 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-gov-blue">
          <Radio className="w-4 h-4 animate-pulse" />
          {row?.status === "capturing"
            ? "Retailer is capturing fingerprint…"
            : "Waiting for retailer to capture…"}
        </div>
        <p className="text-xs text-muted-foreground">
          IPPB biometric call has been redirected through the middleware to the
          retailer's PC. Customer should place finger on retailer's device.
        </p>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs font-mono">capture id: {captureId.slice(0, 8)}…</span>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={cancel}>
            <X className="w-3 h-3" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      className="flex-1"
      variant="default"
      disabled={busy || disabled || alreadyCaptured}
      onClick={trigger}
      title="Redirects IPPB biometric call to retailer's fingerprint device"
    >
      <Fingerprint className="w-4 h-4" />
      {alreadyCaptured ? "Re-capture (Retailer Device)" : "L2 Remote Capture (Retailer Device)"}
    </Button>
  );
}

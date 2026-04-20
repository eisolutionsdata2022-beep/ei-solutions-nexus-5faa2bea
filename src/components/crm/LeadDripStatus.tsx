import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, StopCircle } from "lucide-react";
import { subscribeEnrollment, stopEnrollmentManual } from "@/lib/drip-firebase";
import type { DripEnrollment } from "@/lib/drip-types";

interface Props { leadId: string }

export function LeadDripStatus({ leadId }: Props) {
  const [enr, setEnr] = useState<DripEnrollment | null>(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => subscribeEnrollment(leadId, setEnr), [leadId]);

  if (!enr) return null;

  async function handleStop() {
    setStopping(true);
    try {
      await stopEnrollmentManual(leadId, "Stopped from lead detail");
      toast.success("Drip stopped for this lead");
    } catch (e: any) {
      toast.error(e?.message || "Failed to stop");
    } finally {
      setStopping(false);
    }
  }

  const next = enr.nextSendAt ? new Date(enr.nextSendAt).toLocaleString() : "—";
  const isActive = enr.status === "active";

  return (
    <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Zap className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">WhatsApp Auto-Drip</span>
        <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
          {enr.status.replace("stopped_", "stopped: ")}
        </Badge>
        <Badge variant="outline" className="text-xs">step {enr.currentStep + 1}</Badge>
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        {isActive && <div>Next send: <strong>{next}</strong></div>}
        {enr.lastSentAt && <div>Last sent: {new Date(enr.lastSentAt).toLocaleString()}</div>}
        {enr.stoppedReason && <div>Reason: {enr.stoppedReason}</div>}
        {enr.failedReason && <div className="text-destructive">Error: {enr.failedReason}</div>}
      </div>
      {isActive && (
        <Button size="sm" variant="outline" onClick={handleStop} disabled={stopping}>
          <StopCircle className="h-3.5 w-3.5 mr-1" /> {stopping ? "Stopping…" : "Stop drip"}
        </Button>
      )}
    </div>
  );
}

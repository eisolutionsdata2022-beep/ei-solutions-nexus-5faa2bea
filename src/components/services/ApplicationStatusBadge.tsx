import { Badge } from "@/components/ui/badge";
import { ApplicationStatus } from "@/lib/e-district";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

export function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  if (status === "Approved") {
    return (
      <Badge className="gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {status}
      </Badge>
    );
  }

  if (status === "Rejected") {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <XCircle className="h-3.5 w-3.5" />
        {status}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1.5">
      <Clock3 className="h-3.5 w-3.5" />
      {status}
    </Badge>
  );
}
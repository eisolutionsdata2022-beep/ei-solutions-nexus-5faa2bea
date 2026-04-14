import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { ShoppingBag, Clock, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/staff/")({
  ssr: false,
  component: StaffDashboard,
});

function StaffDashboard() {
  const { appUser } = useAuth();

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border-2 border-gov-blue bg-gov-blue/10 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <ShoppingBag className="w-4 h-4 text-gov-blue" />
            <span className="text-xs font-bold text-gov-blue">Services Processed</span>
          </div>
          <p className="text-2xl font-bold text-gov-blue">0</p>
        </div>
        <div className="rounded-lg border-2 border-warning bg-warning/10 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-xs font-bold text-warning">Pending</span>
          </div>
          <p className="text-2xl font-bold text-warning">0</p>
        </div>
        <div className="rounded-lg border-2 border-success bg-success/10 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-xs font-bold text-success">Completed</span>
          </div>
          <p className="text-2xl font-bold text-success">0</p>
        </div>
      </div>

      {/* Latest Updates placeholder */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="bg-gov-blue-light border-b border-border px-5 py-3">
          <h2 className="text-base font-bold text-gov-blue">Latest Updates</h2>
        </div>
        <div className="p-5 text-sm text-muted-foreground">
          No recent updates.
        </div>
      </div>
    </div>
  );
}

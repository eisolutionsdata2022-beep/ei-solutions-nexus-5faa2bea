import { createFileRoute } from "@tanstack/react-router";
import { CRMDashboard } from "@/components/crm/CRMDashboard";
import { StaffApplicationsDashboard } from "@/components/services/StaffApplicationsDashboard";

export const Route = createFileRoute("/staff/")({
  ssr: false,
  component: StaffHome,
});

function StaffHome() {
  return (
    <div className="space-y-8">
      <CRMDashboard />
      <StaffApplicationsDashboard />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { CRMDashboard } from "@/components/crm/CRMDashboard";

export const Route = createFileRoute("/staff/")({
  ssr: false,
  component: StaffHome,
});

function StaffHome() {
  return (
    <div className="space-y-8">
      <CRMDashboard />
    </div>
  );
}

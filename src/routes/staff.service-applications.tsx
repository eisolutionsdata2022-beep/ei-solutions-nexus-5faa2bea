import { createFileRoute } from "@tanstack/react-router";
import { StaffApplicationsDashboard } from "@/components/services/StaffApplicationsDashboard";

export const Route = createFileRoute("/staff/service-applications")({
  ssr: false,
  component: StaffServiceApplications,
});

function StaffServiceApplications() {
  return <StaffApplicationsDashboard />;
}

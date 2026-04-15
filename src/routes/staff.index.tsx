import { createFileRoute } from "@tanstack/react-router";
import { StaffApplicationsDashboard } from "@/components/services/StaffApplicationsDashboard";

export const Route = createFileRoute("/staff/")({
  ssr: false,
  component: StaffDashboard,
});

function StaffDashboard() {
  return <StaffApplicationsDashboard />;
}

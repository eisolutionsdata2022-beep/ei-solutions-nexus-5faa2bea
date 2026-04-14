import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RouteGuard } from "@/components/RouteGuard";

export const Route = createFileRoute("/distributor")({
  ssr: false,
  component: () => (
    <RouteGuard allowedRoles={["distributor"]}>
      <DashboardLayout />
    </RouteGuard>
  ),
});

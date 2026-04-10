import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RouteGuard } from "@/components/RouteGuard";

export const Route = createFileRoute("/retailer")({
  component: () => (
    <RouteGuard allowedRoles={["retailer"]}>
      <DashboardLayout />
    </RouteGuard>
  ),
});

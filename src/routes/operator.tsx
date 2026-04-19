import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RouteGuard } from "@/components/RouteGuard";

export const Route = createFileRoute("/operator")({
  ssr: false,
  component: () => (
    <RouteGuard allowedRoles={["operator"]}>
      <DashboardLayout />
    </RouteGuard>
  ),
});

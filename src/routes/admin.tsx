import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RouteGuard } from "@/components/RouteGuard";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: () => (
    <RouteGuard allowedRoles={["admin"]}>
      <DashboardLayout />
    </RouteGuard>
  ),
});

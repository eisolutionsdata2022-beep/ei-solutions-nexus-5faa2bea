import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RouteGuard } from "@/components/RouteGuard";

export const Route = createFileRoute("/trainer")({
  ssr: false,
  component: () => (
    <RouteGuard allowedRoles={["trainer"]}>
      <DashboardLayout />
    </RouteGuard>
  ),
});

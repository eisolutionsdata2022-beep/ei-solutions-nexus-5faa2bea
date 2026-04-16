import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RouteGuard } from "@/components/RouteGuard";
import { WalletGate } from "@/components/WalletGate";

export const Route = createFileRoute("/retailer")({
  ssr: false,
  component: () => (
    <RouteGuard allowedRoles={["retailer"]}>
      <WalletGate>
        <DashboardLayout />
      </WalletGate>
    </RouteGuard>
  ),
});

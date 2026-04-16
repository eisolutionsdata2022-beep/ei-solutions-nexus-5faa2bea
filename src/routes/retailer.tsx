import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RouteGuard } from "@/components/RouteGuard";
import { useDisabledServices, isRouteBlocked, ServiceBlockedDialog } from "@/components/ServicePermissionCheck";

export const Route = createFileRoute("/retailer")({
  ssr: false,
  component: RetailerLayout,
});

function RetailerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const disabledKeys = useDisabledServices();
  const [blockedName, setBlockedName] = useState("");
  const [showBlocked, setShowBlocked] = useState(false);

  useEffect(() => {
    // Don't block dashboard itself
    if (location.pathname === "/retailer" || location.pathname === "/retailer/") return;
    
    const blocked = isRouteBlocked(location.pathname, disabledKeys);
    if (blocked) {
      setBlockedName(blocked);
      setShowBlocked(true);
    }
  }, [location.pathname, disabledKeys]);

  return (
    <RouteGuard allowedRoles={["retailer"]}>
      <DashboardLayout />
      <ServiceBlockedDialog
        open={showBlocked}
        onClose={() => {
          setShowBlocked(false);
          navigate({ to: "/retailer" });
        }}
        serviceName={blockedName}
      />
    </RouteGuard>
  );
}

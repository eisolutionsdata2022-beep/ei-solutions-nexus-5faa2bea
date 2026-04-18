import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RouteGuard } from "@/components/RouteGuard";
import {
  useDisabledServices,
  isRouteBlocked,
  ServiceBlockedDialog,
} from "@/components/ServicePermissionCheck";
import { useAuth } from "@/lib/auth-context";
import { PLATFORM_SERVICES } from "@/lib/platform-services";
import {
  isServiceAllowedForUser,
  type ServicePlan,
  type UserPermissionDoc,
} from "@/lib/user-permissions";

export const Route = createFileRoute("/retailer")({
  ssr: false,
  component: RetailerLayout,
});

function RetailerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const disabledKeys = useDisabledServices();
  const { appUser } = useAuth();
  const [perm, setPerm] = useState<UserPermissionDoc | null>(null);
  const [plan, setPlan] = useState<ServicePlan | null>(null);
  const [blockedName, setBlockedName] = useState("");
  const [showBlocked, setShowBlocked] = useState(false);

  // Subscribe to current user's permissions
  useEffect(() => {
    if (!appUser?.uid) return;
    return onSnapshot(doc(db, "userPermissions", appUser.uid), (snap) => {
      setPerm(snap.exists() ? (snap.data() as UserPermissionDoc) : null);
    });
  }, [appUser?.uid]);

  // Subscribe to assigned plan (if any)
  useEffect(() => {
    if (!perm?.planId) { setPlan(null); return; }
    return onSnapshot(doc(db, "servicePlans", perm.planId), (snap) => {
      setPlan(snap.exists() ? ({ id: snap.id, ...snap.data() } as ServicePlan) : null);
    });
  }, [perm?.planId]);

  useEffect(() => {
    // Don't block dashboard itself
    if (location.pathname === "/retailer" || location.pathname === "/retailer/") return;

    // 1. Global toggle (existing behavior)
    const globalBlocked = isRouteBlocked(location.pathname, disabledKeys);
    if (globalBlocked) {
      setBlockedName(globalBlocked);
      setShowBlocked(true);
      return;
    }

    // 2. User-specific (plan + overrides)
    const matched = PLATFORM_SERVICES.find(
      (s) => s.route && location.pathname.startsWith(s.route),
    );
    if (matched) {
      const allowed = isServiceAllowedForUser(matched.key, {
        globalDisabled: disabledKeys,
        plan,
        overrides: perm?.overrides,
      });
      if (!allowed) {
        setBlockedName(matched.name);
        setShowBlocked(true);
      }
    }
  }, [location.pathname, disabledKeys, perm, plan]);

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

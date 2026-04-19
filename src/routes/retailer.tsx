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
import {
  getActivatableServices,
  listActivationConfigs,
  subscribeUserActivations,
  type ActivationConfig,
} from "@/lib/service-activation";

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
  const [needsActivation, setNeedsActivation] = useState(false);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [actConfigs, setActConfigs] = useState<Record<string, ActivationConfig>>({});

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

  // Subscribe to user's activations
  useEffect(() => {
    if (!appUser?.uid) return;
    return subscribeUserActivations(appUser.uid, (set) => setActiveKeys(set));
  }, [appUser?.uid]);

  // Load activation configs (one-shot; updated when admin saves)
  useEffect(() => {
    listActivationConfigs().then(setActConfigs);
  }, []);

  useEffect(() => {
    setNeedsActivation(false);
    // Don't gate dashboard / my-services / wallet / kyc / transactions
    const path = location.pathname;
    if (
      path === "/retailer" || path === "/retailer/" ||
      path.startsWith("/retailer/my-services") ||
      path.startsWith("/retailer/wallet") ||
      path.startsWith("/retailer/kyc") ||
      path.startsWith("/retailer/transactions")
    ) return;

    // 1. Global toggle
    const globalBlocked = isRouteBlocked(path, disabledKeys);
    if (globalBlocked) {
      setBlockedName(globalBlocked);
      setShowBlocked(true);
      return;
    }

    const matched = PLATFORM_SERVICES.find(
      (s) => s.route && path.startsWith(s.route),
    );
    if (!matched) return;

    // 2. Plan / per-user override
    const allowed = isServiceAllowedForUser(matched.key, {
      globalDisabled: disabledKeys,
      plan,
      overrides: perm?.overrides,
    });
    if (!allowed) {
      setBlockedName(matched.name);
      setShowBlocked(true);
      return;
    }

    // 3. Activation gate (highest priority for activatable services)
    const cfg = actConfigs[matched.key];
    const isActivatable = getActivatableServices().some((s) => s.key === matched.key);
    if (isActivatable && cfg?.enabled && !activeKeys.has(matched.key)) {
      setBlockedName(matched.name);
      setNeedsActivation(true);
    }
  }, [location.pathname, disabledKeys, perm, plan, activeKeys, actConfigs]);

  return (
    <RouteGuard allowedRoles={["retailer", "staffSub"]}>
      <DashboardLayout />
      <ServiceBlockedDialog
        open={showBlocked}
        onClose={() => {
          setShowBlocked(false);
          navigate({ to: "/retailer" });
        }}
        serviceName={blockedName}
      />
      <ServiceBlockedDialog
        open={needsActivation}
        onClose={() => {
          setNeedsActivation(false);
          navigate({ to: "/retailer/my-services" });
        }}
        serviceName={`${blockedName} — please activate it from My Services first.`}
      />
    </RouteGuard>
  );
}

import { useAuth, type UserRole } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface RouteGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RouteGuard({ allowedRoles, children }: RouteGuardProps) {
  const { appUser, loading } = useAuth();
  const navigate = useNavigate();
  // Stabilise allowedRoles so the effect below isn't retriggered every render
  // (parent components pass an inline array, which is a new reference each render
  // and used to cause an infinite navigation loop).
  const rolesKey = allowedRoles.join("|");

  useEffect(() => {
    if (loading) return;
    if (!appUser) {
      navigate({ to: "/" });
      return;
    }
    const roles = rolesKey.split("|") as UserRole[];
    if (!roles.includes(appUser.role)) {
      navigate({ to: `/${appUser.role}` as any });
    }
    // navigate intentionally omitted — TanStack's useNavigate result is stable
    // by identity but including it caused the infinite loop in some versions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser, loading, rolesKey]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!appUser || !allowedRoles.includes(appUser.role)) {
    return null;
  }

  return <>{children}</>;
}

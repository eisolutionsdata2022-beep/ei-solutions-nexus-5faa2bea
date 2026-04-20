import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { FinanceAuthProvider, useFinanceAuth } from "@/lib/finance-auth-context";

export const Route = createFileRoute("/finance")({
  ssr: false,
  component: FinancePortalLayout,
});

function FinancePortalLayout() {
  return (
    <FinanceAuthProvider>
      <FinancePortalGate />
    </FinanceAuthProvider>
  );
}

function FinancePortalGate() {
  const { user, loading } = useFinanceAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isLoginPage = location.pathname === "/finance/login";

  useEffect(() => {
    if (loading) return;
    if (!user && !isLoginPage) {
      navigate({ to: "/finance/login" as any, replace: true });
    } else if (user && isLoginPage) {
      navigate({ to: "/finance" as any, replace: true });
    }
  }, [user, loading, isLoginPage, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="animate-pulse text-sm">Securing your session…</div>
      </div>
    );
  }

  if (!user && !isLoginPage) return null;

  return <Outlet />;
}

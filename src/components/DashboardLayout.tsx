import { Outlet, useLocation } from "@tanstack/react-router";
import { AppSidebar } from "@/components/AppSidebar";
import { PortalHeader } from "@/components/PortalHeader";
import { PortalFooter } from "@/components/PortalFooter";
import { MobileSidebar } from "@/components/MobileSidebar";
import { WalletGate } from "@/components/WalletGate";
import { BiometricCaptureListener } from "@/components/ippb/BiometricCaptureListener";

export function DashboardLayout() {
  const location = useLocation();
  const isWalletPage = location.pathname.includes("/wallet");

  return (
    <div className="flex flex-col min-h-screen w-full">
      <PortalHeader />
      <div className="flex flex-1 min-h-0">
        <AppSidebar />
        <MobileSidebar />
        <main className="relative flex-1 overflow-auto bg-background">
          {/* Subtle premium background */}
          <div className="pointer-events-none absolute inset-0 bg-hero-grad opacity-40" aria-hidden />
          <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-20" aria-hidden />
          <div className="relative p-4 lg:p-6">
            {isWalletPage ? <Outlet /> : (
              <WalletGate>
                <Outlet />
              </WalletGate>
            )}
          </div>
        </main>
      </div>
      <PortalFooter />
      <BiometricCaptureListener />
    </div>
  );
}

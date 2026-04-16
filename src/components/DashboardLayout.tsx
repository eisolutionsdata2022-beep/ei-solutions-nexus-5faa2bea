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
        <main className="flex-1 p-4 lg:p-6 overflow-auto bg-background">
          {isWalletPage ? <Outlet /> : (
            <WalletGate>
              <Outlet />
            </WalletGate>
          )}
        </main>
      </div>
      <PortalFooter />
      <BiometricCaptureListener />
    </div>
  );
}

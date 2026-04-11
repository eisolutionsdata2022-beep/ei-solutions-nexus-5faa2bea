import { Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/AppSidebar";
import { PortalHeader } from "@/components/PortalHeader";
import { PortalFooter } from "@/components/PortalFooter";
import { MobileSidebar } from "@/components/MobileSidebar";

export function DashboardLayout() {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <PortalHeader />
      <div className="flex flex-1 min-h-0">
        <AppSidebar />
        <MobileSidebar />
        <main className="flex-1 p-4 lg:p-6 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
      <PortalFooter />
    </div>
  );
}

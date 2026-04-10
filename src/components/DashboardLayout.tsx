import { Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/AppSidebar";

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <main className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

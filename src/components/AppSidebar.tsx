import { Link, useLocation } from "@tanstack/react-router";
import { useAuth, type UserRole } from "@/lib/auth-context";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText as CVIcon,
  Banknote,
  Users,
  Wallet,
  Settings,
  FileText,
  GraduationCap,
  ShoppingBag,
  ClipboardList,
  LogOut,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
}

const navByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
    { label: "Users", to: "/admin/users", icon: Users },
    { label: "KYC Requests", to: "/admin/kyc", icon: ClipboardList },
    { label: "Services", to: "/admin/services", icon: ShoppingBag },
    { label: "Wallets", to: "/admin/wallets", icon: Wallet },
    { label: "Trainings", to: "/admin/trainings", icon: GraduationCap },
    { label: "Training Settings", to: "/admin/training-settings", icon: Settings },
    { label: "Forms", to: "/admin/forms", icon: FileText },
  ],
  distributor: [
    { label: "Dashboard", to: "/distributor", icon: LayoutDashboard },
    { label: "Wallet", to: "/distributor/wallet", icon: Wallet },
  ],
  retailer: [
    { label: "Dashboard", to: "/retailer", icon: LayoutDashboard },
    { label: "Services", to: "/retailer/services", icon: ShoppingBag },
    { label: "Wallet", to: "/retailer/wallet", icon: Wallet },
    { label: "Trainings", to: "/retailer/trainings", icon: GraduationCap },
    { label: "KYC", to: "/retailer/kyc", icon: ClipboardList },
  ],
  trainer: [
    { label: "Dashboard", to: "/trainer", icon: LayoutDashboard },
    { label: "Trainings", to: "/trainer/trainings", icon: GraduationCap },
    { label: "Wallet", to: "/trainer/wallet", icon: Wallet },
  ],
  staff: [
    { label: "Dashboard", to: "/staff", icon: LayoutDashboard },
    { label: "Services", to: "/staff/services", icon: ShoppingBag },
  ],
};

export function AppSidebar() {
  const { appUser, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!appUser) return null;

  const items = navByRole[appUser.role] || [];

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-sidebar-foreground text-sm">EI SOLUTIONS</h2>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{appUser.role} Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to as any}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3 px-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-xs font-semibold text-sidebar-primary">
            {appUser.name?.[0] || appUser.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-sidebar-foreground truncate">{appUser.name || appUser.email}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{appUser.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:text-destructive hover:bg-sidebar-accent/50 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-sidebar z-40 transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}

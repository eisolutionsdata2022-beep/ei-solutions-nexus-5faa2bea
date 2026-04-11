import { Link, useLocation } from "@tanstack/react-router";
import { useAuth, type UserRole } from "@/lib/auth-context";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText as CVIcon,
  Banknote,
  Users,
  UserPlus,
  Wallet,
  Settings,
  FileText,
  GraduationCap,
  ShoppingBag,
  ClipboardList,
  LogOut,
  User,
  BarChart3,
  Download,
  CheckCircle,
} from "lucide-react";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  badge?: number;
}

const navByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
    { label: "Users", to: "/admin/users", icon: Users },
    { label: "Create User", to: "/admin/create-user", icon: UserPlus },
    { label: "KYC Requests", to: "/admin/kyc", icon: ClipboardList },
    { label: "Services", to: "/admin/services", icon: ShoppingBag },
    { label: "Wallets", to: "/admin/wallets", icon: Wallet },
    { label: "Wallet Requests", to: "/admin/wallet-requests", icon: Banknote },
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
    { label: "Apply Service", to: "/retailer/services", icon: ShoppingBag },
    { label: "Transactions", to: "/retailer/transactions", icon: ArrowLeftRight },
    { label: "My Wallet", to: "/retailer/wallet", icon: Wallet },
    { label: "Money Transfer", to: "/retailer/money-transfer", icon: Banknote },
    { label: "CV Builder", to: "/retailer/cv-builder", icon: CVIcon },
    { label: "Trainings", to: "/retailer/trainings", icon: GraduationCap },
    { label: "KYC", to: "/retailer/kyc", icon: CheckCircle },
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

  if (!appUser) return null;

  const items = navByRole[appUser.role] || [];

  return (
    <aside className="hidden lg:flex flex-col w-56 bg-card border-r border-border min-h-0">
      {/* User welcome */}
      <div className="p-4 bg-gov-blue text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs opacity-70">Welcome</p>
            <p className="text-sm font-bold truncate">{appUser.name || appUser.email.split("@")[0]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to as any}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm border-l-4 transition-colors ${
                isActive
                  ? "border-gov-blue bg-gov-blue-light text-gov-blue font-semibold"
                  : "border-transparent text-foreground/80 hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm w-full bg-gov-gold text-white font-semibold hover:opacity-90 transition-opacity"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

import { Link, useLocation } from "@tanstack/react-router";
import { useAuth, type UserRole } from "@/lib/auth-context";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Sparkles,
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
  MessageSquare,
  BotMessageSquare,
  Briefcase,
  ShieldCheck,
  Gavel,
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
    { label: "CRM Leads", to: "/admin/crm-leads", icon: Users },
    { label: "CRM Reports", to: "/admin/crm-reports", icon: BarChart3 },
    { label: "Users", to: "/admin/users", icon: Users },
    { label: "Create User", to: "/admin/create-user", icon: UserPlus },
    { label: "KYC Requests", to: "/admin/kyc", icon: ClipboardList },
    { label: "Services", to: "/admin/services", icon: ShoppingBag },
    { label: "Service Plans", to: "/admin/service-plans", icon: ShieldCheck },
    { label: "Activation Charges", to: "/admin/service-activations-config", icon: Sparkles },
    { label: "Activations Log", to: "/admin/service-activations", icon: BarChart3 },
    { label: "Service Buttons", to: "/admin/service-buttons", icon: ShoppingBag },
    { label: "Recharge Txns", to: "/admin/recharge-transactions", icon: ArrowLeftRight },
    { label: "Wallets", to: "/admin/wallets", icon: Wallet },
    { label: "Wallet Requests", to: "/admin/wallet-requests", icon: Banknote },
    { label: "Horoscope", to: "/admin/horoscope-settings", icon: Sparkles },
    { label: "Matrimony", to: "/admin/matrimony", icon: Users },
    { label: "Trainings", to: "/admin/trainings", icon: GraduationCap },
    { label: "Training Settings", to: "/admin/training-settings", icon: Settings },
    { label: "Form Analytics", to: "/admin/form-analytics", icon: BarChart3 },
    { label: "Service Apps", to: "/admin/service-applications", icon: ClipboardList },
    { label: "Training Earnings", to: "/admin/training-earnings", icon: BarChart3 },
    { label: "Commissions", to: "/admin/commissions", icon: BarChart3 },
    { label: "Training Reviews", to: "/admin/training-reviews", icon: MessageSquare },
    { label: "Notice Board", to: "/admin/notices", icon: ClipboardList },
    { label: "Chat Inbox", to: "/admin/chat-inbox", icon: MessageSquare },
    { label: "Job Marketplace", to: "/admin/job-marketplace", icon: Briefcase },
    { label: "Job Earnings", to: "/admin/job-earnings", icon: BarChart3 },
    { label: "Job Disputes", to: "/admin/job-disputes", icon: Gavel },
    { label: "Work Badges", to: "/admin/work-badges", icon: ShieldCheck },
    { label: "IPPB Badges", to: "/admin/ippb-badges", icon: ShieldCheck },
    { label: "IPPB Settings", to: "/admin/ippb-settings", icon: Banknote },
    { label: "EI PAY Settings", to: "/admin/csc-settings", icon: Banknote },
    { label: "EI PAY Monitor", to: "/admin/csc-monitor", icon: BarChart3 },
    { label: "PAN Portal Settings", to: "/admin/pan-settings", icon: ShieldCheck },
    { label: "Finance Overview", to: "/admin/finance", icon: Banknote },
  ],
  distributor: [
    { label: "Dashboard", to: "/distributor", icon: LayoutDashboard },
    { label: "Earnings", to: "/distributor/earnings", icon: BarChart3 },
    { label: "Wallet", to: "/distributor/wallet", icon: Wallet },
  ],
  retailer: [
    { label: "Dashboard", to: "/retailer", icon: LayoutDashboard },
    { label: "My Services", to: "/retailer/my-services", icon: Sparkles },
    { label: "EI SOLUTIONS PAY", to: "/retailer/ei-pay", icon: Banknote },
    { label: "PAN Portal", to: "/retailer/pan-portal", icon: CVIcon },
    { label: "Recharge & BBPS", to: "/retailer/recharge", icon: Banknote },
    { label: "E-dis", to: "/retailer/services", icon: ShoppingBag },
    { label: "Horoscope", to: "/retailer/horoscope", icon: Sparkles },
    { label: "Matrimony", to: "/retailer/matrimony", icon: Users },
    { label: "Transactions", to: "/retailer/transactions", icon: ArrowLeftRight },
    { label: "My Wallet", to: "/retailer/wallet", icon: Wallet },
    { label: "Money Transfer", to: "/retailer/money-transfer", icon: Banknote },
    { label: "CV Builder", to: "/retailer/cv-builder", icon: CVIcon },
    { label: "Trainings", to: "/retailer/trainings", icon: GraduationCap },
    { label: "KYC", to: "/retailer/kyc", icon: CheckCircle },
    { label: "Virtual", to: "/retailer/virtual-trainer", icon: BotMessageSquare },
    { label: "Page Tools", to: "/retailer/page-tools", icon: FileText },
    { label: "Forms", to: "/retailer/forms", icon: CVIcon },
    { label: "Job Marketplace", to: "/retailer/jobs", icon: Briefcase },
    { label: "Worker Dashboard", to: "/retailer/work", icon: ShieldCheck },
    { label: "IPPB Account", to: "/retailer/ippb", icon: Banknote },
    { label: "Finance", to: "/retailer/finance", icon: Banknote },
  ],
  trainer: [
    { label: "Dashboard", to: "/trainer", icon: LayoutDashboard },
    { label: "Trainings", to: "/trainer/trainings", icon: GraduationCap },
    { label: "Wallet", to: "/trainer/wallet", icon: Wallet },
  ],
  staff: [
    { label: "Dashboard", to: "/staff", icon: LayoutDashboard },
    { label: "Leads", to: "/staff/leads", icon: Users },
    { label: "Reports", to: "/staff/reports", icon: BarChart3 },
    { label: "Horoscope", to: "/staff/horoscope-requests", icon: Sparkles },
    { label: "E-dis Services", to: "/staff/services", icon: ShoppingBag },
    { label: "Service Apps", to: "/staff/service-applications", icon: ClipboardList },
    { label: "Form Builder", to: "/staff/forms", icon: FileText },
    { label: "Form Submissions", to: "/staff/form-submissions", icon: FileText },
    { label: "IPPB Tablet", to: "/staff/ippb", icon: Banknote },
  ],
  manager: [
    { label: "Dashboard", to: "/staff", icon: LayoutDashboard },
    { label: "Leads", to: "/staff/leads", icon: Users },
    { label: "Reports", to: "/staff/reports", icon: BarChart3 },
    { label: "Performance", to: "/staff/performance", icon: BarChart3 },
    { label: "E-dis Services", to: "/staff/services", icon: ShoppingBag },
    { label: "Service Apps", to: "/staff/service-applications", icon: ClipboardList },
    { label: "IPPB Tablet", to: "/staff/ippb", icon: Banknote },
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

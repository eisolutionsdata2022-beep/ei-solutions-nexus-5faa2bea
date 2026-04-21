import { Link, useLocation } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  CheckCircle,
  MessageSquare,
  BotMessageSquare,
  Briefcase,
  ShieldCheck,
  Gavel,
  CalendarDays,
  Award,
  BookOpen,
  Gift,
  Activity,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  badge?: number;
}

const navByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
    { label: "Landing CMS", to: "/admin/landing-cms", icon: FileText },
    { label: "CRM Leads", to: "/admin/crm-leads", icon: Users },
    { label: "CRM Reports", to: "/admin/crm-reports", icon: BarChart3 },
    { label: "Bulk Comm", to: "/admin/crm-bulk-comm", icon: MessageSquare },
    { label: "WhatsApp", to: "/admin/whatsapp", icon: MessageSquare },
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
    { label: "Session Quality", to: "/admin/session-quality", icon: Activity },
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
    { label: "PSA ID Monitor", to: "/admin/psa-ids", icon: Award },
    { label: "Finance Overview", to: "/admin/finance", icon: Banknote },
    { label: "Finance Branches", to: "/admin/finance-branches", icon: ShieldCheck },
    { label: "Finance Users", to: "/admin/finance-users", icon: ShieldCheck },
    { label: "DMT Settings", to: "/admin/dmt-settings", icon: ArrowLeftRight },
    { label: "DMT Daily Digest", to: "/admin/dmt-daily-digest", icon: CalendarDays },
    { label: "Cert. Reissues", to: "/admin/certificate-reissues", icon: Award as any },
    { label: "Referrals", to: "/admin/referrals", icon: Gift },
  ],
  distributor: [
    { label: "Dashboard", to: "/distributor", icon: LayoutDashboard },
    { label: "Earnings", to: "/distributor/earnings", icon: BarChart3 },
    { label: "Wallet", to: "/distributor/wallet", icon: Wallet },
  ],
  retailer: [
    { label: "Dashboard", to: "/retailer", icon: LayoutDashboard },
    { label: "Profile", to: "/retailer/profile", icon: User },
    { label: "Refer & Earn", to: "/retailer/referrals", icon: Gift },
    { label: "Operators", to: "/retailer/staff", icon: Users },
    { label: "My Services", to: "/retailer/my-services", icon: Sparkles },
    { label: "EI SOLUTIONS PAY", to: "/retailer/ei-pay", icon: Banknote },
    { label: "PAN Portal", to: "/retailer/pan-portal", icon: CVIcon },
    { label: "Recharge & BBPS", to: "/retailer/recharge", icon: Banknote },
    { label: "E-dis", to: "/retailer/services", icon: ShoppingBag },
    { label: "Horoscope", to: "/retailer/horoscope", icon: Sparkles },
    { label: "Matrimony", to: "/retailer/matrimony", icon: Users },
    { label: "Transactions", to: "/retailer/transactions", icon: ArrowLeftRight },
    { label: "My Wallet", to: "/retailer/wallet", icon: Wallet },
    { label: "Money Transfer (DMT)", to: "/retailer/money-transfer", icon: ArrowLeftRight },
    { label: "CV Builder", to: "/retailer/cv-builder", icon: CVIcon },
    { label: "Trainings", to: "/retailer/trainings", icon: GraduationCap },
    { label: "Training Guide", to: "/retailer/training-guide", icon: BookOpen },
    { label: "KYC", to: "/retailer/kyc", icon: CheckCircle },
    { label: "Virtual", to: "/retailer/virtual-trainer", icon: BotMessageSquare },
    { label: "Page Tools", to: "/retailer/page-tools", icon: FileText },
    { label: "Forms", to: "/retailer/forms", icon: CVIcon },
    { label: "Job Marketplace", to: "/retailer/jobs", icon: Briefcase },
    { label: "Worker Dashboard", to: "/retailer/work", icon: ShieldCheck },
    { label: "IPPB Account", to: "/retailer/ippb", icon: Banknote },
    // Finance moved to standalone /finance subsite — admin-managed accounts only.
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
    { label: "DMT Queue", to: "/staff/dmt", icon: ArrowLeftRight },
    { label: "WhatsApp", to: "/staff/whatsapp", icon: MessageSquare },
  ],
  manager: [
    { label: "Dashboard", to: "/staff", icon: LayoutDashboard },
    { label: "Leads", to: "/staff/leads", icon: Users },
    { label: "Reports", to: "/staff/reports", icon: BarChart3 },
    { label: "Performance", to: "/staff/performance", icon: BarChart3 },
    { label: "E-dis Services", to: "/staff/services", icon: ShoppingBag },
    { label: "Service Apps", to: "/staff/service-applications", icon: ClipboardList },
    { label: "IPPB Tablet", to: "/staff/ippb", icon: Banknote },
    { label: "DMT Queue", to: "/staff/dmt", icon: ArrowLeftRight },
    { label: "WhatsApp", to: "/staff/whatsapp", icon: MessageSquare },
  ],
  operator: [
    { label: "Dashboard", to: "/operator" as any, icon: LayoutDashboard },
  ],
  staffSub: [
    { label: "Dashboard", to: "/retailer", icon: LayoutDashboard },
    { label: "Profile", to: "/retailer/profile", icon: User },
    { label: "Recharge & BBPS", to: "/retailer/recharge", icon: Banknote },
    { label: "E-dis", to: "/retailer/services", icon: ShoppingBag },
    { label: "Transactions", to: "/retailer/transactions", icon: ArrowLeftRight },
  ],
};

export function AppSidebar() {
  const { appUser, logout } = useAuth();
  const location = useLocation();

  if (!appUser) return null;

  const items = navByRole[appUser.role] || [];
  const initial = (appUser.name || appUser.email || "U").charAt(0).toUpperCase();

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-card border-r border-border min-h-0 relative">
      {/* Subtle gradient accent on the right edge */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary/40 to-transparent"
        aria-hidden
      />

      {/* User welcome — premium gradient header */}
      <div className="relative overflow-hidden bg-premium-gradient text-white p-4">
        <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center text-base font-bold shadow-md">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/75 font-semibold">Welcome back</p>
            <p className="text-sm font-bold truncate">{appUser.name || appUser.email.split("@")[0]}</p>
            <p className="text-[10px] text-white/70 truncate capitalize">{appUser.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
        {items.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to as any}
              className={`relative group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-premium-gradient text-white font-semibold shadow-premium"
                  : "text-foreground/75 hover:bg-muted/70 hover:text-foreground hover:translate-x-0.5"
              }`}
            >
              {/* Left active accent bar */}
              {isActive && (
                <span
                  className="absolute -left-2 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-white/80 shadow-glow"
                  aria-hidden
                />
              )}
              <item.icon
                className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive ? "text-white" : "text-muted-foreground group-hover:text-primary group-hover:scale-110"
                }`}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border bg-background/50 backdrop-blur-sm">
        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm w-full bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white font-semibold shadow-sm hover:shadow-premium hover:opacity-95 active:scale-[0.98] transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

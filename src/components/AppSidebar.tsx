import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
  IdCard,
  CreditCard,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type BadgeTone = "new" | "hot" | "pending" | "offer";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  /** Numeric counter pill (e.g. unread count). */
  badge?: number;
  /** Tag chip such as NEW / HOT / PENDING / OFFER. */
  tag?: BadgeTone;
  /** Optional one-line hint shown as a subtitle + native tooltip. */
  hint?: string;
}

const navByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
    { label: "Marketing Hub", to: "/admin/marketing", icon: Gift, tag: "new", hint: "CMS, Leads, Bulk Email, WhatsApp, Brochures" },
    { label: "Users", to: "/admin/users", icon: Users },
    { label: "Create User", to: "/admin/create-user", icon: UserPlus },
    { label: "Staff User Creation", to: "/admin/staff-created-users", icon: BarChart3, hint: "How many users each staff has registered" },
    { label: "CRM Reports", to: "/admin/crm-reports", icon: BarChart3 },
    { label: "Wallets", to: "/admin/wallets", icon: Wallet },
    { label: "Activations Log", to: "/admin/service-activations", icon: BarChart3 },
    { label: "Bill Payment Txns", to: "/admin/bbps-transactions", icon: ArrowLeftRight },
    { label: "Service Buttons", to: "/admin/service-buttons", icon: ShoppingBag },
    { label: "Notice Board", to: "/admin/notices", icon: ClipboardList },
    { label: "Chat Inbox", to: "/admin/chat-inbox", icon: MessageSquare },
    { label: "Training Settings", to: "/admin/training-settings", icon: Settings },
    { label: "Training Earnings", to: "/admin/training-earnings", icon: BarChart3 },
    { label: "Training Reviews", to: "/admin/training-reviews", icon: MessageSquare },
    { label: "Session Quality", to: "/admin/session-quality", icon: Activity },
    { label: "Job Marketplace", to: "/admin/job-marketplace", icon: Briefcase },
    { label: "Job Earnings", to: "/admin/job-earnings", icon: BarChart3 },
    { label: "Job Disputes", to: "/admin/job-disputes", icon: Gavel },
    { label: "Work Badges", to: "/admin/work-badges", icon: ShieldCheck },
    { label: "IPPB Badges", to: "/admin/ippb-badges", icon: ShieldCheck },
    { label: "IPPB Settings", to: "/admin/ippb-settings", icon: Banknote },
    { label: "EI PAY Settings", to: "/admin/csc-settings", icon: Banknote },
    { label: "EI PAY Monitor", to: "/admin/csc-monitor", icon: BarChart3 },
    { label: "PAN Portal Settings", to: "/admin/pan-portal-settings", icon: IdCard as any },
    { label: "PAN Legacy Wallet", to: "/admin/pan-legacy-balances", icon: Wallet },
    { label: "DMT Settings", to: "/admin/dmt-settings", icon: ArrowLeftRight },
    { label: "DMT Daily Digest", to: "/admin/dmt-daily-digest", icon: CalendarDays },
    { label: "Cert. Reissues", to: "/admin/certificate-reissues", icon: Award as any },
    { label: "Referrals", to: "/admin/referrals", icon: Gift, tag: "offer" },
    { label: "System Cleanup", to: "/admin/system-cleanup", icon: Trash2 },
  ],
  distributor: [
    { label: "Dashboard", to: "/distributor", icon: LayoutDashboard },
    { label: "Earnings", to: "/distributor/earnings", icon: BarChart3 },
    { label: "Wallet", to: "/distributor/wallet", icon: Wallet },
  ],
  retailer: [
    { label: "Dashboard", to: "/retailer", icon: LayoutDashboard },
    { label: "Updates", to: "/retailer/updates", icon: Activity, tag: "new", hint: "Lottery, PSC, Govt Press — live" },
    { label: "Profile", to: "/retailer/profile", icon: User },
    { label: "Refer & Earn", to: "/retailer/referrals", icon: Gift, tag: "offer" },
    { label: "Operators", to: "/retailer/staff", icon: Users },
    { label: "My Services", to: "/retailer/my-services", icon: Sparkles },
    { label: "EI SOLUTIONS PAY", to: "/retailer/ei-pay", icon: Banknote, tag: "hot" },
    { label: "PAN Portal", to: "/retailer/pan-portal", icon: IdCard as any, tag: "new", hint: "PSA Auto-ID + NSDL eKYC PAN" },
    { label: "Bill Payment", to: "/retailer/bill-payment", icon: Banknote, tag: "new", hint: "Bharat Connect — Electricity, Water, Gas, Mobile, DTH, FASTag" },
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
    { label: "Virtual", to: "/retailer/virtual-trainer", icon: BotMessageSquare, tag: "new" },
    { label: "Page Tools", to: "/retailer/page-tools", icon: FileText },
    { label: "Job Marketplace", to: "/retailer/jobs", icon: Briefcase },
    { label: "Worker Dashboard", to: "/retailer/work", icon: ShieldCheck },
    { label: "IPPB Account", to: "/retailer/ippb", icon: Banknote },
    {
      label: "Finance / Gold Loan",
      to: "/retailer/finance",
      icon: Banknote,
      tag: "new",
      hint: "Same login — no separate sign-in",
    },
  ],
  trainer: [
    { label: "Dashboard", to: "/trainer", icon: LayoutDashboard },
    { label: "Trainings", to: "/trainer/trainings", icon: GraduationCap },
    { label: "Wallet", to: "/trainer/wallet", icon: Wallet },
  ],
  staff: [
    { label: "Dashboard", to: "/staff", icon: LayoutDashboard },
    { label: "Create User", to: "/staff/create-user", icon: UserPlus, tag: "new", hint: "Register new retailers / users" },
    { label: "Leads", to: "/staff/leads", icon: Users },
    { label: "Reports", to: "/staff/reports", icon: BarChart3 },
    { label: "Horoscope", to: "/staff/horoscope-requests", icon: Sparkles },
    { label: "E-dis Services", to: "/staff/services", icon: ShoppingBag },
    { label: "Service Apps", to: "/staff/service-applications", icon: ClipboardList },
    { label: "IPPB Tablet", to: "/staff/ippb", icon: Banknote },
    { label: "DMT Queue", to: "/staff/dmt", icon: ArrowLeftRight },
    { label: "WhatsApp", to: "/staff/whatsapp", icon: MessageSquare },
    { label: "Marketing", to: "/staff/marketing", icon: Gift, tag: "new", hint: "Brochures & posters" },
  ],
  manager: [
    { label: "Dashboard", to: "/staff", icon: LayoutDashboard },
    { label: "Create User", to: "/staff/create-user", icon: UserPlus, tag: "new", hint: "Register new retailers / users" },
    { label: "Leads", to: "/staff/leads", icon: Users },
    { label: "Reports", to: "/staff/reports", icon: BarChart3 },
    { label: "Performance", to: "/staff/performance", icon: BarChart3 },
    { label: "E-dis Services", to: "/staff/services", icon: ShoppingBag },
    { label: "Service Apps", to: "/staff/service-applications", icon: ClipboardList },
    { label: "IPPB Tablet", to: "/staff/ippb", icon: Banknote },
    { label: "DMT Queue", to: "/staff/dmt", icon: ArrowLeftRight },
    { label: "WhatsApp", to: "/staff/whatsapp", icon: MessageSquare },
    { label: "Marketing", to: "/staff/marketing", icon: Gift, tag: "new", hint: "Brochures & posters" },
  ],
  operator: [
    { label: "Dashboard", to: "/operator" as any, icon: LayoutDashboard },
  ],
  staffSub: [
    { label: "Dashboard", to: "/retailer", icon: LayoutDashboard },
    { label: "Profile", to: "/retailer/profile", icon: User },
    { label: "Bill Payment", to: "/retailer/bill-payment", icon: Banknote },
    { label: "E-dis", to: "/retailer/services", icon: ShoppingBag },
    { label: "Transactions", to: "/retailer/transactions", icon: ArrowLeftRight },
  ],
};

const TAG_STYLES: Record<BadgeTone, { label: string; cls: string }> = {
  new: {
    label: "NEW",
    cls: "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.55)]",
  },
  hot: {
    label: "HOT",
    cls: "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.55)]",
  },
  pending: {
    label: "PENDING",
    cls: "bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 shadow-[0_0_10px_rgba(245,158,11,0.55)]",
  },
  offer: {
    label: "OFFER",
    cls: "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-[0_0_10px_rgba(217,70,239,0.55)]",
  },
};

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

export function AppSidebar() {
  const { appUser, logout } = useAuth();
  const location = useLocation();
  const [filter, setFilter] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Live wallet subscription for the badge in the profile header.
  useEffect(() => {
    if (!appUser?.uid) return;
    const unsub = onSnapshot(
      doc(db, "wallets", appUser.uid),
      (snap) => {
        if (snap.exists()) setWalletBalance(snap.data().balance ?? 0);
        else setWalletBalance(null);
      },
      () => setWalletBalance(null),
    );
    return unsub;
  }, [appUser?.uid]);

  const allItems = appUser ? navByRole[appUser.role] || [] : [];
  const items = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [allItems, filter]);

  if (!appUser) return null;
  const initial = (appUser.name || appUser.email || "U").charAt(0).toUpperCase();
  const displayName = appUser.name || appUser.email.split("@")[0];

  return (
    <aside
      className="hidden lg:flex flex-col w-64 min-h-0 relative text-white overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, hsl(230 60% 12%) 0%, hsl(245 55% 14%) 45%, hsl(265 50% 15%) 100%)",
      }}
    >
      {/* Ambient glow blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full blur-3xl opacity-40"
        style={{ background: "radial-gradient(circle, hsl(216 90% 55% / 0.7), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-20 h-72 w-72 rounded-full blur-3xl opacity-30"
        style={{ background: "radial-gradient(circle, hsl(280 80% 60% / 0.7), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full blur-3xl opacity-30"
        style={{ background: "radial-gradient(circle, hsl(330 80% 60% / 0.6), transparent 70%)" }}
      />

      {/* Right edge gradient accent */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-fuchsia-400/60 to-transparent"
        aria-hidden
      />

      {/* ========== USER PROFILE CARD ========== */}
      <div className="relative p-4">
        <div className="relative rounded-2xl p-4 backdrop-blur-xl bg-white/10 border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* Avatar with animated gradient ring */}
              <div className="p-[2px] rounded-full bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-amber-400 shadow-[0_0_18px_rgba(217,70,239,0.55)]">
                <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-lg font-bold text-white">
                  {initial}
                </div>
              </div>
              {/* Online status dot */}
              <span
                className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse"
                title="Online"
                aria-label="Online"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.15em] text-cyan-300/90 font-semibold">
                Welcome back
              </p>
              <p className="text-sm font-bold truncate text-white">{displayName}</p>
              <p className="text-[10px] text-white/60 truncate capitalize">{appUser.role}</p>
            </div>
          </div>

          {/* Wallet balance chip */}
          {walletBalance !== null && (
            <Link
              to={"/retailer/wallet" as any}
              className="mt-3 flex items-center justify-between gap-2 rounded-xl px-3 py-2 bg-gradient-to-r from-amber-400/20 via-yellow-300/15 to-amber-400/20 border border-amber-300/30 hover:border-amber-300/60 transition-all group"
            >
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-200/90">
                <Wallet className="w-3.5 h-3.5" />
                Wallet
              </span>
              <span className="text-sm font-extrabold text-amber-100 group-hover:text-white transition-colors">
                {formatINR(walletBalance)}
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* ========== SEARCH ========== */}
      {allItems.length >= 8 && (
        <div className="px-4 pb-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-300/80 transition-transform group-focus-within:scale-110" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search menu…"
              className="pl-9 h-9 text-xs rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/40 focus-visible:border-cyan-400/70 focus-visible:ring-2 focus-visible:ring-cyan-400/30 focus-visible:shadow-[0_0_18px_rgba(34,211,238,0.35)] transition-all"
            />
          </div>
        </div>
      )}

      {/* ========== NAV ========== */}
      <nav className="flex-1 py-2 px-3 overflow-y-auto thin-scroll space-y-1">
        {items.length === 0 && (
          <p className="text-xs text-white/50 text-center py-6">
            No menu items match "{filter}"
          </p>
        )}
        {items.map((item) => {
          const isActive = location.pathname === item.to;
          const tooltip = item.hint ? `${item.label} — ${item.hint}` : item.label;
          const tag = item.tag ? TAG_STYLES[item.tag] : null;

          return (
            <Link
              key={item.to}
              to={item.to as any}
              title={tooltip}
              aria-label={tooltip}
              className={`relative group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${
                isActive
                  ? "text-white font-semibold shadow-[0_8px_24px_rgba(99,102,241,0.45)]"
                  : "text-white/75 hover:text-white hover:translate-x-0.5"
              }`}
              style={
                isActive
                  ? {
                      background:
                        "linear-gradient(135deg, hsl(216 90% 55%) 0%, hsl(260 80% 60%) 55%, hsl(330 80% 60%) 100%)",
                    }
                  : undefined
              }
            >
              {/* Hover glass background */}
              {!isActive && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 group-hover:backdrop-blur-sm transition-all duration-200 border border-transparent group-hover:border-white/10"
                />
              )}

              {/* Active left accent bar */}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute -left-3 top-1/2 -translate-y-1/2 h-7 w-1 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                />
              )}

              {/* Icon with glow */}
              <span
                className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all ${
                  isActive
                    ? "bg-white/20 shadow-[0_0_14px_rgba(255,255,255,0.6)]"
                    : "bg-white/5 group-hover:bg-white/15 group-hover:shadow-[0_0_14px_rgba(34,211,238,0.5)]"
                }`}
              >
                <item.icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? "text-white" : "text-cyan-200/90 group-hover:text-white"
                  }`}
                />
              </span>

              <div className="relative z-10 min-w-0 flex-1">
                <span className="block truncate leading-tight">{item.label}</span>
                {item.hint && (
                  <span
                    className={`block truncate text-[10px] font-normal leading-tight mt-0.5 ${
                      isActive ? "text-white/80" : "text-white/45"
                    }`}
                  >
                    {item.hint}
                  </span>
                )}
              </div>

              {/* Tag chip (NEW / HOT / PENDING / OFFER) */}
              {tag && (
                <span
                  className={`relative z-10 ml-auto text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-md ${tag.cls}`}
                >
                  {tag.label}
                </span>
              )}

              {/* Numeric badge */}
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`relative z-10 ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-cyan-400/20 text-cyan-100 border border-cyan-300/30"
                  }`}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ========== LOGOUT ========== */}
      <div className="relative p-3 border-t border-white/10 backdrop-blur-md bg-black/20">
        <button
          onClick={logout}
          className="relative overflow-hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm w-full font-semibold text-white shadow-[0_8px_24px_rgba(244,63,94,0.4)] hover:shadow-[0_12px_32px_rgba(244,63,94,0.6)] active:scale-[0.98] transition-all group"
          style={{
            background:
              "linear-gradient(135deg, hsl(0 80% 55%) 0%, hsl(20 90% 55%) 100%)",
          }}
        >
          <span
            aria-hidden
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
          <LogOut className="w-4 h-4 relative z-10" />
          <span className="relative z-10">Logout</span>
        </button>
      </div>
    </aside>
  );
}

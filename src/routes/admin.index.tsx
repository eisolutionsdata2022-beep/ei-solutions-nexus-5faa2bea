import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Users,
  Wallet,
  ShoppingBag,
  ShieldCheck,
  UserPlus,
  Sparkles,
  ArrowRight,
  Activity,
  IndianRupee,
  CreditCard,
  Banknote,
  GraduationCap,
  Heart,
  Star,
  ClipboardList,
  Settings,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserSearchPanel } from "@/components/admin/UserSearchPanel";
import { LegacyCleanupCard } from "@/components/admin/LegacyCleanupCard";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminDashboard,
});

type UserDoc = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  kycStatus?: string;
  createdAt?: any;
};

type WalletReqDoc = { status?: string };

function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    todayRevenue: 0,
    pendingKyc: 0,
    pendingWalletReq: 0,
    walletFloat: 0,
    activeRetailers: 0,
  });
  const [recentUsers, setRecentUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startTs = Timestamp.fromDate(startOfDay);

        const usersCol = collection(db, "users");
        const walletsCol = collection(db, "wallets");
        const walletReqCol = collection(db, "walletRequests");
        const transCol = collection(db, "transactions");

        // Lightweight aggregations and scoped queries (avoid full-collection downloads)
        const [
          usersCountSnap,
          activeRetailersCountSnap,
          pendingKycCountSnap,
          pendingWalletReqCountSnap,
          todayDebitSnap,
          recentUsersSnap,
        ] = await Promise.all([
          getCountFromServer(usersCol).catch(() => null),
          getCountFromServer(
            query(usersCol, where("role", "==", "retailer"), where("kycStatus", "==", "approved")),
          ).catch(() => null),
          getCountFromServer(query(usersCol, where("kycStatus", "==", "pending"))).catch(() => null),
          getCountFromServer(query(walletReqCol, where("status", "==", "pending"))).catch(() => null),
          getDocs(
            query(transCol, where("type", "==", "debit"), where("createdAt", ">=", startTs)),
          ).catch(() => null),
          getDocs(query(usersCol, orderBy("createdAt", "desc"), limit(6))).catch(() => null),
        ]);

        let todayRevenue = 0;
        todayDebitSnap?.forEach((d) => {
          const t = d.data() as { amount?: number };
          todayRevenue += t.amount || 0;
        });

        // Wallet float — fetch only balance field via paginated reads (kept simple but capped)
        let walletFloat = 0;
        try {
          const walletsSnap = await getDocs(query(walletsCol, limit(2000)));
          walletsSnap.forEach((d) => {
            const w = d.data() as { balance?: number };
            walletFloat += w.balance || 0;
          });
        } catch {
          /* ignore */
        }

        const recentUsers: UserDoc[] = [];
        recentUsersSnap?.forEach((d) =>
          recentUsers.push({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) }),
        );

        setStats({
          users: usersCountSnap?.data().count ?? 0,
          todayRevenue,
          pendingKyc: pendingKycCountSnap?.data().count ?? 0,
          pendingWalletReq: pendingWalletReqCountSnap?.data().count ?? 0,
          walletFloat,
          activeRetailers: activeRetailersCountSnap?.data().count ?? 0,
        });
        setRecentUsers(recentUsers);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const totalPending = stats.pendingKyc + stats.pendingWalletReq;

  return (
    <div className="space-y-6">
      {/* ============ Welcome Header ============ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">
                Admin Control Center
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold">Welcome, Admin 👋</h1>
              <p className="text-sm text-white/80 mt-1">
                Here's what's happening across your platform today.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/create-user">
              <Button
                size="lg"
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 shadow-lg"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Create User
              </Button>
            </Link>
            <Link to="/admin/users">
              <Button
                size="lg"
                className="bg-white text-indigo-700 hover:bg-white/90 shadow-lg"
              >
                <Users className="w-4 h-4 mr-2" /> Manage Users
              </Button>
            </Link>
          </div>
        </div>

        {/* Inline KPI strip inside header */}
        <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HeaderStat
            label="Today Revenue"
            value={loading ? "…" : `₹${stats.todayRevenue.toLocaleString("en-IN")}`}
            icon={IndianRupee}
          />
          <HeaderStat
            label="Total Users"
            value={loading ? "…" : stats.users.toLocaleString("en-IN")}
            icon={Users}
            sub={loading ? "" : `${stats.activeRetailers} active retailers`}
          />
          <HeaderStat
            label="Pending Requests"
            value={loading ? "…" : totalPending.toString()}
            icon={ClipboardList}
            sub={loading ? "" : `${stats.pendingKyc} KYC · ${stats.pendingWalletReq} Wallet`}
            highlight={totalPending > 0}
          />
          <HeaderStat
            label="Wallet Float"
            value={loading ? "…" : `₹${stats.walletFloat.toLocaleString("en-IN")}`}
            icon={Wallet}
          />
        </div>
      </div>

      {/* ============ User Search ============ */}
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm p-1">
        <UserSearchPanel />
      </div>

      {/* ============ Services Grid ============ */}
      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Manage Services</h2>
            <p className="text-sm text-muted-foreground">
              Quick access to platform service controls
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {SERVICE_TILES.map((s) => (
            <ServiceCard key={s.to} {...s} />
          ))}
        </div>
      </div>

      {/* ============ Recent Users ============ */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-500 to-violet-600" />
            <h2 className="text-lg font-bold text-foreground">Recent Users</h2>
          </div>
          <Link to="/admin/users">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                <th className="text-left px-5 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-5 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">
                  Email
                </th>
                <th className="text-left px-5 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">
                  Role
                </th>
                <th className="text-left px-5 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">
                  KYC
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-20" /></td>
                  </tr>
                ))
              ) : recentUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                recentUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border/30 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">{u.name || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className="capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.kycStatus === "approved"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : u.kycStatus === "rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {u.kycStatus || "N/A"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legacy Cleanup */}
      <LegacyCleanupCard />
    </div>
  );
}

/* ===================== Sub-components ===================== */

function HeaderStat({
  label,
  value,
  sub,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: any;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl backdrop-blur-md border p-3 transition-colors ${
        highlight
          ? "bg-amber-400/20 border-amber-200/50"
          : "bg-white/10 border-white/20"
      }`}
    >
      <div className="flex items-center gap-2 text-white/80">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="mt-1 text-xl font-bold text-white tabular-nums truncate">{value}</div>
      {sub && <div className="text-[10px] text-white/70 truncate">{sub}</div>}
    </div>
  );
}

type ServiceTile = {
  to: string;
  title: string;
  subtitle: string;
  icon: any;
  gradient: string;
};

const SERVICE_TILES: ServiceTile[] = [
  {
    to: "/admin/service-plans",
    title: "Service Plans",
    subtitle: "Pricing tiers & visibility",
    icon: ShieldCheck,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    to: "/admin/service-activations-config",
    title: "Activation Charges",
    subtitle: "Per-service fees & validity",
    icon: Sparkles,
    gradient: "from-fuchsia-500 to-pink-600",
  },
  {
    to: "/admin/kyc",
    title: "KYC Requests",
    subtitle: "Review retailer documents",
    icon: ClipboardList,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    to: "/admin/wallet-requests",
    title: "Wallet Requests",
    subtitle: "Approve add-money asks",
    icon: Wallet,
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    to: "/admin/bbps-settings",
    title: "Bill Payment Settings",
    subtitle: "BBPS & Bharat Connect",
    icon: Banknote,
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    to: "/admin/pan-portal-settings",
    title: "PAN Portal Settings",
    subtitle: "UTI PSA + Coupon credentials & fees",
    icon: CreditCard,
    gradient: "from-sky-500 to-indigo-600",
  },
  {
    to: "/admin/pan-portal-settings",
    title: "PAN VLE Editor",
    subtitle: "Edit retailer VLE links from coupon report",
    icon: Settings,
    gradient: "from-orange-500 to-red-600",
  },
  {
    to: "/admin/csc-settings",
    title: "EI SOLUTIONS PAY",
    subtitle: "CSC master credentials & fees",
    icon: CreditCard,
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    to: "/admin/trainings",
    title: "Trainings",
    subtitle: "Sessions & schedules",
    icon: GraduationCap,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    to: "/admin/matrimony",
    title: "Matrimony",
    subtitle: "Profiles & moderation",
    icon: Heart,
    gradient: "from-rose-500 to-pink-600",
  },
  {
    to: "/admin/horoscope-settings",
    title: "Horoscope",
    subtitle: "Premium engine settings",
    icon: Star,
    gradient: "from-yellow-500 to-amber-600",
  },
  {
    to: "/admin/paytm-settings",
    title: "Payment Settings",
    subtitle: "Paytm gateway & QR",
    icon: CreditCard,
    gradient: "from-sky-500 to-indigo-600",
  },
  {
    to: "/admin/services",
    title: "All Services",
    subtitle: "Master catalogue",
    icon: ShoppingBag,
    gradient: "from-slate-600 to-slate-800",
  },
];

function ServiceCard({ to, title, subtitle, icon: Icon, gradient }: ServiceTile) {
  return (
    <Link to={to as any} className="group block">
      <div className="relative h-full rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-transparent overflow-hidden">
        {/* gradient hover glow */}
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${gradient}`}
          aria-hidden
        />
        <div className="relative flex items-start justify-between">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
          >
            <Icon className="w-6 h-6" />
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
        </div>
        <div className="relative mt-4">
          <h3 className="font-bold text-foreground group-hover:text-white transition-colors">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 group-hover:text-white/85 transition-colors">
            {subtitle}
          </p>
        </div>
        <div className="relative mt-4">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:text-white transition-colors">
            Open
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// Suppress unused-import warnings if any remain (Activity icon kept for future)
void Activity;

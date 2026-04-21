import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  Wallet,
  Users,
  TrendingUp,
  IndianRupee,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Activity,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/StatsCard";
import { RevenueChart, UserGrowthChart } from "@/components/admin/AdminCharts";

export const Route = createFileRoute("/distributor/")({
  ssr: false,
  component: DistributorDashboard,
});

type Retailer = {
  id: string;
  name?: string;
  email?: string;
  kycStatus?: string;
  createdAt?: any;
};

type Txn = {
  id: string;
  type?: string;
  amount?: number;
  createdAt?: any;
  userId?: string;
};

function DistributorDashboard() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [commission, setCommission] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });
    return unsub;
  }, [appUser]);

  useEffect(() => {
    if (!appUser) return;
    const fetchData = async () => {
      try {
        // Retailers under this distributor (best-effort: filter by distributorId field)
        const retailersSnap = await getDocs(
          query(
            collection(db, "users"),
            where("role", "==", "retailer"),
          ),
        );
        const list: Retailer[] = [];
        retailersSnap.forEach((d) => {
          const data = d.data() as any;
          // If distributorId mapping exists, filter; otherwise show all (admin can refine later)
          if (
            !data.distributorId ||
            data.distributorId === appUser.uid
          ) {
            list.push({ id: d.id, ...data });
          }
        });
        setRetailers(list);

        // Pull commission transactions for this distributor
        try {
          const cTxnSnap = await getDocs(
            query(
              collection(db, "transactions"),
              where("userId", "==", appUser.uid),
            ),
          );
          const tList: Txn[] = [];
          let comm = 0;
          cTxnSnap.forEach((d) => {
            const data = d.data() as any;
            tList.push({ id: d.id, ...data });
            if (data.type === "credit" && data.category === "commission") {
              comm += data.amount || 0;
            }
          });
          setTxns(tList);
          setCommission(comm);
        } catch {
          /* index might not exist; ignore */
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [appUser]);

  const activeRetailers = retailers.filter(
    (r) => r.kycStatus === "approved",
  ).length;
  const pendingApprovals = retailers.filter(
    (r) => r.kycStatus === "pending",
  ).length;

  return (
    <div className="space-y-6">
      {/* Hero — Wallet + Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-premium-gradient p-7 text-white shadow-premium">
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/15 blur-3xl animate-blob" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl animate-blob [animation-delay:2s]" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">
                Distributor Console
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Hello, {appUser?.name || "Partner"} 👋
              </h1>
              <p className="text-sm text-white/80 mt-1">
                Track your retailer network, commissions and team performance.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <p className="text-[11px] uppercase tracking-widest text-white/70 font-semibold">
              Wallet Balance
            </p>
            <p className="text-3xl sm:text-4xl font-extrabold tabular-nums">
              ₹{balance.toLocaleString("en-IN")}
            </p>
            <Link to="/distributor/wallet">
              <Button
                size="sm"
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30"
              >
                <Wallet className="w-4 h-4 mr-2" /> Recharge
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))
        ) : (
          <>
            <StatsCard
              title="Total Retailers"
              value={retailers.length}
              icon={Users}
              tone="primary"
              delay={0}
              description={`${activeRetailers} active`}
            />
            <StatsCard
              title="Commission Earned"
              value={`₹${commission.toLocaleString("en-IN")}`}
              icon={IndianRupee}
              tone="success"
              delay={1}
            />
            <StatsCard
              title="Pending Approvals"
              value={pendingApprovals}
              icon={ShieldCheck}
              tone={pendingApprovals > 0 ? "warning" : "cyan"}
              delay={2}
              description="Retailer KYC"
            />
            <StatsCard
              title="My Transactions"
              value={txns.length}
              icon={CreditCard}
              tone="violet"
              delay={3}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-card-v2 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">
                Commission Flow (14 days)
              </h2>
              <p className="text-xs text-muted-foreground">Daily credit volume</p>
            </div>
          </div>
          <div className="p-4">
            {loading ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <RevenueChart
                transactions={txns.map((t) => ({
                  ...t,
                  // RevenueChart sums "debit"; remap commission credits as debit for chart
                  type: t.type === "credit" ? "debit" : t.type,
                }))}
              />
            )}
          </div>
        </div>

        <div className="glass-card-v2 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">
                Retailer Growth
              </h2>
              <p className="text-xs text-muted-foreground">Onboarding trend</p>
            </div>
          </div>
          <div className="p-4">
            {loading ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <UserGrowthChart users={retailers} />
            )}
          </div>
        </div>
      </div>

      {/* Retailer List */}
      <div className="glass-card-v2 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-premium-gradient" />
            <h2 className="text-lg font-bold text-foreground">My Retailers</h2>
          </div>
          <Link to="/distributor/wallet">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              View wallet <ArrowRight className="w-3 h-3" />
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
                  KYC
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                  </tr>
                ))
              ) : retailers.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No retailers in your network yet.
                  </td>
                </tr>
              ) : (
                retailers.slice(0, 8).map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/30 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">{r.name || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          r.kycStatus === "approved"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : r.kycStatus === "rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {r.kycStatus || "N/A"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass-card-v2 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40">
          <div className="w-1 h-6 rounded-full bg-premium-gradient" />
          <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <Link to="/distributor/wallet">
            <Button className="w-full justify-start gap-2 bg-premium-gradient text-white border-0 shadow-premium hover:opacity-90">
              <Wallet className="w-4 h-4" /> My Wallet
            </Button>
          </Link>
          <Link to="/distributor/earnings">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-background/50 backdrop-blur-sm hover:bg-muted"
            >
              <Activity className="w-4 h-4" /> Earnings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

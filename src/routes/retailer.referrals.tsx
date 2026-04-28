import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Copy, Share2, Users, IndianRupee, Gift, Sparkles, Trophy,
  Coins, Gamepad2, Wallet, ArrowRight, Loader2, ArrowRightLeft,
  CheckCircle2, Clock, XCircle,
} from "lucide-react";
import {
  getOrCreateReferralCode,
  subscribeReferredUsers,
  subscribeReferrerPayouts,
  loadReferralConfig,
  type ReferralConfig,
  type ReferralPayout,
} from "@/lib/referral-firebase";
import {
  subscribeRecentPlays,
  getGameStats,
  type GamePlay,
  type GameStats,
} from "@/lib/games-firebase";
import {
  subscribeRewardsBalance,
  subscribeMyTransferRequests,
  requestTransferToMainWallet,
  REWARDS_MIN_TRANSFER,
  type TransferRequestDoc,
} from "@/lib/rewards-wallet";
import {
  listCommissionConfigs,
  type CommissionConfig,
} from "@/lib/commission-config";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Line, ComposedChart, Bar, Legend,
} from "recharts";
import { SpinWheel } from "@/components/games/SpinWheel";
import { ScratchCard } from "@/components/games/ScratchCard";
import { TreasureBox } from "@/components/games/TreasureBox";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/referrals")({
  ssr: false,
  component: ReferralPanel,
});

function ReferralPanel() {
  const { appUser } = useAuth();
  const [code, setCode] = useState<string>("");
  const [cfg, setCfg] = useState<ReferralConfig | null>(null);
  const [refs, setRefs] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<ReferralPayout[]>([]);
  const [recentPlays, setRecentPlays] = useState<GamePlay[]>([]);
  const [gameStats, setGameStats] = useState<GameStats>({ totalRewards: 0, totalPlays: 0 });
  const [commissionConfigs, setCommissionConfigs] = useState<CommissionConfig[]>([]);

  // Rewards wallet (separate from main wallet)
  const [rewardsBalance, setRewardsBalance] = useState(0);
  const [transferRequests, setTransferRequests] = useState<TransferRequestDoc[]>([]);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (!appUser?.uid) return;
    getOrCreateReferralCode(appUser.uid).then(setCode);
    loadReferralConfig().then(setCfg);
    getGameStats(appUser.uid).then(setGameStats);
    listCommissionConfigs().then(setCommissionConfigs).catch(() => {});
    const u1 = subscribeReferredUsers(appUser.uid, setRefs);
    const u2 = subscribeReferrerPayouts(appUser.uid, setPayouts);
    const u3 = subscribeRecentPlays(appUser.uid, (plays) => {
      setRecentPlays(plays);
      getGameStats(appUser.uid).then(setGameStats);
    });
    const u4 = subscribeRewardsBalance(appUser.uid, setRewardsBalance);
    const u5 = subscribeMyTransferRequests(appUser.uid, setTransferRequests);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [appUser?.uid]);

  const link = typeof window !== "undefined" && code ? `${window.location.origin}/register?ref=${code}` : "";
  const totalReferralEarnings = payouts.reduce((s, p) => s + (p.referrerReward || 0), 0);
  const activatedCount = refs.filter((r) => r.activated).length;
  const totalEarnings = totalReferralEarnings + gameStats.totalRewards;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join EI Solutions",
          text: `Sign up using my referral code ${code} and get a welcome bonus on activation!`,
          url: link,
        });
      } catch {/* user cancelled */}
    } else {
      copy(link);
    }
  };

  const pendingRequest = transferRequests.find((r) => r.status === "pending");

  const handleSubmitTransfer = async () => {
    if (!appUser || transferring) return;
    const amt = Math.floor(Number(transferAmount));
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setTransferring(true);
    try {
      await requestTransferToMainWallet({
        uid: appUser.uid,
        userName: appUser.name,
        userEmail: appUser.email,
        amount: amt,
        userNote: transferNote.trim(),
      });
      toast.success("Transfer request sent — awaiting admin approval");
      setTransferOpen(false);
      setTransferAmount("");
      setTransferNote("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send request");
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 p-6 sm:p-8 text-primary-foreground shadow-xl">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="absolute -bottom-16 -left-8 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Refer & Win
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold">Earn Every Day</h1>
            <p className="mt-1 max-w-xl text-sm sm:text-base text-primary-foreground/85">
              Refer friends, spin the wheel, scratch cards & open treasure boxes.
              All rewards land directly in your wallet.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
            <div className="rounded-xl bg-white/20 p-2"><Wallet className="h-6 w-6" /></div>
            <div>
              <div className="text-xs uppercase tracking-wider text-primary-foreground/70">Total earned</div>
              <div className="text-2xl font-extrabold">₹{totalEarnings.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile icon={<Users className="h-5 w-5" />} label="Referrals" value={refs.length} tint="blue" />
        <StatTile icon={<Gift className="h-5 w-5" />} label="Activated" value={activatedCount} tint="green" />
        <StatTile icon={<IndianRupee className="h-5 w-5" />} label="Referral ₹" value={`₹${totalReferralEarnings.toFixed(0)}`} tint="gold" />
        <StatTile icon={<Coins className="h-5 w-5" />} label="Game ₹" value={`₹${gameStats.totalRewards.toFixed(0)}`} tint="violet" />
      </div>

      {/* Rewards Wallet — separate balance, transferable to main wallet via admin approval */}
      <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-600">
                <Coins className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-amber-700/80 font-semibold">
                  Rewards Wallet (referral + games)
                </p>
                <p className="text-3xl font-extrabold text-amber-900">₹{rewardsBalance.toFixed(2)}</p>
                <p className="text-xs text-amber-800/70 mt-0.5">
                  Held separately. Move it to your main wallet by requesting an admin transfer.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <Button
                size="lg"
                className="gap-2"
                disabled={rewardsBalance < REWARDS_MIN_TRANSFER || !!pendingRequest}
                onClick={() => {
                  setTransferAmount(String(Math.floor(rewardsBalance)));
                  setTransferOpen(true);
                }}
              >
                <ArrowRightLeft className="h-4 w-4" /> Request Transfer to Main Wallet
              </Button>
              {pendingRequest && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" /> Pending: ₹{pendingRequest.amount} — admin reviewing
                </Badge>
              )}
              {!pendingRequest && rewardsBalance < REWARDS_MIN_TRANSFER && (
                <p className="text-xs text-amber-800/70">Minimum transfer ₹{REWARDS_MIN_TRANSFER}</p>
              )}
            </div>
          </div>

          {transferRequests.length > 0 && (
            <div className="border-t border-amber-200 pt-3">
              <p className="text-xs font-semibold text-amber-800 mb-2">Recent transfer requests</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {transferRequests.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs bg-white/60 rounded px-2 py-1.5">
                    <div>
                      <span className="font-semibold">₹{r.amount}</span>
                      <span className="text-muted-foreground"> · {new Date(r.requestedAt).toLocaleString()}</span>
                      {r.adminNote && <p className="text-[11px] text-muted-foreground italic">"{r.adminNote}"</p>}
                    </div>
                    <Badge variant={
                      r.status === "approved" ? "default" :
                      r.status === "rejected" ? "destructive" : "secondary"
                    } className="capitalize gap-1">
                      {r.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                      {r.status === "pending" && <Clock className="h-3 w-3" />}
                      {r.status === "rejected" && <XCircle className="h-3 w-3" />}
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/60">
          <TabsTrigger value="games" className="gap-2 text-base">
            <Gamepad2 className="h-4 w-4" /> Daily Games
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2 text-base">
            <Users className="h-4 w-4" /> Refer & Earn
          </TabsTrigger>
        </TabsList>

        {/* GAMES */}
        <TabsContent value="games" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <SpinWheel />
            <ScratchCard />
            <TreasureBox />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" /> Recent Game Rewards
              </CardTitle>
              <Badge variant="secondary">{recentPlays.length}</Badge>
            </CardHeader>
            <CardContent>
              {recentPlays.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No game plays yet. Try a game above to earn your first reward!
                </p>
              ) : (
                <div className="divide-y">
                  {recentPlays.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-base">
                          {p.game === "spin" ? "🎡" : p.game === "scratch" ? "🎫" : "📦"}
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {p.game === "spin" ? "Spin & Win" : p.game === "scratch" ? "Lucky Scratch" : "Treasure Box"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.label} · {new Date(p.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {p.reward > 0 ? (
                        <Badge className="bg-green-600 hover:bg-green-600">+₹{p.reward}</Badge>
                      ) : (
                        <Badge variant="outline">No reward</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Withdrawal hint removed — Rewards Wallet card above handles transfers */}
        </TabsContent>

        {/* REFERRALS */}
        <TabsContent value="referrals" className="space-y-6 mt-6">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" /> Your Referral Code & Link
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Earn ₹{cfg?.referrerReward ?? 50} every time someone signs up & activates with your code.
                New user gets ₹{cfg?.newUserReward ?? 100} welcome bonus too.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={code} readOnly className="font-mono font-bold text-lg tracking-wider" />
                <Button variant="outline" onClick={() => copy(code)}><Copy className="h-4 w-4" /></Button>
              </div>
              <div className="flex gap-2">
                <Input value={link} readOnly className="text-sm" />
                <Button variant="outline" onClick={() => copy(link)}><Copy className="h-4 w-4" /></Button>
                <Button onClick={share}><Share2 className="mr-2 h-4 w-4" />Share</Button>
              </div>
            </CardContent>
          </Card>

          <ReferralEarningsChart payouts={payouts} />

          <Card>
            <CardHeader>
              <CardTitle>Your Referrals ({refs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {refs.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No referrals yet. Share your code to start earning!
                </p>
              ) : (
                <div className="space-y-2">
                  {refs.map((r) => (
                    <div key={r.uid} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{r.name || r.email}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </div>
                      {r.activated ? (
                        <Badge className="bg-green-600 hover:bg-green-600">
                          Activated · +₹{cfg?.referrerReward ?? 50}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfer to main wallet dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" /> Request Transfer to Main Wallet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
              <p>Available rewards balance: <strong>₹{rewardsBalance.toFixed(2)}</strong></p>
              <p className="text-xs text-muted-foreground mt-1">
                Admin will review and approve your request. Once approved, the amount moves to your main wallet.
              </p>
            </div>
            <div>
              <Label className="text-xs">Amount (₹) — minimum ₹{REWARDS_MIN_TRANSFER}</Label>
              <Input
                type="number"
                min={REWARDS_MIN_TRANSFER}
                max={Math.floor(rewardsBalance)}
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Note for admin (optional)</Label>
              <Textarea
                rows={2}
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="e.g. Withdrawing for monthly utilities"
              />
            </div>
            <Button onClick={handleSubmitTransfer} disabled={transferring} className="w-full">
              {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({
  icon, label, value, tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tint: "blue" | "green" | "gold" | "violet";
}) {
  const tints: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    gold: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tints[tint]}`}>
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl sm:text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReferralEarningsChart({ payouts }: { payouts: ReferralPayout[] }) {
  // Build last 30 days
  const days: { key: string; label: string; earnings: number; count: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map = new Map<string, { label: string; earnings: number; count: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    map.set(key, { label, earnings: 0, count: 0 });
  }
  payouts.forEach((p) => {
    if (!p.paidAt || !p.referrerReward) return;
    const key = p.paidAt.slice(0, 10);
    const row = map.get(key);
    if (row) {
      row.earnings += p.referrerReward || 0;
      row.count += 1;
    }
  });
  let cumulative = 0;
  for (const [key, val] of map.entries()) {
    cumulative += val.earnings;
    days.push({ key, label: val.label, earnings: val.earnings, count: val.count });
  }
  // Recompute cumulative as array
  let acc = 0;
  const data = days.map((d) => {
    acc += d.earnings;
    return { ...d, cumulative: acc };
  });

  const totalLast30 = data.reduce((s, d) => s + d.earnings, 0);
  const activationsLast30 = data.reduce((s, d) => s + d.count, 0);

  const tooltipStyle = {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    fontSize: 12,
    color: "var(--popover-foreground)",
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-amber-500" /> Referral Earnings (last 30 days)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            ₹{totalLast30.toFixed(0)} earned · {activationsLast30} activation{activationsLast30 === 1 ? "" : "s"}
          </p>
        </div>
        <Badge variant="secondary">{payouts.length} total</Badge>
      </CardHeader>
      <CardContent>
        {payouts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No referral earnings yet. Share your code to start earning!
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="refEarnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(40 95% 55%)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="hsl(40 95% 55%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: any, name: any) =>
                    name === "Activations"
                      ? [v, name]
                      : [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, name]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="earnings"
                  name="Daily ₹"
                  fill="url(#refEarnGrad)"
                  stroke="hsl(40 95% 50%)"
                  radius={[6, 6, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  name="Cumulative ₹"
                  stroke="hsl(280 80% 60%)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

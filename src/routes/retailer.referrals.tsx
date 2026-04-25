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

          {/* Withdrawal hint */}
          <Card className="border-dashed">
            <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-3 text-primary"><Wallet className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">Rewards land in your wallet</p>
                  <p className="text-sm text-muted-foreground">
                    Convert to cash anytime via the wallet withdrawal flow.
                  </p>
                </div>
              </div>
              <a href="/retailer/wallet">
                <Button variant="outline" className="gap-2">
                  Open Wallet <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </CardContent>
          </Card>
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

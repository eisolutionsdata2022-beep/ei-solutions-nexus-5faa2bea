import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Sparkles, Wallet, Gift, AlertTriangle, ArrowRight } from "lucide-react";
import {
  loadReferralConfig,
  atomicReferralActivation,
  type ReferralConfig,
} from "@/lib/referral-firebase";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/activate")({
  ssr: false,
  component: ActivatePage,
});

function ActivatePage() {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<ReferralConfig | null>(null);
  const [balance, setBalance] = useState(0);
  const [activated, setActivated] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadReferralConfig().then(setCfg);
  }, []);

  useEffect(() => {
    if (!appUser?.uid) return;
    const u1 = onSnapshot(doc(db, "wallets", appUser.uid), (s) => {
      setBalance(s.exists() ? (s.data().balance || 0) : 0);
    });
    const u2 = onSnapshot(doc(db, "users", appUser.uid), async (s) => {
      if (!s.exists()) return;
      const data = s.data() as any;
      setActivated(!!data.activated);
      if (data.referredBy) {
        const refSnap = await import("firebase/firestore").then(({ getDoc, doc: d }) =>
          getDoc(d(db, "users", data.referredBy)),
        );
        if (refSnap.exists()) setReferrerName(refSnap.data().name || "your referrer");
      }
    });
    return () => { u1(); u2(); };
  }, [appUser?.uid]);

  const handleActivate = async () => {
    if (!appUser || !cfg) return;
    if (balance < cfg.activationFee) {
      toast.error(`Recharge ₹${cfg.activationFee - balance} more to activate.`);
      return;
    }
    setBusy(true);
    try {
      const res = await atomicReferralActivation({
        newUserUid: appUser.uid,
        newUserName: appUser.name,
        newUserEmail: appUser.email,
      });
      if (res.alreadyActivated) {
        toast.info("Already activated.");
      } else {
        toast.success(`Activated! ₹${cfg.newUserReward} credited to your wallet.`);
        if (res.referrerPaid) toast.info(`Your referrer earned ₹${cfg.referrerReward}.`);
      }
      setTimeout(() => navigate({ to: "/retailer" }), 800);
    } catch (e: any) {
      toast.error(e?.message || "Activation failed");
    } finally {
      setBusy(false);
    }
  };

  if (!cfg) return <div className="p-8 text-muted-foreground">Loading…</div>;

  if (activated) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-green-500/40">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <CardTitle>Account Activated</CardTitle>
            <CardDescription>Your account is fully active. Enjoy all platform services.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/retailer">
              <Button>Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const insufficient = balance < cfg.activationFee;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <Badge className="bg-gov-gold text-white mb-2">One-Time Activation</Badge>
        <h1 className="text-3xl font-bold">Activate Your Account</h1>
        <p className="text-muted-foreground mt-2">
          Pay ₹{cfg.activationFee} once to unlock all retailer services. Get ₹{cfg.newUserReward} back instantly!
        </p>
      </div>

      {referrerName && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 flex items-center gap-3">
            <Gift className="w-6 h-6 text-primary" />
            <div className="text-sm">
              You were referred by <span className="font-bold">{referrerName}</span>. They will earn ₹{cfg.referrerReward} when you activate.
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gov-gold" /> Activation Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-muted-foreground">Activation fee</span>
            <span className="font-bold text-destructive">– ₹{cfg.activationFee}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-muted-foreground">Welcome bonus</span>
            <span className="font-bold text-green-600">+ ₹{cfg.newUserReward}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-muted-foreground">Net cost to you</span>
            <span className="font-bold">₹{cfg.activationFee - cfg.newUserReward}</span>
          </div>
          <div className="flex justify-between items-center bg-muted rounded-lg p-3">
            <span className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4" /> Current wallet balance</span>
            <span className={`font-bold ${insufficient ? "text-destructive" : "text-foreground"}`}>₹{balance.toFixed(2)}</span>
          </div>

          {insufficient ? (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-destructive mb-2">
                <AlertTriangle className="w-4 h-4" /> Insufficient balance
              </div>
              <p className="text-muted-foreground mb-3">
                Add at least ₹{(cfg.activationFee - balance).toFixed(2)} to your wallet to activate.
              </p>
              <Link to="/retailer/wallet">
                <Button className="w-full">Recharge Wallet</Button>
              </Link>
            </div>
          ) : (
            <Button onClick={handleActivate} disabled={busy} className="w-full bg-gov-gold hover:opacity-90 text-white font-bold" size="lg">
              {busy ? "Activating…" : `Activate Now — Pay ₹${cfg.activationFee}`}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

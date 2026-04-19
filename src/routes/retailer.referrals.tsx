import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { RouteGuard } from "@/components/RouteGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, Share2, Users, IndianRupee, Gift } from "lucide-react";
import {
  getOrCreateReferralCode,
  subscribeReferredUsers,
  subscribeReferrerPayouts,
  loadReferralConfig,
  type ReferralConfig,
  type ReferralPayout,
} from "@/lib/referral-firebase";
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

  useEffect(() => {
    if (!appUser?.uid) return;
    getOrCreateReferralCode(appUser.uid).then(setCode);
    loadReferralConfig().then(setCfg);
    const u1 = subscribeReferredUsers(appUser.uid, setRefs);
    const u2 = subscribeReferrerPayouts(appUser.uid, setPayouts);
    return () => { u1(); u2(); };
  }, [appUser?.uid]);

  const link = typeof window !== "undefined" && code ? `${window.location.origin}/register?ref=${code}` : "";
  const totalEarnings = payouts.reduce((s, p) => s + (p.referrerReward || 0), 0);
  const activatedCount = refs.filter((r) => r.activated).length;

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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Refer & Earn</h1>
        <p className="text-muted-foreground">
          Share your code. Earn ₹{cfg?.referrerReward ?? 50} every time someone signs up and activates.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total referrals</p>
                <p className="text-2xl font-bold">{refs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center"><Gift className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Activated</p>
                <p className="text-2xl font-bold">{activatedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gov-gold/20 flex items-center justify-center"><IndianRupee className="w-5 h-5 text-gov-gold" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total earned</p>
                <p className="text-2xl font-bold">₹{totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Your Referral Code & Link</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={code} readOnly className="font-mono font-bold text-lg" />
            <Button variant="outline" onClick={() => copy(code)}><Copy className="w-4 h-4" /></Button>
          </div>
          <div className="flex gap-2">
            <Input value={link} readOnly className="text-sm" />
            <Button variant="outline" onClick={() => copy(link)}><Copy className="w-4 h-4" /></Button>
            <Button onClick={share}><Share2 className="w-4 h-4 mr-2" />Share</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your Referrals ({refs.length})</CardTitle></CardHeader>
        <CardContent>
          {refs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No referrals yet. Share your code to start earning!</p>
          ) : (
            <div className="space-y-2">
              {refs.map((r) => (
                <div key={r.uid} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{r.name || r.email}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </div>
                  {r.activated ? (
                    <Badge className="bg-green-600">Activated · +₹{cfg?.referrerReward ?? 50}</Badge>
                  ) : (
                    <Badge variant="outline">Pending activation</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { RouteGuard } from "@/components/RouteGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  loadReferralConfig,
  saveReferralConfig,
  subscribeAllPayouts,
  type ReferralConfig,
  type ReferralPayout,
  DEFAULT_REFERRAL_CONFIG,
} from "@/lib/referral-firebase";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/referrals")({
  ssr: false,
  component: () => (
    <RouteGuard allowedRoles={["admin"]}>
      <DashboardLayout>
        <AdminReferralPage />
      </DashboardLayout>
    </RouteGuard>
  ),
});

function AdminReferralPage() {
  const { appUser } = useAuth();
  const [cfg, setCfg] = useState<ReferralConfig>(DEFAULT_REFERRAL_CONFIG);
  const [payouts, setPayouts] = useState<ReferralPayout[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReferralConfig().then(setCfg);
    return subscribeAllPayouts(setPayouts);
  }, []);

  const save = async () => {
    if (!appUser) return;
    setSaving(true);
    try {
      await saveReferralConfig(cfg, appUser.uid);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const totalPaidOut = payouts.reduce((s, p) => s + (p.referrerReward || 0) + (p.newUserReward || 0), 0);
  const totalCollected = payouts.reduce((s, p) => s + (p.activationFee || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referral System</h1>
        <p className="text-muted-foreground">Configure rewards and monitor payouts.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Activations</p>
          <p className="text-2xl font-bold">{payouts.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Activation fees collected</p>
          <p className="text-2xl font-bold text-green-600">₹{totalCollected.toFixed(2)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Rewards paid out</p>
          <p className="text-2xl font-bold text-destructive">₹{totalPaidOut.toFixed(2)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Changes take effect immediately for new activations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <Label>Enable Referral System</Label>
              <p className="text-xs text-muted-foreground">When off, activation page is unavailable.</p>
            </div>
            <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })} />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Activation Fee (₹)</Label>
              <Input type="number" min={0} value={cfg.activationFee}
                onChange={(e) => setCfg({ ...cfg, activationFee: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">Charged to new user.</p>
            </div>
            <div className="space-y-2">
              <Label>New User Reward (₹)</Label>
              <Input type="number" min={0} value={cfg.newUserReward}
                onChange={(e) => setCfg({ ...cfg, newUserReward: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">Credited back instantly.</p>
            </div>
            <div className="space-y-2">
              <Label>Referrer Reward (₹)</Label>
              <Input type="number" min={0} value={cfg.referrerReward}
                onChange={(e) => setCfg({ ...cfg, referrerReward: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">Credited to the referring retailer.</p>
            </div>
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Config"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Activation & Payout Log ({payouts.length})</CardTitle></CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No activations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">New User</th>
                    <th className="text-left py-2 px-2">Referred By</th>
                    <th className="text-right py-2 px-2">Fee</th>
                    <th className="text-right py-2 px-2">User Bonus</th>
                    <th className="text-right py-2 px-2">Referrer Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 px-2 whitespace-nowrap">{new Date(p.paidAt).toLocaleDateString()}</td>
                      <td className="py-2 px-2">
                        <div className="font-medium">{p.newUserName || "—"}</div>
                        <div className="text-xs text-muted-foreground">{p.newUserEmail}</div>
                      </td>
                      <td className="py-2 px-2">
                        {p.referrerCode ? (
                          <Badge variant="outline" className="font-mono">{p.referrerCode}</Badge>
                        ) : <span className="text-muted-foreground">Direct</span>}
                      </td>
                      <td className="py-2 px-2 text-right text-green-600 font-medium">+₹{p.activationFee}</td>
                      <td className="py-2 px-2 text-right text-destructive">–₹{p.newUserReward}</td>
                      <td className="py-2 px-2 text-right text-destructive">{p.referrerReward > 0 ? `–₹${p.referrerReward}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

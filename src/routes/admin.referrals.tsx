import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  loadReferralConfig,
  saveReferralConfig,
  subscribeAllPayouts,
  type ReferralConfig,
  type ReferralPayout,
  DEFAULT_REFERRAL_CONFIG,
} from "@/lib/referral-firebase";
import {
  subscribeAllTransferRequests,
  adminApproveTransfer,
  adminRejectTransfer,
  type TransferRequestDoc,
} from "@/lib/rewards-wallet";
import { CheckCircle2, XCircle, Clock, ArrowRightLeft, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/referrals")({
  ssr: false,
  component: AdminReferralPage,
});

function AdminReferralPage() {
  const { appUser } = useAuth();
  const [cfg, setCfg] = useState<ReferralConfig>(DEFAULT_REFERRAL_CONFIG);
  const [payouts, setPayouts] = useState<ReferralPayout[]>([]);
  const [saving, setSaving] = useState(false);
  const [transfers, setTransfers] = useState<TransferRequestDoc[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    loadReferralConfig().then(setCfg);
    const unsubPayouts = subscribeAllPayouts(setPayouts);
    const unsubTransfers = subscribeAllTransferRequests(setTransfers);
    return () => { unsubPayouts(); unsubTransfers(); };
  }, []);

  const approve = async (id: string) => {
    if (!appUser) return;
    setProcessingId(id);
    try {
      await adminApproveTransfer(id, appUser.uid);
      toast.success("Transfer approved & credited to main wallet");
    } catch (e: any) {
      toast.error(e?.message || "Approval failed");
    } finally {
      setProcessingId(null);
    }
  };

  const reject = async () => {
    if (!appUser || !rejectId) return;
    if (!rejectNote.trim()) { toast.error("Please add a reason"); return; }
    setProcessingId(rejectId);
    try {
      await adminRejectTransfer(rejectId, appUser.uid, rejectNote.trim());
      toast.success("Transfer rejected");
      setRejectId(null);
      setRejectNote("");
    } catch (e: any) {
      toast.error(e?.message || "Reject failed");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingTransfers = transfers.filter(t => t.status === "pending");
  const processedTransfers = transfers.filter(t => t.status !== "pending");

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

  // ── This-month leaderboard ──
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const leaderboard = (() => {
    const map = new Map<string, { uid: string; code?: string; earnings: number; count: number }>();
    for (const p of payouts) {
      if (!p.referrerUid || !p.paidAt?.startsWith(monthKey)) continue;
      if (!(p.referrerReward > 0)) continue;
      const row = map.get(p.referrerUid) ?? { uid: p.referrerUid, code: p.referrerCode, earnings: 0, count: 0 };
      row.earnings += p.referrerReward || 0;
      row.count += 1;
      if (!row.code && p.referrerCode) row.code = p.referrerCode;
      map.set(p.referrerUid, row);
    }
    return Array.from(map.values())
      .sort((a, b) => b.earnings - a.earnings || b.count - a.count)
      .slice(0, 10);
  })();
  const monthLabel = now.toLocaleString(undefined, { month: "long", year: "numeric" });

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

      <Card className="border-amber-300 dark:border-amber-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-amber-600" />
                Rewards → Main Wallet Transfer Requests
              </CardTitle>
              <CardDescription>
                Retailers request transfers of their referral & game earnings to the main wallet.
                Approve to atomically debit rewards and credit main wallet.
              </CardDescription>
            </div>
            {pendingTransfers.length > 0 && (
              <Badge variant="destructive" className="text-base px-3 py-1">
                <Clock className="h-3.5 w-3.5 mr-1" /> {pendingTransfers.length} Pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingTransfers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No pending transfer requests.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-2">Requested</th>
                    <th className="text-left py-2 px-2">User</th>
                    <th className="text-right py-2 px-2">Amount</th>
                    <th className="text-left py-2 px-2">Note</th>
                    <th className="text-right py-2 px-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTransfers.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2 px-2 whitespace-nowrap text-xs">
                        {new Date(t.requestedAt).toLocaleString()}
                      </td>
                      <td className="py-2 px-2">
                        <div className="font-medium">{t.userName || "—"}</div>
                        <div className="text-xs text-muted-foreground">{t.userEmail || t.uid.slice(0, 10) + "…"}</div>
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-primary">₹{t.amount.toFixed(2)}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground max-w-[200px] truncate">
                        {t.userNote || "—"}
                      </td>
                      <td className="py-2 px-2 text-right space-x-2 whitespace-nowrap">
                        <Button size="sm" onClick={() => approve(t.id)} disabled={processingId === t.id}>
                          {processingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (<><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve</>)}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setRejectId(t.id); setRejectNote(""); }} disabled={processingId === t.id}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {processedTransfers.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Show processed history ({processedTransfers.length})
              </summary>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2 px-2">Processed</th>
                      <th className="text-left py-2 px-2">User</th>
                      <th className="text-right py-2 px-2">Amount</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Admin Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedTransfers.map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-2 px-2 whitespace-nowrap text-xs">
                          {t.processedAt ? new Date(t.processedAt).toLocaleString() : "—"}
                        </td>
                        <td className="py-2 px-2">
                          <div className="font-medium">{t.userName || "—"}</div>
                          <div className="text-xs text-muted-foreground">{t.userEmail || t.uid.slice(0, 10) + "…"}</div>
                        </td>
                        <td className="py-2 px-2 text-right font-medium">₹{t.amount.toFixed(2)}</td>
                        <td className="py-2 px-2">
                          {t.status === "approved" ? (
                            <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>
                          ) : (
                            <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>
                          )}
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground max-w-[240px] truncate">
                          {t.adminNote || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transfer Request</DialogTitle>
            <DialogDescription>
              Provide a reason that will be visible to the retailer.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Reason for rejection…"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={!!processingId}>
              {processingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <CardHeader>
          <CardTitle>🏆 Top 10 Referrers — {monthLabel}</CardTitle>
          <CardDescription>Ranked by referral earnings this calendar month.</CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No referral payouts yet this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-2 w-12">Rank</th>
                    <th className="text-left py-2 px-2">Referrer</th>
                    <th className="text-right py-2 px-2">Successful Referrals</th>
                    <th className="text-right py-2 px-2">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => (
                    <tr key={row.uid} className="border-b last:border-0">
                      <td className="py-2 px-2 font-bold">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </td>
                      <td className="py-2 px-2">
                        {row.code ? (
                          <Badge variant="outline" className="font-mono">{row.code}</Badge>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">{row.uid.slice(0, 8)}…</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right font-medium">{row.count}</td>
                      <td className="py-2 px-2 text-right font-bold text-primary">₹{row.earnings.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadDmtConfig, saveDmtConfig, listenAllTransfers } from "@/lib/dmt-firebase";
import {
  type DmtConfig,
  type DmtTransfer,
  type DmtChargeSlab,
  DEFAULT_DMT_CONFIG,
} from "@/lib/dmt-types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Banknote, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/dmt-settings")({
  ssr: false,
  component: AdminDmtSettings,
});

function AdminDmtSettings() {
  const [cfg, setCfg] = useState<DmtConfig>(DEFAULT_DMT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transfers, setTransfers] = useState<DmtTransfer[]>([]);

  useEffect(() => {
    loadDmtConfig().then((c) => { setCfg(c); setLoading(false); });
    return listenAllTransfers(setTransfers);
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayTx = transfers.filter((t) => new Date(t.createdAt).toDateString() === today);
    const month = new Date().toISOString().slice(0, 7);
    const monthTx = transfers.filter((t) => t.createdAt.startsWith(month));
    return {
      todayCount: todayTx.length,
      todayAmount: todayTx.filter((t) => t.status === "success").reduce((s, t) => s + t.amount, 0),
      todayCharges: todayTx.filter((t) => t.status === "success").reduce((s, t) => s + t.charge + t.gst, 0),
      monthCount: monthTx.length,
      monthAmount: monthTx.filter((t) => t.status === "success").reduce((s, t) => s + t.amount, 0),
      monthCharges: monthTx.filter((t) => t.status === "success").reduce((s, t) => s + t.charge + t.gst, 0),
      pending: transfers.filter((t) => t.status === "pending" || t.status === "processing").length,
    };
  }, [transfers]);

  const updateSlab = (i: number, patch: Partial<DmtChargeSlab>) => {
    const next = [...cfg.slabs];
    next[i] = { ...next[i], ...patch };
    setCfg({ ...cfg, slabs: next });
  };

  const addSlab = () => {
    const last = cfg.slabs[cfg.slabs.length - 1];
    setCfg({ ...cfg, slabs: [...cfg.slabs, { upTo: (last?.upTo || 0) + 5000, fee: (last?.fee || 0) + 10 }] });
  };

  const removeSlab = (i: number) => {
    setCfg({ ...cfg, slabs: cfg.slabs.filter((_, idx) => idx !== i) });
  };

  const save = async () => {
    setSaving(true);
    try {
      const sorted = { ...cfg, slabs: [...cfg.slabs].sort((a, b) => a.upTo - b.upTo) };
      await saveDmtConfig(sorted);
      setCfg(sorted);
      toast.success("DMT settings saved");
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="w-6 h-6 text-primary" /> DMT Settings
        </h1>
        <p className="text-muted-foreground text-sm">Charge slabs, GST, limits, and live revenue dashboard.</p>
      </div>

      {/* Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="w-4 h-4" /> Live Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Today txns" value={stats.todayCount} />
          <Stat label="Today amount" value={`₹${stats.todayAmount.toFixed(0)}`} />
          <Stat label="Today charges earned" value={`₹${stats.todayCharges.toFixed(0)}`} c="text-green-700" />
          <Stat label="Pending in queue" value={stats.pending} c="text-amber-700" />
          <Stat label="Month txns" value={stats.monthCount} />
          <Stat label="Month amount" value={`₹${stats.monthAmount.toFixed(0)}`} />
          <Stat label="Month charges earned" value={`₹${stats.monthCharges.toFixed(0)}`} c="text-green-700" />
          <Stat label="Total all-time" value={transfers.length} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Master toggle and per-transaction limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })} />
            <Label>Enable DMT for retailers</Label>
            {cfg.apiReady && <Badge variant="outline" className="text-[10px]">API READY</Badge>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label>Min per txn (₹)</Label>
              <Input type="number" value={cfg.minPerTxn} onChange={(e) => setCfg({ ...cfg, minPerTxn: +e.target.value })} />
            </div>
            <div><Label>Max per txn (₹)</Label>
              <Input type="number" value={cfg.maxPerTxn} onChange={(e) => setCfg({ ...cfg, maxPerTxn: +e.target.value })} />
            </div>
            <div><Label>Customer monthly limit (₹)</Label>
              <Input type="number" value={cfg.customerMonthlyLimit} onChange={(e) => setCfg({ ...cfg, customerMonthlyLimit: +e.target.value })} />
            </div>
            <div><Label>GST %</Label>
              <Input type="number" value={cfg.gstPercent} onChange={(e) => setCfg({ ...cfg, gstPercent: +e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <Label>Retailer commission % (of base charge)</Label>
              <Input type="number" min={0} max={100}
                value={cfg.retailerCommissionPercent}
                onChange={(e) => setCfg({ ...cfg, retailerCommissionPercent: +e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-credited to retailer wallet on each successful transfer.
                Example: charge ₹20 × {cfg.retailerCommissionPercent}% = ₹{((20 * (cfg.retailerCommissionPercent || 0)) / 100).toFixed(2)} commission.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Charge Slabs</CardTitle>
          <CardDescription>Slab fee applies based on amount ≤ upTo. GST is added on top.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {cfg.slabs.map((s, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1"><Label>Up to (₹)</Label>
                <Input type="number" value={s.upTo} onChange={(e) => updateSlab(i, { upTo: +e.target.value })} />
              </div>
              <div className="flex-1"><Label>Fee (₹)</Label>
                <Input type="number" value={s.fee} onChange={(e) => updateSlab(i, { fee: +e.target.value })} />
              </div>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeSlab(i)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addSlab}><Plus className="w-4 h-4 mr-1" /> Add Slab</Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, c }: { label: string; value: string | number; c?: string }) {
  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${c || ""}`}>{value}</p>
    </div>
  );
}

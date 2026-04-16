import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, DollarSign, BarChart3, TrendingUp } from "lucide-react";
import {
  subscribeHoroscopeSettings, updateHoroscopeSettings,
  subscribeHoroscopeRequests,
} from "@/lib/horoscope-firebase";
import { StatsCard } from "@/components/StatsCard";
import type { HoroscopeSettings, HoroscopeRequest } from "@/lib/horoscope-types";

export const Route = createFileRoute("/admin/horoscope-settings")({
  ssr: false,
  component: AdminHoroscopeSettings,
});

function AdminHoroscopeSettings() {
  const [settings, setSettings] = useState<HoroscopeSettings | null>(null);
  const [price, setPrice] = useState("");
  const [commission, setCommission] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [requests, setRequests] = useState<HoroscopeRequest[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub1 = subscribeHoroscopeSettings((s) => {
      setSettings(s);
      setPrice(String(s.pricePerHoroscope));
      setCommission(String(s.commissionPercentage));
      setEnabled(s.serviceEnabled);
    });
    const unsub2 = subscribeHoroscopeRequests((r) => setRequests(r));
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateHoroscopeSettings({
        pricePerHoroscope: Number(price) || 299,
        commissionPercentage: Number(commission) || 20,
        serviceEnabled: enabled,
      });
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const totalRevenue = requests.reduce((s, r) => s + (r.amount || 0), 0);
  const totalCommission = totalRevenue * (Number(commission) || 20) / 100;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🔮 Horoscope Settings & Revenue</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total Reports" value={requests.length} icon={<BarChart3 className="w-5 h-5" />} />
        <StatsCard title="Total Revenue" value={`₹${totalRevenue}`} icon={<DollarSign className="w-5 h-5" />} />
        <StatsCard title="Commission" value={`₹${totalCommission.toFixed(0)}`} icon={<TrendingUp className="w-5 h-5" />} />
        <StatsCard title="Delivered" value={requests.filter((r) => r.status === "Delivered").length} icon={<Settings className="w-5 h-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>⚙️ Service Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Service Enabled</Label>
              <p className="text-sm text-muted-foreground">Enable/disable horoscope service for franchises</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price per Horoscope (₹)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Commission Percentage (%)</Label>
              <Input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-gov-blue hover:bg-gov-blue/90">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

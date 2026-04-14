import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Settings, IndianRupee } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/training-settings")({
  ssr: false,
  component: AdminTrainingSettings,
});

interface TrainingSettings {
  pricePerHour: number;
  earningMode: "fixed" | "percentage";
  trainerEarningFixed: number;
  trainerEarningPercent: number;
}

const DEFAULT_SETTINGS: TrainingSettings = {
  pricePerHour: 300,
  earningMode: "fixed",
  trainerEarningFixed: 150,
  trainerEarningPercent: 30,
};

function calcTrainerEarning(s: TrainingSettings): number {
  if (s.earningMode === "percentage") {
    return Math.round((s.pricePerHour * s.trainerEarningPercent) / 100 * 100) / 100;
  }
  return s.trainerEarningFixed;
}

function AdminTrainingSettings() {
  const [settings, setSettings] = useState<TrainingSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "training"));
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            pricePerHour: data.pricePerHour ?? 300,
            earningMode: data.earningMode ?? "fixed",
            trainerEarningFixed: data.trainerEarningFixed ?? data.trainerEarningPerHour ?? 150,
            trainerEarningPercent: data.trainerEarningPercent ?? 30,
          });
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const trainerEarning = calcTrainerEarning(settings);
  const adminEarning = settings.pricePerHour - trainerEarning;
  const commissionPercent = settings.pricePerHour > 0
    ? ((adminEarning / settings.pricePerHour) * 100).toFixed(1)
    : "0";

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (trainerEarning > settings.pricePerHour) {
      toast.error("Trainer earning cannot exceed training price");
      return;
    }
    if (trainerEarning < 0) {
      toast.error("Trainer earning cannot be negative");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "training"), {
        ...settings,
        // Keep legacy field for backward compat
        trainerEarningPerHour: trainerEarning,
      });
      toast.success("Training settings saved!");
    } catch (err) {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Training Settings</h1>
        <p className="text-muted-foreground">Configure training pricing and commissions.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" /> Pricing Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <Label>Training Price per Hour (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={settings.pricePerHour}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, pricePerHour: Number(e.target.value) }))
                  }
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Trainer Earning Mode</Label>
                <RadioGroup
                  value={settings.earningMode}
                  onValueChange={(v) =>
                    setSettings((s) => ({ ...s, earningMode: v as "fixed" | "percentage" }))
                  }
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="fixed" id="mode-fixed" />
                    <Label htmlFor="mode-fixed" className="cursor-pointer">Fixed Amount (₹)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="percentage" id="mode-percent" />
                    <Label htmlFor="mode-percent" className="cursor-pointer">Percentage (%)</Label>
                  </div>
                </RadioGroup>
              </div>

              {settings.earningMode === "fixed" ? (
                <div className="space-y-2">
                  <Label>Trainer Earning per Hour (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={settings.trainerEarningFixed}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, trainerEarningFixed: Number(e.target.value) }))
                    }
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Trainer Earning Percentage (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={settings.trainerEarningPercent}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, trainerEarningPercent: Number(e.target.value) }))
                    }
                    required
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5" /> Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Training Price</span>
              <span className="font-semibold text-foreground">₹{settings.pricePerHour}/hr</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Trainer Earning</span>
              <span className="font-semibold text-green-600">
                ₹{trainerEarning}/hr
                {settings.earningMode === "percentage" && (
                  <span className="text-xs text-muted-foreground ml-1">({settings.trainerEarningPercent}%)</span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Admin Earning</span>
              <span className="font-semibold text-primary">₹{adminEarning}/hr</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-muted-foreground">Admin Commission %</span>
              <span className="font-semibold text-primary">{commissionPercent}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

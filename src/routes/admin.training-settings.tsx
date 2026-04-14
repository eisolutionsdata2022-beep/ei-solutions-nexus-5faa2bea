import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, IndianRupee } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/training-settings")({
  ssr: false,
  component: AdminTrainingSettings,
});

interface TrainingSettings {
  pricePerHour: number;
  trainerEarningPerHour: number;
}

function AdminTrainingSettings() {
  const [settings, setSettings] = useState<TrainingSettings>({
    pricePerHour: 300,
    trainerEarningPerHour: 150,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "training"));
        if (snap.exists()) {
          setSettings(snap.data() as TrainingSettings);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const commission = settings.pricePerHour - settings.trainerEarningPerHour;
  const commissionPercent = settings.pricePerHour > 0
    ? ((commission / settings.pricePerHour) * 100).toFixed(1)
    : "0";

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (settings.trainerEarningPerHour > settings.pricePerHour) {
      toast.error("Trainer earning cannot exceed training price");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "training"), settings);
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
            <form onSubmit={handleSave} className="space-y-4">
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
              <div className="space-y-2">
                <Label>Trainer Earning per Hour (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={settings.trainerEarningPerHour}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, trainerEarningPerHour: Number(e.target.value) }))
                  }
                  required
                />
              </div>
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
              <span className="font-semibold text-green-600">₹{settings.trainerEarningPerHour}/hr</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Platform Commission</span>
              <span className="font-semibold text-primary">₹{commission}/hr</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-muted-foreground">Commission %</span>
              <span className="font-semibold text-primary">{commissionPercent}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

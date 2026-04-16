import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  DEFAULT_IPPB_FEE,
  getIPPBFeeConfig,
  netRetailerCost,
  saveIPPBFeeConfig,
  type IPPBFeeConfig,
} from "@/lib/ippb-fee-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, Loader2, Save, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/ippb-settings")({
  ssr: false,
  component: AdminIPPBSettingsPage,
});

function AdminIPPBSettingsPage() {
  const { appUser } = useAuth();
  const [cfg, setCfg] = useState<IPPBFeeConfig>(DEFAULT_IPPB_FEE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getIPPBFeeConfig()
      .then(setCfg)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!appUser) return;
    setSaving(true);
    try {
      await saveIPPBFeeConfig(
        {
          serviceCharge: Number(cfg.serviceCharge) || 0,
          retailerCommission: Number(cfg.retailerCommission) || 0,
          staffCommission: Number(cfg.staffCommission) || 0,
          adminCommission: Number(cfg.adminCommission) || 0,
        },
        appUser.uid
      );
      toast.success("IPPB fee config saved");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sumSplits =
    Number(cfg.retailerCommission) + Number(cfg.staffCommission) + Number(cfg.adminCommission);
  const exceeds = sumSplits > Number(cfg.serviceCharge);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="w-6 h-6 text-gov-blue" />
          IPPB Account Opening – Fee Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Retailer wallet ഇതിൽ നിന്ന് debit ചെയ്യും. Staff success മാർക്ക് ചെയ്യുമ്പോൾ മാത്രം charge applies.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Charge & Commission Split</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Service Charge (₹) — debited from retailer</Label>
            <Input
              type="number"
              min={0}
              value={cfg.serviceCharge}
              onChange={(e) => setCfg({ ...cfg, serviceCharge: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Retailer Commission (₹)</Label>
            <Input
              type="number"
              min={0}
              value={cfg.retailerCommission}
              onChange={(e) => setCfg({ ...cfg, retailerCommission: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Staff Commission (₹)</Label>
            <Input
              type="number"
              min={0}
              value={cfg.staffCommission}
              onChange={(e) => setCfg({ ...cfg, staffCommission: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Admin Commission (₹)</Label>
            <Input
              type="number"
              min={0}
              value={cfg.adminCommission}
              onChange={(e) => setCfg({ ...cfg, adminCommission: Number(e.target.value) })}
            />
          </div>

          <div className="sm:col-span-2 rounded-lg border p-4 bg-muted/40 text-sm space-y-1">
            <div className="flex items-start gap-2 text-gov-blue font-medium">
              <Info className="w-4 h-4 mt-0.5" />
              <span>Live Preview</span>
            </div>
            <div>Debit from retailer: <span className="font-bold">₹{cfg.serviceCharge}</span></div>
            <div>
              Splits: Retailer ₹{cfg.retailerCommission} + Staff ₹{cfg.staffCommission} + Admin ₹{cfg.adminCommission}
              {" = "}₹{sumSplits}
            </div>
            <div>
              Net cost to retailer:{" "}
              <span className="font-bold text-gov-blue">₹{netRetailerCost(cfg)}</span>
            </div>
            {exceeds && (
              <div className="text-destructive font-medium">
                ⚠ Splits exceed service charge — adjust before saving.
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <Button onClick={handleSave} disabled={saving || exceeds}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </Button>
            {cfg.updatedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: {new Date(cfg.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>എങ്ങനെ പ്രവർത്തിക്കും? (Workflow in Malayalam)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3 leading-relaxed">
          <ol className="list-decimal pl-5 space-y-2">
            <li>റീടെയിലർ /retailer/ippb-ൽ "New Request" ക്ലിക്ക് ചെയ്യും. <strong>Wallet-ൽ നിന്ന് ഈ stage-ൽ ഒന്നും കട്ട് ആകില്ല.</strong></li>
            <li>Staff /staff/ippb-ൽ request claim ചെയ്ത് customer mobile enter ചെയ്ത് OTP send ചെയ്യും.</li>
            <li>Customer-ന് OTP വരുമ്പോൾ retailer-ന് അത് കൊടുക്കും. Retailer dashboard-ൽ OTP enter ചെയ്യും.</li>
            <li>Staff OTP verify ചെയ്ത്, customer details + biometric (MFS110 / L1 sim) capture ചെയ്യും.</li>
            <li>Account number generate ആയി, staff "Mark Success" ക്ലിക്ക് ചെയ്യുമ്പോൾ <strong>only then</strong> retailer wallet-ൽ നിന്ന് <strong>₹{cfg.serviceCharge}</strong> debit ആകും.</li>
            <li>അതേ ട്രാൻസാക്ഷനിൽ commission auto-credit ആകും: Retailer ₹{cfg.retailerCommission}, Staff ₹{cfg.staffCommission}, Admin ₹{cfg.adminCommission}.</li>
            <li>Retailer-ന് net cost ₹{netRetailerCost(cfg)} matters; failed/cancelled ആയാൽ <strong>charge ഇല്ല</strong>.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

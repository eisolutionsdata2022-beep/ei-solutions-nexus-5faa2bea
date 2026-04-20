/**
 * Settings tab — branch/company info + default loan parameters.
 */
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { toast } from "sonner";
import { saveFinanceSettings } from "@/lib/finance-firebase";
import type { FinanceSettings } from "@/lib/finance-types";
import {
  DEFAULT_GOLD_RATE,
  DEFAULT_INTEREST_RATE,
  DEFAULT_LTV,
  DEFAULT_PENALTY_RATE,
} from "@/lib/finance-types";
import {
  StudioCard,
  StudioSectionTitle,
  StudioInput,
  StudioTextarea,
  StudioButton,
} from "./StudioShell";

interface Props {
  ownerId: string;
  settings: FinanceSettings | null;
}

export function SettingsTab({ ownerId, settings }: Props) {
  const [form, setForm] = useState<FinanceSettings>(() => buildInitial(ownerId, settings));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(buildInitial(ownerId, settings));
  }, [ownerId, settings]);

  async function save() {
    if (!form.companyName.trim() || !form.branchName.trim()) {
      toast.error("Company name and branch name are required");
      return;
    }
    setSaving(true);
    try {
      await saveFinanceSettings({ ...form, retailerId: ownerId });
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <StudioSectionTitle
        eyebrow="Workspace"
        title="Branch Settings"
        right={
          <StudioButton onClick={save} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </StudioButton>
        }
      />

      <StudioCard>
        <div className="mb-4 flex items-center gap-2 text-slate-300">
          <SettingsIcon className="h-4 w-4 text-cyan-300" />
          <p className="text-sm font-semibold">Company & branch</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StudioInput
            label="Company name *"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          />
          <StudioInput
            label="Branch name *"
            value={form.branchName}
            onChange={(e) => setForm({ ...form, branchName: e.target.value })}
          />
          <StudioInput
            label="Owner name"
            value={form.ownerName ?? ""}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          />
          <StudioInput
            label="Email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <StudioInput
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <StudioInput
            label="WhatsApp"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          />
        </div>
        <div className="mt-3">
          <StudioTextarea
            label="Branch address"
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
      </StudioCard>

      <StudioCard>
        <div className="mb-4 flex items-center gap-2 text-slate-300">
          <SettingsIcon className="h-4 w-4 text-violet-300" />
          <p className="text-sm font-semibold">Default loan parameters</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StudioInput
            label="Gold rate ₹/g (24k)"
            type="number"
            value={form.defaultGoldRatePerGram}
            onChange={(e) => setForm({ ...form, defaultGoldRatePerGram: Number(e.target.value) })}
          />
          <StudioInput
            label="LTV %"
            type="number"
            value={form.defaultLtvPercent}
            onChange={(e) => setForm({ ...form, defaultLtvPercent: Number(e.target.value) })}
          />
          <StudioInput
            label="Interest % p.a."
            type="number"
            value={form.defaultInterestRate}
            onChange={(e) => setForm({ ...form, defaultInterestRate: Number(e.target.value) })}
          />
          <StudioInput
            label="Penalty % per day"
            type="number"
            step="0.01"
            value={form.penaltyRatePerDay}
            onChange={(e) => setForm({ ...form, penaltyRatePerDay: Number(e.target.value) })}
          />
        </div>
        <div className="mt-3">
          <StudioInput
            label="Receipt footer text"
            value={form.receiptFooter}
            onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
          />
        </div>
      </StudioCard>
    </div>
  );
}

function buildInitial(ownerId: string, settings: FinanceSettings | null): FinanceSettings {
  return (
    settings ?? {
      retailerId: ownerId,
      companyName: "",
      branchName: "Main Branch",
      ownerName: "",
      phone: "",
      whatsapp: "",
      address: "",
      email: "",
      receiptFooter: "Thank you for your business",
      defaultInterestRate: DEFAULT_INTEREST_RATE,
      defaultLtvPercent: DEFAULT_LTV,
      defaultGoldRatePerGram: DEFAULT_GOLD_RATE,
      penaltyRatePerDay: DEFAULT_PENALTY_RATE,
      updatedAt: new Date().toISOString(),
    }
  );
}

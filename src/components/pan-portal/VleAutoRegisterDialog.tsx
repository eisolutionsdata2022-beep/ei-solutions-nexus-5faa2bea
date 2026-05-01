/**
 * VleAutoRegisterDialog
 * ─────────────────────
 * Auto-prompts for the minimum fields needed to call upstream `psa_create`
 * when a coupon purchase failed with "Vle Data Not Exist". Only asks for
 * fields that are NOT already known from the PSA record / user profile.
 *
 * Used during seamless migration of legacy users whose PSA was linked
 * locally but never registered upstream.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { panPsaCreate } from "@/lib/pan-portal.functions";
import { upsertPsaRecord } from "@/lib/pan-portal-firebase";
import { generateVleId } from "@/lib/vle-id";
import type { PanPsaRecord } from "@/lib/pan-portal-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { uid: string; email: string; name?: string; phone?: string; address?: string };
  psa: PanPsaRecord | null;
  /** Called after upstream registration succeeds and PSA record is saved. */
  onRegistered: (vleRegCode?: string) => void;
}

interface FormState {
  shopName: string;
  panNo: string;
  uidNo: string;
  pinCode: string;
  state: string;
  address: string;
}

export function VleAutoRegisterDialog({ open, onOpenChange, user, psa, onRegistered }: Props) {
  const initial = useMemo<FormState>(
    () => ({
      shopName: psa?.shopName || user.name || "",
      panNo: (psa?.panNo || "").toUpperCase(),
      uidNo: psa?.uidNo || "",
      pinCode: psa?.pinCode || "",
      state: psa?.state || "Kerala",
      address: psa?.address || user.address || "",
    }),
    [psa, user],
  );

  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) setForm(initial); }, [open, initial]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user.phone || !/^\d{10}$/.test(user.phone)) {
      toast.error("Mobile number missing in your profile.");
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.panNo)) {
      toast.error("Invalid PAN format (ABCDE1234F).");
      return;
    }
    if (!/^\d{12}$/.test(form.uidNo)) {
      toast.error("Aadhaar must be 12 digits.");
      return;
    }
    if (!/^\d{6}$/.test(form.pinCode)) {
      toast.error("PIN must be 6 digits.");
      return;
    }
    if (!form.shopName.trim() || !form.address.trim() || !form.state.trim()) {
      toast.error("Shop name, address and state are required.");
      return;
    }

    setSubmitting(true);
    try {
      const vleId = generateVleId(user.uid, user.phone);
      const res = await panPsaCreate({
        data: {
          vleId,
          vleName: user.name || user.email,
          vleShop: form.shopName.trim(),
          vleLoc: form.address.trim().slice(0, 50),
          vleState: form.state.trim(),
          vleUid: form.uidNo,
          vlePin: form.pinCode,
          vleEmail: user.email,
          vleMob: user.phone,
          vlePan: form.panNo.toUpperCase(),
        },
      });
      if (!res.success) throw new Error(res.error);

      const nowIso = new Date().toISOString();
      await upsertPsaRecord({
        retailerId: user.uid,
        vleId,
        vleRegCode: res.vleRegCode,
        status: "approved",
        linkedExisting: false,
        ownerName: user.name || user.email,
        shopName: form.shopName.trim(),
        mobile: user.phone,
        email: user.email,
        panNo: form.panNo.toUpperCase(),
        uidNo: form.uidNo,
        address: form.address.trim(),
        state: form.state.trim(),
        pinCode: form.pinCode,
        remark: res.message || "Auto-registered before coupon purchase",
        createdAt: psa?.createdAt || nowIso,
        updatedAt: nowIso,
      });

      toast.success("VLE registered with UTI ✓ — retrying coupon purchase…");
      onOpenChange(false);
      onRegistered(res.vleRegCode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      console.error("[PAN][auto-register] failed:", err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Activate Your VLE with UTI
          </DialogTitle>
          <DialogDescription>
            Your PSA ID isn't registered with UTI yet. Confirm these details once and
            we'll register it automatically — your coupon purchase will retry the
            moment registration succeeds. No wallet debit until then.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ar-shop">Shop / Business Name</Label>
              <Input id="ar-shop" value={form.shopName} onChange={(e) => set("shopName", e.target.value)} placeholder="Your shop name" />
            </div>
            <div>
              <Label htmlFor="ar-state">State</Label>
              <Input id="ar-state" value={form.state} onChange={(e) => set("state", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ar-addr">Address</Label>
              <Input id="ar-addr" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Shop address" />
            </div>
            <div>
              <Label htmlFor="ar-pan">PAN No.</Label>
              <Input
                id="ar-pan"
                value={form.panNo}
                onChange={(e) => set("panNo", e.target.value.toUpperCase())}
                maxLength={10}
                placeholder="ABCDE1234F"
                className="uppercase font-mono"
              />
            </div>
            <div>
              <Label htmlFor="ar-uid">Aadhaar No.</Label>
              <Input
                id="ar-uid"
                value={form.uidNo}
                onChange={(e) => set("uidNo", e.target.value.replace(/\D/g, ""))}
                maxLength={12}
                placeholder="12-digit Aadhaar"
                inputMode="numeric"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="ar-pin">PIN Code</Label>
              <Input
                id="ar-pin"
                value={form.pinCode}
                onChange={(e) => set("pinCode", e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                placeholder="6-digit PIN"
                inputMode="numeric"
                className="font-mono"
              />
            </div>
          </div>

          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            VLE ID:{" "}
            <code className="font-mono text-foreground">
              {generateVleId(user.uid, user.phone || "")}
            </code>{" "}
            • Mobile: <code className="font-mono text-foreground">{user.phone || "—"}</code>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registering…</> : "Register & Retry Purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

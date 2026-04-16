import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { JOB_CATEGORIES, type CategoryCommissionDoc, type JobCategory } from "@/lib/job-marketplace-types";
import { setCategoryCommission } from "@/lib/job-marketplace";

export const Route = createFileRoute("/admin/job-marketplace")({
  ssr: false,
  component: AdminJobMarketplace,
});

function AdminJobMarketplace() {
  const [rules, setRules] = useState<Record<string, CategoryCommissionDoc>>({});
  const [draft, setDraft] = useState<Record<string, { type: "percent" | "flat"; value: string; sec: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "jobCategoryCommissions"), (snap) => {
      const map: Record<string, CategoryCommissionDoc> = {};
      snap.forEach((d) => { map[d.id] = d.data() as CategoryCommissionDoc; });
      setRules(map);
    });
    return unsub;
  }, []);

  const getDraft = (cat: JobCategory) => {
    if (draft[cat]) return draft[cat];
    const r = rules[cat];
    return {
      type: r?.type ?? "percent",
      value: String(r?.value ?? 10),
      sec: String(r?.workerSecurityFeePercent ?? 5),
    };
  };

  const save = async (cat: JobCategory) => {
    setBusy(cat);
    try {
      const d = getDraft(cat);
      await setCategoryCommission({
        category: cat,
        type: d.type,
        value: Number(d.value),
        workerSecurityFeePercent: Number(d.sec),
        updatedAt: new Date().toISOString(),
      });
      toast.success(`${cat} updated`);
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="w-6 h-6" /> Job Marketplace Commissions</h1>
        <p className="text-muted-foreground text-sm">Set per-category commission and worker security fee</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Category Rules</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {JOB_CATEGORIES.map((cat) => {
            const d = getDraft(cat);
            return (
              <div key={cat} className="p-3 border rounded grid sm:grid-cols-5 gap-3 items-end">
                <div className="sm:col-span-1"><p className="font-semibold text-sm">{cat}</p></div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={d.type} onValueChange={(v) => setDraft((p) => ({ ...p, [cat]: { ...d, type: v as any } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                      <SelectItem value="flat">Flat (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Commission</Label>
                  <Input type="number" value={d.value} onChange={(e) => setDraft((p) => ({ ...p, [cat]: { ...d, value: e.target.value } }))} />
                </div>
                <div>
                  <Label className="text-xs">Security Fee %</Label>
                  <Input type="number" value={d.sec} onChange={(e) => setDraft((p) => ({ ...p, [cat]: { ...d, sec: e.target.value } }))} />
                </div>
                <Button size="sm" onClick={() => save(cat)} disabled={busy === cat}>
                  {busy === cat ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p><strong>Flow:</strong> Uploader posts job → budget held in escrow. Worker bids → on accept, security fee debited from worker. On completion, worker is paid (bid − commission) + security refund, admin gets commission, uploader is refunded any excess (budget − bid).</p>
        </CardContent>
      </Card>
    </div>
  );
}

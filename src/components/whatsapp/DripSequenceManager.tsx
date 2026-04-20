import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save, Zap, Activity, CheckCircle2, MessageSquareReply, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  ensureDefaultSequence, saveSequence, subscribeDefaultSequence,
  getDripStats, subscribeRecentEnrollments,
} from "@/lib/drip-firebase";
import { LEAD_SOURCES } from "@/lib/crm-types";
import type { DripSequence, DripStep, DripEnrollment } from "@/lib/drip-types";

export function DripSequenceManager() {
  const { appUser } = useAuth();
  const [seq, setSeq] = useState<DripSequence | null>(null);
  const [steps, setSteps] = useState<DripStep[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDripStats>> | null>(null);
  const [recent, setRecent] = useState<DripEnrollment[]>([]);

  // Boot — ensure default exists, then subscribe
  useEffect(() => {
    if (!appUser?.uid) return;
    ensureDefaultSequence(appUser.uid).catch(() => {});
    const u1 = subscribeDefaultSequence((s) => {
      setSeq(s);
      if (s) {
        setSteps(s.steps || []);
        setEnabled(!!s.enabled);
        setName(s.name || "");
        setSources(s.leadSources || []);
      }
    });
    const u2 = subscribeRecentEnrollments(setRecent, 25);
    getDripStats(30).then(setStats).catch(() => {});
    return () => { u1(); u2(); };
  }, [appUser?.uid]);

  function updateStep(idx: number, patch: Partial<DripStep>) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function addStep() {
    const last = steps[steps.length - 1];
    setSteps((prev) => [
      ...prev,
      { dayOffset: (last?.dayOffset ?? 0) + 2, hourOfDay: 11, body: "" },
    ]);
  }
  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }
  function toggleSource(src: string) {
    setSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]
    );
  }

  async function handleSave() {
    // Basic validation
    for (const s of steps) {
      if (s.dayOffset < 0 || s.dayOffset > 60) {
        toast.error("Day offset must be 0–60"); return;
      }
      if (s.hourOfDay < 0 || s.hourOfDay > 23) {
        toast.error("Hour must be 0–23"); return;
      }
      if (!s.body.trim()) { toast.error("Empty step body"); return; }
      if (s.body.length > 4096) { toast.error("Step body > 4096 chars"); return; }
    }
    setSaving(true);
    try {
      await saveSequence({ name, enabled, leadSources: sources, steps });
      toast.success("Drip sequence saved");
      getDripStats(30).then(setStats).catch(() => {});
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile icon={<Activity className="h-4 w-4" />} label="Active" value={stats?.active ?? 0} tone="text-blue-600" />
        <StatTile icon={<MessageSquareReply className="h-4 w-4" />} label="Replied" value={stats?.stoppedReplied ?? 0} tone="text-emerald-600" />
        <StatTile icon={<XCircle className="h-4 w-4" />} label="Status / Manual" value={(stats?.stoppedStatus ?? 0) + (stats?.stoppedManual ?? 0)} tone="text-orange-600" />
        <StatTile icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={stats?.completed ?? 0} tone="text-violet-600" />
        <StatTile icon={<Zap className="h-4 w-4" />} label="Total (30d)" value={stats?.total ?? 0} tone="text-foreground" />
      </div>

      {/* Sequence editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Default Drip Sequence
            <Badge variant={enabled ? "default" : "secondary"} className="ml-2">
              {enabled ? "Enabled" : "Disabled"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[1fr,auto] items-end">
            <div className="space-y-1.5">
              <Label>Sequence name (admin-only)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New lead welcome" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={enabled} onCheckedChange={setEnabled} id="drip-enabled" />
              <Label htmlFor="drip-enabled" className="cursor-pointer">Enabled</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Auto-enroll lead sources</Label>
            <p className="text-xs text-muted-foreground">
              Leave all UNCHECKED to enroll <strong>every</strong> new lead regardless of source.
            </p>
            <div className="flex flex-wrap gap-2">
              {LEAD_SOURCES.map((src) => (
                <Badge
                  key={src}
                  variant={sources.includes(src) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleSource(src)}
                >
                  {src}
                </Badge>
              ))}
              <Badge
                variant={sources.includes("Landing Page") ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleSource("Landing Page")}
              >
                Landing Page
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Steps ({steps.length})</Label>
              <Button size="sm" variant="outline" onClick={addStep}>
                <Plus className="h-4 w-4 mr-1" /> Add step
              </Button>
            </div>

            {steps.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No steps yet — add one above.</p>
            )}

            {steps.map((step, idx) => (
              <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">Step {idx + 1}</Badge>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">Day +</Label>
                    <Input
                      type="number" min={0} max={60} className="w-16 h-8"
                      value={step.dayOffset}
                      onChange={(e) => updateStep(idx, { dayOffset: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs">at hour (IST)</Label>
                    <Input
                      type="number" min={0} max={23} className="w-16 h-8"
                      value={step.hourOfDay}
                      onChange={(e) => updateStep(idx, { hourOfDay: Number(e.target.value) })}
                    />
                  </div>
                  <Button
                    size="icon" variant="ghost" className="ml-auto h-8 w-8 text-destructive"
                    onClick={() => removeStep(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  value={step.body}
                  onChange={(e) => updateStep(idx, { body: e.target.value })}
                  placeholder="Hi {{name}}, ..."
                />
                <p className="text-xs text-muted-foreground">
                  {step.body.length}/4096 — supports <code>{"{{name}}"}</code>
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save sequence"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent enrollments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent enrollments</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollments yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recent.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div>
                    <span className="font-medium">{e.name || e.phone}</span>{" "}
                    <span className="text-muted-foreground">+91 {e.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">step {e.currentStep + 1}</Badge>
                    <Badge variant={e.status === "active" ? "default" : "secondary"} className="text-xs">
                      {e.status.replace("stopped_", "stopped: ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className={`flex items-center gap-2 text-xs text-muted-foreground`}>
          <span className={tone}>{icon}</span>
          {label}
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { applyForWorkBadge } from "@/lib/job-marketplace";
import { type WorkBadgeApplicationDoc } from "@/lib/job-marketplace-types";

export const Route = createFileRoute("/retailer/work-badge")({
  ssr: false,
  component: WorkBadgePage,
});

function WorkBadgePage() {
  const { appUser } = useAuth();
  const [apps, setApps] = useState<WorkBadgeApplicationDoc[]>([]);
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(
      query(collection(db, "workBadgeApplications"), where("userId", "==", appUser.uid)),
      (snap) => {
        const list: WorkBadgeApplicationDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setApps(list);
      }
    );
    return unsub;
  }, [appUser?.uid]);

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser || busy) return;
    setBusy(true);
    try {
      await applyForWorkBadge({
        userId: appUser.uid,
        userName: appUser.name || appUser.email,
        userEmail: appUser.email,
        userPhone: appUser.phone,
        skills,
        experience,
        portfolio,
      });
      toast.success("Application submitted! Admin will review.");
      setSkills(""); setExperience(""); setPortfolio("");
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  const hasBadge = !!appUser?.workBadge;
  const pending = apps.find((a) => a.status === "pending");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6" /> Work Badge</h1>
        <p className="text-muted-foreground text-sm">Required to take jobs from the marketplace</p>
      </div>

      {hasBadge && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4 text-sm text-green-900">
            ✅ You have an active Work Badge. You can bid on jobs.
          </CardContent>
        </Card>
      )}

      {!hasBadge && pending && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            ⏳ Your application is pending admin review.
          </CardContent>
        </Card>
      )}

      {!hasBadge && !pending && (
        <Card>
          <CardHeader><CardTitle>Apply for Work Badge</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleApply} className="space-y-3">
              <div><Label>Your Skills *</Label><Textarea required rows={3} placeholder="e.g. GST filing, Tally, Web development..." value={skills} onChange={(e) => setSkills(e.target.value)} /></div>
              <div><Label>Experience *</Label><Textarea required rows={3} placeholder="Years of experience, past clients, etc." value={experience} onChange={(e) => setExperience(e.target.value)} /></div>
              <div><Label>Portfolio Link</Label><Input type="url" placeholder="https://..." value={portfolio} onChange={(e) => setPortfolio(e.target.value)} /></div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {apps.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Application History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {apps.map((a) => (
              <div key={a.id} className="p-3 border rounded">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</p>
                  <Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>{a.status}</Badge>
                </div>
                {a.reviewNote && <p className="text-xs"><strong>Admin note:</strong> {a.reviewNote}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

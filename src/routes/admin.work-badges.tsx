import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, ShieldX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { reviewWorkBadge } from "@/lib/job-marketplace";
import { type WorkBadgeApplicationDoc } from "@/lib/job-marketplace-types";

export const Route = createFileRoute("/admin/work-badges")({
  ssr: false,
  component: AdminWorkBadges,
});

function AdminWorkBadges() {
  const [apps, setApps] = useState<WorkBadgeApplicationDoc[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "workBadgeApplications"), (snap) => {
      const list: WorkBadgeApplicationDoc[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setApps(list);
    });
    return unsub;
  }, []);

  const handle = async (id: string, userId: string, approve: boolean) => {
    setBusy(id);
    try {
      await reviewWorkBadge(id, userId, approve, notes[id] || "");
      toast.success(approve ? "Badge approved" : "Application rejected");
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(null); }
  };

  const pending = apps.filter((a) => a.status === "pending");
  const reviewed = apps.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6" /> Work Badge Applications</h1>
        <p className="text-muted-foreground text-sm">Approve workers who can bid on marketplace jobs</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Pending ({pending.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? <p className="text-muted-foreground text-sm">None.</p> : pending.map((a) => (
            <div key={a.id} className="p-3 border rounded space-y-2">
              <div>
                <p className="font-semibold">{a.userName} <span className="text-xs text-muted-foreground">({a.userEmail})</span></p>
                <p className="text-xs text-muted-foreground">{a.userPhone || "no phone"}</p>
              </div>
              <div className="text-sm"><strong>Skills:</strong> {a.skills}</div>
              <div className="text-sm"><strong>Experience:</strong> {a.experience}</div>
              {a.portfolio && <div className="text-sm"><strong>Portfolio:</strong> <a href={a.portfolio} target="_blank" rel="noreferrer" className="text-primary underline">{a.portfolio}</a></div>}
              <Textarea rows={2} placeholder="Review note (optional)" value={notes[a.id] || ""} onChange={(e) => setNotes((p) => ({ ...p, [a.id]: e.target.value }))} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handle(a.id, a.userId, true)} disabled={busy === a.id}>
                  {busy === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4 mr-1" /> Approve</>}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handle(a.id, a.userId, false)} disabled={busy === a.id}>
                  <ShieldX className="w-4 h-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reviewed ({reviewed.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {reviewed.length === 0 ? <p className="text-muted-foreground text-sm">None.</p> : reviewed.map((a) => (
            <div key={a.id} className="p-3 border rounded flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{a.userName}</p>
                <p className="text-xs text-muted-foreground">{a.userEmail}</p>
                {a.reviewNote && <p className="text-xs italic mt-1">"{a.reviewNote}"</p>}
              </div>
              <Badge variant={a.status === "approved" ? "default" : "destructive"}>{a.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

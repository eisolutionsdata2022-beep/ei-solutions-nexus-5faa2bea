import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Banknote, ShieldCheck, ShieldX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  reviewIPPBBadge,
  revokeIPPBBadge,
  type IPPBBadgeApplicationDoc,
} from "@/lib/ippb-badge";

export const Route = createFileRoute("/admin/ippb-badges")({
  ssr: false,
  component: AdminIPPBBadges,
});

function AdminIPPBBadges() {
  const { appUser } = useAuth();
  const [apps, setApps] = useState<IPPBBadgeApplicationDoc[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "ippbBadgeApplications"), (snap) => {
      const list: IPPBBadgeApplicationDoc[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setApps(list);
    });
    return unsub;
  }, []);

  const handle = async (id: string, userId: string, approve: boolean) => {
    if (!appUser) return;
    setBusy(id);
    try {
      await reviewIPPBBadge(id, userId, approve, appUser.uid, notes[id] || "");
      toast.success(approve ? "IPPB badge approved" : "Application rejected");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (userId: string, name: string) => {
    if (!confirm(`Revoke IPPB badge from ${name}?`)) return;
    try {
      await revokeIPPBBadge(userId);
      toast.success("Badge revoked");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const pending = apps.filter((a) => a.status === "pending");
  const reviewed = apps.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="w-6 h-6 text-gov-blue" /> IPPB Badge Applications
        </h1>
        <p className="text-muted-foreground text-sm">
          Approve retailers who can open IPPB accounts. Only badged retailers can create
          IPPB requests.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending applications.</p>
          ) : (
            pending.map((a) => (
              <div key={a.id} className="p-3 border rounded space-y-2">
                <div>
                  <p className="font-semibold">
                    {a.userName}{" "}
                    <span className="text-xs text-muted-foreground">({a.userEmail})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.userPhone || "no phone"} •{" "}
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-sm">
                  <strong>Why IPPB:</strong> {a.reason}
                </div>
                <div className="text-xs">
                  Acknowledged help page:{" "}
                  {a.acknowledgedHelp ? (
                    <span className="text-green-700">✓ yes</span>
                  ) : (
                    <span className="text-amber-700">⚠ no</span>
                  )}
                </div>
                <Textarea
                  rows={2}
                  placeholder="Review note (optional, shown to retailer)"
                  value={notes[a.id] || ""}
                  onChange={(e) =>
                    setNotes((p) => ({ ...p, [a.id]: e.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handle(a.id, a.userId, true)}
                    disabled={busy === a.id}
                  >
                    {busy === a.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 mr-1" /> Approve & Grant Badge
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handle(a.id, a.userId, false)}
                    disabled={busy === a.id}
                  >
                    <ShieldX className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reviewed ({reviewed.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {reviewed.length === 0 ? (
            <p className="text-muted-foreground text-sm">None.</p>
          ) : (
            reviewed.map((a) => (
              <div
                key={a.id}
                className="p-3 border rounded flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{a.userName}</p>
                  <p className="text-xs text-muted-foreground">{a.userEmail}</p>
                  {a.reviewNote && (
                    <p className="text-xs italic mt-1">"{a.reviewNote}"</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={a.status === "approved" ? "default" : "destructive"}
                  >
                    {a.status}
                  </Badge>
                  {a.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevoke(a.userId, a.userName)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

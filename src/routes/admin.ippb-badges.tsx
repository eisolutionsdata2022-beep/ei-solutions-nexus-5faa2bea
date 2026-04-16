import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Banknote, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import {
  reviewIPPBBadge,
  type IPPBBadgeApplicationDoc,
} from "@/lib/ippb-badge";

export const Route = createFileRoute("/admin/ippb-badges")({
  ssr: false,
  component: AdminIPPBBadges,
});

function AdminIPPBBadges() {
  const [apps, setApps] = useState<IPPBBadgeApplicationDoc[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "ippbBadgeApplications"),
      (snap) => {
        const list: IPPBBadgeApplicationDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setApps(list);
      }
    );
    return unsub;
  }, []);

  const handle = async (id: string, userId: string, approve: boolean) => {
    setBusy(id);
    try {
      await reviewIPPBBadge(id, userId, approve, notes[id] || "");
      toast.success(approve ? "IPPB Badge approved" : "Application rejected");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
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
          Approve retailers who can open IPPB accounts and receive biometric
          capture requests from staff tablets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm">None.</p>
          ) : (
            pending.map((a) => (
              <div key={a.id} className="p-3 border rounded space-y-2">
                <div>
                  <p className="font-semibold">
                    {a.userName}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({a.userEmail})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.userPhone || "no phone"} · Branch:{" "}
                    <strong>{a.branchLocation}</strong>
                  </p>
                </div>
                <div className="text-sm">
                  <strong>Device:</strong>{" "}
                  {a.hasDevice ? (
                    <span className="text-green-700">
                      ✓ {a.deviceModel || "RD-Service device"}
                    </span>
                  ) : (
                    <span className="text-amber-700">
                      ✗ No device (L1 simulation only)
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  <strong>Experience:</strong> {a.experience}
                </div>
                {a.authorizationDoc && (
                  <div className="text-sm">
                    <strong>Auth Doc:</strong>{" "}
                    <a
                      href={a.authorizationDoc}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {a.authorizationDoc}
                    </a>
                  </div>
                )}
                <Textarea
                  rows={2}
                  placeholder="Review note (optional)"
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
                        <ShieldCheck className="w-4 h-4 mr-1" /> Approve
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
                className="p-3 border rounded flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-sm">{a.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.userEmail} · {a.branchLocation}
                  </p>
                  {a.reviewNote && (
                    <p className="text-xs italic mt-1">"{a.reviewNote}"</p>
                  )}
                </div>
                <Badge
                  variant={a.status === "approved" ? "default" : "destructive"}
                >
                  {a.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

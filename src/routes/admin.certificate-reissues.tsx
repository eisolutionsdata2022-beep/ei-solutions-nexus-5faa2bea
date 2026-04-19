import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Award } from "lucide-react";
import { toast } from "sonner";
import {
  listAllReissues, reviewReissue, type CertificateReissueRequest,
} from "@/lib/certificate-reissue";

export const Route = createFileRoute("/admin/certificate-reissues")({
  ssr: false,
  component: AdminReissues,
});

function AdminReissues() {
  const { appUser } = useAuth();
  const [items, setItems] = useState<CertificateReissueRequest[]>([]);
  const [reviewing, setReviewing] = useState<CertificateReissueRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = useState("");

  const load = () => listAllReissues().then(setItems);
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!reviewing || !decision || !appUser) return;
    await reviewReissue(reviewing.id, decision, appUser.email, note);
    toast.success(`Marked as ${decision}`);
    setReviewing(null); setDecision(null); setNote("");
    load();
  };

  const pending = items.filter((i) => i.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="w-6 h-6" /> Certificate Reissue Requests</h1>
        <p className="text-muted-foreground">{pending.length} pending · {items.length} total</p>
      </div>

      <Card>
        <CardHeader><CardTitle>All Requests</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Reason</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No requests yet.</td></tr>
                ) : items.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="p-3"><div className="font-medium">{r.userName}</div><div className="text-xs text-muted-foreground">{r.userEmail}</div></td>
                    <td className="p-3 capitalize">{r.type}</td>
                    <td className="p-3 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                    <td className="p-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      {r.status === "pending" && (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" className="h-7 text-xs text-green-700" onClick={() => { setReviewing(r); setDecision("approved"); }}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => { setReviewing(r); setDecision("rejected"); }}>
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{decision === "approved" ? "Approve" : "Reject"} Reissue</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">User: <b>{reviewing?.userName}</b> · Type: <b className="capitalize">{reviewing?.type}</b></p>
            <p className="text-sm">Reason: {reviewing?.reason}</p>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Review note (optional)" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>Cancel</Button>
            <Button onClick={submit}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

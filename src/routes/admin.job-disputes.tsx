import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { toast } from "sonner";
import { AlertTriangle, Gavel, Loader2 } from "lucide-react";
import { FilePreviewList } from "@/components/JobFileUploadField";
import type { JobDoc, JobMessageDoc, DisputeResolution } from "@/lib/job-marketplace-types";
import { resolveDispute } from "@/lib/job-marketplace";

export const Route = createFileRoute("/admin/job-disputes")({
  ssr: false,
  component: AdminJobDisputes,
});

function AdminJobDisputes() {
  const { appUser } = useAuth();
  const [jobs, setJobs] = useState<JobDoc[]>([]);
  const [selected, setSelected] = useState<JobDoc | null>(null);
  const [messages, setMessages] = useState<JobMessageDoc[]>([]);
  const [resolution, setResolution] = useState<DisputeResolution>("release_worker");
  const [splitPct, setSplitPct] = useState("50");
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "jobs"), where("status", "==", "disputed")),
      (snap) => {
        const list: JobDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) =>
          (a.disputeRaisedAt || a.updatedAt) < (b.disputeRaisedAt || b.updatedAt) ? 1 : -1
        );
        setJobs(list);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, "jobMessages"), where("jobId", "==", selected.id)),
      (snap) => {
        const list: JobMessageDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setMessages(list);
      }
    );
    return unsub;
  }, [selected?.id]);

  const handleResolve = async () => {
    if (!selected || !appUser || busy) return;
    if (!adminNote.trim()) {
      toast.error("Please add an admin note explaining the decision");
      return;
    }
    setBusy(true);
    try {
      await resolveDispute(
        selected.id,
        appUser.uid,
        resolution,
        adminNote.trim(),
        resolution === "split" ? Number(splitPct) : undefined
      );
      toast.success("Dispute resolved & funds released");
      setSelected(null);
      setAdminNote("");
      setSplitPct("50");
      setResolution("release_worker");
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve dispute");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gavel className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold">Job Disputes</h1>
        <Badge variant="secondary">{jobs.length} pending</Badge>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            🎉 No active disputes. All clear!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {jobs.map((j) => (
            <Card key={j.id} className="border-amber-200">
              <CardHeader>
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      {j.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {j.category} • Uploader: {j.uploaderName} • Worker:{" "}
                      <Link
                        to="/worker/$workerId"
                        params={{ workerId: j.assignedWorkerId || "" }}
                        className="text-primary underline"
                      >
                        {j.assignedWorkerName}
                      </Link>
                    </p>
                  </div>
                  <Badge variant="destructive">disputed</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Budget</p>
                    <p className="font-bold">₹{j.budget}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Final Bid</p>
                    <p className="font-bold">₹{j.finalBidAmount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Security Held</p>
                    <p className="font-bold">₹{j.workerSecurityFee || 0}</p>
                  </div>
                </div>
                {j.disputeReason && (
                  <div className="bg-amber-50 border border-amber-200 p-2 rounded">
                    <p className="text-xs font-semibold text-amber-900">Uploader's reason:</p>
                    <p className="text-xs text-amber-800 whitespace-pre-wrap">{j.disputeReason}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => setSelected(j)}>
                    Review & Resolve
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/retailer/jobs/$jobId" params={{ jobId: j.id }}>
                      View Job
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resolve Dispute: {selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded">
                <p className="text-xs font-semibold text-amber-900">Uploader's complaint:</p>
                <p className="text-sm text-amber-900 whitespace-pre-wrap">
                  {selected.disputeReason}
                </p>
              </div>

              <div>
                <Label className="text-xs">Submission History & Files</Label>
                <div className="mt-1 max-h-64 overflow-y-auto border rounded p-2 space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No messages</p>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className="text-xs border-b pb-2 last:border-0">
                        <div className="flex justify-between">
                          <span className="font-semibold">
                            {m.fromUserName}{" "}
                            <Badge variant="outline" className="ml-1">{m.type}</Badge>
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(m.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        {m.fileUrls && m.fileUrls.length > 0 && (
                          <FilePreviewList urls={m.fileUrls} />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Decision</Label>
                <RadioGroup
                  value={resolution}
                  onValueChange={(v) => setResolution(v as DisputeResolution)}
                  className="mt-2 space-y-2"
                >
                  <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="release_worker" className="mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold">Release to Worker (standard payout)</p>
                      <p className="text-muted-foreground">
                        Worker gets bid − commission. Uploader refunded excess. Admin earns commission.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="favor_worker_no_commission" className="mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold">Favor Worker (no commission)</p>
                      <p className="text-muted-foreground">
                        Worker gets full bid. No admin cut. Uploader was wrong / acted in bad faith.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="refund_uploader" className="mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold">Full Refund to Uploader</p>
                      <p className="text-muted-foreground">
                        Worker only gets security fee back. Worker did not deliver.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="split" className="mt-0.5" />
                    <div className="text-xs w-full">
                      <p className="font-semibold">Split Payment</p>
                      <p className="text-muted-foreground">
                        Partial credit to worker, rest refunded to uploader.
                      </p>
                      {resolution === "split" && (
                        <div className="mt-2 flex items-center gap-2">
                          <Label className="text-xs">Worker gets %</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={splitPct}
                            onChange={(e) => setSplitPct(e.target.value)}
                            className="w-20 h-7"
                          />
                          <span className="text-xs text-muted-foreground">
                            ≈ ₹{Math.round(((selected.finalBidAmount || 0) * Number(splitPct)) / 100)} of ₹{selected.finalBidAmount}
                          </span>
                        </div>
                      )}
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-sm">Admin Note (visible in audit log) *</Label>
                <Textarea
                  required
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Explain your decision..."
                />
              </div>

              <Button onClick={handleResolve} disabled={busy} className="w-full">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Resolution & Release Funds"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

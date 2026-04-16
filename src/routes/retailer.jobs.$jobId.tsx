import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Send, Star, AlertTriangle } from "lucide-react";
import {
  type BidDoc,
  type JobDoc,
  type JobMessageDoc,
} from "@/lib/job-marketplace-types";
import {
  acceptBid,
  completeJobAndRelease,
  placeBid,
  raiseDispute,
  rejectJob,
  requestDocuments,
  submitWork,
  uploadDocumentsResponse,
} from "@/lib/job-marketplace";
import { uploadJobFiles } from "@/lib/job-file-upload";
import { JobFileUploadField, FilePreviewList } from "@/components/JobFileUploadField";
import { RatingDialog } from "@/components/RatingDialog";
import { getRatingForJob } from "@/lib/job-ratings";

export const Route = createFileRoute("/retailer/jobs/$jobId")({
  ssr: false,
  component: JobDetail,
});

function JobDetail() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const [job, setJob] = useState<JobDoc | null>(null);
  const [bids, setBids] = useState<BidDoc[]>([]);
  const [messages, setMessages] = useState<JobMessageDoc[]>([]);
  const [busy, setBusy] = useState(false);

  const [bidOpen, setBidOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [noBadgeOpen, setNoBadgeOpen] = useState(false);

  const [docRequestOpen, setDocRequestOpen] = useState(false);
  const [docRequestText, setDocRequestText] = useState("");

  const [docUploadOpen, setDocUploadOpen] = useState(false);
  const [docUploadText, setDocUploadText] = useState("");
  const [docUploadFiles, setDocUploadFiles] = useState<File[]>([]);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitText, setSubmitText] = useState("");
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);

  const [ratingOpen, setRatingOpen] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "jobs", jobId), (snap) => {
      if (snap.exists()) setJob({ id: snap.id, ...(snap.data() as any) });
    });
    return unsub;
  }, [jobId]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "bids"), where("jobId", "==", jobId)),
      (snap) => {
        const list: BidDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setBids(list);
      }
    );
    return unsub;
  }, [jobId]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "jobMessages"), where("jobId", "==", jobId)),
      (snap) => {
        const list: JobMessageDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setMessages(list);
      }
    );
    return unsub;
  }, [jobId]);

  // Check if rating exists
  useEffect(() => {
    if (job?.status === "completed") {
      getRatingForJob(jobId).then((r) => setHasRated(!!r));
    }
  }, [jobId, job?.status]);

  const isUploader = appUser && job && appUser.uid === job.uploaderId;
  const isWorker = appUser && job && appUser.uid === job.assignedWorkerId;
  const isOpen = job?.status === "open";

  const handleBid = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser || !job || busy) return;
    setBusy(true);
    try {
      await placeBid(job.id, job.title, appUser.uid, appUser.name || appUser.email, Number(bidAmount), bidMessage);
      toast.success("Bid placed!");
      setBidOpen(false); setBidAmount(""); setBidMessage("");
    } catch (err: any) {
      if (err.message === "NO_BADGE") {
        setBidOpen(false);
        setNoBadgeOpen(true);
      } else toast.error(err.message || "Failed to bid");
    } finally { setBusy(false); }
  };

  const handleAccept = async (bidId: string) => {
    if (!job || busy) return;
    setBusy(true);
    try {
      await acceptBid(job.id, bidId);
      toast.success("Bid accepted! Worker assigned.");
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const handleReject = async () => {
    if (!job || busy) return;
    if (!confirm("Cancel this job and refund escrow?")) return;
    setBusy(true);
    try {
      await rejectJob(job.id);
      toast.success("Job cancelled and refunded");
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const handleRequestDocs = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser || !job || busy) return;
    setBusy(true);
    try {
      await requestDocuments(job.id, appUser.uid, appUser.name || appUser.email, docRequestText);
      toast.success("Document request sent");
      setDocRequestOpen(false); setDocRequestText("");
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const handleUploadDocs = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser || !job || busy) return;
    setBusy(true);
    try {
      const uploaded = await uploadJobFiles({
        jobId: job.id,
        userId: appUser.uid,
        kind: "doc-upload",
        files: docUploadFiles,
      });
      await uploadDocumentsResponse(
        job.id,
        appUser.uid,
        appUser.name || appUser.email,
        docUploadText,
        uploaded.map((u) => u.url),
      );
      toast.success("Documents shared with worker");
      setDocUploadOpen(false); setDocUploadText(""); setDocUploadFiles([]);
    } catch (err: any) { toast.error(err.message || "Upload failed"); }
    finally { setBusy(false); }
  };

  const handleSubmitWork = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser || !job || busy) return;
    setBusy(true);
    try {
      const uploaded = await uploadJobFiles({
        jobId: job.id,
        userId: appUser.uid,
        kind: "submission",
        files: submitFiles,
      });
      await submitWork(
        job.id,
        appUser.uid,
        appUser.name || appUser.email,
        submitText,
        uploaded.map((u) => u.url),
      );
      toast.success("Work submitted for review");
      setSubmitOpen(false); setSubmitText(""); setSubmitFiles([]);
    } catch (err: any) { toast.error(err.message || "Upload failed"); }
    finally { setBusy(false); }
  };

  const handleComplete = async () => {
    if (!job || busy) return;
    if (!confirm("Mark complete and release payment?")) return;
    setBusy(true);
    try {
      await completeJobAndRelease(job.id);
      toast.success("Payment released! Please rate your worker.");
      setTimeout(() => setRatingOpen(true), 500);
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const handleRaiseDispute = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser || !job || busy) return;
    setBusy(true);
    try {
      await raiseDispute(job.id, appUser.uid, disputeReason);
      toast.success("Dispute raised. Admin will review and decide.");
      setDisputeOpen(false);
      setDisputeReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to raise dispute");
    } finally {
      setBusy(false);
    }
  };

  if (!job) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/retailer/jobs" })}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <CardTitle>{job.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {job.category} • Posted by {job.uploaderName}
                {job.assignedWorkerId && (
                  <> • Worker: <Link to="/worker/$workerId" params={{ workerId: job.assignedWorkerId }} className="text-primary underline">{job.assignedWorkerName}</Link></>
                )}
              </p>
            </div>
            <Badge variant={job.status === "completed" ? "default" : job.status === "rejected" ? "destructive" : "secondary"}>{job.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm whitespace-pre-wrap">{job.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Budget</p><p className="font-bold">₹{job.budget}</p></div>
            <div><p className="text-xs text-muted-foreground">Deadline</p><p className="font-semibold">{job.deadline}</p></div>
            {job.pages ? <div><p className="text-xs text-muted-foreground">Pages</p><p className="font-semibold">{job.pages}</p></div> : null}
            {job.finalBidAmount ? <div><p className="text-xs text-muted-foreground">Accepted Bid</p><p className="font-bold text-primary">₹{job.finalBidAmount}</p></div> : null}
          </div>
          {job.requiredDocs && (
            <div className="bg-muted/50 p-2 rounded text-xs"><strong>Required docs:</strong> {job.requiredDocs}</div>
          )}
          {job.status === "completed" && (
            <div className="bg-green-50 border border-green-200 p-3 rounded text-sm space-y-1">
              <p>✅ Worker received: <strong>₹{job.workerNet}</strong></p>
              <p>💼 Admin commission: <strong>₹{job.adminCommission}</strong></p>
              {(job.uploaderRefund || 0) > 0 && <p>💰 You were refunded: <strong>₹{job.uploaderRefund}</strong></p>}
              {job.disputeResolution && (
                <p className="pt-1 border-t mt-1">⚖️ Resolved via dispute: <strong>{job.disputeResolution}</strong></p>
              )}
            </div>
          )}
          {job.status === "disputed" && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm space-y-1">
              <p className="font-semibold flex items-center gap-1 text-amber-900">
                <AlertTriangle className="w-4 h-4" /> Under Dispute — Awaiting Admin Review
              </p>
              {job.disputeReason && (
                <p className="text-xs text-amber-800"><strong>Reason:</strong> {job.disputeReason}</p>
              )}
              <p className="text-xs text-amber-700">Funds remain held in escrow. Admin will decide payout.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {!isUploader && isOpen && (
          <Button onClick={() => setBidOpen(true)}>Place a Bid</Button>
        )}
        {isWorker && (job.status === "assigned" || job.status === "doc_requested") && (
          <>
            <Button variant="outline" onClick={() => setDocRequestOpen(true)}>Request Documents</Button>
            <Button onClick={() => setSubmitOpen(true)}>Submit Completed Work</Button>
          </>
        )}
        {isUploader && job.status === "doc_requested" && (
          <Button onClick={() => setDocUploadOpen(true)}>Upload Documents</Button>
        )}
        {isUploader && job.status === "submitted" && (
          <>
            <Button onClick={handleComplete} disabled={busy}>Mark Completed & Pay</Button>
            <Button variant="destructive" onClick={() => setDisputeOpen(true)} disabled={busy}>
              <AlertTriangle className="w-4 h-4 mr-1" /> Reject & Raise Dispute
            </Button>
          </>
        )}
        {isUploader && job.status === "completed" && !hasRated && job.assignedWorkerId && (
          <Button onClick={() => setRatingOpen(true)} variant="default">
            <Star className="w-4 h-4 mr-1" /> Rate Worker
          </Button>
        )}
        {isUploader && job.status === "completed" && hasRated && (
          <Badge variant="outline" className="px-3 py-1.5"><Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" /> Rated</Badge>
        )}
        {isUploader && job.status !== "completed" && job.status !== "rejected" && job.status !== "disputed" && job.status !== "submitted" && (
          <Button variant="destructive" onClick={handleReject} disabled={busy}>Cancel Job</Button>
        )}
      </div>

      {/* Bids panel (uploader only) */}
      {isUploader && (
        <Card>
          <CardHeader><CardTitle>Bids ({bids.length})</CardTitle></CardHeader>
          <CardContent>
            {bids.length === 0 ? <p className="text-muted-foreground text-sm">No bids yet.</p> : (
              <div className="space-y-2">
                {bids.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-semibold">
                        <Link to="/worker/$workerId" params={{ workerId: b.workerId }} className="hover:underline">{b.workerName}</Link>
                        {" — "}<span className="text-primary">₹{b.amount}</span>
                      </p>
                      {b.message && <p className="text-xs text-muted-foreground">{b.message}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={b.status === "accepted" ? "default" : b.status === "rejected" ? "destructive" : "secondary"}>{b.status}</Badge>
                      {b.status === "pending" && isOpen && (
                        <Button size="sm" onClick={() => handleAccept(b.id)} disabled={busy}>Accept</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages thread */}
      <Card>
        <CardHeader><CardTitle>Communication ({messages.length})</CardTitle></CardHeader>
        <CardContent>
          {messages.length === 0 ? <p className="text-muted-foreground text-sm">No messages yet.</p> : (
            <div className="space-y-2">
              {messages.map((m) => (
                <div key={m.id} className="p-3 border rounded text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-xs">{m.fromUserName} <Badge variant="outline" className="ml-2">{m.type}</Badge></p>
                    <p className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.fileUrls && m.fileUrls.length > 0 && (
                    <FilePreviewList urls={m.fileUrls} />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bid dialog */}
      <Dialog open={bidOpen} onOpenChange={setBidOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Place Your Bid</DialogTitle></DialogHeader>
          <form onSubmit={handleBid} className="space-y-3">
            <div><Label>Bid Amount (₹) *</Label><Input required type="number" min={1} max={job.budget} value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">Max: ₹{job.budget}. A small security fee is deducted on acceptance and refunded on completion.</p>
            <div><Label>Cover Message</Label><Textarea rows={3} value={bidMessage} onChange={(e) => setBidMessage(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Bid"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* No badge dialog */}
      <Dialog open={noBadgeOpen} onOpenChange={setNoBadgeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>You don't have permission to take this work</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">A Work Badge is required to bid on jobs. Apply now and an admin will review your application.</p>
          <Button onClick={() => navigate({ to: "/retailer/work-badge" })}>Apply for Work Badge</Button>
        </DialogContent>
      </Dialog>

      {/* Doc request */}
      <Dialog open={docRequestOpen} onOpenChange={setDocRequestOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Documents</DialogTitle></DialogHeader>
          <form onSubmit={handleRequestDocs} className="space-y-3">
            <Textarea required rows={4} placeholder="List the documents you need..." value={docRequestText} onChange={(e) => setDocRequestText(e.target.value)} />
            <Button type="submit" disabled={busy} className="w-full"><Send className="w-4 h-4 mr-1" /> Send Request</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Doc upload (file picker) */}
      <Dialog open={docUploadOpen} onOpenChange={setDocUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Documents</DialogTitle></DialogHeader>
          <form onSubmit={handleUploadDocs} className="space-y-3">
            <div><Label>Note</Label><Textarea rows={3} value={docUploadText} onChange={(e) => setDocUploadText(e.target.value)} /></div>
            <div>
              <Label>Files</Label>
              <JobFileUploadField files={docUploadFiles} onChange={setDocUploadFiles} />
            </div>
            <Button type="submit" disabled={busy || docUploadFiles.length === 0} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload & Send"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit work (file picker) */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Completed Work</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitWork} className="space-y-3">
            <div><Label>Notes *</Label><Textarea required rows={3} value={submitText} onChange={(e) => setSubmitText(e.target.value)} /></div>
            <div>
              <Label>Deliverable Files *</Label>
              <JobFileUploadField files={submitFiles} onChange={setSubmitFiles} />
            </div>
            <Button type="submit" disabled={busy || submitFiles.length === 0} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload & Submit"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dispute dialog */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Reject & Raise Dispute
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRaiseDispute} className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded text-xs space-y-1">
              <p className="font-semibold text-amber-900">⚠️ This will freeze all funds in escrow.</p>
              <p className="text-amber-800">An admin will review the submission and decide payouts. You cannot cancel a disputed job.</p>
            </div>
            <div>
              <Label>Reason for rejecting the work *</Label>
              <Textarea
                required
                rows={5}
                placeholder="Explain what's wrong with the submission (incomplete, low quality, wrong files, etc.)"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
              />
            </div>
            <Button type="submit" variant="destructive" disabled={busy} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Dispute"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {job.assignedWorkerId && job.assignedWorkerName && appUser && (
        <RatingDialog
          open={ratingOpen}
          onOpenChange={setRatingOpen}
          jobId={job.id}
          jobTitle={job.title}
          workerId={job.assignedWorkerId}
          workerName={job.assignedWorkerName}
          uploaderId={appUser.uid}
          uploaderName={appUser.name || appUser.email}
          onSubmitted={() => setHasRated(true)}
        />
      )}
    </div>
  );
}

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
import { Loader2, ArrowLeft, Send, Star, AlertTriangle, Briefcase, IndianRupee, CalendarDays, Layers, Sparkles, CheckCircle2, Hourglass, FileCheck2, Lock, XCircle, MessageSquare, Users } from "lucide-react";
import { ServicePageShell, ServiceSectionCard, ServiceTag } from "@/components/ServicePageShell";
import {
  type BidDoc,
  type JobDoc,
  type JobMessageDoc,
} from "@/lib/job-marketplace-types";
import {
  acceptBid,
  uploaderApproveSubmission,
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

  const isUploader = !!(appUser && job && appUser.uid === job.uploaderId);
  const isWorker = !!(appUser && job && appUser.uid === job.assignedWorkerId);
  const isAdmin = appUser?.role === "admin";
  const hasBid = !!(appUser && bids.some((b) => b.workerId === appUser.uid));
  const isOpen = job?.status === "open";
  // Sensitive details (messages/files) — only participants & admin
  const canSeePrivate = isUploader || isWorker || isAdmin;
  // Anyone with badge can see open job + place a bid; once assigned, only worker/uploader/admin/bidders
  const canViewJob = isOpen || canSeePrivate || hasBid;

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
        uploaded.map((u) => ({
          url: u.url,
          name: u.name,
          contentType: u.contentType,
          size: u.size,
        })),
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
        uploaded.map((u) => ({
          url: u.url,
          name: u.name,
          contentType: u.contentType,
          size: u.size,
        })),
      );
      toast.success("Work submitted for review");
      setSubmitOpen(false); setSubmitText(""); setSubmitFiles([]);
    } catch (err: any) { toast.error(err.message || "Upload failed"); }
    finally { setBusy(false); }
  };

  const handleComplete = async () => {
    if (!job || !appUser || busy) return;
    if (!confirm("Approve this work and submit for admin payout? Funds will be released to the worker after admin review.")) return;
    setBusy(true);
    try {
      await uploaderApproveSubmission(job.id, appUser.uid);
      toast.success("Approved! Admin will release the payout shortly.");
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

  if (!job) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading job…
      </div>
    );
  }

  if (!canViewJob) {
    return (
      <ServicePageShell
        icon={Lock}
        title="Private Job"
        subtitle="Only participants can view this job"
        eyebrow="Restricted"
        gradient="from-slate-700 via-slate-800 to-slate-900"
      >
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
            <h2 className="text-lg font-semibold">No Access</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              This job is private. Only the uploader, the assigned worker, the admin, and bidders can view its details.
            </p>
            <Button variant="outline" onClick={() => navigate({ to: "/retailer/work" })}>Browse Open Jobs</Button>
          </CardContent>
        </Card>
      </ServicePageShell>
    );
  }

  // status meta for header
  const statusGradient: Record<string, string> = {
    open: "from-blue-600 via-indigo-600 to-purple-700",
    assigned: "from-amber-600 via-orange-600 to-red-600",
    doc_requested: "from-cyan-600 via-sky-600 to-blue-700",
    submitted: "from-violet-600 via-fuchsia-600 to-purple-700",
    pending_admin_approval: "from-amber-600 via-yellow-600 to-orange-700",
    completed: "from-emerald-600 via-teal-600 to-green-700",
    rejected: "from-red-600 via-rose-600 to-pink-700",
    cancelled: "from-slate-600 via-gray-700 to-zinc-800",
    disputed: "from-amber-700 via-red-700 to-rose-800",
  };
  const statusIcon: Record<string, any> = {
    open: Sparkles, assigned: Hourglass, doc_requested: FileCheck2,
    submitted: FileCheck2, pending_admin_approval: Lock,
    completed: CheckCircle2, rejected: XCircle, cancelled: XCircle,
    disputed: AlertTriangle,
  };
  const HeroIcon = statusIcon[job.status as string] || Briefcase;
  const heroGradient = statusGradient[job.status as string] || "from-orange-600 via-red-600 to-rose-700";

  return (
    <ServicePageShell
      icon={HeroIcon}
      title={job.title}
      subtitle={`${job.category} • Posted by ${job.uploaderName}`}
      eyebrow={(job.status as string).replace(/_/g, " ").toUpperCase()}
      gradient={heroGradient}
      headerAction={
        <Button
          size="sm"
          variant="secondary"
          className="bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-xl"
          onClick={() => navigate({ to: "/retailer/jobs" })}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> All Jobs
        </Button>
      }
      stats={[
        { icon: IndianRupee, label: "Budget", value: `₹${job.budget}`, accent: "from-emerald-400 to-teal-400" },
        { icon: CalendarDays, label: "Deadline", value: job.deadline, accent: "from-blue-400 to-cyan-400" },
        ...(job.pages ? [{ icon: Layers, label: "Pages", value: job.pages, accent: "from-violet-400 to-fuchsia-400" }] : []),
        ...(job.finalBidAmount ? [{ icon: CheckCircle2, label: "Accepted Bid", value: `₹${job.finalBidAmount}`, accent: "from-amber-400 to-orange-400" }] : []),
      ]}
    >
      <div className="space-y-5">
      <ServiceSectionCard title="Job Details" icon={Briefcase} accent="from-orange-500 to-red-600">
        <div className="space-y-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{job.description}</p>
          {job.requiredDocs && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-xs">
              <strong className="text-amber-900 dark:text-amber-200">Required documents:</strong>
              <span className="text-amber-800 dark:text-amber-300"> {job.requiredDocs}</span>
            </div>
          )}
          {job.referenceFiles && job.referenceFiles.length > 0 && (
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                📎 Reference files from uploader
              </p>
              <FilePreviewList files={job.referenceFiles} />
            </div>
          )}
          {job.status === "completed" && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 p-4 text-sm space-y-1.5">
              <p className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4" /> Job Completed Successfully
              </p>
              <p className="text-emerald-800 dark:text-emerald-300">Worker received: <strong>₹{job.workerNet}</strong></p>
              <p className="text-emerald-800 dark:text-emerald-300">Admin commission: <strong>₹{job.adminCommission}</strong></p>
              {(job.uploaderRefund || 0) > 0 && (
                <p className="text-emerald-800 dark:text-emerald-300">You were refunded: <strong>₹{job.uploaderRefund}</strong></p>
              )}
              {job.disputeResolution && (
                <p className="pt-1 border-t border-emerald-200 dark:border-emerald-800 mt-1 text-emerald-800 dark:text-emerald-300">
                  ⚖️ Resolved via dispute: <strong>{job.disputeResolution}</strong>
                </p>
              )}
            </div>
          )}
          {job.status === "pending_admin_approval" && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 p-4 text-sm space-y-1.5">
              <p className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <Hourglass className="w-4 h-4" /> Awaiting Admin Approval
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-300">
                Uploader has approved the work. Admin will review and release payout to the worker.
              </p>
              {job.uploaderApprovedAt && (
                <p className="text-xs text-blue-700 dark:text-blue-400">Approved on: {new Date(job.uploaderApprovedAt).toLocaleString()}</p>
              )}
            </div>
          )}
          {job.status === "disputed" && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 p-4 text-sm space-y-1.5">
              <p className="font-semibold flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4" /> Under Dispute — Awaiting Admin Review
              </p>
              {job.disputeReason && (
                <p className="text-xs text-amber-800 dark:text-amber-300"><strong>Reason:</strong> {job.disputeReason}</p>
              )}
              <p className="text-xs text-amber-700 dark:text-amber-400">Funds remain held in escrow. Admin will decide payout.</p>
            </div>
          )}
        </div>
      </ServiceSectionCard>

      {/* Action buttons */}
      <ServiceSectionCard title="Actions" icon={Sparkles} accent="from-indigo-500 to-purple-600">
        <div className="flex gap-2 flex-wrap">
          {!isUploader && isOpen && (
            <Button onClick={() => setBidOpen(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 shadow-md">
              <Sparkles className="w-4 h-4 mr-1" /> Place a Bid
            </Button>
          )}
          {isWorker && (job.status === "assigned" || job.status === "doc_requested") && (
            <>
              <Button variant="outline" onClick={() => setDocRequestOpen(true)}>
                <FileCheck2 className="w-4 h-4 mr-1" /> Request Documents
              </Button>
              <Button onClick={() => setSubmitOpen(true)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 shadow-md">
                <Send className="w-4 h-4 mr-1" /> Submit Completed Work
              </Button>
            </>
          )}
          {isUploader && job.status === "doc_requested" && (
            <Button onClick={() => setDocUploadOpen(true)} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 shadow-md">
              <FileCheck2 className="w-4 h-4 mr-1" /> Upload Documents
            </Button>
          )}
          {isUploader && job.status === "submitted" && (
            <>
              <Button onClick={handleComplete} disabled={busy} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 shadow-md">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Approve Work
              </Button>
              <Button variant="destructive" onClick={() => setDisputeOpen(true)} disabled={busy}>
                <AlertTriangle className="w-4 h-4 mr-1" /> Reject & Raise Dispute
              </Button>
            </>
          )}
          {isUploader && job.status === "completed" && !hasRated && job.assignedWorkerId && (
            <Button onClick={() => setRatingOpen(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 shadow-md">
              <Star className="w-4 h-4 mr-1" /> Rate Worker
            </Button>
          )}
          {isUploader && job.status === "completed" && hasRated && (
            <Badge variant="outline" className="px-3 py-1.5 border-amber-300 bg-amber-50 text-amber-800">
              <Star className="w-3 h-3 mr-1 fill-amber-400 text-amber-400" /> Rated
            </Badge>
          )}
          {isUploader && job.status !== "completed" && job.status !== "rejected" && job.status !== "disputed" && job.status !== "submitted" && job.status !== "pending_admin_approval" && (
            <Button variant="destructive" onClick={handleReject} disabled={busy}>
              <XCircle className="w-4 h-4 mr-1" /> Cancel Job
            </Button>
          )}
          {(!isUploader && !isWorker && !isOpen) && (
            <p className="text-xs text-muted-foreground">No actions available for this job state.</p>
          )}
        </div>
      </ServiceSectionCard>

      {/* Bids panel (uploader only) */}
      {isUploader && (
        <ServiceSectionCard
          title="Bids"
          icon={Users}
          accent="from-blue-500 to-cyan-600"
          right={<Badge variant="secondary" className="text-[10px]">{bids.length}</Badge>}
        >
          {bids.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No bids yet — workers will appear here as they submit offers.</p>
          ) : (
            <div className="space-y-2">
              {bids.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-900/40 dark:to-blue-950/20 hover:shadow-sm transition">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      <Link to="/worker/$workerId" params={{ workerId: b.workerId }} className="hover:underline">{b.workerName}</Link>
                      <span className="text-muted-foreground"> — </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">₹{b.amount}</span>
                    </p>
                    {b.message && <p className="text-xs text-muted-foreground truncate">{b.message}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ServiceTag tone={b.status === "accepted" ? "success" : b.status === "rejected" ? "danger" : "info"}>
                      {b.status}
                    </ServiceTag>
                    {b.status === "pending" && isOpen && (
                      <Button size="sm" onClick={() => handleAccept(b.id)} disabled={busy} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95">
                        Accept
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ServiceSectionCard>
      )}

      {/* Messages thread */}
      {canSeePrivate && (
        <ServiceSectionCard
          title="Communication"
          icon={MessageSquare}
          accent="from-violet-500 to-fuchsia-600"
          right={<Badge variant="secondary" className="text-[10px]">{messages.length}</Badge>}
        >
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No messages yet.</p>
          ) : (
            <div className="space-y-2">
              {messages.map((m) => (
                <div key={m.id} className="p-3 rounded-xl border bg-card text-sm hover:shadow-sm transition">
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <p className="font-semibold text-xs flex items-center gap-2 min-w-0">
                      <span className="truncate">{m.fromUserName}</span>
                      <ServiceTag tone="neutral">{m.type}</ServiceTag>
                    </p>
                    <p className="text-[10px] text-muted-foreground shrink-0">{new Date(m.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="whitespace-pre-wrap text-foreground/90">{m.text}</p>
                  {((m.files && m.files.length > 0) || (m.fileUrls && m.fileUrls.length > 0)) && (
                    <div className="mt-2"><FilePreviewList files={m.files} urls={m.fileUrls} /></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ServiceSectionCard>
      )}
      </div>

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
    </ServicePageShell>
  );
}

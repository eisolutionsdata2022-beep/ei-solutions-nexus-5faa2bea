import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Briefcase, Plus, Loader2, ShieldCheck } from "lucide-react";
import { JOB_CATEGORIES, type JobDoc } from "@/lib/job-marketplace-types";
import { createJobWithEscrow } from "@/lib/job-marketplace";
import { JobFileUploadField } from "@/components/JobFileUploadField";
import { uploadJobFiles } from "@/lib/job-file-upload";

export const Route = createFileRoute("/retailer/jobs")({
  ssr: false,
  component: RetailerJobs,
});

function RetailerJobs() {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobDoc[]>([]);
  const [myJobs, setMyJobs] = useState<JobDoc[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<typeof JOB_CATEGORIES[number]>(JOB_CATEGORIES[0]);
  const [pages, setPages] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [requiredDocs, setRequiredDocs] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "jobs"), where("status", "==", "open"), orderBy("createdAt", "desc")),
      (snap) => {
        const list: JobDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setJobs(list);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(
      query(collection(db, "jobs"), where("uploaderId", "==", appUser.uid)),
      (snap) => {
        const list: JobDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setMyJobs(list);
      }
    );
    return unsub;
  }, [appUser?.uid]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      // Pre-create temp ID by using timestamp; uploads happen *after* job is created so use job ID returned.
      // Strategy: create the job first WITHOUT files, then upload using returned jobId, then update.
      // Simpler: upload using a synthetic key derived from uploader+ts, then attach metadata.
      const tempKey = `pre-${Date.now()}`;
      let uploaded: { url: string; name: string; contentType: string; size: number }[] = [];
      if (referenceFiles.length > 0) {
        uploaded = await uploadJobFiles({
          jobId: tempKey,
          userId: appUser.uid,
          kind: "doc-upload",
          files: referenceFiles,
        });
      }
      await createJobWithEscrow(appUser.uid, appUser.name || appUser.email, {
        title,
        description,
        category,
        pages: pages ? Number(pages) : undefined,
        budget: Number(budget),
        deadline,
        requiredDocs,
        referenceFiles: uploaded.map((u) => ({
          url: u.url,
          name: u.name,
          contentType: u.contentType,
          size: u.size,
        })),
      });
      toast.success("Job posted! Budget held in escrow.");
      setOpen(false);
      setTitle(""); setDescription(""); setPages(""); setBudget(""); setDeadline(""); setRequiredDocs("");
      setReferenceFiles([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="w-6 h-6" /> Job Marketplace</h1>
          <p className="text-muted-foreground text-sm">Post jobs and hire approved workers</p>
        </div>
        <div className="flex gap-2">
          <Link to="/retailer/work-badge"><Button variant="outline"><ShieldCheck className="w-4 h-4 mr-1" /> Work Badge</Button></Link>
          <Link to="/retailer/work"><Button variant="outline">Browse Jobs (Workers)</Button></Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-1" /> Post New Job</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Post a New Job</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div><Label>Title *</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div><Label>Description *</Label><Textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category *</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {JOB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Number of Pages</Label><Input type="number" value={pages} onChange={(e) => setPages(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Budget (₹) *</Label><Input required type="number" min={50} value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
                  <div><Label>Deadline *</Label><Input required type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
                </div>
                <div><Label>Required Documents</Label><Textarea rows={2} placeholder="e.g. Aadhaar, PAN, source files..." value={requiredDocs} onChange={(e) => setRequiredDocs(e.target.value)} /></div>
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-2 rounded">
                  ⚠️ Your budget will be held in escrow when you post. Excess (budget − accepted bid) is auto-refunded on completion.
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Posting...</> : "Post Job"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>My Posted Jobs ({myJobs.length})</CardTitle></CardHeader>
        <CardContent>
          {myJobs.length === 0 ? <p className="text-muted-foreground text-sm">No jobs posted yet.</p> : (
            <div className="space-y-2">
              {myJobs.map((j) => (
                <button key={j.id} onClick={() => navigate({ to: "/retailer/jobs/$jobId", params: { jobId: j.id } })}
                  className="w-full text-left p-3 border rounded hover:bg-muted/50 transition">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-semibold">{j.title}</p>
                      <p className="text-xs text-muted-foreground">{j.category} • ₹{j.budget} • due {j.deadline}</p>
                    </div>
                    <Badge variant={j.status === "completed" ? "default" : j.status === "rejected" ? "destructive" : "secondary"}>{j.status}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Open Jobs ({jobs.length})</CardTitle></CardHeader>
        <CardContent>
          {jobs.length === 0 ? <p className="text-muted-foreground text-sm">No open jobs right now.</p> : (
            <div className="grid sm:grid-cols-2 gap-3">
              {jobs.map((j) => (
                <button key={j.id} onClick={() => navigate({ to: "/retailer/jobs/$jobId", params: { jobId: j.id } })}
                  className="text-left p-3 border rounded hover:border-primary transition">
                  <p className="font-semibold">{j.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{j.description}</p>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-muted-foreground">{j.category}</span>
                    <span className="font-bold text-primary">₹{j.budget}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

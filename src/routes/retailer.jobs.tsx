import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Briefcase, Plus, Loader2, ShieldCheck, Hammer, Sparkles, Search,
  IndianRupee, CalendarDays, Layers, TrendingUp, CheckCircle2,
  XCircle, Hourglass, ArrowRight, Lock, FileCheck2, Flame,
} from "lucide-react";
import { JOB_CATEGORIES, type JobDoc, type JobStatus } from "@/lib/job-marketplace-types";
import { createJobWithEscrow } from "@/lib/job-marketplace";
import { JobFileUploadField } from "@/components/JobFileUploadField";
import { uploadJobFiles } from "@/lib/job-file-upload";
import { ServicePageShell } from "@/components/ServicePageShell";

export const Route = createFileRoute("/retailer/jobs")({
  ssr: false,
  component: RetailerJobs,
});

const CAT_META: Record<string, { gradient: string; glow: string }> = {
  "Typing":            { gradient: "from-blue-500 via-indigo-500 to-purple-600",  glow: "shadow-indigo-500/30" },
  "Translation":       { gradient: "from-emerald-500 via-teal-500 to-cyan-500",   glow: "shadow-teal-500/30" },
  "Form Filling":      { gradient: "from-amber-500 via-orange-500 to-red-500",    glow: "shadow-orange-500/30" },
  "Scanning":          { gradient: "from-violet-500 via-fuchsia-500 to-pink-500", glow: "shadow-fuchsia-500/30" },
  "Editing":           { gradient: "from-cyan-500 via-sky-500 to-blue-600",       glow: "shadow-sky-500/30" },
  "Design":            { gradient: "from-pink-500 via-rose-500 to-red-500",       glow: "shadow-rose-500/30" },
  "Other":             { gradient: "from-slate-500 via-gray-600 to-zinc-700",     glow: "shadow-slate-500/30" },
};
const FALLBACK = { gradient: "from-slate-500 to-slate-700", glow: "shadow-slate-500/30" };
const metaOf = (c?: string) => (c && CAT_META[c]) || FALLBACK;

const STATUS_META: Record<string, { color: string; text: string; icon: any }> = {
  open:                       { color: "from-blue-500 to-indigo-600",     text: "Open",            icon: Sparkles },
  assigned:                   { color: "from-amber-500 to-orange-600",    text: "In Progress",     icon: Hourglass },
  submitted:                  { color: "from-violet-500 to-purple-600",   text: "Submitted",       icon: FileCheck2 },
  pending_admin_approval:     { color: "from-amber-500 to-yellow-600",    text: "Awaiting Admin",  icon: Lock },
  completed:                  { color: "from-emerald-500 to-teal-600",    text: "Completed",       icon: CheckCircle2 },
  rejected:                   { color: "from-red-500 to-rose-600",        text: "Rejected",        icon: XCircle },
  cancelled:                  { color: "from-slate-500 to-gray-600",      text: "Cancelled",       icon: XCircle },
};
const statusOf = (s?: JobStatus | string) => STATUS_META[s as string] || STATUS_META.open;

function RetailerJobs() {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobDoc[]>([]);
  const [myJobs, setMyJobs] = useState<JobDoc[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "newest" | "highest">("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<typeof JOB_CATEGORIES[number]>(JOB_CATEGORIES[0]);
  const [pages, setPages] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [requiredDocs, setRequiredDocs] = useState("");
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

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

  // Stats
  const stats = useMemo(() => {
    const totalSpend = myJobs
      .filter((j) => j.status === "completed")
      .reduce((s, j) => s + (j.finalBidAmount || j.budget || 0), 0);
    const inProgress = myJobs.filter((j) =>
      ["assigned", "submitted", "pending_admin_approval"].includes(j.status as string)
    ).length;
    const completed = myJobs.filter((j) => j.status === "completed").length;
    return { totalSpend, inProgress, completed, posted: myJobs.length };
  }, [myJobs]);

  const filteredOpen = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = jobs.filter((j) =>
      !q ? true : `${j.title} ${j.description} ${j.category}`.toLowerCase().includes(q)
    );
    if (filter === "highest") list = [...list].sort((a, b) => (b.budget || 0) - (a.budget || 0));
    if (filter === "newest")  list = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return list;
  }, [jobs, search, filter]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    if (submitting) return;
    setSubmitting(true);
    try {
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
    <ServicePageShell
      icon={Briefcase}
      title="Job Marketplace"
      subtitle="ജോലി പോസ്റ്റ് ചെയ്യൂ • Verified workers ബിഡ് ചെയ്യും • Escrow-secured payments"
      eyebrow="Premium Marketplace"
      gradient="from-orange-600 via-red-600 to-rose-700"
      headerAction={
        <div className="flex gap-2 flex-wrap">
          <Link to="/retailer/work-badge">
            <Button size="sm" variant="secondary" className="bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-xl">
              <ShieldCheck className="w-4 h-4 mr-1" /> Badge
            </Button>
          </Link>
          <Link to="/retailer/work">
            <Button size="sm" variant="secondary" className="bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-xl">
              <Hammer className="w-4 h-4 mr-1" /> Worker View
            </Button>
          </Link>
        </div>
      }
      stats={[
        { icon: Layers,        label: "Posted",      value: stats.posted,                 accent: "from-blue-400 to-cyan-400" },
        { icon: Hourglass,     label: "In Progress", value: stats.inProgress,             accent: "from-amber-400 to-orange-400" },
        { icon: CheckCircle2,  label: "Completed",   value: stats.completed,              accent: "from-emerald-400 to-teal-400" },
        { icon: TrendingUp,    label: "Spent",       value: `₹${stats.totalSpend}`,       accent: "from-pink-400 to-rose-400" },
      ]}
    >
      {/* CTA hero strip */}
      <Card className="border-0 overflow-hidden shadow-2xl">
        <div className="relative bg-gradient-to-br from-orange-600 via-red-600 to-rose-700 p-5 text-white">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30 shadow-lg flex-shrink-0">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-0.5 text-[10px] font-semibold border border-white/25 mb-1.5">
                  <Sparkles className="w-3 h-3" /> ESCROW PROTECTED
                </div>
                <h2 className="text-xl font-bold tracking-tight">Need work done? Post it in minutes.</h2>
                <p className="text-xs text-white/80 mt-0.5 max-w-md">
                  Verified workers ബിഡ് ചെയ്യും. നിങ്ങളുടെ budget escrow-ൽ safely hold ചെയ്യും, completion-ന് ശേഷം മാത്രം release ആകും.
                </p>
              </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-white text-orange-700 hover:bg-white/90 font-bold shadow-xl whitespace-nowrap">
                  <Plus className="w-5 h-5 mr-1.5" /> Post New Job
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-xl">Post a New Job</DialogTitle></DialogHeader>
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
                  <div><Label>Required Documents (text)</Label><Textarea rows={2} placeholder="e.g. Aadhaar, PAN, source files..." value={requiredDocs} onChange={(e) => setRequiredDocs(e.target.value)} /></div>
                  <div>
                    <Label>Reference Files (optional)</Label>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Attach sample files, briefs, or source documents.
                    </p>
                    <JobFileUploadField files={referenceFiles} onChange={setReferenceFiles} />
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs p-3 rounded-lg flex items-start gap-2">
                    <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Your budget will be held in <strong>escrow</strong> when you post. Excess (budget − accepted bid) is auto-refunded on completion.</span>
                  </div>
                  <Button type="submit" className="w-full h-11 bg-gradient-to-r from-orange-600 to-red-600 hover:opacity-95 shadow-lg" disabled={submitting}>
                    {submitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Posting...</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Post Job & Hold Escrow</>}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>

      {/* My posted jobs */}
      <section className="space-y-3 animate-fade-up">
        <SectionHead icon={FileCheck2} accent="from-orange-500 to-red-600" title="My Posted Jobs" count={myJobs.length} />
        {myJobs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No jobs posted yet. Click <strong>Post New Job</strong> to start.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myJobs.map((j) => (
              <MyJobCard
                key={j.id}
                job={j}
                onOpen={() => navigate({ to: "/retailer/jobs/$jobId", params: { jobId: j.id } })}
              />
            ))}
          </div>
        )}
      </section>

      {/* All open jobs */}
      <section className="space-y-3 animate-fade-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <SectionHead icon={Sparkles} accent="from-indigo-500 to-purple-600" title="All Open Jobs" count={jobs.length} />
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 backdrop-blur border">
            {(["all", "newest", "highest"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filter === f
                    ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "highest" ? "Highest ₹" : f}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title, description, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-orange-400/40 bg-card"
          />
        </div>

        {filteredOpen.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {jobs.length === 0 ? "No open jobs from other retailers." : "No jobs match your search."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOpen.map((j) => (
              <OpenJobCard
                key={j.id}
                job={j}
                onOpen={() => navigate({ to: "/retailer/jobs/$jobId", params: { jobId: j.id } })}
              />
            ))}
          </div>
        )}
      </section>
    </ServicePageShell>
  );
}

/* ─────────── Sub components ─────────── */

function SectionHead({ icon: Icon, title, count, accent }: { icon: any; title: string; count: number; accent: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow-md`}>
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <Badge variant="secondary" className="text-[10px] font-semibold">{count}</Badge>
    </div>
  );
}

function MyJobCard({ job, onOpen }: { job: JobDoc; onOpen: () => void }) {
  const meta = metaOf(job.category);
  const sm = statusOf(job.status);
  const SIcon = sm.icon;

  return (
    <button
      onClick={onOpen}
      className={`group relative text-left rounded-2xl border border-border/60 bg-card overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl ${meta.glow}`}
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${meta.gradient}`} />
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">{job.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{job.category}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge className={`bg-gradient-to-r ${sm.color} text-white border-0 text-[10px] px-2 py-0.5 shadow-sm`}>
            <SIcon className="w-2.5 h-2.5 mr-0.5" /> {sm.text}
          </Badge>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><CalendarDays className="w-3 h-3" /> {job.deadline || "—"}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-[11px] text-muted-foreground">Budget</span>
          <div className="flex items-center gap-0.5 text-base font-bold text-foreground">
            <IndianRupee className="w-3.5 h-3.5" />{job.budget?.toLocaleString("en-IN")}
          </div>
        </div>
      </div>
    </button>
  );
}

function OpenJobCard({ job, onOpen }: { job: JobDoc; onOpen: () => void }) {
  const meta = metaOf(job.category);
  const isUrgent = job.deadline ? (new Date(job.deadline).getTime() - Date.now()) < 1000 * 60 * 60 * 48 : false;

  return (
    <button
      onClick={onOpen}
      className={`group relative text-left rounded-2xl border border-border/60 bg-card overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl ${meta.glow}`}
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${meta.gradient}`} />
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">{job.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{job.category}</p>
          </div>
          {isUrgent && (
            <Badge className="bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 text-[9px] px-1.5 py-0">
              <Flame className="w-2.5 h-2.5 mr-0.5" /> URGENT
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{job.description}</p>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="w-3 h-3" /> {job.deadline || "—"}
          </div>
          <div className="flex items-center gap-0.5 text-base font-bold text-foreground">
            <IndianRupee className="w-3.5 h-3.5" />{job.budget?.toLocaleString("en-IN")}
          </div>
        </div>

        <div className={`flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-lg bg-gradient-to-r ${meta.gradient} text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md`}>
          View Details <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
}

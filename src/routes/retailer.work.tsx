import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Briefcase, ShieldAlert, ShieldCheck, Search, Sparkles, ArrowRight,
  Clock, IndianRupee, CalendarDays, Layers, TrendingUp, Award, Hammer,
  CheckCircle2, Hourglass, XCircle, Plus, Flame,
} from "lucide-react";
import { type BidDoc, type JobDoc } from "@/lib/job-marketplace-types";
import { ServicePageShell } from "@/components/ServicePageShell";

export const Route = createFileRoute("/retailer/work")({
  ssr: false,
  component: WorkerDashboard,
});

// Category → icon + gradient
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

function WorkerDashboard() {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [openJobs, setOpenJobs] = useState<JobDoc[]>([]);
  const [myBids, setMyBids] = useState<BidDoc[]>([]);
  const [activeJobs, setActiveJobs] = useState<JobDoc[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "newest" | "highest">("all");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "jobs"), where("status", "==", "open")),
      (snap) => {
        const list: JobDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        // Client-side ordering to avoid composite index requirement
        list.sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1));
        setOpenJobs(list);
      },
      (err) => {
        console.error("[retailer.work] open jobs listener error:", err);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(
      query(collection(db, "bids"), where("workerId", "==", appUser.uid)),
      (snap) => {
        const list: BidDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setMyBids(list);
      }
    );
    return unsub;
  }, [appUser?.uid]);

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(
      query(collection(db, "jobs"), where("assignedWorkerId", "==", appUser.uid)),
      (snap) => {
        const list: JobDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setActiveJobs(list);
      }
    );
    return unsub;
  }, [appUser?.uid]);

  const hasBadge = !!appUser?.workBadge;

  // Earnings estimate from accepted bids
  const earnings = useMemo(() => {
    return myBids
      .filter((b) => b.status === "accepted")
      .reduce((s, b) => s + (b.amount || 0), 0);
  }, [myBids]);

  const filteredOpen = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = openJobs.filter((j) => {
      if (!q) return true;
      return `${j.title} ${j.description} ${j.category}`.toLowerCase().includes(q);
    });
    if (filter === "highest") list = [...list].sort((a, b) => (b.budget || 0) - (a.budget || 0));
    if (filter === "newest")  list = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return list;
  }, [openJobs, search, filter]);

  return (
    <ServicePageShell
      icon={Hammer}
      title="Worker Studio"
      subtitle="ജോലികൾ കണ്ടെത്തൂ • ബിഡ് ചെയ്യൂ • സമ്പാദിക്കൂ — premium freelance hub"
      eyebrow="Worker Dashboard"
      gradient="from-orange-600 via-red-600 to-rose-700"
      headerAction={
        <div className="flex gap-2 flex-wrap">
          {!hasBadge ? (
            <Link to="/retailer/work-badge">
              <Button size="sm" className="bg-white text-orange-700 hover:bg-white/90 font-semibold shadow-lg">
                <ShieldAlert className="w-4 h-4 mr-1.5" /> Apply for Badge
              </Button>
            </Link>
          ) : (
            <Badge className="bg-white/20 backdrop-blur text-white border border-white/30 px-3 py-1.5 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Work Badge Verified
            </Badge>
          )}
          <Link to="/retailer/jobs">
            <Button size="sm" variant="secondary" className="bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-xl">
              <Plus className="w-4 h-4 mr-1" /> Post Job
            </Button>
          </Link>
        </div>
      }
      stats={[
        { icon: Layers,        label: "Open Jobs",   value: openJobs.length,    accent: "from-blue-400 to-cyan-400" },
        { icon: Hourglass,     label: "My Bids",     value: myBids.length,      accent: "from-amber-400 to-orange-400" },
        { icon: CheckCircle2,  label: "Active",      value: activeJobs.length,  accent: "from-emerald-400 to-teal-400" },
        { icon: TrendingUp,    label: "Earnings",    value: `₹${earnings}`,     accent: "from-pink-400 to-rose-400" },
      ]}
    >
      {/* Badge warning */}
      {!hasBadge && (
        <Card className="border-amber-300/60 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/40 dark:to-amber-950/40 dark:border-amber-700/60 shadow-md">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">Work Badge Required</p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                ജോലികൾക്ക് ബിഡ് ചെയ്യാൻ Work Badge ആവശ്യമാണ്. Apply ചെയ്താൽ admin verify ചെയ്യും.
              </p>
            </div>
            <Link to="/retailer/work-badge">
              <Button size="sm" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-95 text-white shadow-md">
                Apply Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Active jobs — featured strip */}
      {activeJobs.length > 0 && (
        <section className="space-y-3 animate-fade-up">
          <SectionHead icon={Flame} accent="from-emerald-500 to-teal-600" title="My Active Jobs" count={activeJobs.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeJobs.map((j) => (
              <ActiveJobCard
                key={j.id}
                job={j}
                onOpen={() => navigate({ to: "/retailer/jobs/$jobId", params: { jobId: j.id } })}
              />
            ))}
          </div>
        </section>
      )}

      {/* My bids */}
      {myBids.length > 0 && (
        <section className="space-y-3 animate-fade-up">
          <SectionHead icon={Hourglass} accent="from-amber-500 to-orange-600" title="My Bids" count={myBids.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myBids.map((b) => (
              <BidCard
                key={b.id}
                bid={b}
                onOpen={() => navigate({ to: "/retailer/jobs/$jobId", params: { jobId: b.jobId } })}
              />
            ))}
          </div>
        </section>
      )}

      {/* Available jobs */}
      <section className="space-y-3 animate-fade-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <SectionHead icon={Sparkles} accent="from-indigo-500 to-purple-600" title="Available Jobs" count={openJobs.length} />
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
            placeholder="Search by title, description, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-orange-400/40 bg-card"
          />
        </div>

        {filteredOpen.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {openJobs.length === 0 ? "No open jobs right now. Check back soon!" : "No jobs match your search."}
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

function OpenJobCard({ job, onOpen }: { job: JobDoc; onOpen: () => void }) {
  const meta = metaOf(job.category);
  const isUrgent = job.deadline ? (new Date(job.deadline).getTime() - Date.now()) < 1000 * 60 * 60 * 48 : false;

  return (
    <button
      onClick={onOpen}
      className={`group relative text-left rounded-2xl border border-border/60 bg-card overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl ${meta.glow} hover:shadow-lg`}
    >
      {/* gradient header strip */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${meta.gradient}`} />

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {job.title}
            </p>
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
          View & Bid <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
}

function ActiveJobCard({ job, onOpen }: { job: JobDoc; onOpen: () => void }) {
  const meta = metaOf(job.category);
  return (
    <button
      onClick={onOpen}
      className="group relative text-left rounded-2xl border-2 border-emerald-300/60 dark:border-emerald-700/60 bg-gradient-to-br from-emerald-50/50 via-card to-teal-50/50 dark:from-emerald-950/20 dark:via-card dark:to-teal-950/20 overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/20"
    >
      <div className="absolute top-2 right-2">
        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 text-[9px] px-2 py-0.5 shadow-md">
          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> ACTIVE
        </Badge>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3 pr-16">
          <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
            <Award className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight line-clamp-2">{job.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{job.category}</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-emerald-300/30 dark:border-emerald-700/30">
          <div className="text-[11px] text-muted-foreground capitalize">
            <Clock className="w-3 h-3 inline mr-1" />
            {job.status?.replace(/_/g, " ")}
          </div>
          <div className="flex items-center gap-0.5 text-base font-bold text-emerald-700 dark:text-emerald-300">
            <IndianRupee className="w-3.5 h-3.5" />{(job.finalBidAmount ?? job.budget)?.toLocaleString("en-IN")}
          </div>
        </div>
      </div>
    </button>
  );
}

function BidCard({ bid, onOpen }: { bid: BidDoc; onOpen: () => void }) {
  const status = bid.status || "pending";
  const statusMeta = {
    accepted: { icon: CheckCircle2, color: "from-emerald-500 to-teal-600", text: "Accepted", textColor: "text-emerald-700 dark:text-emerald-300" },
    rejected: { icon: XCircle,      color: "from-red-500 to-rose-600",     text: "Rejected", textColor: "text-red-700 dark:text-red-300" },
    pending:  { icon: Hourglass,    color: "from-amber-500 to-orange-600", text: "Pending",  textColor: "text-amber-700 dark:text-amber-300" },
  }[status as "accepted" | "rejected" | "pending"] || { icon: Hourglass, color: "from-amber-500 to-orange-600", text: "Pending", textColor: "text-amber-700" };
  const Icon = statusMeta.icon;

  return (
    <button
      onClick={onOpen}
      className="group relative text-left rounded-2xl border border-border/60 bg-card overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl"
    >
      <div className={`h-1 w-full bg-gradient-to-r ${statusMeta.color}`} />
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm leading-tight line-clamp-2 flex-1">{bid.jobTitle}</p>
          <Badge className={`bg-gradient-to-r ${statusMeta.color} text-white border-0 text-[9px] px-1.5 py-0`}>
            <Icon className="w-2.5 h-2.5 mr-0.5" /> {statusMeta.text}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Your bid</span>
          <span className={`flex items-center gap-0.5 font-bold ${statusMeta.textColor}`}>
            <IndianRupee className="w-3 h-3" />{bid.amount?.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </button>
  );
}

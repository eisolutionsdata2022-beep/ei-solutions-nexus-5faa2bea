import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, ShieldAlert } from "lucide-react";
import { type BidDoc, type JobDoc } from "@/lib/job-marketplace-types";

export const Route = createFileRoute("/retailer/work")({
  ssr: false,
  component: WorkerDashboard,
});

function WorkerDashboard() {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [openJobs, setOpenJobs] = useState<JobDoc[]>([]);
  const [myBids, setMyBids] = useState<BidDoc[]>([]);
  const [activeJobs, setActiveJobs] = useState<JobDoc[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "jobs"), where("status", "==", "open"), orderBy("createdAt", "desc")),
      (snap) => {
        const list: JobDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setOpenJobs(list);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="w-6 h-6" /> Worker Dashboard</h1>
          <p className="text-muted-foreground text-sm">Bid on jobs and earn</p>
        </div>
        <div className="flex gap-2">
          {!hasBadge ? (
            <Link to="/retailer/work-badge"><Button variant="default"><ShieldAlert className="w-4 h-4 mr-1" /> Apply for Work Badge</Button></Link>
          ) : (
            <Badge className="text-sm">Work Badge ✓</Badge>
          )}
          <Link to="/retailer/jobs"><Button variant="outline">Post a Job</Button></Link>
        </div>
      </div>

      {!hasBadge && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            ⚠️ You need a Work Badge to bid on jobs. Apply now — an admin will review your application.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>My Active Jobs ({activeJobs.length})</CardTitle></CardHeader>
        <CardContent>
          {activeJobs.length === 0 ? <p className="text-muted-foreground text-sm">None.</p> : (
            <div className="space-y-2">
              {activeJobs.map((j) => (
                <button key={j.id} onClick={() => navigate({ to: "/retailer/jobs/$jobId", params: { jobId: j.id } })}
                  className="w-full text-left p-3 border rounded hover:bg-muted/50">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-semibold">{j.title}</p>
                      <p className="text-xs text-muted-foreground">{j.category} • Bid ₹{j.finalBidAmount}</p>
                    </div>
                    <Badge>{j.status}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>My Bids ({myBids.length})</CardTitle></CardHeader>
        <CardContent>
          {myBids.length === 0 ? <p className="text-muted-foreground text-sm">No bids placed yet.</p> : (
            <div className="space-y-2">
              {myBids.map((b) => (
                <button key={b.id} onClick={() => navigate({ to: "/retailer/jobs/$jobId", params: { jobId: b.jobId } })}
                  className="w-full text-left p-3 border rounded hover:bg-muted/50">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-semibold">{b.jobTitle}</p>
                      <p className="text-xs text-muted-foreground">Your bid: ₹{b.amount}</p>
                    </div>
                    <Badge variant={b.status === "accepted" ? "default" : b.status === "rejected" ? "destructive" : "secondary"}>{b.status}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Available Jobs ({openJobs.length})</CardTitle></CardHeader>
        <CardContent>
          {openJobs.length === 0 ? <p className="text-muted-foreground text-sm">No open jobs.</p> : (
            <div className="grid sm:grid-cols-2 gap-3">
              {openJobs.map((j) => (
                <button key={j.id} onClick={() => navigate({ to: "/retailer/jobs/$jobId", params: { jobId: j.id } })}
                  className="text-left p-3 border rounded hover:border-primary">
                  <p className="font-semibold">{j.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{j.description}</p>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-muted-foreground">{j.category} • due {j.deadline}</span>
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

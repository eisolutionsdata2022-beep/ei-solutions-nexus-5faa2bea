import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShieldCheck, ArrowLeft } from "lucide-react";
import { getWorkerProfile, getWorkerRatings, type JobRatingDoc } from "@/lib/job-ratings";

export const Route = createFileRoute("/worker/$workerId")({
  ssr: false,
  component: WorkerProfile,
});

function WorkerProfile() {
  const { workerId } = Route.useParams();
  const [profile, setProfile] = useState<any>(null);
  const [ratings, setRatings] = useState<JobRatingDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, r] = await Promise.all([
          getWorkerProfile(workerId),
          getWorkerRatings(workerId),
        ]);
        setProfile(p);
        setRatings(r);
      } finally {
        setLoading(false);
      }
    })();
  }, [workerId]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-muted-foreground">Worker not found</div>;

  const avg = profile.ratingAvg || 0;
  const count = profile.ratingCount || 0;

  return (
    <div className="space-y-4 max-w-3xl mx-auto p-4">
      <Link to="/retailer/work"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button></Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-2xl">{profile.name || profile.email?.split("@")[0]}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
            </div>
            {profile.workBadge && (
              <Badge className="bg-emerald-600"><ShieldCheck className="w-3 h-3 mr-1" /> Work Badge</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-6 h-6 ${avg >= s ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                ))}
              </div>
              <p className="text-3xl font-bold mt-1">{avg.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{count} review{count === 1 ? "" : "s"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reviews ({ratings.length})</CardTitle></CardHeader>
        <CardContent>
          {ratings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {ratings.map((r) => (
                <div key={r.id} className="border-b pb-3 last:border-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="font-semibold text-sm">{r.uploaderName}</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${r.rating >= s ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">on {r.jobTitle} • {new Date(r.createdAt).toLocaleDateString()}</p>
                  {r.review && <p className="text-sm mt-2">{r.review}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

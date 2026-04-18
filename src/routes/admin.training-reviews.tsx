import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { listAllReviews, avgRating, type TrainingReview } from "@/lib/training-reviews";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Star, Search, MessageSquare, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/admin/training-reviews")({
  ssr: false,
  component: AdminTrainingReviews,
});

function AdminTrainingReviews() {
  const { appUser } = useAuth();
  const [reviews, setReviews] = useState<TrainingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!appUser) return;
    listAllReviews()
      .then(setReviews)
      .finally(() => setLoading(false));
  }, [appUser]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return reviews;
    return reviews.filter((r) =>
      r.trainerName.toLowerCase().includes(q) ||
      r.trainingTitle.toLowerCase().includes(q) ||
      r.retailerName.toLowerCase().includes(q) ||
      r.comments.toLowerCase().includes(q)
    );
  }, [reviews, search]);

  const overallAvg = avgRating(reviews);

  // group by trainer
  const trainerStats = useMemo(() => {
    const map = new Map<string, { name: string; reviews: TrainingReview[] }>();
    reviews.forEach((r) => {
      if (!map.has(r.trainerId)) map.set(r.trainerId, { name: r.trainerName, reviews: [] });
      map.get(r.trainerId)!.reviews.push(r);
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: v.name, count: v.reviews.length, avg: avgRating(v.reviews) }))
      .sort((a, b) => b.count - a.count);
  }, [reviews]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Training Reviews</h1>
        <p className="text-muted-foreground">All retailer feedback on training sessions (admin only).</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={MessageSquare} label="Total Reviews" value={reviews.length.toString()} />
        <StatCard icon={Star} label="Avg Rating" value={`${overallAvg} / 5`} />
        <StatCard icon={Users} label="Trainers Reviewed" value={trainerStats.length.toString()} />
      </div>

      {/* Trainer leaderboard */}
      {trainerStats.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Trainer Performance</h2>
            </div>
            <div className="space-y-2">
              {trainerStats.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                  <div>
                    <p className="font-medium text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.count} review{t.count !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-foreground">{t.avg}</span>
                    <span className="text-xs text-muted-foreground">/ 5</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by trainer, training title, retailer, or comments…"
          className="pl-9"
        />
      </div>

      {/* Reviews */}
      {loading ? (
        <p className="text-muted-foreground text-center py-8">Loading reviews…</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No reviews found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{r.trainingTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Trainer: <span className="font-medium">{r.trainerName}</span> · Reviewer: <span className="font-medium">{r.retailerName}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`w-4 h-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`}
                      />
                    ))}
                  </div>
                </div>
                {r.comments && (
                  <p className="text-sm text-foreground/80 bg-muted/30 rounded-md p-2.5 border-l-2 border-primary/40">
                    “{r.comments}”
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

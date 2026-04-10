import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, IndianRupee, CalendarCheck, Clock } from "lucide-react";

export const Route = createFileRoute("/trainer/")({
  component: TrainerDashboard,
});

function TrainerDashboard() {
  const { appUser } = useAuth();
  const [stats, setStats] = useState({ total: 0, earnings: 0, upcoming: 0, completed: 0 });
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [completedList, setCompletedList] = useState<any[]>([]);

  useEffect(() => {
    if (!appUser) return;
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, "trainings"));
        const today = new Date().toISOString().split("T")[0];
        let total = 0, earnings = 0, upcoming = 0, completed = 0;
        const upList: any[] = [];
        const compList: any[] = [];

        snap.forEach((d) => {
          const data = d.data();
          if (data.trainerId !== appUser.uid) return;
          total++;
          if (data.date >= today) {
            upcoming++;
            upList.push({ id: d.id, ...data });
          } else {
            completed++;
            compList.push({ id: d.id, ...data });
          }
        });

        // Calculate earnings from transactions
        const txSnap = await getDocs(collection(db, "transactions"));
        txSnap.forEach((d) => {
          const data = d.data();
          if (data.userId === appUser.uid && data.type === "credit" && data.source === "training") {
            earnings += data.amount || 0;
          }
        });

        setStats({ total, earnings, upcoming, completed });
        setUpcomingList(upList.sort((a, b) => a.date.localeCompare(b.date)));
        setCompletedList(compList.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [appUser]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Trainer Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {appUser?.name || appUser?.email}!</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Trainings" value={stats.total} icon={GraduationCap} />
        <StatsCard title="Total Earnings" value={`₹${stats.earnings.toLocaleString()}`} icon={IndianRupee} />
        <StatsCard title="Upcoming" value={stats.upcoming} icon={CalendarCheck} />
        <StatsCard title="Completed" value={stats.completed} icon={Clock} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Upcoming Classes</CardTitle></CardHeader>
          <CardContent>
            {upcomingList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming classes.</p>
            ) : (
              <div className="space-y-3">
                {upcomingList.map((t) => (
                  <div key={t.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-foreground text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.date} {t.time && `at ${t.time}`}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{t.duration}hr</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Completed</CardTitle></CardHeader>
          <CardContent>
            {completedList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed classes yet.</p>
            ) : (
              <div className="space-y-3">
                {completedList.map((t) => (
                  <div key={t.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-foreground text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.date}</p>
                    </div>
                    <span className="text-xs text-green-600 font-medium">₹{t.trainerEarning || 0}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

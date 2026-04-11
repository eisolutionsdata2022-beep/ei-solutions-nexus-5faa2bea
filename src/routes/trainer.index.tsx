import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { GraduationCap, IndianRupee, CalendarCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

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
          if (data.date >= today) { upcoming++; upList.push({ id: d.id, ...data }); }
          else { completed++; compList.push({ id: d.id, ...data }); }
        });

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
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={GraduationCap} label="Total Trainings" value={stats.total} borderColor="border-gov-blue" bgColor="bg-gov-blue/10" textColor="text-gov-blue" />
        <StatCard icon={IndianRupee} label="Earnings" value={`₹${stats.earnings.toLocaleString()}`} borderColor="border-success" bgColor="bg-success/10" textColor="text-success" />
        <StatCard icon={CalendarCheck} label="Upcoming" value={stats.upcoming} borderColor="border-warning" bgColor="bg-warning/10" textColor="text-warning" />
        <StatCard icon={Clock} label="Completed" value={stats.completed} borderColor="border-gov-saffron" bgColor="bg-gov-saffron/10" textColor="text-gov-saffron" />
      </div>

      {/* Upcoming Classes */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="bg-gov-blue-light border-b border-border px-5 py-3">
          <h2 className="text-base font-bold text-gov-blue">Upcoming Classes</h2>
        </div>
        <div className="p-5 space-y-3 text-sm">
          {upcomingList.length === 0 ? (
            <p className="text-muted-foreground">No upcoming classes.</p>
          ) : (
            upcomingList.map((t) => (
              <div key={t.id} className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.date} {t.time && `at ${t.time}`}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-gov-blue/10 text-gov-blue font-semibold">{t.duration}hr</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Completed */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="bg-gov-blue-light border-b border-border px-5 py-3">
          <h2 className="text-base font-bold text-gov-blue">Recent Completed</h2>
        </div>
        <div className="p-5 space-y-3 text-sm">
          {completedList.length === 0 ? (
            <p className="text-muted-foreground">No completed classes yet.</p>
          ) : (
            completedList.map((t) => (
              <div key={t.id} className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                </div>
                <span className="text-sm text-success font-semibold">₹{t.trainerEarning || 0}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, borderColor, bgColor, textColor }: {
  icon: React.ElementType; label: string; value: number | string; borderColor: string; bgColor: string; textColor: string;
}) {
  return (
    <div className={`rounded-lg border-2 p-4 text-center ${borderColor} ${bgColor}`}>
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Icon className={`w-4 h-4 ${textColor}`} />
        <span className={`text-xs font-bold ${textColor}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

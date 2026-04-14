import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, TrendingUp, Users, Wallet } from "lucide-react";

export const Route = createFileRoute("/admin/training-earnings")({
  ssr: false,
  component: AdminTrainingEarnings,
});

interface Training {
  id: string;
  title: string;
  date: string;
  duration: number;
  price: number;
  trainerEarning: number;
  adminEarning: number;
  trainerName?: string;
  trainerId: string;
}

interface TrainerSummary {
  trainerId: string;
  trainerName: string;
  totalSessions: number;
  totalHours: number;
  totalRevenue: number;
  totalPayout: number;
  totalAdminEarning: number;
}

function AdminTrainingEarnings() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [attendance, setAttendance] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trainSnap, attSnap] = await Promise.all([
          getDocs(collection(db, "trainings")),
          getDocs(collection(db, "attendance")),
        ]);

        const list: Training[] = [];
        trainSnap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            title: data.title || "",
            date: data.date || "",
            duration: data.duration || 1,
            price: data.price || 0,
            trainerEarning: data.trainerEarning || 0,
            adminEarning: data.adminEarning ?? (data.price || 0) - (data.trainerEarning || 0),
            trainerName: data.trainerName || "Unknown",
            trainerId: data.trainerId || "",
          });
        });
        list.sort((a, b) => b.date.localeCompare(a.date));
        setTrainings(list);

        const attMap: Record<string, number> = {};
        attSnap.forEach((d) => {
          const tid = d.data().trainingId;
          attMap[tid] = (attMap[tid] || 0) + 1;
        });
        setAttendance(attMap);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalRevenue = trainings.reduce((s, t) => s + t.price, 0);
  const totalTrainerPayout = trainings.reduce((s, t) => s + t.trainerEarning, 0);
  const totalAdminEarning = trainings.reduce((s, t) => s + t.adminEarning, 0);
  const totalAttendees = Object.values(attendance).reduce((s, n) => s + n, 0);

  // Group by trainer
  const trainerMap = new Map<string, TrainerSummary>();
  for (const t of trainings) {
    const existing = trainerMap.get(t.trainerId);
    if (existing) {
      existing.totalSessions++;
      existing.totalHours += t.duration;
      existing.totalRevenue += t.price;
      existing.totalPayout += t.trainerEarning;
      existing.totalAdminEarning += t.adminEarning;
    } else {
      trainerMap.set(t.trainerId, {
        trainerId: t.trainerId,
        trainerName: t.trainerName || "Unknown",
        totalSessions: 1,
        totalHours: t.duration,
        totalRevenue: t.price,
        totalPayout: t.trainerEarning,
        totalAdminEarning: t.adminEarning,
      });
    }
  }
  const trainerSummaries = Array.from(trainerMap.values()).sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Training Earnings Report</h1>
        <p className="text-muted-foreground">Revenue, trainer payouts, and admin commission breakdown.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-foreground">₹{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trainer Payouts</p>
                <p className="text-xl font-bold text-green-600">₹{totalTrainerPayout.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Admin Commission</p>
                <p className="text-xl font-bold text-primary">₹{totalAdminEarning.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Attendees</p>
                <p className="text-xl font-bold text-foreground">{totalAttendees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trainer-wise Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Trainer-wise Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {trainerSummaries.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No training data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trainer</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Payout</TableHead>
                    <TableHead className="text-right">Admin Earning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainerSummaries.map((ts) => (
                    <TableRow key={ts.trainerId}>
                      <TableCell className="font-medium">{ts.trainerName}</TableCell>
                      <TableCell className="text-right">{ts.totalSessions}</TableCell>
                      <TableCell className="text-right">{ts.totalHours}hr</TableCell>
                      <TableCell className="text-right">₹{ts.totalRevenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">₹{ts.totalPayout.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-primary">₹{ts.totalAdminEarning.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Trainings Detail */}
      <Card>
        <CardHeader>
          <CardTitle>All Training Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {trainings.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No trainings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Trainer Earning</TableHead>
                    <TableHead className="text-right">Admin Earning</TableHead>
                    <TableHead className="text-right">Attendees</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell>{t.date}</TableCell>
                      <TableCell>{t.trainerName}</TableCell>
                      <TableCell className="text-right">{t.duration}hr</TableCell>
                      <TableCell className="text-right">₹{t.price.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">₹{t.trainerEarning.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-primary">₹{t.adminEarning.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{attendance[t.id] || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

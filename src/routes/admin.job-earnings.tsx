import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BarChart3, Wallet } from "lucide-react";
import { JOB_CATEGORIES, type JobDoc } from "@/lib/job-marketplace-types";

export const Route = createFileRoute("/admin/job-earnings")({
  ssr: false,
  component: AdminJobEarnings,
});

function AdminJobEarnings() {
  const [jobs, setJobs] = useState<JobDoc[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "jobs"), where("status", "==", "completed")),
      (snap) => {
        const list: JobDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setJobs(list);
      }
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const t = new Date(j.updatedAt || j.createdAt).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime() + 86_400_000) return false;
      return true;
    });
  }, [jobs, from, to]);

  const stats = useMemo(() => {
    let totalCommission = 0;
    let totalPaidWorkers = 0;
    let totalJobs = filtered.length;
    const byCategory: Record<string, { count: number; commission: number; paid: number }> = {};
    JOB_CATEGORIES.forEach((c) => (byCategory[c] = { count: 0, commission: 0, paid: 0 }));
    filtered.forEach((j) => {
      totalCommission += j.adminCommission || 0;
      totalPaidWorkers += j.workerNet || 0;
      const b = byCategory[j.category] || (byCategory[j.category] = { count: 0, commission: 0, paid: 0 });
      b.count += 1;
      b.commission += j.adminCommission || 0;
      b.paid += j.workerNet || 0;
    });
    return { totalCommission, totalPaidWorkers, totalJobs, byCategory };
  }, [filtered]);

  const reset = () => { setFrom(""); setTo(""); };

  const setPreset = (days: number) => {
    const now = new Date();
    const past = new Date(now.getTime() - days * 86_400_000);
    setFrom(past.toISOString().slice(0, 10));
    setTo(now.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> Job Marketplace Earnings
        </h1>
        <p className="text-muted-foreground text-sm">Total commissions earned per category</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filter by date</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-4 gap-3 items-end">
            <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setPreset(7)}>7d</Button>
              <Button size="sm" variant="outline" onClick={() => setPreset(30)}>30d</Button>
              <Button size="sm" variant="outline" onClick={() => setPreset(90)}>90d</Button>
              <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Admin Commission</p>
            <p className="text-3xl font-bold text-primary mt-1">₹{stats.totalCommission.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid to Workers</p>
            <p className="text-3xl font-bold mt-1">₹{stats.totalPaidWorkers.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed Jobs</p>
            <p className="text-3xl font-bold mt-1">{stats.totalJobs}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> By Category</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2">Category</th>
                  <th className="py-2 text-right">Jobs</th>
                  <th className="py-2 text-right">Worker Paid</th>
                  <th className="py-2 text-right">Admin Commission</th>
                </tr>
              </thead>
              <tbody>
                {JOB_CATEGORIES.map((c) => {
                  const b = stats.byCategory[c];
                  return (
                    <tr key={c} className="border-b hover:bg-muted/30">
                      <td className="py-2 font-medium">{c}</td>
                      <td className="py-2 text-right">{b.count}</td>
                      <td className="py-2 text-right">₹{b.paid.toLocaleString()}</td>
                      <td className="py-2 text-right font-bold text-primary">₹{b.commission.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="font-bold border-t-2">
                <tr>
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">{stats.totalJobs}</td>
                  <td className="py-2 text-right">₹{stats.totalPaidWorkers.toLocaleString()}</td>
                  <td className="py-2 text-right text-primary">₹{stats.totalCommission.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

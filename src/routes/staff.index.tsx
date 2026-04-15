import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { ShoppingBag, Clock, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/staff/")({
  ssr: false,
  component: StaffDashboard,
});

interface AppRecord {
  id: string;
  status: "Pending" | "Approved" | "Rejected";
  fullName: string;
  serviceType: string;
  createdAt: string;
}

function StaffDashboard() {
  const { appUser } = useAuth();
  const [applications, setApplications] = useState<AppRecord[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "serviceApplications")),
      (snap) => {
        const list: AppRecord[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as AppRecord));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setApplications(list);
      },
      () => setApplications([])
    );
    return unsub;
  }, []);

  const total = applications.length;
  const pending = applications.filter((a) => a.status === "Pending").length;
  const approved = applications.filter((a) => a.status === "Approved").length;
  const rejected = applications.filter((a) => a.status === "Rejected").length;
  const recent = applications.slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border-2 border-gov-blue bg-gov-blue/10 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <ShoppingBag className="w-4 h-4 text-gov-blue" />
            <span className="text-xs font-bold text-gov-blue">Total</span>
          </div>
          <p className="text-2xl font-bold text-gov-blue">{total}</p>
        </div>
        <div className="rounded-lg border-2 border-warning bg-warning/10 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-xs font-bold text-warning">Pending</span>
          </div>
          <p className="text-2xl font-bold text-warning">{pending}</p>
        </div>
        <div className="rounded-lg border-2 border-success bg-success/10 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-xs font-bold text-success">Approved</span>
          </div>
          <p className="text-2xl font-bold text-success">{approved}</p>
        </div>
        <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="text-xs font-bold text-destructive">Rejected</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{rejected}</p>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="bg-gov-blue-light border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gov-blue">Recent Applications</h2>
          <Link to="/staff/service-applications">
            <Button size="sm" variant="ghost" className="text-xs gap-1 text-gov-blue">
              View All <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No applications yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{a.fullName}</p>
                  <p className="text-xs text-muted-foreground">{a.serviceType} · {new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${a.status === "Pending" ? "bg-warning/20 text-warning" : a.status === "Approved" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

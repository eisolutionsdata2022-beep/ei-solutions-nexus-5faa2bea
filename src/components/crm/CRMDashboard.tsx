import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Phone, CheckCircle2, Clock3, Banknote, AlertTriangle, UserPlus, PhoneCall } from "lucide-react";
import { getCRMStats } from "@/lib/crm-firebase";
import { useAuth } from "@/lib/auth-context";

export function CRMDashboard() {
  const { appUser } = useAuth();
  const isStaff = appUser?.role === "staff";
  const [stats, setStats] = useState({
    totalLeads: 0, todayCalls: 0, converted: 0, pendingFollowUps: 0,
    paymentCompleted: 0, paymentPending: 0, newLeads: 0, contacted: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCRMStats(isStaff ? appUser?.uid : undefined).then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, [isStaff, appUser?.uid]);

  const cards = [
    { title: "Total Leads", value: stats.totalLeads, icon: Users, color: "text-blue-600 bg-blue-50" },
    { title: "Today's Calls", value: stats.todayCalls, icon: PhoneCall, color: "text-purple-600 bg-purple-50" },
    { title: "Converted", value: stats.converted, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
    { title: "Follow-ups", value: stats.pendingFollowUps, icon: Clock3, color: "text-orange-600 bg-orange-50" },
    { title: "Payment Done", value: stats.paymentCompleted, icon: Banknote, color: "text-emerald-600 bg-emerald-50" },
    { title: "Payment Pending", value: stats.paymentPending, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    { title: "New Leads", value: stats.newLeads, icon: UserPlus, color: "text-cyan-600 bg-cyan-50" },
    { title: "Contacted", value: stats.contacted, icon: Phone, color: "text-indigo-600 bg-indigo-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CRM Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isStaff ? "Your assigned leads overview" : "Overall lead management overview"}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-xl p-3 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className="text-xl font-bold text-foreground">
                  {loading ? "..." : card.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

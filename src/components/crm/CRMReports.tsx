import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { subscribeLeads } from "@/lib/crm-firebase";
import { useAuth } from "@/lib/auth-context";
import type { Lead } from "@/lib/crm-types";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b"];

export function CRMReports() {
  const { appUser } = useAuth();
  const isStaff = appUser?.role === "staff";
  const [leads, setLeads] = useState<Lead[]>([]);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    const unsub = subscribeLeads(setLeads, undefined, isStaff ? appUser?.uid : undefined);
    return unsub;
  }, [isStaff, appUser?.uid]);

  const filteredLeads = useMemo(() => {
    if (period === "all") return leads;
    const now = new Date();
    const cutoff = new Date();
    if (period === "today") cutoff.setHours(0, 0, 0, 0);
    else if (period === "week") cutoff.setDate(now.getDate() - 7);
    else if (period === "month") cutoff.setMonth(now.getMonth() - 1);
    return leads.filter((l) => new Date(l.createdAt) >= cutoff);
  }, [leads, period]);

  // Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach((l) => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  // Lead source distribution
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach((l) => { counts[l.leadSource] = (counts[l.leadSource] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  // Conversion rate
  const conversionRate = useMemo(() => {
    if (filteredLeads.length === 0) return 0;
    return Math.round((filteredLeads.filter((l) => l.status === "Converted").length / filteredLeads.length) * 100);
  }, [filteredLeads]);

  // Staff performance
  const staffData = useMemo(() => {
    const map: Record<string, { name: string; total: number; converted: number }> = {};
    filteredLeads.forEach((l) => {
      if (!map[l.assignedStaffId]) map[l.assignedStaffId] = { name: l.assignedStaffName, total: 0, converted: 0 };
      map[l.assignedStaffId].total++;
      if (l.status === "Converted") map[l.assignedStaffId].converted++;
    });
    return Object.values(map).sort((a, b) => b.converted - a.converted);
  }, [filteredLeads]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">{filteredLeads.length} leads in selected period</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Leads</p>
          <p className="text-3xl font-bold">{filteredLeads.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Converted</p>
          <p className="text-3xl font-bold text-green-600">{filteredLeads.filter((l) => l.status === "Converted").length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Conversion Rate</p>
          <p className="text-3xl font-bold text-blue-600">{conversionRate}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Paid</p>
          <p className="text-3xl font-bold text-emerald-600">{filteredLeads.filter((l) => l.paymentStatus === "Paid").length}</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Lead Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Lead Source Analysis</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Staff Leaderboard */}
      {!isStaff && staffData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Staff Performance Leaderboard</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staffData.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? "bg-yellow-100 text-yellow-800" : i === 1 ? "bg-gray-100 text-gray-800" : i === 2 ? "bg-orange-100 text-orange-800" : "bg-muted text-muted-foreground"
                    }`}>
                      #{i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.total} leads assigned</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{s.converted} converted</p>
                    <p className="text-xs text-muted-foreground">
                      {s.total > 0 ? Math.round((s.converted / s.total) * 100) : 0}% rate
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

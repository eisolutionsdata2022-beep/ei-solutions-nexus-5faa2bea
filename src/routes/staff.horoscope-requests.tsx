import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Search, RefreshCw } from "lucide-react";
import { subscribeHoroscopeRequests, updateHoroscopeRequest } from "@/lib/horoscope-firebase";
import { generateHoroscopePDF } from "@/lib/horoscope-pdf";
import type { HoroscopeRequest, HoroscopeStatus } from "@/lib/horoscope-types";
import { STATUS_COLORS, HOROSCOPE_STATUSES } from "@/lib/horoscope-types";
import { StatsCard } from "@/components/StatsCard";

export const Route = createFileRoute("/staff/horoscope-requests")({
  ssr: false,
  component: StaffHoroscopeRequests,
});

function StaffHoroscopeRequests() {
  const { appUser } = useAuth();
  const [requests, setRequests] = useState<HoroscopeRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const unsub = subscribeHoroscopeRequests((r) => setRequests(r));
    return unsub;
  }, []);

  const filtered = requests.filter((r) => {
    const matchSearch = r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.userName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "Pending").length,
    generated: requests.filter((r) => r.status === "Generated").length,
    delivered: requests.filter((r) => r.status === "Delivered").length,
  };

  const handleStatusChange = async (id: string, newStatus: HoroscopeStatus) => {
    try {
      const update: Partial<HoroscopeRequest> = {
        status: newStatus,
        ...(newStatus === "Processing" ? { processedBy: appUser?.uid, processedByName: appUser?.name || appUser?.email } : {}),
        ...(newStatus === "Delivered" ? { deliveredAt: new Date().toISOString() } : {}),
      };
      await updateHoroscopeRequest(id, update);
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDownloadPDF = (req: HoroscopeRequest) => {
    const html = generateHoroscopePDF(req);
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🔮 Horoscope Requests</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total" value={stats.total} icon={Search} />
        <StatsCard title="Pending" value={stats.pending} icon={RefreshCw} />
        <StatsCard title="Generated" value={stats.generated} icon={Download} />
        <StatsCard title="Delivered" value={stats.delivered} icon={Search} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 justify-between">
            <CardTitle>All Requests</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-48" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {HOROSCOPE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Franchise</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.customerName}</TableCell>
                  <TableCell>{r.userName}</TableCell>
                  <TableCell>{r.dateOfBirth}</TableCell>
                  <TableCell>
                    <Select value={r.status} onValueChange={(v) => handleStatusChange(r.id, v as HoroscopeStatus)}>
                      <SelectTrigger className="w-32">
                        <Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {HOROSCOPE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>₹{r.amount}</TableCell>
                  <TableCell>
                    {r.chart && (
                      <Button size="sm" variant="outline" onClick={() => handleDownloadPDF(r)}>
                        <Download className="w-4 h-4 mr-1" /> PDF
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No requests found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

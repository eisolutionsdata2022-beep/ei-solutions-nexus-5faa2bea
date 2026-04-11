import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wallet, Search, Clock, CheckCircle, XCircle, AlertCircle,
  ArrowDownLeft, ArrowUpRight, FileText, ExternalLink, BarChart3, HelpCircle,
} from "lucide-react";

export const Route = createFileRoute("/retailer/")({
  component: RetailerDashboard,
});

interface Transaction {
  id: string;
  amount: number;
  type: string;
  source: string;
  description?: string;
  createdAt: string;
}

interface ServiceRequest {
  id: string;
  serviceName: string;
  status: string;
  createdAt: string;
}

function RetailerDashboard() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [applications, setApplications] = useState<ServiceRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const statusCounts = {
    pending: applications.filter((a) => a.status === "pending").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  useEffect(() => {
    if (!appUser) return;

    const unsub = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });

    getDocs(query(
      collection(db, "serviceRequests"),
      where("userId", "==", appUser.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    )).then((snap) => {
      const list: ServiceRequest[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ServiceRequest));
      setApplications(list);
    }).catch(() => {});

    getDocs(query(
      collection(db, "transactions"),
      where("userId", "==", appUser.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    )).then((snap) => {
      const list: Transaction[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Transaction));
      setRecentTx(list);
    }).catch(() => {});

    return unsub;
  }, [appUser]);

  const filteredApps = applications.filter((a) =>
    !searchTerm || a.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) || a.id.includes(searchTerm)
  );

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-green-100 text-green-700 border-green-300";
    if (s === "rejected") return "bg-red-100 text-red-700 border-red-300";
    return "bg-yellow-100 text-yellow-700 border-yellow-300";
  };

  return (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <Card className="border-[#c5d3e8] bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1a3a6c] flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Wallet Balance</p>
                <p className="text-2xl font-bold text-foreground">₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</p>
              </div>
            </div>
            <Link to="/retailer/wallet">
              <Button size="sm" className="bg-[#2e8b57] hover:bg-[#267a4c] text-white font-semibold">
                Recharge
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Status badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusBadgeCard icon={Clock} label="Pending" count={statusCounts.pending} color="border-yellow-400 bg-yellow-50" textColor="text-yellow-700" />
        <StatusBadgeCard icon={AlertCircle} label="Processing" count={0} color="border-orange-400 bg-orange-50" textColor="text-orange-700" />
        <StatusBadgeCard icon={CheckCircle} label="Approved" count={statusCounts.approved} color="border-green-400 bg-green-50" textColor="text-green-700" />
        <StatusBadgeCard icon={XCircle} label="Rejected" count={statusCounts.rejected} color="border-red-400 bg-red-50" textColor="text-red-700" />
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#c5d3e8]"
          />
        </div>
        <Button variant="outline" className="border-[#1a3a6c] text-[#1a3a6c] font-semibold">
          Filter &gt;
        </Button>
      </div>

      {/* Recent Applications Table */}
      <Card className="border-[#c5d3e8] bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-[#1a3a6c]">Recent Applications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#c5d3e8] bg-[#f0f4fa]">
                  <th className="text-left px-4 py-2.5 font-semibold text-[#1a3a6c]">Application No.</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#1a3a6c]">Service Name</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#1a3a6c]">Applied Date</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#1a3a6c]">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#1a3a6c]">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No applications yet.</td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="border-b border-[#e8eef7] hover:bg-[#f8fafd]">
                      <td className="px-4 py-2.5 font-mono text-xs">{app.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-2.5">{app.serviceName || "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{new Date(app.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border capitalize ${statusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Button variant="outline" size="sm" className="text-xs border-[#1a3a6c] text-[#1a3a6c] h-7">
                          <Search className="w-3 h-3 mr-1" /> Track
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredApps.length > 0 && (
            <div className="text-center py-3 border-t border-[#e8eef7]">
              <Link to="/retailer/services">
                <Button variant="outline" size="sm" className="text-xs border-[#1a3a6c] text-[#1a3a6c]">View All</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Latest Updates */}
        <Card className="border-[#c5d3e8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#1a3a6c]">Latest Updates</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            {recentTx.length === 0 ? (
              <p>No recent updates.</p>
            ) : (
              recentTx.slice(0, 3).map((tx) => (
                <div key={tx.id} className="flex items-start gap-3 pb-2 border-b border-[#e8eef7] last:border-0">
                  {tx.type === "credit" ? (
                    <ArrowDownLeft className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-foreground text-sm font-medium">{tx.description || tx.source}</p>
                    <p className="text-xs">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`ml-auto font-semibold ${tx.type === "credit" ? "text-green-600" : "text-red-500"}`}>
                    {tx.type === "credit" ? "+" : "-"}₹{tx.amount}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Important Links */}
        <Card className="border-[#c5d3e8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#1a3a6c]">Important Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: HelpCircle, label: "FAQs", to: "/retailer/services" },
              { icon: FileText, label: "Services List", to: "/retailer/services" },
              { icon: BarChart3, label: "Commission Chart", to: "/retailer/transactions" },
              { icon: ExternalLink, label: "KYC Verification", to: "/retailer/kyc" },
            ].map((link) => (
              <Link key={link.label} to={link.to as any} className="flex items-center gap-3 text-sm text-[#1a3a6c] hover:underline">
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadgeCard({ icon: Icon, label, count, color, textColor }: {
  icon: React.ElementType; label: string; count: number; color: string; textColor: string;
}) {
  return (
    <div className={`rounded-lg border-2 p-3 text-center ${color}`}>
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${textColor}`} />
        <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{count}</p>
    </div>
  );
}

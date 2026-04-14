import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wallet, Search, Clock, CheckCircle, XCircle, AlertCircle,
  ArrowDownLeft, ArrowUpRight, FileText, ExternalLink, BarChart3, HelpCircle,
} from "lucide-react";

export const Route = createFileRoute("/retailer/")({
  ssr: false,
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

interface ServiceButtonData {
  id: string;
  name: string;
  url: string;
  style: "solid" | "outline" | "gradient";
  enabled: boolean;
}

function getButtonClasses(style: string) {
  switch (style) {
    case "solid": return "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md";
    case "outline": return "border-2 border-primary text-primary bg-transparent hover:bg-primary/10";
    case "gradient": return "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:opacity-90";
    default: return "bg-primary text-primary-foreground";
  }
}

function RetailerDashboard() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [applications, setApplications] = useState<ServiceRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceButtons, setServiceButtons] = useState<ServiceButtonData[]>([]);

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

    // Fetch service buttons
    getDocs(collection(db, "serviceButtons")).then((snap) => {
      const list: ServiceButtonData[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ServiceButtonData));
      setServiceButtons(list.filter((b) => b.enabled));
    }).catch(() => {});

    return unsub;
  }, [appUser]);

  const filteredApps = applications.filter((a) =>
    !searchTerm || a.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) || a.id.includes(searchTerm)
  );

  return (
    <div className="space-y-5">
      {/* Wallet Balance */}
      <div className="bg-card rounded-lg border border-border p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gov-blue flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Wallet Balance</p>
            <p className="text-2xl font-bold text-foreground">₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</p>
          </div>
        </div>
        <Link to="/retailer/wallet">
          <Button className="bg-gov-green hover:opacity-90 text-white font-bold">Recharge</Button>
        </Link>
      </div>

      {/* Service Buttons */}
      {serviceButtons.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-3">Quick Services</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {serviceButtons.map((b) => (
              <a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-base font-bold transition-all min-h-[56px] ${getButtonClasses(b.style)}`}>
                <ExternalLink className="w-4 h-4" /> {b.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusCard icon={Clock} label="Pending" count={statusCounts.pending} borderColor="border-warning" bgColor="bg-warning/10" textColor="text-warning" />
        <StatusCard icon={AlertCircle} label="Processing" count={0} borderColor="border-gov-saffron" bgColor="bg-gov-saffron/10" textColor="text-gov-saffron" />
        <StatusCard icon={CheckCircle} label="Approved" count={statusCounts.approved} borderColor="border-success" bgColor="bg-success/10" textColor="text-success" />
        <StatusCard icon={XCircle} label="Rejected" count={statusCounts.rejected} borderColor="border-destructive" bgColor="bg-destructive/10" textColor="text-destructive" />
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline" className="border-gov-blue text-gov-blue font-bold">Filter &gt;</Button>
      </div>

      {/* Recent Applications */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="bg-gov-blue-light border-b border-border px-5 py-3">
          <h2 className="text-base font-bold text-gov-blue">Recent Applications</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-2.5 font-semibold text-gov-blue text-xs">Application No.</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gov-blue text-xs">Service Name</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gov-blue text-xs">Applied Date</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gov-blue text-xs">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gov-blue text-xs">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No applications yet.</td></tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="px-4 py-2.5 font-mono text-xs">{app.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-2.5">{app.serviceName || "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${
                        app.status === "approved" ? "bg-success/10 text-success border-success/30" :
                        app.status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/30" :
                        "bg-warning/10 text-warning border-warning/30"
                      }`}>{app.status}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Button variant="outline" size="sm" className="text-xs border-gov-blue text-gov-blue h-7">
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
          <div className="text-center py-3 border-t border-border">
            <Link to="/retailer/services">
              <Button variant="outline" size="sm" className="text-xs border-gov-blue text-gov-blue">View All</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="bg-gov-blue-light border-b border-border px-5 py-3">
            <h2 className="text-base font-bold text-gov-blue">Latest Updates</h2>
          </div>
          <div className="p-5 text-sm space-y-3">
            {recentTx.length === 0 ? (
              <p className="text-muted-foreground">No recent updates.</p>
            ) : (
              recentTx.slice(0, 3).map((tx) => (
                <div key={tx.id} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                  {tx.type === "credit" ? (
                    <ArrowDownLeft className="w-4 h-4 text-success mt-0.5 shrink-0" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-foreground text-sm font-medium">{tx.description || tx.source}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`ml-auto font-semibold ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                    {tx.type === "credit" ? "+" : "-"}₹{tx.amount}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="bg-gov-blue-light border-b border-border px-5 py-3">
            <h2 className="text-base font-bold text-gov-blue">Important Links</h2>
          </div>
          <div className="p-5 space-y-3">
            {[
              { icon: HelpCircle, label: "FAQs", to: "/retailer/services" },
              { icon: FileText, label: "Services List", to: "/retailer/services" },
              { icon: BarChart3, label: "Commission Chart", to: "/retailer/transactions" },
              { icon: ExternalLink, label: "KYC Verification", to: "/retailer/kyc" },
            ].map((link) => (
              <Link key={link.label} to={link.to as any} className="flex items-center gap-3 text-sm text-gov-blue hover:underline font-medium">
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, label, count, borderColor, bgColor, textColor }: {
  icon: React.ElementType; label: string; count: number; borderColor: string; bgColor: string; textColor: string;
}) {
  return (
    <div className={`rounded-lg border-2 p-3 text-center ${borderColor} ${bgColor}`}>
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${textColor}`} />
        <span className={`text-xs font-bold ${textColor}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{count}</p>
    </div>
  );
}

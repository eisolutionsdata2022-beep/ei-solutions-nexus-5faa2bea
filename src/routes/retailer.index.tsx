import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { NoticeMarquee } from "@/components/NoticeMarquee";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useDisabledServices, ServiceBlockedDialog } from "@/components/ServicePermissionCheck";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wallet, Search, Clock, CheckCircle, XCircle, AlertCircle,
  ArrowDownLeft, ArrowUpRight, FileText, ExternalLink, BarChart3, HelpCircle,
  IdCard, Copy, Sparkles, Banknote, ShieldCheck, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { generateVleId } from "@/lib/pan-vle-id";
import { getPsaIdRecord, type PsaIdRecord } from "@/lib/psa-auto-id";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

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
  iconUrl?: string;
  customColor?: string;
}

function getButtonClasses(style: string, hasCustomColor?: boolean) {
  if (hasCustomColor) {
    switch (style) {
      case "solid": return "text-white shadow-md hover:opacity-90";
      case "outline": return "border-2 bg-transparent hover:opacity-80";
      case "gradient": return "text-white shadow-lg hover:opacity-90";
      default: return "text-white shadow-md hover:opacity-90";
    }
  }
  switch (style) {
    case "solid": return "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md";
    case "outline": return "border-2 border-primary text-primary bg-transparent hover:bg-primary/10";
    case "gradient": return "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:opacity-90";
    default: return "bg-primary text-primary-foreground";
  }
}

function getButtonInlineStyle(style: string, color?: string): React.CSSProperties {
  if (!color) return {};
  switch (style) {
    case "solid": return { backgroundColor: color };
    case "outline": return { borderColor: color, color: color };
    case "gradient": {
      const num = parseInt(color.replace("#", ""), 16);
      const r = Math.min(255, ((num >> 16) & 0xff) + 40);
      const g = Math.min(255, ((num >> 8) & 0xff) + 40);
      const b = Math.min(255, (num & 0xff) + 40);
      const lighter = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
      return { background: `linear-gradient(135deg, ${color}, ${lighter})` };
    }
    default: return { backgroundColor: color };
  }
}

function RetailerDashboard() {
  const { appUser } = useAuth();
  const disabledServices = useDisabledServices();
  const [blockedServiceName, setBlockedServiceName] = useState("");
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [balance, setBalance] = useState(0);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [applications, setApplications] = useState<ServiceRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceButtons, setServiceButtons] = useState<ServiceButtonData[]>([]);
  const [psa, setPsa] = useState<PsaIdRecord | null>(null);
  const [psaDismissed, setPsaDismissed] = useState(false);

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

    // Load PSA ID record (if exists)
    getPsaIdRecord(appUser.uid).then((rec) => {
      setPsa(rec);
      if (rec && typeof window !== "undefined") {
        const seenKey = `psa-banner-seen-${rec.psaId}`;
        if (window.localStorage.getItem(seenKey) === "1") setPsaDismissed(true);
      }
    }).catch(() => {});

    return unsub;
  }, [appUser]);

  const dismissPsaBanner = () => {
    if (psa && typeof window !== "undefined") {
      window.localStorage.setItem(`psa-banner-seen-${psa.psaId}`, "1");
    }
    setPsaDismissed(true);
  };

  const filteredApps = applications.filter((a) =>
    !searchTerm || a.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) || a.id.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Notice Board Marquee */}
      <NoticeMarquee />

      {/* Premium Greeting Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-premium-gradient p-6 text-white shadow-premium">
        <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/15 blur-3xl animate-blob" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-white/10 blur-3xl animate-blob [animation-delay:-7s]" aria-hidden />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/80 font-semibold">Retailer Dashboard</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {appUser?.name?.split(" ")[0] || "Partner"} 👋
            </h1>
            <p className="mt-1 text-sm text-white/85">
              Here's a snapshot of your business — services, wallet and recent activity at a glance.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/retailer/my-services">
              <Button variant="secondary" className="font-semibold bg-white/95 text-foreground hover:bg-white">
                <Sparkles className="w-4 h-4 mr-1.5" /> My Services
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* PSA ID Congratulations Banner */}
      {psa && !psaDismissed && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 p-5 text-white shadow-premium flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl shrink-0">
              🎉
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">
                Congratulations! Your PSA ID has been generated successfully.
              </p>
              <p className="text-sm text-white/90 mt-1">
                <span className="font-mono font-bold tracking-wider">{psa.psaId}</span>
                {" · "}Status: ACTIVE · Generated {new Date(psa.generatedAt).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <Link to="/retailer/profile">
              <Button variant="secondary" size="sm" className="font-semibold">View in Profile</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={dismissPsaBanner} className="text-white hover:bg-white/20">
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* QUICK LOAN APPLY + KYC — premium one-tap CTAs (always visible) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/retailer/finance" className="group block">
          <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 text-white shadow-premium transition-all hover:-translate-y-0.5 hover:shadow-2xl">
            <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/15 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-14 -left-10 h-36 w-36 rounded-full bg-white/10 blur-3xl" aria-hidden />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
                <Banknote className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/85 font-semibold">Gold Loan</p>
                <p className="text-xl sm:text-2xl font-extrabold leading-tight">Quick Loan Apply</p>
                <p className="text-xs text-white/85 mt-0.5">Pledge gold · instant disbursal · paperless KYC</p>
              </div>
              <div className="hidden sm:flex w-10 h-10 rounded-full bg-white/20 group-hover:bg-white/30 items-center justify-center shrink-0 transition-all">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
            <div className="relative mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-[11px] font-semibold">⚡ 5-min approval</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-[11px] font-semibold">💰 Up to 75% LTV</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-[11px] font-semibold">🔒 Secure vault</span>
            </div>
          </div>
        </Link>

        <Link to="/retailer/kyc" className="group block">
          <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white shadow-premium transition-all hover:-translate-y-0.5 hover:shadow-2xl">
            <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/15 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-14 -left-10 h-36 w-36 rounded-full bg-white/10 blur-3xl" aria-hidden />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/85 font-semibold">Identity</p>
                <p className="text-xl sm:text-2xl font-extrabold leading-tight">KYC Update / Submit</p>
                <p className="text-xs text-white/85 mt-0.5">Aadhaar · PAN · selfie · franchise certificate</p>
              </div>
              <div className="hidden sm:flex w-10 h-10 rounded-full bg-white/20 group-hover:bg-white/30 items-center justify-center shrink-0 transition-all">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
            <div className="relative mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-[11px] font-semibold">✓ Single click</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-[11px] font-semibold">📄 Upload docs</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-[11px] font-semibold">🔐 Bank-grade</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Wallet + VLE ID — premium glass cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Wallet card */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-0.5">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-premium-gradient opacity-20 blur-3xl" aria-hidden />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-premium-gradient flex items-center justify-center shadow-premium">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Wallet Balance</p>
                <p className="text-3xl font-extrabold tracking-tight text-foreground">
                  ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
            <Link to="/retailer/wallet">
              <Button className="bg-premium-gradient text-white font-bold border-0 shadow-premium hover:opacity-95">
                Recharge
              </Button>
            </Link>
          </div>
        </div>

        {/* VLE ID card */}
        <button
          type="button"
          onClick={() => {
            const id = generateVleId(appUser?.uid, appUser?.phone);
            navigator.clipboard?.writeText(id).then(
              () => toast.success(`VLE ID copied: ${id}`),
              () => toast.error("Could not copy VLE ID"),
            );
          }}
          className="glass-card group relative overflow-hidden rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99]"
          title="Click to copy your EI SOLUTIONS VLE ID"
        >
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-20 blur-3xl" aria-hidden />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-premium">
                <IdCard className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                  EI SOLUTIONS VLE ID
                  <Copy className="w-3 h-3 opacity-60" />
                </p>
                <p className="text-2xl font-extrabold text-foreground font-mono tracking-wider truncate">
                  {generateVleId(appUser?.uid, appUser?.phone)}
                </p>
              </div>
            </div>
            <Link
              to="/retailer/pan-portal"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            >
              <Button variant="outline" className="font-semibold backdrop-blur">PAN Portal</Button>
            </Link>
          </div>
        </button>
      </div>

      {/* Service Buttons */}
      {serviceButtons.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-1 rounded-full bg-premium-gradient" aria-hidden />
            <p className="text-sm font-bold text-foreground uppercase tracking-wider">Quick Services</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {serviceButtons.map((b) => {
              const isDisabled = disabledServices.has(b.name);
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    if (isDisabled) {
                      setBlockedServiceName(b.name);
                      setShowBlockedDialog(true);
                    } else {
                      window.open(b.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className={`inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-base font-bold transition-all min-h-[56px] hover:-translate-y-0.5 hover:shadow-premium ${isDisabled ? "opacity-50 cursor-not-allowed" : ""} ${getButtonClasses(b.style, !!b.customColor)}`}
                  style={getButtonInlineStyle(b.style, b.customColor)}
                >
                  {b.iconUrl ? (
                    <img src={b.iconUrl} alt="" className="w-5 h-5 rounded-sm object-contain" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Cards — premium gradient tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <PremiumStatTile icon={Clock} label="Pending" count={statusCounts.pending} gradient="from-amber-500 to-orange-500" />
        <PremiumStatTile icon={AlertCircle} label="Processing" count={0} gradient="from-orange-500 to-rose-500" />
        <PremiumStatTile icon={CheckCircle} label="Approved" count={statusCounts.approved} gradient="from-emerald-500 to-teal-500" />
        <PremiumStatTile icon={XCircle} label="Rejected" count={statusCounts.rejected} gradient="from-rose-500 to-red-600" />
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search applications by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-background/70 backdrop-blur border-border/70 focus-visible:ring-primary/40"
          />
        </div>
        <Button variant="outline" className="h-11 rounded-xl font-semibold border-border/70 backdrop-blur">
          Filter
        </Button>
      </div>

      {/* Recent Applications */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="border-b border-border/60 bg-background/40 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-premium-gradient" aria-hidden />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Recent Applications</h2>
          </div>
          <span className="text-xs text-muted-foreground">{filteredApps.length} record{filteredApps.length === 1 ? "" : "s"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 font-semibold text-foreground/70 text-xs uppercase tracking-wider">Application No.</th>
                <th className="text-left px-4 py-2.5 font-semibold text-foreground/70 text-xs uppercase tracking-wider">Service Name</th>
                <th className="text-left px-4 py-2.5 font-semibold text-foreground/70 text-xs uppercase tracking-wider">Applied Date</th>
                <th className="text-left px-4 py-2.5 font-semibold text-foreground/70 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-foreground/70 text-xs uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No applications yet.</td></tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{app.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3 font-medium">{app.serviceName || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${
                        app.status === "approved" ? "bg-success/10 text-success border-success/30" :
                        app.status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/30" :
                        "bg-warning/10 text-warning border-warning/30"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          app.status === "approved" ? "bg-success" :
                          app.status === "rejected" ? "bg-destructive" : "bg-warning"
                        }`} />
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" className="text-xs h-7 rounded-lg backdrop-blur">
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
          <div className="text-center py-3 border-t border-border/60 bg-background/40">
            <Link to="/retailer/services">
              <Button variant="outline" size="sm" className="text-xs rounded-lg">View All</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="border-b border-border/60 bg-background/40 px-5 py-3.5 flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-premium-gradient" aria-hidden />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Latest Updates</h2>
          </div>
          <div className="p-5 text-sm space-y-3">
            {recentTx.length === 0 ? (
              <p className="text-muted-foreground">No recent updates.</p>
            ) : (
              recentTx.slice(0, 3).map((tx) => (
                <div key={tx.id} className="flex items-start gap-3 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    tx.type === "credit" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}>
                    {tx.type === "credit" ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-medium truncate">{tx.description || tx.source}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-bold tabular-nums ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                    {tx.type === "credit" ? "+" : "-"}₹{tx.amount}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="border-b border-border/60 bg-background/40 px-5 py-3.5 flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-premium-gradient" aria-hidden />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Important Links</h2>
          </div>
          <div className="p-3">
            {[
              { icon: HelpCircle, label: "FAQs", to: "/retailer/services" },
              { icon: FileText, label: "Services List", to: "/retailer/services" },
              { icon: BarChart3, label: "Commission Chart", to: "/retailer/transactions" },
              { icon: ExternalLink, label: "KYC Verification", to: "/retailer/kyc" },
            ].map((link) => (
              <Link
                key={link.label}
                to={link.to as any}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted/50 hover:text-foreground transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-premium-gradient/10 flex items-center justify-center text-primary group-hover:bg-premium-gradient group-hover:text-white transition-all">
                  <link.icon className="w-4 h-4" />
                </div>
                <span className="flex-1">{link.label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Service Blocked Dialog */}
      <ServiceBlockedDialog
        open={showBlockedDialog}
        onClose={() => setShowBlockedDialog(false)}
        serviceName={blockedServiceName}
      />
    </div>
  );
}

function PremiumStatTile({
  icon: Icon, label, count, gradient,
}: {
  icon: React.ElementType; label: string; count: number; gradient: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl glass-card p-4 transition-all hover:-translate-y-0.5">
      <div
        className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-25 blur-2xl group-hover:opacity-40 transition-opacity`}
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-foreground tabular-nums">{count}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md text-white`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

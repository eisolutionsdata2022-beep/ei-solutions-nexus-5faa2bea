import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Wallet, Users, BarChart3, HelpCircle, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/distributor/")({
  component: DistributorDashboard,
});

function DistributorDashboard() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });
    return unsub;
  }, [appUser]);

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
            <p className="text-2xl font-bold text-foreground">₹{balance.toLocaleString("en-IN")}</p>
          </div>
        </div>
        <Link to="/distributor/wallet">
          <Button className="bg-gov-green hover:opacity-90 text-white font-bold">Recharge</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border-2 border-gov-blue bg-gov-blue/10 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="w-4 h-4 text-gov-blue" />
            <span className="text-xs font-bold text-gov-blue">Retailers</span>
          </div>
          <p className="text-2xl font-bold text-gov-blue">0</p>
        </div>
        <div className="rounded-lg border-2 border-success bg-success/10 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <BarChart3 className="w-4 h-4 text-success" />
            <span className="text-xs font-bold text-success">Commission</span>
          </div>
          <p className="text-2xl font-bold text-success">₹0</p>
        </div>
      </div>

      {/* Important Links */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="bg-gov-blue-light border-b border-border px-5 py-3">
          <h2 className="text-base font-bold text-gov-blue">Important Links</h2>
        </div>
        <div className="p-5 space-y-3">
          {[
            { icon: HelpCircle, label: "FAQs", to: "/distributor" },
            { icon: FileText, label: "Commission Structure", to: "/distributor/wallet" },
            { icon: ExternalLink, label: "Retailer Management", to: "/distributor" },
          ].map((link) => (
            <Link key={link.label} to={link.to as any} className="flex items-center gap-3 text-sm text-gov-blue hover:underline font-medium">
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

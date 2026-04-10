import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { StatsCard } from "@/components/StatsCard";
import { ShoppingBag, Wallet, GraduationCap, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/retailer/")({
  component: RetailerDashboard,
});

function RetailerDashboard() {
  const { appUser } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Retailer Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {appUser?.name || appUser?.email}!</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="KYC Status" value={appUser?.kycStatus || "Pending"} icon={ClipboardList} />
        <StatsCard title="Services Used" value={0} icon={ShoppingBag} />
        <StatsCard title="Wallet Balance" value="₹0" icon={Wallet} />
        <StatsCard title="Trainings" value={0} icon={GraduationCap} />
      </div>
    </div>
  );
}

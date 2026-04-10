import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { StatsCard } from "@/components/StatsCard";
import { Wallet, Users } from "lucide-react";

export const Route = createFileRoute("/distributor/")({
  component: () => {
    const { appUser } = useAuth();
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Distributor Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {appUser?.name || appUser?.email}!</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatsCard title="Wallet Balance" value="₹0" icon={Wallet} />
          <StatsCard title="Retailers" value={0} icon={Users} />
        </div>
      </div>
    );
  },
});

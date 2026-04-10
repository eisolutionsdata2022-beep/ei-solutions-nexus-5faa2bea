import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { StatsCard } from "@/components/StatsCard";
import { ShoppingBag, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/staff/")({
  component: () => {
    const { appUser } = useAuth();
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {appUser?.name || appUser?.email}!</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatsCard title="Services Processed" value={0} icon={ShoppingBag} />
        </div>
      </div>
    );
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/retailer/wallet")({
  component: () => {
    const { appUser } = useAuth();
    return (
      <div className="space-y-6 max-w-lg">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Wallet</h1>
          <p className="text-muted-foreground">View your balance and transactions.</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-4xl font-bold text-foreground mt-1">₹0.00</p>
            <p className="text-xs text-muted-foreground mt-2">No transactions yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  },
});

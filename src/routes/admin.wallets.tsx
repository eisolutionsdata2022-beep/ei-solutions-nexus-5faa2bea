import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/admin/wallets")({
  component: () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wallets</h1>
        <p className="text-muted-foreground">Manage user wallets and balances.</p>
      </div>
      <Card>
        <CardContent className="p-12 text-center">
          <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Wallet management coming soon.</p>
        </CardContent>
      </Card>
    </div>
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/admin/forms")({
  component: () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Form Builder</h1>
        <p className="text-muted-foreground">Create and manage custom forms.</p>
      </div>
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Form builder coming soon.</p>
        </CardContent>
      </Card>
    </div>
  ),
});

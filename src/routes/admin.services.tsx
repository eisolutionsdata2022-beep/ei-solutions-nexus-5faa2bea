import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Search, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { PLATFORM_SERVICES, PLATFORM_SERVICE_CATEGORIES } from "@/lib/platform-services";

export const Route = createFileRoute("/admin/services")({
  ssr: false,
  component: AdminServices,
});

function AdminServices() {
  const [serviceStates, setServiceStates] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  // Listen to all service toggle states from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "platformServices"), (snap) => {
      const states: Record<string, boolean> = {};
      snap.forEach((d) => {
        states[d.id] = d.data().enabled !== false;
      });
      setServiceStates(states);
    });
    return unsub;
  }, []);

  const toggleService = async (key: string, currentEnabled: boolean) => {
    setLoading(key);
    try {
      const ref = doc(db, "platformServices", key);
      await setDoc(ref, { enabled: !currentEnabled, updatedAt: new Date().toISOString() }, { merge: true });
      toast.success(`Service ${!currentEnabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update service");
    }
    setLoading(null);
  };

  const filtered = PLATFORM_SERVICES.filter((s) =>
    !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const enabledCount = PLATFORM_SERVICES.filter((s) => serviceStates[s.key] !== false).length;
  const disabledCount = PLATFORM_SERVICES.length - enabledCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Services Control</h1>
        <p className="text-muted-foreground">Toggle services on/off. Disabled services show "No Permission" to retailers.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{PLATFORM_SERVICES.length}</p>
          <p className="text-xs text-muted-foreground">Total Services</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-success">{enabledCount}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{disabledCount}</p>
          <p className="text-xs text-muted-foreground">Disabled</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Services by category */}
      {PLATFORM_SERVICE_CATEGORIES.map((cat) => {
        const items = filtered.filter((s) => s.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <h2 className="text-lg font-semibold text-foreground mb-3">{cat}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {items.map((s) => {
                const isEnabled = serviceStates[s.key] !== false;
                return (
                  <Card key={s.key} className={!isEnabled ? "opacity-60 border-destructive/30" : ""}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isEnabled ? "bg-primary/10" : "bg-destructive/10"}`}>
                            {isEnabled ? (
                              <ShieldCheck className="w-5 h-5 text-primary" />
                            ) : (
                              <ShieldX className="w-5 h-5 text-destructive" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{s.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant={isEnabled ? "default" : "destructive"} className="text-xs">
                          {isEnabled ? "Active" : "Disabled"}
                        </Badge>
                        <Switch
                          checked={isEnabled}
                          disabled={loading === s.key}
                          onCheckedChange={() => toggleService(s.key, isEnabled)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, addDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { atomicDebit, atomicCredit } from "@/lib/firebase-transactions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/services")({
  ssr: false,
  component: RetailerServices,
});

const SERVICE_CATEGORIES = [
  "Government Services",
  "Bill Payment",
  "Insurance",
  "Banking",
  "Other Services",
];

interface ServiceData {
  id: string;
  name: string;
  price: number;
  category: string;
  transactionType: string;
  apiUrl: string;
  enabled: boolean;
}

function RetailerServices() {
  const { appUser } = useAuth();
  const [services, setServices] = useState<ServiceData[]>([]);
  const [balance, setBalance] = useState(0);
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null);
  const [apiInputs, setApiInputs] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!appUser) return;
    const unsub1 = onSnapshot(collection(db, "services"), (snap) => {
      const list: ServiceData[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ServiceData));
      setServices(list.filter((s) => s.enabled !== false));
    });
    const unsub2 = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });
    return () => { unsub1(); unsub2(); };
  }, [appUser]);

  const useService = async (service: ServiceData) => {
    if (!appUser) return;
    if (service.price <= 0) {
      toast.error("Invalid service price.");
      return;
    }
    if (service.transactionType !== "credit" && balance < service.price) {
      toast.error("Insufficient wallet balance!");
      return;
    }
    setProcessing(true);
    try {
      // Call API if exists
      let apiResponse = null;
      if (service.apiUrl) {
        try {
          const res = await fetch(service.apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: appUser.uid, ...apiInputs }),
          });
          apiResponse = await res.json();
        } catch {
          apiResponse = { error: "API call failed" };
        }
      }

      // Atomic wallet update
      if (service.transactionType === "credit") {
        await atomicCredit(appUser.uid, service.price, {
          source: "service",
          serviceId: service.id,
          description: `Service: ${service.name}`,
        });
      } else {
        await atomicDebit(appUser.uid, service.price, {
          source: "service",
          serviceId: service.id,
          description: `Service: ${service.name}`,
        });
      }

      // Save service request
      await addDoc(collection(db, "serviceRequests"), {
        userId: appUser.uid,
        userEmail: appUser.email,
        serviceId: service.id,
        serviceName: service.name,
        price: service.price,
        status: "completed",
        apiResponse,
        createdAt: new Date().toISOString(),
      });

      toast.success(`${service.name} completed successfully!`);
      setSelectedService(null);
      setApiInputs({});
    } catch (err: any) {
      toast.error(err?.message || "Service request failed.");
    } finally {
      setProcessing(false);
    }
  };

  const grouped = SERVICE_CATEGORIES.map((cat) => ({
    category: cat,
    items: services.filter((s) => (s.category || "Other Services") === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Available Services</h1>
          <p className="text-muted-foreground">Browse and use services. Your balance: <span className="font-semibold text-primary">₹{balance.toFixed(2)}</span></p>
        </div>
      </div>

      <Tabs defaultValue={grouped[0]?.category || "Government Services"}>
        <TabsList className="flex-wrap h-auto gap-1">
          {grouped.map((g) => (
            <TabsTrigger key={g.category} value={g.category} className="text-xs">
              {g.category} ({g.items.length})
            </TabsTrigger>
          ))}
        </TabsList>
        {grouped.map((g) => (
          <TabsContent key={g.category} value={g.category}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {g.items.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{s.name}</p>
                        <p className="text-lg font-bold text-primary">₹{s.price}</p>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => s.apiUrl ? setSelectedService(s) : useService(s)}
                      disabled={processing}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Use Service
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* API Service Dialog */}
      <Dialog open={!!selectedService} onOpenChange={(v) => { if (!v) { setSelectedService(null); setApiInputs({}); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedService?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter the required details for this service.</p>
            <div className="space-y-2">
              <Label>Input Data</Label>
              <Input
                placeholder="Enter required info..."
                value={apiInputs.data || ""}
                onChange={(e) => setApiInputs({ ...apiInputs, data: e.target.value })}
              />
            </div>
            {balance < (selectedService?.price || 0) && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">Insufficient balance (₹{balance.toFixed(2)})</p>
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => selectedService && useService(selectedService)}
              disabled={processing || balance < (selectedService?.price || 0)}
            >
              {processing ? "Processing..." : `Pay ₹${selectedService?.price} & Submit`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

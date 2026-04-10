import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Send } from "lucide-react";

export const Route = createFileRoute("/retailer/services")({
  component: RetailerServices,
});

function RetailerServices() {
  const { appUser } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "services"));
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setServices(list);
    };
    fetch();
  }, []);

  const requestService = async (serviceId: string, serviceName: string, price: number) => {
    if (!appUser) return;
    setRequesting(serviceId);
    await addDoc(collection(db, "serviceRequests"), {
      userId: appUser.uid,
      userEmail: appUser.email,
      serviceId,
      serviceName,
      price,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    setRequesting(null);
    alert("Service request submitted!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Available Services</h1>
        <p className="text-muted-foreground">Browse and request services.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
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
                onClick={() => requestService(s.id, s.name, s.price)}
                disabled={requesting === s.id}
              >
                <Send className="w-4 h-4 mr-2" />
                {requesting === s.id ? "Requesting..." : "Request Service"}
              </Button>
            </CardContent>
          </Card>
        ))}
        {services.length === 0 && <p className="text-muted-foreground">No services available.</p>}
      </div>
    </div>
  );
}

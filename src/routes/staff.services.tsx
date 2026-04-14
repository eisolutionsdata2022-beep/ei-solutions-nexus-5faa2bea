import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/staff/services")({
  ssr: false,
  component: () => {
    const [services, setServices] = useState<any[]>([]);

    useEffect(() => {
      const fetch = async () => {
        const snap = await getDocs(collection(db, "services"));
        const list: any[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setServices(list);
      };
      fetch();
    }, []);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground">View available services.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-6 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{s.name}</p>
                  <p className="text-lg font-bold text-primary">₹{s.price}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {services.length === 0 && <p className="text-muted-foreground">No services available.</p>}
        </div>
      </div>
    );
  },
});

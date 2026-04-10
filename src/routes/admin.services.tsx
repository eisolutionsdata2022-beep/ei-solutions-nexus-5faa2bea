import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/admin/services")({
  component: AdminServices,
});

function AdminServices() {
  const [services, setServices] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [open, setOpen] = useState(false);

  const fetchServices = async () => {
    const snap = await getDocs(collection(db, "services"));
    const list: any[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    setServices(list);
  };

  useEffect(() => { fetchServices(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "services"), {
      name,
      price: parseFloat(price),
      createdAt: new Date().toISOString(),
    });
    setName("");
    setPrice("");
    setOpen(false);
    fetchServices();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground">Manage platform services.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Service</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Service Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full">Create Service</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{s.name}</p>
                  <p className="text-lg font-bold text-primary mt-1">₹{s.price}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {services.length === 0 && (
          <p className="text-muted-foreground col-span-full">No services yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}

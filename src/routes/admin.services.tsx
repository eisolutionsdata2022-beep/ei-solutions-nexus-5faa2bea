import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { collection, getDocs, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, ShoppingBag, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/services")({
  component: AdminServices,
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
  createdAt: string;
}

function AdminServices() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Government Services");
  const [transactionType, setTransactionType] = useState("debit");
  const [apiUrl, setApiUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [editService, setEditService] = useState<ServiceData | null>(null);

  const fetchServices = async () => {
    const snap = await getDocs(collection(db, "services"));
    const list: ServiceData[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ServiceData));
    setServices(list);
  };

  useEffect(() => { fetchServices(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(price);
    if (!parsedPrice || parsedPrice < 0) {
      toast.error("Price must be a positive value.");
      return;
    }
    try {
      await addDoc(collection(db, "services"), {
        name,
        price: parsedPrice,
        category,
        transactionType,
        apiUrl,
        enabled: true,
        createdAt: new Date().toISOString(),
      });
      resetForm();
      setOpen(false);
      fetchServices();
      toast.success("Service created!");
    } catch {
      toast.error("Failed to create service.");
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editService) return;
    await updateDoc(doc(db, "services", editService.id), {
      name, price: parseFloat(price), category, transactionType, apiUrl,
    });
    resetForm();
    setEditService(null);
    fetchServices();
  };

  const toggleEnabled = async (s: ServiceData) => {
    await updateDoc(doc(db, "services", s.id), { enabled: !s.enabled });
    fetchServices();
  };

  const resetForm = () => {
    setName(""); setPrice(""); setCategory("Government Services");
    setTransactionType("debit"); setApiUrl("");
  };

  const openEdit = (s: ServiceData) => {
    setName(s.name); setPrice(String(s.price)); setCategory(s.category || "Government Services");
    setTransactionType(s.transactionType || "debit"); setApiUrl(s.apiUrl || "");
    setEditService(s);
  };

  const grouped = SERVICE_CATEGORIES.map((cat) => ({
    category: cat,
    items: services.filter((s) => (s.category || "Other Services") === cat),
  }));

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Service Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Price (₹)</Label>
        <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SERVICE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Transaction Type</Label>
        <Select value={transactionType} onValueChange={setTransactionType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="debit">Debit</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>API URL (optional)</Label>
        <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.example.com/..." />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground">Manage platform services with categories and pricing.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Service</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate}>
              {formFields}
              <Button type="submit" className="w-full mt-4">Create Service</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editService} onOpenChange={(v) => { if (!v) { setEditService(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Service</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            {formFields}
            <Button type="submit" className="w-full mt-4">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      {grouped.map((g) => (
        <div key={g.category}>
          <h2 className="text-lg font-semibold text-foreground mb-3">{g.category}</h2>
          {g.items.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">No services in this category.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {g.items.map((s) => (
                <Card key={s.id} className={!s.enabled ? "opacity-50" : ""}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{s.name}</p>
                          <p className="text-lg font-bold text-primary">₹{s.price}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs capitalize">{s.transactionType || "debit"}</Badge>
                        {s.apiUrl && <Badge variant="outline" className="text-xs">API</Badge>}
                      </div>
                      <Switch checked={s.enabled !== false} onCheckedChange={() => toggleEnabled(s)} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

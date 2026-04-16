import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_COMMISSION_RATES, SERVICE_CATALOG, type CommissionRate, type ServiceType } from "@/lib/commission-config";
import { SERVICE_CATALOG as EDIS_CATALOG } from "@/lib/service-catalog";
import { getMatrimonyPricing, saveMatrimonyPricing } from "@/lib/matrimony-firebase";
import type { MatrimonyPricing } from "@/lib/matrimony-types";
import { DEFAULT_PRICING } from "@/lib/matrimony-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Upload, RotateCcw, Heart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/commissions")({
  ssr: false,
  component: AdminCommissions,
});

function AdminCommissions() {
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [editRate, setEditRate] = useState<CommissionRate | null>(null);
  const [form, setForm] = useState({
    totalPercent: "",
    retailerPercent: "",
    distributorPercent: "",
    adminPercent: "",
    serviceCharge: "",
  });

  // E-dis service fees state
  const [edisFees, setEdisFees] = useState<Record<string, number>>({});
  const [editingEdis, setEditingEdis] = useState<string | null>(null);
  const [edisFeeInput, setEdisFeeInput] = useState("");

  // CV Builder fee state
  const [cvFee, setCvFee] = useState(10);
  const [editingCvFee, setEditingCvFee] = useState(false);
  const [cvFeeInput, setCvFeeInput] = useState("");

  // Virtual Trainer fee state
  const [trainerFee, setTrainerFee] = useState(0);
  const [editingTrainerFee, setEditingTrainerFee] = useState(false);
  const [trainerFeeInput, setTrainerFeeInput] = useState("");

  // Matrimony commission state
  const [matPricing, setMatPricing] = useState<MatrimonyPricing>(DEFAULT_PRICING);
  const [editingMat, setEditingMat] = useState(false);
  const [matForm, setMatForm] = useState({
    commissionType: "fixed" as "fixed" | "percentage",
    commissionValue: "100",
  });

  const fetchRates = async () => {
    const snap = await getDocs(collection(db, "commissionRates"));
    const list: CommissionRate[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as CommissionRate));
    const merged = DEFAULT_COMMISSION_RATES.map((def) => {
      const existing = list.find(
        (r) => r.serviceType === def.serviceType && r.operator === def.operator
      );
      return existing || { ...def, id: `${def.serviceType}_${def.operator}` };
    });
    setRates(merged);
  };

  const fetchEdisFees = async () => {
    const snap = await getDocs(collection(db, "edisServiceFees"));
    const fees: Record<string, number> = {};
    snap.forEach((d) => { fees[d.id] = d.data().fee as number; });
    // Merge with defaults
    EDIS_CATALOG.forEach((s) => {
      if (!(s.name in fees)) fees[s.name] = s.fee;
    });
    setEdisFees(fees);
  };

  const saveEdisFee = async (serviceName: string) => {
    const fee = parseFloat(edisFeeInput);
    if (isNaN(fee) || fee < 0) { toast.error("Invalid fee amount"); return; }
    try {
      await setDoc(doc(db, "edisServiceFees", serviceName), { fee, updatedAt: new Date().toISOString() });
      toast.success(`Fee updated for ${serviceName}`);
      setEditingEdis(null);
      setEdisFeeInput("");
      fetchEdisFees();
    } catch { toast.error("Failed to update fee"); }
  };

  // CV fee fetch/save
  const fetchCvFee = async () => {
    try {
      const snap = await getDoc(doc(db, "platformFees", "cv_builder"));
      if (snap.exists()) { setCvFee(snap.data().fee || 10); }
    } catch { /* default */ }
  };

  const saveCvFee = async () => {
    const fee = parseFloat(cvFeeInput);
    if (isNaN(fee) || fee < 0) { toast.error("Invalid fee"); return; }
    try {
      await setDoc(doc(db, "platformFees", "cv_builder"), { fee, updatedAt: new Date().toISOString() });
      toast.success("CV Builder fee updated!");
      setCvFee(fee);
      setEditingCvFee(false);
    } catch { toast.error("Failed to update fee"); }
  };

  // Virtual Trainer fee fetch/save
  const fetchTrainerFee = async () => {
    try {
      const snap = await getDoc(doc(db, "platformFees", "virtual_trainer"));
      if (snap.exists()) { setTrainerFee(snap.data().fee || 0); }
    } catch { /* default 0 = free */ }
  };

  const saveTrainerFee = async () => {
    const fee = parseFloat(trainerFeeInput);
    if (isNaN(fee) || fee < 0) { toast.error("Invalid fee"); return; }
    try {
      await setDoc(doc(db, "platformFees", "virtual_trainer"), { fee, updatedAt: new Date().toISOString() });
      toast.success("Virtual Trainer fee updated!");
      setTrainerFee(fee);
      setEditingTrainerFee(false);
    } catch { toast.error("Failed to update fee"); }
  };

  // Matrimony commission fetch/save
  const fetchMatPricing = async () => {
    try {
      const p = await getMatrimonyPricing();
      setMatPricing(p);
    } catch { /* default */ }
  };

  const saveMatCommission = async () => {
    const val = parseFloat(matForm.commissionValue);
    if (isNaN(val) || val < 0) { toast.error("Invalid commission value"); return; }
    try {
      const updated = { ...matPricing, commissionType: matForm.commissionType, commissionValue: val };
      await saveMatrimonyPricing(updated);
      setMatPricing(updated);
      setEditingMat(false);
      toast.success("Matrimony commission updated!");
    } catch { toast.error("Failed to update"); }
  };

  useEffect(() => { fetchRates(); fetchEdisFees(); fetchCvFee(); fetchTrainerFee(); fetchMatPricing(); }, []);

  const openEdit = (rate: CommissionRate) => {
    setEditRate(rate);
    setForm({
      totalPercent: String(rate.totalPercent),
      retailerPercent: String(rate.retailerPercent),
      distributorPercent: String(rate.distributorPercent),
      adminPercent: String(rate.adminPercent),
      serviceCharge: String(rate.serviceCharge),
    });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editRate) return;
    const data = {
      serviceType: editRate.serviceType,
      operator: editRate.operator,
      totalPercent: parseFloat(form.totalPercent),
      retailerPercent: parseFloat(form.retailerPercent),
      distributorPercent: parseFloat(form.distributorPercent),
      adminPercent: parseFloat(form.adminPercent),
      serviceCharge: parseFloat(form.serviceCharge),
    };
    // Validate splits add up
    const splitSum = data.retailerPercent + data.distributorPercent + data.adminPercent;
    if (Math.abs(splitSum - data.totalPercent) > 0.01) {
      toast.error(`Splits (${splitSum.toFixed(2)}%) must equal total (${data.totalPercent}%)`);
      return;
    }
    try {
      const docId = `${data.serviceType}_${data.operator}`;
      await setDoc(doc(db, "commissionRates", docId), data);
      toast.success("Commission rate updated!");
      setEditRate(null);
      fetchRates();
    } catch {
      toast.error("Failed to update rate");
    }
  };

  const seedDefaults = async () => {
    try {
      for (const rate of DEFAULT_COMMISSION_RATES) {
        const docId = `${rate.serviceType}_${rate.operator}`;
        await setDoc(doc(db, "commissionRates", docId), rate);
      }
      toast.success("Default rates seeded to Firebase!");
      fetchRates();
    } catch {
      toast.error("Failed to seed defaults");
    }
  };

  const serviceTypes = Object.keys(SERVICE_CATALOG) as ServiceType[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commission Management</h1>
          <p className="text-muted-foreground">Configure commission splits for all services.</p>
        </div>
        <Button variant="outline" onClick={seedDefaults}>
          <Upload className="w-4 h-4 mr-2" /> Seed Default Rates
        </Button>
      </div>

      <Tabs defaultValue="mobile_recharge">
        <TabsList className="flex-wrap h-auto gap-1">
          {serviceTypes.map((st) => (
            <TabsTrigger key={st} value={st} className="text-xs">
              {SERVICE_CATALOG[st].icon} {SERVICE_CATALOG[st].label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="edis_fees" className="text-xs">
            📋 E-dis Service Fees
          </TabsTrigger>
          <TabsTrigger value="cv_fee" className="text-xs">
            📄 CV Builder Fee
          </TabsTrigger>
          <TabsTrigger value="trainer_fee" className="text-xs">
            🤖 Virtual Trainer Fee
          </TabsTrigger>
          <TabsTrigger value="matrimony" className="text-xs">
            <Heart className="w-3 h-3 mr-1" /> Matrimony
          </TabsTrigger>
        </TabsList>

        {serviceTypes.map((st) => {
          const typeRates = rates.filter((r) => r.serviceType === st);
          return (
            <TabsContent key={st} value={st}>
              <div className="grid gap-4">
                {typeRates.map((rate) => {
                  const op = SERVICE_CATALOG[st].operators.find((o) => o.id === rate.operator);
                  return (
                    <Card key={rate.operator}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{op?.logo || "📦"}</span>
                            <div>
                              <p className="font-semibold">{op?.name || rate.operator}</p>
                              <p className="text-sm text-muted-foreground">Total: {rate.totalPercent}%</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Retailer: {rate.retailerPercent}%
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              Distributor: {rate.distributorPercent}%
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              Admin: {rate.adminPercent}%
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Charge: ₹{rate.serviceCharge}
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(rate)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {typeRates.length === 0 && (
                  <p className="text-muted-foreground text-sm">No rates configured. Click "Seed Default Rates" to initialize.</p>
                )}
              </div>
            </TabsContent>
          );
        })}

        {/* E-dis Service Fees Tab */}
        <TabsContent value="edis_fees">
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-bold">E-dis Application Fees</CardTitle>
              <p className="text-xs text-muted-foreground">Set the fee deducted from retailer wallet per application submission.</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-xs font-bold text-left px-4 py-2">Service Name</th>
                      <th className="text-xs font-bold text-left px-4 py-2">Category</th>
                      <th className="text-xs font-bold text-left px-4 py-2">Current Fee (₹)</th>
                      <th className="text-xs font-bold text-left px-4 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EDIS_CATALOG.map((svc) => (
                      <tr key={svc.name} className="border-b">
                        <td className="text-xs font-medium px-4 py-2">{svc.name}</td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className="text-[10px]">{svc.category}</Badge>
                        </td>
                        <td className="px-4 py-2">
                          {editingEdis === svc.name ? (
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={edisFeeInput}
                              onChange={(e) => setEdisFeeInput(e.target.value)}
                              className="h-7 w-24 text-xs"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs font-semibold">₹{edisFees[svc.name] ?? svc.fee}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {editingEdis === svc.name ? (
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 text-xs" onClick={() => saveEdisFee(svc.name)}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingEdis(null); setEdisFeeInput(""); }}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setEditingEdis(svc.name); setEdisFeeInput(String(edisFees[svc.name] ?? svc.fee)); }}>
                              <Pencil className="w-3 h-3" /> Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CV Builder Fee Tab */}
        <TabsContent value="cv_fee">
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-bold">CV Builder Fee</CardTitle>
              <p className="text-xs text-muted-foreground">Set the fee deducted from retailer wallet each time a CV is downloaded.</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-sm font-medium">Current Fee</Label>
                  {editingCvFee ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg font-bold">₹</span>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={cvFeeInput}
                        onChange={(e) => setCvFeeInput(e.target.value)}
                        className="w-32"
                        autoFocus
                      />
                      <Button size="sm" onClick={saveCvFee}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCvFee(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-2xl font-bold text-primary">₹{cvFee}</span>
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => { setEditingCvFee(true); setCvFeeInput(String(cvFee)); }}>
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Virtual Trainer Fee Tab */}
        <TabsContent value="trainer_fee">
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-bold">Virtual Trainer Fee</CardTitle>
              <p className="text-xs text-muted-foreground">Set the fee deducted from retailer wallet per virtual trainer session. Set 0 for free access.</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-sm font-medium">Session Fee</Label>
                  {editingTrainerFee ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg font-bold">₹</span>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={trainerFeeInput}
                        onChange={(e) => setTrainerFeeInput(e.target.value)}
                        className="w-32"
                        autoFocus
                      />
                      <Button size="sm" onClick={saveTrainerFee}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTrainerFee(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-2xl font-bold text-primary">
                        {trainerFee === 0 ? "Free" : `₹${trainerFee}`}
                      </span>
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => { setEditingTrainerFee(true); setTrainerFeeInput(String(trainerFee)); }}>
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matrimony Commission Tab */}
        <TabsContent value="matrimony">
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" /> Matrimony Commission
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Set the commission deducted from retailer wallet per matrimony profile registration.
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {editingMat ? (
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Commission Type</Label>
                    <Select
                      value={matForm.commissionType}
                      onValueChange={(v) => setMatForm({ ...matForm, commissionType: v as "fixed" | "percentage" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {matForm.commissionType === "fixed" ? "Amount per Profile (₹)" : "Percentage per Profile (%)"}
                    </Label>
                    <Input
                      type="number"
                      step={matForm.commissionType === "fixed" ? "1" : "0.1"}
                      min="0"
                      value={matForm.commissionValue}
                      onChange={(e) => setMatForm({ ...matForm, commissionValue: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveMatCommission}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingMat(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Commission Type</p>
                      <Badge variant="outline" className="mt-1">
                        {matPricing.commissionType === "fixed" ? "Fixed Amount" : "Percentage"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Per Profile Registration</p>
                      <p className="text-2xl font-bold text-primary mt-1">
                        {matPricing.commissionType === "fixed"
                          ? `₹${matPricing.commissionValue}`
                          : `${matPricing.commissionValue}%`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1"
                      onClick={() => {
                        setEditingMat(true);
                        setMatForm({
                          commissionType: matPricing.commissionType,
                          commissionValue: String(matPricing.commissionValue),
                        });
                      }}
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Matrimony Package Pricing</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Card className="border-green-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground">Basic</p>
                          <p className="text-lg font-bold">₹{matPricing.basicPrice}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-blue-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground">Premium</p>
                          <p className="text-lg font-bold">₹{matPricing.premiumPrice}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-purple-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground">VIP</p>
                          <p className="text-lg font-bold">₹{matPricing.vipPrice}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editRate} onOpenChange={(v) => { if (!v) setEditRate(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Commission: {editRate?.operator.toUpperCase()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Commission %</Label>
                <Input type="number" step="0.01" value={form.totalPercent} onChange={(e) => setForm({ ...form, totalPercent: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Service Charge (₹)</Label>
                <Input type="number" step="0.5" value={form.serviceCharge} onChange={(e) => setForm({ ...form, serviceCharge: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Retailer %</Label>
                <Input type="number" step="0.01" value={form.retailerPercent} onChange={(e) => setForm({ ...form, retailerPercent: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Distributor %</Label>
                <Input type="number" step="0.01" value={form.distributorPercent} onChange={(e) => setForm({ ...form, distributorPercent: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Admin %</Label>
                <Input type="number" step="0.01" value={form.adminPercent} onChange={(e) => setForm({ ...form, adminPercent: e.target.value })} required />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Split total: {(parseFloat(form.retailerPercent || "0") + parseFloat(form.distributorPercent || "0") + parseFloat(form.adminPercent || "0")).toFixed(2)}% 
              (must equal {form.totalPercent || "0"}%)
            </p>
            <Button type="submit" className="w-full">Save Commission Rate</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

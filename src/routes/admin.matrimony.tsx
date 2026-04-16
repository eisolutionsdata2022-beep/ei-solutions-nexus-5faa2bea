import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  subscribeMatrimonyProfiles, deleteMatrimonyProfile,
  subscribeMatrimonyRequests, deleteDemoProfiles, getDemoProfileCount,
  getMatrimonyPricing, saveMatrimonyPricing, addMatrimonyProfile,
  updateMatrimonyRequest,
} from "@/lib/matrimony-firebase";
import { generateDemoProfiles, DEFAULT_PRICING, KERALA_DISTRICTS } from "@/lib/matrimony-types";
import type { MatrimonyProfile, MatrimonyRequest, MatrimonyPricing } from "@/lib/matrimony-types";
import { Trash2, Users, Heart, MessageSquare, Crown, Database, Loader2, IndianRupee, Percent, Eye, Phone, Mail, MapPin, Filter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/matrimony")({
  ssr: false,
  component: AdminMatrimonyDashboard,
});

function AdminMatrimonyDashboard() {
  const [profiles, setProfiles] = useState<MatrimonyProfile[]>([]);
  const [requests, setRequests] = useState<MatrimonyRequest[]>([]);
  const [pricing, setPricing] = useState<MatrimonyPricing>(DEFAULT_PRICING);
  const [demoCount, setDemoCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Request filters
  const [districtFilter, setDistrictFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<MatrimonyRequest | null>(null);

  useEffect(() => {
    const unsub1 = subscribeMatrimonyProfiles(setProfiles);
    const unsub2 = subscribeMatrimonyRequests(setRequests);
    getMatrimonyPricing().then(setPricing);
    getDemoProfileCount().then(setDemoCount);
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleLoadDemos = async () => {
    setLoading(true);
    try {
      const demos = generateDemoProfiles();
      let count = 0;
      for (const demo of demos) {
        await addMatrimonyProfile(demo);
        count++;
        if (count % 10 === 0) toast.info(`Loading... ${count}/100`);
      }
      toast.success("100 demo profiles loaded!");
      getDemoProfileCount().then(setDemoCount);
    } catch { toast.error("Failed to load demos"); }
    setLoading(false);
  };

  const handleDeleteDemos = async () => {
    setLoading(true);
    try {
      const count = await deleteDemoProfiles();
      toast.success(`${count} demo profiles deleted`);
      setDemoCount(0);
    } catch { toast.error("Failed to delete demos"); }
    setLoading(false);
  };

  const handleSavePricing = async () => {
    try {
      await saveMatrimonyPricing(pricing);
      toast.success("Pricing saved!");
    } catch { toast.error("Failed to save pricing"); }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm("Delete this profile?")) return;
    try {
      await deleteMatrimonyProfile(id);
      toast.success("Profile deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const handleUpdateRequestStatus = async (id: string, status: "New" | "Contacted" | "Converted") => {
    try {
      await updateMatrimonyRequest(id, { status });
      toast.success(`Status updated to ${status}`);
    } catch { toast.error("Failed to update"); }
  };

  const handleReassignFranchise = async (requestId: string, franchiseId: string, franchiseName: string) => {
    try {
      await updateMatrimonyRequest(requestId, { assignedFranchiseId: franchiseId, assignedFranchiseName: franchiseName });
      toast.success("Franchise reassigned");
    } catch { toast.error("Failed to reassign"); }
  };

  // Filter requests
  const filteredRequests = requests.filter(r => {
    if (districtFilter !== "all" && r.district !== districtFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  const statusColor = (s: string) => {
    if (s === "New") return "bg-blue-100 text-blue-700 border-blue-200";
    if (s === "Contacted") return "bg-amber-100 text-amber-700 border-amber-200";
    if (s === "Converted") return "bg-green-100 text-green-700 border-green-200";
    return "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-pink-600">💕 Kukku Life Matrimony — Admin</h1>
        <p className="text-sm text-muted-foreground">Manage profiles, requests, and pricing</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-pink-100"><CardContent className="p-4 text-center"><Users className="w-6 h-6 text-pink-500 mx-auto" /><p className="text-2xl font-bold">{profiles.length}</p><p className="text-xs text-muted-foreground">Total Profiles</p></CardContent></Card>
        <Card className="border-amber-100"><CardContent className="p-4 text-center"><Database className="w-6 h-6 text-amber-500 mx-auto" /><p className="text-2xl font-bold">{demoCount}</p><p className="text-xs text-muted-foreground">Demo Profiles</p></CardContent></Card>
        <Card className="border-blue-100"><CardContent className="p-4 text-center"><MessageSquare className="w-6 h-6 text-blue-500 mx-auto" /><p className="text-2xl font-bold">{requests.length}</p><p className="text-xs text-muted-foreground">Total Requests</p></CardContent></Card>
        <Card className="border-green-100"><CardContent className="p-4 text-center"><Heart className="w-6 h-6 text-green-500 mx-auto" /><p className="text-2xl font-bold">{requests.filter(r => r.status === "New").length}</p><p className="text-xs text-muted-foreground">New Requests</p></CardContent></Card>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="demo">Demo Data</TabsTrigger>
        </TabsList>

        {/* ─── Requests Tab ─── */}
        <TabsContent value="requests" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="District" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {KERALA_DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Contacted">Contacted</SelectItem>
                <SelectItem value="Converted">Converted</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">{filteredRequests.length} results</span>
          </div>

          {filteredRequests.map(r => (
            <Card key={r.id} className="border-blue-100 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-lg">{r.requesterName}</p>
                      <Badge className={`${statusColor(r.status)} text-xs`}>{r.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Interested in: <strong>{r.profileName}</strong>
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{r.phone}</span>
                      {r.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{r.email}</span>}
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{r.district || "N/A"}</span>
                    </div>
                    {r.message && <p className="text-sm mt-2 italic text-gray-500">"{r.message}"</p>}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>Franchise: <strong>{r.assignedFranchiseName || "Unassigned"}</strong></span>
                      <span>•</span>
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Select value={r.status} onValueChange={(v) => handleUpdateRequestStatus(r.id, v as "New" | "Contacted" | "Converted")}>
                      <SelectTrigger className="w-[130px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Converted">Converted</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => setSelectedRequest(r)} className="text-xs">
                      <Eye className="w-3.5 h-3.5 mr-1" /> Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredRequests.length === 0 && <p className="text-center py-8 text-muted-foreground">No requests found</p>}
        </TabsContent>

        {/* ─── Profiles Tab ─── */}
        <TabsContent value="profiles" className="space-y-3">
          {profiles.map(p => (
            <Card key={p.id} className="border-pink-100">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden shrink-0">
                  {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-lg font-bold text-pink-400">{p.name[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{p.name}</p>
                    {p.isDemo && <Badge className="bg-amber-500 text-white border-0 text-[10px]">Demo</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.age} yrs • {p.gender} • {p.location} • By: {p.franchiseName}</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteProfile(p.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ─── Pricing Tab ─── */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500" /> Manage Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {(["basic", "premium", "vip"] as const).map((plan) => (
                <div key={plan} className="space-y-3 p-4 border rounded-lg">
                  <h3 className="font-semibold capitalize text-lg">{plan} Plan</h3>
                  <div>
                    <Label>Price (₹)</Label>
                    <Input type="number" value={pricing[`${plan}Price`]} onChange={e => setPricing({...pricing, [`${plan}Price`]: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <Label>Features (comma separated)</Label>
                    <Input value={pricing[`${plan}Features`].join(", ")} onChange={e => setPricing({...pricing, [`${plan}Features`]: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})} />
                  </div>
                </div>
              ))}

              {/* Commission Settings */}
              <div className="space-y-3 p-4 border-2 border-emerald-200 rounded-lg bg-emerald-50/50">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-emerald-600" />
                  Retailer Commission (Per Profile Registration)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Commission Type</Label>
                    <Select value={pricing.commissionType || "fixed"} onValueChange={(v) => setPricing({ ...pricing, commissionType: v as "fixed" | "percentage" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{pricing.commissionType === "percentage" ? "Percentage (%)" : "Amount (₹)"}</Label>
                    <div className="relative">
                      <Input type="number" value={pricing.commissionValue ?? 100} onChange={e => setPricing({ ...pricing, commissionValue: parseFloat(e.target.value) || 0 })} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {pricing.commissionType === "percentage" ? <Percent className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pricing.commissionType === "percentage"
                    ? `Retailer earns ${pricing.commissionValue ?? 0}% of the plan price per profile registered`
                    : `Retailer earns ₹${pricing.commissionValue ?? 0} flat per profile registered`}
                </p>
              </div>

              <Button onClick={handleSavePricing} className="bg-pink-500 hover:bg-pink-600">Save Pricing & Commission</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Demo Tab ─── */}
        <TabsContent value="demo">
          <Card>
            <CardHeader><CardTitle>Demo Profile Management</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Current demo profiles: <strong>{demoCount}</strong></p>
              <div className="flex gap-3">
                <Button onClick={handleLoadDemos} disabled={loading} className="bg-blue-500 hover:bg-blue-600">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Loading...</> : "Load 100 Demo Profiles"}
                </Button>
                <Button variant="destructive" onClick={handleDeleteDemos} disabled={loading || demoCount === 0}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete All Demos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Requester:</span><p className="font-semibold">{selectedRequest.requesterName}</p></div>
                <div><span className="text-muted-foreground">Phone:</span><p className="font-semibold">{selectedRequest.phone}</p></div>
                <div><span className="text-muted-foreground">Email:</span><p className="font-semibold">{selectedRequest.email || "N/A"}</p></div>
                <div><span className="text-muted-foreground">Profile:</span><p className="font-semibold">{selectedRequest.profileName}</p></div>
                <div><span className="text-muted-foreground">District:</span><p className="font-semibold">{selectedRequest.district || "N/A"}</p></div>
                <div><span className="text-muted-foreground">Status:</span><Badge className={`${statusColor(selectedRequest.status)} mt-1`}>{selectedRequest.status}</Badge></div>
                <div><span className="text-muted-foreground">Franchise:</span><p className="font-semibold">{selectedRequest.assignedFranchiseName || "Unassigned"}</p></div>
                <div><span className="text-muted-foreground">Date:</span><p className="font-semibold">{new Date(selectedRequest.createdAt).toLocaleString()}</p></div>
              </div>
              {selectedRequest.message && (
                <div>
                  <span className="text-sm text-muted-foreground">Message:</span>
                  <p className="text-sm italic mt-1 bg-gray-50 p-3 rounded-lg">"{selectedRequest.message}"</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Select value={selectedRequest.status} onValueChange={(v) => {
                  handleUpdateRequestStatus(selectedRequest.id, v as "New" | "Contacted" | "Converted");
                  setSelectedRequest({ ...selectedRequest, status: v as "New" | "Contacted" | "Converted" });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Contacted">Contacted</SelectItem>
                    <SelectItem value="Converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

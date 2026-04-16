import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  subscribeMatrimonyProfiles, deleteMatrimonyProfile,
  subscribeMatrimonyRequests, deleteDemoProfiles, getDemoProfileCount,
  getMatrimonyPricing, saveMatrimonyPricing, addMatrimonyProfile,
} from "@/lib/matrimony-firebase";
import { generateDemoProfiles, DEFAULT_PRICING } from "@/lib/matrimony-types";
import type { MatrimonyProfile, MatrimonyRequest, MatrimonyPricing } from "@/lib/matrimony-types";
import { Trash2, Users, Heart, MessageSquare, Crown, Database, Loader2, IndianRupee, Percent, Copy } from "lucide-react";
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
        <Card className="border-blue-100"><CardContent className="p-4 text-center"><MessageSquare className="w-6 h-6 text-blue-500 mx-auto" /><p className="text-2xl font-bold">{requests.length}</p><p className="text-xs text-muted-foreground">Requests</p></CardContent></Card>
        <Card className="border-green-100"><CardContent className="p-4 text-center"><Heart className="w-6 h-6 text-green-500 mx-auto" /><p className="text-2xl font-bold">{profiles.filter(p => !p.isDemo).length}</p><p className="text-xs text-muted-foreground">Real Profiles</p></CardContent></Card>
      </div>

      <Tabs defaultValue="profiles">
        <TabsList>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="demo">Demo Data</TabsTrigger>
        </TabsList>

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
                    <Badge className="bg-green-500 text-white border-0 text-[10px]">Delivered</Badge>
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

        <TabsContent value="requests" className="space-y-3">
          {requests.map(r => (
            <Card key={r.id} className="border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">{r.requesterName}</p>
                  <Badge variant="outline" className="text-xs">{new Date(r.createdAt).toLocaleDateString()}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Profile: <strong>{r.profileName}</strong></p>
                <p className="text-sm">📞 {r.phone} {r.email && `• ✉️ ${r.email}`}</p>
                {r.message && <p className="text-sm mt-1 italic">"{r.message}"</p>}
              </CardContent>
            </Card>
          ))}
          {requests.length === 0 && <p className="text-center py-8 text-muted-foreground">No requests yet</p>}
        </TabsContent>

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
              <Button onClick={handleSavePricing} className="bg-pink-500 hover:bg-pink-600">Save Pricing</Button>
            </CardContent>
          </Card>
        </TabsContent>

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
    </div>
  );
}

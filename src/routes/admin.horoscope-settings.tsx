import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DollarSign, BarChart3, TrendingUp, Sparkles } from "lucide-react";
import { subscribeHoroscopeSettings, updateHoroscopeSettings, subscribeHoroscopeRequests } from "@/lib/horoscope-firebase";
import { StatsCard } from "@/components/StatsCard";
import type { HoroscopeSettings, HoroscopeRequest, HoroscopeProduct, HoroscopeProductPricing } from "@/lib/horoscope-types";
import { PRODUCT_LABELS, DEFAULT_PRODUCT_PRICING, STATUS_COLORS, getProductPricing } from "@/lib/horoscope-types";

export const Route = createFileRoute("/admin/horoscope-settings")({
  ssr: false,
  component: AdminHoroscopeSettings,
});

const PRODUCTS: HoroscopeProduct[] = ["standard", "premium", "palmistry"];

function AdminHoroscopeSettings() {
  const [settings, setSettings] = useState<HoroscopeSettings | null>(null);
  const [products, setProducts] = useState<Record<HoroscopeProduct, HoroscopeProductPricing>>(DEFAULT_PRODUCT_PRICING);
  const [requests, setRequests] = useState<HoroscopeRequest[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u1 = subscribeHoroscopeSettings((s) => {
      setSettings(s);
      setProducts({
        standard: getProductPricing(s, "standard"),
        premium: getProductPricing(s, "premium"),
        palmistry: getProductPricing(s, "palmistry"),
      });
    });
    const u2 = subscribeHoroscopeRequests((r) => setRequests(r));
    return () => { u1(); u2(); };
  }, []);

  const updateProduct = (key: HoroscopeProduct, patch: Partial<HoroscopeProductPricing>) =>
    setProducts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateHoroscopeSettings({
        pricePerHoroscope: products.standard.price,
        commissionPercentage: products.standard.commissionPercentage,
        serviceEnabled: products.standard.enabled,
        products,
      });
      toast.success("Settings saved!");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayReqs = requests.filter((r) => new Date(r.createdAt).toDateString() === today);
    const byProduct = (p: HoroscopeProduct) => requests.filter((r) => (r.product || "standard") === p);
    return {
      totalRevenue: requests.reduce((s, r) => s + (r.amount || 0), 0),
      todayRevenue: todayReqs.reduce((s, r) => s + (r.amount || 0), 0),
      todayCount: todayReqs.length,
      byProduct: {
        standard: byProduct("standard").length,
        premium: byProduct("premium").length,
        palmistry: byProduct("palmistry").length,
      },
    };
  }, [requests]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-950 via-purple-950 to-indigo-950 text-white rounded-xl p-5 shadow-xl border border-amber-500/30">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-amber-300" /> Horoscope — Settings & Revenue</h1>
        <p className="text-amber-200/80 text-sm mt-1">Per-product pricing, daily revenue, full order history</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total Reports" value={requests.length} icon={BarChart3} />
        <StatsCard title="Total Revenue" value={`₹${stats.totalRevenue}`} icon={DollarSign} />
        <StatsCard title="Today" value={`₹${stats.todayRevenue} (${stats.todayCount})`} icon={TrendingUp} />
        <StatsCard title="Delivered" value={requests.filter((r) => r.status === "Delivered").length} icon={Sparkles} />
      </div>

      <Tabs defaultValue="pricing">
        <TabsList>
          <TabsTrigger value="pricing">⚙️ Pricing</TabsTrigger>
          <TabsTrigger value="orders">📋 Orders ({requests.length})</TabsTrigger>
          <TabsTrigger value="report">📊 Daily Report</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing">
          <Card>
            <CardHeader><CardTitle>Per-Product Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {PRODUCTS.map((p) => (
                <div key={p} className="border-2 rounded-xl p-4 bg-gradient-to-br from-amber-50/40 to-transparent">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <div className="font-bold text-lg flex items-center gap-2">{PRODUCT_LABELS[p].emoji} {PRODUCT_LABELS[p].ml}</div>
                      <div className="text-xs text-muted-foreground">{PRODUCT_LABELS[p].en}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Enabled</Label>
                      <Switch checked={products[p].enabled} onCheckedChange={(v) => updateProduct(p, { enabled: v })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Price (₹)</Label>
                      <Input type="number" value={products[p].price} onChange={(e) => updateProduct(p, { price: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Commission (%)</Label>
                      <Input type="number" value={products[p].commissionPercentage} onChange={(e) => updateProduct(p, { commissionPercentage: Number(e.target.value) || 0 })} />
                    </div>
                  </div>
                </div>
              ))}
              <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                {saving ? "Saving..." : "Save All Pricing"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader><CardTitle>Order History</CardTitle></CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No orders yet</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Retailer</TableHead><TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead><TableHead>Status</TableHead><TableHead>Amount</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{new Date(r.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{r.userName}</TableCell>
                        <TableCell>{r.customerName}</TableCell>
                        <TableCell><Badge variant="outline">{PRODUCT_LABELS[r.product || "standard"].emoji} {PRODUCT_LABELS[r.product || "standard"].ml}</Badge></TableCell>
                        <TableCell><Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge></TableCell>
                        <TableCell>₹{r.amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader><CardTitle>Daily Income Report</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {PRODUCTS.map((p) => {
                  const list = requests.filter((r) => (r.product || "standard") === p);
                  const rev = list.reduce((s, r) => s + (r.amount || 0), 0);
                  return (
                    <div key={p} className="border rounded-lg p-4 bg-gradient-to-br from-amber-50/50 to-transparent">
                      <div className="text-2xl">{PRODUCT_LABELS[p].emoji}</div>
                      <div className="font-bold mt-1">{PRODUCT_LABELS[p].ml}</div>
                      <div className="text-2xl font-bold text-amber-700 mt-2">₹{rev}</div>
                      <div className="text-xs text-muted-foreground">{list.length} orders</div>
                    </div>
                  );
                })}
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Orders</TableHead><TableHead>Revenue</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {Object.entries(requests.reduce((acc, r) => {
                    const day = new Date(r.createdAt).toLocaleDateString();
                    acc[day] = acc[day] || { count: 0, rev: 0 };
                    acc[day].count++; acc[day].rev += r.amount || 0;
                    return acc;
                  }, {} as Record<string, { count: number; rev: number }>))
                    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                    .slice(0, 30)
                    .map(([day, data]) => (
                      <TableRow key={day}>
                        <TableCell>{day}</TableCell>
                        <TableCell>{data.count}</TableCell>
                        <TableCell className="font-bold text-amber-700">₹{data.rev}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

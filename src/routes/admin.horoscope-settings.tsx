/**
 * Admin — Horoscope settings + all requests.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Sparkles, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  subscribeHoroscopeSettings, updateHoroscopeSettings, subscribeHoroscopeRequests,
} from "@/lib/horoscope-firebase";
import {
  DEFAULT_SETTINGS, PRODUCT_LABELS, STATUS_COLORS,
  type HoroscopeRequest, type HoroscopeSettings,
} from "@/lib/horoscope-types";

export const Route = createFileRoute("/admin/horoscope-settings")({
  ssr: false,
  component: AdminHoroscopeSettings,
});

function AdminHoroscopeSettings() {
  const [settings, setSettings] = useState<HoroscopeSettings>(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState<HoroscopeSettings>(DEFAULT_SETTINGS);
  const [requests, setRequests] = useState<HoroscopeRequest[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeHoroscopeSettings((s) => { setSettings(s); setDraft(s); }), []);
  useEffect(() => subscribeHoroscopeRequests(setRequests), []);

  async function save() {
    setSaving(true);
    try {
      await updateHoroscopeSettings(draft);
      toast.success("Saved.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const totalRevenue = requests.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-amber-100 text-amber-700"><Sparkles className="w-6 h-6" /></div>
        <div>
          <h1 className="text-2xl font-bold">Horoscope Settings</h1>
          <p className="text-sm text-muted-foreground">Pricing & all retailer requests</p>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Pricing & Availability</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">Service enabled</div>
                  <p className="text-xs text-muted-foreground">When off, retailers cannot generate new horoscopes.</p>
                </div>
                <Switch
                  checked={draft.enabled}
                  onCheckedChange={(v) => setDraft({ ...draft, enabled: v })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{PRODUCT_LABELS.standard.ml} fee (₹)</Label>
                  <Input
                    type="number" min={0}
                    value={draft.standardFee}
                    onChange={(e) => setDraft({ ...draft, standardFee: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{PRODUCT_LABELS.premium.ml} fee (₹)</Label>
                  <Input
                    type="number" min={0}
                    value={draft.premiumFee}
                    onChange={(e) => setDraft({ ...draft, premiumFee: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notice (optional)</Label>
                <Textarea
                  rows={2}
                  placeholder="Optional banner shown on retailer page"
                  value={draft.notice || ""}
                  onChange={(e) => setDraft({ ...draft, notice: e.target.value })}
                />
              </div>

              <Button onClick={save} disabled={!dirty || saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving</> : <><Save className="w-4 h-4 mr-2" /> Save settings</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>All Requests</span>
                <Badge variant="secondary">Revenue: ₹{totalRevenue.toLocaleString("en-IN")}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">No requests yet.</p>
                : <div className="overflow-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Retailer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {requests.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div className="font-medium">{r.customerName}</div>
                              <div className="text-[11px] text-muted-foreground">{r.placeOfBirth}</div>
                            </TableCell>
                            <TableCell className="text-xs">{r.userName || r.userId.slice(0, 8)}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{r.product}</Badge></TableCell>
                            <TableCell>₹{r.amount}</TableCell>
                            <TableCell><Badge className={`text-xs ${STATUS_COLORS[r.status]}`} variant="outline">{r.status}</Badge></TableCell>
                            <TableCell className="text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
              }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
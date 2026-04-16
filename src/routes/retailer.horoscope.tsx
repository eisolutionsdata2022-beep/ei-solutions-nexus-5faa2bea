import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Download, Plus, Star, Upload, Image } from "lucide-react";
import { generateHoroscope } from "@/lib/horoscope-engine";
import { generateHoroscopePDF } from "@/lib/horoscope-pdf";
import {
  addHoroscopeRequest, subscribeHoroscopeRequests,
  getHoroscopeSettings, subscribeHoroscopeSettings,
} from "@/lib/horoscope-firebase";
import { atomicDebit } from "@/lib/firebase-transactions";
import type { HoroscopeRequest, HoroscopeSettings, Gender } from "@/lib/horoscope-types";
import { STATUS_COLORS } from "@/lib/horoscope-types";

export const Route = createFileRoute("/retailer/horoscope")({
  ssr: false,
  component: RetailerHoroscope,
});

function RetailerHoroscope() {
  const { appUser } = useAuth();
  const [requests, setRequests] = useState<HoroscopeRequest[]>([]);
  const [settings, setSettings] = useState<HoroscopeSettings | null>(null);
  const [tab, setTab] = useState("new");
  const [loading, setLoading] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [gender, setGender] = useState<Gender>("Male");
  const [dob, setDob] = useState("");
  const [timeOfBirth, setTimeOfBirth] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [language, setLanguage] = useState<"Malayalam" | "English" | "Both">("Both");
  const [godImage, setGodImage] = useState<string>("");

  useEffect(() => {
    if (!appUser) return;
    const unsub1 = subscribeHoroscopeRequests((r) => setRequests(r), appUser.uid);
    const unsub2 = subscribeHoroscopeSettings((s) => setSettings(s));
    return () => { unsub1(); unsub2(); };
  }, [appUser]);

  const handleSubmit = async () => {
    if (!appUser || !settings) return;
    if (!customerName || !dob || !timeOfBirth || !placeOfBirth) {
      toast.error("എല്ലാ ഫീൽഡുകളും പൂരിപ്പിക്കുക");
      return;
    }
    if (!settings.serviceEnabled) {
      toast.error("ഹോറോസ്കോപ്പ് സേവനം നിലവിൽ ലഭ്യമല്ല");
      return;
    }

    setLoading(true);
    try {
      // Debit wallet
      await atomicDebit(appUser.uid, settings.pricePerHoroscope, {
        source: "horoscope",
        description: `Horoscope for ${customerName}`,
      });

      // Generate horoscope
      const { chart, predictions } = generateHoroscope(dob, timeOfBirth);

      await addHoroscopeRequest({
        userId: appUser.uid,
        userName: appUser.name || appUser.email,
        customerName,
        gender,
        dateOfBirth: dob,
        timeOfBirth,
        placeOfBirth,
        language,
        status: "Generated",
        chart,
        predictions,
        godImage: godImage || undefined,
        amount: settings.pricePerHoroscope,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      toast.success("ഹോറോസ്കോപ്പ് ജനറേറ്റ് ചെയ്തു!");
      setCustomerName(""); setDob(""); setTimeOfBirth(""); setPlaceOfBirth(""); setGodImage("");
      setTab("reports");
    } catch (err: any) {
      toast.error(err.message || "പിശക് സംഭവിച്ചു");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (req: HoroscopeRequest) => {
    const html = generateHoroscopePDF(req);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🔮 ജ്യോതിഷ സേവനം</h1>
          <p className="text-muted-foreground">Horoscope Service</p>
        </div>
        {settings && (
          <Badge variant="outline" className="text-base px-4 py-2">
            ₹{settings.pricePerHoroscope} / report
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="new"><Plus className="w-4 h-4 mr-1" /> New Request</TabsTrigger>
          <TabsTrigger value="reports"><FileText className="w-4 h-4 mr-1" /> My Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>📝 പുതിയ ഹോറോസ്കോപ്പ് / New Horoscope Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>പേര് / Name *</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
                </div>
                <div className="space-y-2">
                  <Label>ലിംഗം / Gender *</Label>
                  <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ജനന തീയതി / Date of Birth *</Label>
                  <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>ജനന സമയം / Time of Birth *</Label>
                  <Input type="time" value={timeOfBirth} onChange={(e) => setTimeOfBirth(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>ജനന സ്ഥലം / Place of Birth *</Label>
                  <Input value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} placeholder="e.g., Thrissur, Kerala" />
                </div>
                <div className="space-y-2">
                  <Label>ഭാഷ / Language</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Malayalam">മലയാളം</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={loading} className="w-full bg-gov-blue hover:bg-gov-blue/90">
                <Star className="w-4 h-4 mr-2" />
                {loading ? "Processing..." : `ജനറേറ്റ് ചെയ്യുക (₹${settings?.pricePerHoroscope || 299})`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>📋 റിപ്പോർട്ടുകൾ / My Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">ഇതുവരെ റിപ്പോർട്ടുകൾ ഇല്ല</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>പേര്</TableHead>
                      <TableHead>DOB</TableHead>
                      <TableHead>ലഗ്നം</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.customerName}</TableCell>
                        <TableCell>{r.dateOfBirth}</TableCell>
                        <TableCell>{r.chart ? `${r.chart.lagna}` : "-"}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge>
                        </TableCell>
                        <TableCell>₹{r.amount}</TableCell>
                        <TableCell>
                          {(r.status === "Generated" || r.status === "Delivered") && (
                            <Button size="sm" variant="outline" onClick={() => handleDownloadPDF(r)}>
                              <Download className="w-4 h-4 mr-1" /> PDF
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

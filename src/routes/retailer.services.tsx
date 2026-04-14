import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, addDoc, doc, onSnapshot, query, where, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { atomicDebit } from "@/lib/firebase-transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicationForm, type ApplicationData } from "@/components/services/ApplicationForm";
import { ServiceCatalogView } from "@/components/services/ServiceCatalogView";
import { SERVICE_CATALOG } from "@/lib/service-catalog";
import {
  Wallet, FileText, LayoutList, BookOpen, Clock, CheckCircle, XCircle,
  Plus, Shield,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/services")({
  ssr: false,
  component: RetailerServices,
});

interface AppRecord {
  id: string;
  applicationNo: string;
  serviceType: string;
  fullName: string;
  status: "Pending" | "Approved" | "Rejected";
  staffRemark?: string;
  govApplicationNo?: string;
  createdAt: string;
  fee: number;
}

function RetailerServices() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [applications, setApplications] = useState<AppRecord[]>([]);
  const [view, setView] = useState<"dashboard" | "apply">("dashboard");

  useEffect(() => {
    if (!appUser?.uid) return;
    const unsub1 = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });
    const unsub2 = onSnapshot(
      query(collection(db, "serviceApplications"), where("userId", "==", appUser.uid)),
      (snap) => {
        const list: AppRecord[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as AppRecord));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setApplications(list);
      },
      (error) => {
        console.error("Failed to load service applications:", error);
        toast.error("Unable to load applications right now. Please refresh and try again.");
        setApplications([]);
      }
    );
    return () => { unsub1(); unsub2(); };
  }, [appUser?.uid]);

  const handleSubmit = async (data: ApplicationData) => {
    if (!appUser) throw new Error("Please login to submit applications.");
    try {
      const svc = SERVICE_CATALOG.find((s) => s.name === data.serviceType);
      let fee = svc?.fee || 0;

      // Check if admin has set a custom fee in Firebase
      try {
        const feeDoc = await getDoc(doc(db, "edisServiceFees", data.serviceType));
        if (feeDoc.exists()) fee = feeDoc.data().fee as number;
      } catch {}

      if (fee > 0) {
        await atomicDebit(appUser.uid, fee, {
          source: "service",
          description: `Service Application: ${data.serviceType}`,
        });
      }

      const appNo = `EIS-${Date.now().toString(36).toUpperCase()}`;

      // Upload documents in parallel
      const docsToUpload = data.documents.filter((d) => d.file);
      const uploadedDocs = await Promise.all(
        docsToUpload.map(async (docItem) => {
          const storagePath = `serviceDocuments/${appUser.uid}/${appNo}/${docItem.name}_${docItem.file!.name}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, docItem.file!);
          const url = await getDownloadURL(storageRef);
          return { name: docItem.name, url, fileName: docItem.file!.name };
        })
      );

      await addDoc(collection(db, "serviceApplications"), {
        userId: appUser.uid,
        userEmail: appUser.email,
        userName: data.fullName,
        applicationNo: appNo,
        serviceType: data.serviceType,
        fullName: data.fullName,
        dob: data.dob,
        gender: data.gender,
        mobile: data.mobile,
        email: data.email,
        aadhaar: data.aadhaar,
        address: data.address,
        district: data.district,
        purpose: data.purpose,
        fee,
        status: "Pending",
        declared: data.declared,
        signature: data.signature,
        uploadedDocuments: uploadedDocs,
        createdAt: new Date().toISOString(),
      });

      toast.success(`Application ${appNo} submitted successfully!`);
      setView("dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Submission failed. Please try again.");
      throw err;
    }
  };

  const statusIcon = (s: string) => {
    if (s === "Approved") return <CheckCircle className="w-3.5 h-3.5 text-gov-green" />;
    if (s === "Rejected") return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    return <Clock className="w-3.5 h-3.5 text-gov-gold" />;
  };

  const statusVariant = (s: string): "default" | "secondary" | "destructive" => {
    if (s === "Approved") return "default";
    if (s === "Rejected") return "destructive";
    return "secondary";
  };

  const pending = applications.filter((a) => a.status === "Pending").length;
  const approved = applications.filter((a) => a.status === "Approved").length;
  const rejected = applications.filter((a) => a.status === "Rejected").length;

  if (view === "apply") {
    return (
      <div className="max-w-4xl mx-auto">
        <ApplicationForm balance={balance} onSubmit={handleSubmit} onBack={() => setView("dashboard")} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gov-blue text-white p-4 rounded-lg border-b-4 border-gov-saffron">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <h1 className="text-lg font-bold tracking-wide">E-GOVERNANCE SERVICES PORTAL</h1>
              <p className="text-xs opacity-80">EI Solutions — Digital India Services</p>
            </div>
          </div>
          <Button onClick={() => setView("apply")} className="bg-white text-gov-blue hover:bg-white/90">
            <Plus className="w-4 h-4 mr-1" /> New Application
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-gov-blue">
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-gov-blue" />
            <div>
              <p className="text-xs text-muted-foreground">Wallet Balance</p>
              <p className="text-xl font-bold text-gov-blue">₹{balance.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gov-gold">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-gov-gold" />
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold">{pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gov-green">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-gov-green" />
            <div>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-xl font-bold">{approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Rejected</p>
              <p className="text-xl font-bold">{rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications" className="text-xs gap-1"><LayoutList className="w-3.5 h-3.5" /> My Applications</TabsTrigger>
          <TabsTrigger value="catalog" className="text-xs gap-1"><BookOpen className="w-3.5 h-3.5" /> Service Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Recent Applications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {applications.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No applications yet. Click "New Application" to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-bold">Application No</TableHead>
                        <TableHead className="text-xs font-bold">Service</TableHead>
                        <TableHead className="text-xs font-bold">Date</TableHead>
                        <TableHead className="text-xs font-bold">Fee</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-xs font-bold">Govt App No</TableHead>
                        <TableHead className="text-xs font-bold">Staff Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs font-mono font-medium">{a.applicationNo}</TableCell>
                          <TableCell className="text-xs">{a.serviceType}</TableCell>
                          <TableCell className="text-xs">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs">₹{a.fee}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(a.status)} className="text-[10px] gap-1">
                              {statusIcon(a.status)} {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-gov-blue">{a.govApplicationNo || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{a.staffRemark || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog">
          <ServiceCatalogView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

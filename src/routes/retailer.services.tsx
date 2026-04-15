import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { FileText, Files, IndianRupee, Plus, ShieldCheck, TimerReset } from "lucide-react";
import { toast } from "sonner";
import { ApplicationStatusBadge } from "@/components/services/ApplicationStatusBadge";
import { ApplicationForm, type ApplicationData } from "@/components/services/ApplicationForm";
import { ServiceCatalogView } from "@/components/services/ServiceCatalogView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import {
  formatApplicationDate,
  getDocumentStatusLabel,
  mapServiceApplication,
  ServiceApplicationRecord,
} from "@/lib/e-district";
import { db } from "@/lib/firebase";
import { atomicCredit, atomicDebit } from "@/lib/firebase-transactions";
import { SERVICE_CATALOG } from "@/lib/service-catalog";
import { uploadServiceDocuments } from "@/lib/service-document-upload";

export const Route = createFileRoute("/retailer/services")({
  ssr: false,
  component: RetailerServices,
});

function RetailerServices() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [applications, setApplications] = useState<ServiceApplicationRecord[]>([]);
  const [serviceFees, setServiceFees] = useState<Record<string, number>>({});
  const [view, setView] = useState<"dashboard" | "apply">("dashboard");

  useEffect(() => {
    if (!appUser?.uid) return;

    const unsubscribeWallet = onSnapshot(doc(db, "wallets", appUser.uid), (snapshot) => {
      if (snapshot.exists()) setBalance(snapshot.data().balance || 0);
    });

    const unsubscribeApplications = onSnapshot(
      query(collection(db, "serviceApplications"), where("userId", "==", appUser.uid)),
      (snapshot) => {
        const nextApplications = snapshot.docs
          .map((document) => mapServiceApplication(document.id, document.data() as Partial<ServiceApplicationRecord>))
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

        setApplications(nextApplications);
      },
      (error) => {
        console.error("Failed to load service applications:", error);
        toast.error("Unable to load applications. Please refresh.");
        setApplications([]);
      },
    );

    const unsubscribeFees = onSnapshot(
      collection(db, "edisServiceFees"),
      (snapshot) => {
        const nextFees: Record<string, number> = {};
        snapshot.forEach((feeDocument) => {
          const fee = feeDocument.data().fee;
          if (typeof fee === "number") nextFees[feeDocument.id] = fee;
        });

        setServiceFees(nextFees);
      },
      () => setServiceFees({}),
    );

    return () => {
      unsubscribeWallet();
      unsubscribeApplications();
      unsubscribeFees();
    };
  }, [appUser?.uid]);

  const handleSubmit = async (data: ApplicationData) => {
    if (!appUser) throw new Error("Please login to submit applications.");

    const appNo = `EIS-${Date.now().toString(36).toUpperCase()}`;
    let debited = false;
    let applicationSaved = false;
    const serviceInfo = SERVICE_CATALOG.find((service) => service.name === data.serviceType);
    const fee = serviceFees[data.serviceType] ?? serviceInfo?.fee ?? 0;
    const docsToUpload = data.documents.filter((document) => document.file);

    try {
      if (fee > 0) {
        await atomicDebit(appUser.uid, fee, {
          source: "service",
          applicationNo: appNo,
          description: `Service Application: ${data.serviceType}`,
        });
        debited = true;
      }

      const applicationRef = await addDoc(collection(db, "serviceApplications"), {
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
        uploadedDocuments: [],
        documentUploadStatus: docsToUpload.length > 0 ? "pending" : "no_documents",
        createdAt: new Date().toISOString(),
      });
      applicationSaved = true;

      if (docsToUpload.length > 0) {
        toast.info(`Uploading ${docsToUpload.length} document(s). Please wait on this page until upload completes.`);

        try {
          const uploadedDocs = await uploadServiceDocuments({ appNo, documents: data.documents, userId: appUser.uid });

          await updateDoc(doc(db, "serviceApplications", applicationRef.id), {
            uploadedDocuments: uploadedDocs,
            documentUploadStatus: "completed",
          });

          toast.success(`Application ${appNo} submitted with ${uploadedDocs.length} document(s)!`);
        } catch (uploadErr) {
          console.error("[E-dis] Document upload failed after application save:", uploadErr);

          await updateDoc(doc(db, "serviceApplications", applicationRef.id), {
            documentUploadStatus: "failed",
          }).catch(() => {});

          toast.error(`Application ${appNo} was saved, but document upload failed. Do not submit again; contact staff with this application number.`);
          setView("dashboard");
          return;
        }
      } else {
        toast.success(`Application ${appNo} submitted successfully!`);
      }

      setView("dashboard");
    } catch (err: any) {
      console.error("[E-dis] Submit FAILED:", err?.message, err);
      if (!applicationSaved && debited && fee > 0) {
        try {
          await atomicCredit(appUser.uid, fee, {
            source: "service_refund",
            applicationNo: appNo,
            description: `Refund for failed application: ${data.serviceType}`,
          });
          toast.error((err?.message || "Submission failed.") + " Wallet refunded.");
        } catch {
          toast.error("Submission failed after wallet debit. Contact support.");
        }
      } else if (applicationSaved) {
        toast.error(err?.message || "Application was saved, but document processing did not complete.");
      } else {
        toast.error(err?.message || "Submission failed. Please try again.");
      }
      throw err;
    }
  };

  const counts = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((application) => application.status === "Pending").length,
      approved: applications.filter((application) => application.status === "Approved").length,
      rejected: applications.filter((application) => application.status === "Rejected").length,
    }),
    [applications],
  );

  if (view === "apply") {
    return (
      <div className="max-w-4xl mx-auto">
        <ApplicationForm
          balance={balance}
          feeOverrides={serviceFees}
          onSubmit={handleSubmit}
          onBack={() => setView("dashboard")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full border bg-background p-3">
              <ShieldCheck className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Retailer e-District applications</h1>
              <p className="text-sm text-muted-foreground">
                Submit applications, upload required documents, and track staff updates in real time.
              </p>
            </div>
          </div>

          <Button onClick={() => setView("apply")}>
            <Plus className="mr-1.5 h-4 w-4" />
            New application
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Wallet balance" value={`₹${balance.toFixed(2)}`} icon={IndianRupee} />
        <MetricCard label="Total applications" value={String(counts.total)} icon={Files} />
        <MetricCard label="Pending" value={String(counts.pending)} icon={TimerReset} />
        <MetricCard label="Approved" value={String(counts.approved)} icon={ShieldCheck} />
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications">My applications</TabsTrigger>
          <TabsTrigger value="catalog">Service catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submitted applications</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {applications.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application No</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead>Govt App No</TableHead>
                        <TableHead>Remark / reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{application.applicationNo}</p>
                              <p className="text-xs text-muted-foreground">₹{application.fee.toFixed(2)}</p>
                            </div>
                          </TableCell>
                          <TableCell>{application.serviceType}</TableCell>
                          <TableCell>{formatApplicationDate(application.createdAt)}</TableCell>
                          <TableCell>
                            <ApplicationStatusBadge status={application.status} />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {application.uploadedDocuments.length} file(s)
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getDocumentStatusLabel(application.documentUploadStatus)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{application.govApplicationNo || "—"}</TableCell>
                          <TableCell>
                            <span className="text-sm text-foreground">
                              {application.rejectionReason || application.staffRemark || "—"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No applications yet. Create your first e-District application.
                  </p>
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

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof IndianRupee;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className="rounded-full border bg-background p-3">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

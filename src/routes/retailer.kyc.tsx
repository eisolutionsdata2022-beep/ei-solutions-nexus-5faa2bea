import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Upload, Download, Award } from "lucide-react";
import { downloadCertificate } from "@/lib/franchise-certificate";

export const Route = createFileRoute("/retailer/kyc")({
  ssr: false,
  component: RetailerKYC,
});

function RetailerKYC() {
  const { appUser } = useAuth();
  const [form, setForm] = useState({
    name: appUser?.name || "",
    phone: appUser?.phone || "",
    aadhaar: "",
    pan: "",
    shopName: "",
    address: "",
  });
  const [files, setFiles] = useState<Record<string, File | null>>({
    aadhaarFront: null,
    aadhaarBack: null,
    panCard: null,
    photo: null,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    setLoading(true);

    try {
      const uploadedUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(files)) {
        if (file) {
          const storageRef = ref(storage, `kyc/${appUser.uid}/${key}`);
          await uploadBytes(storageRef, file);
          uploadedUrls[key] = await getDownloadURL(storageRef);
        }
      }

      await updateDoc(doc(db, "users", appUser.uid), {
        ...form,
        kycDocuments: uploadedUrls,
        kycStatus: "pending",
      });
      setSuccess(true);
    } catch (err) {
      console.error("KYC submission error:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = {
    pending: <Clock className="w-5 h-5 text-warning" />,
    approved: <CheckCircle className="w-5 h-5 text-success" />,
    rejected: <XCircle className="w-5 h-5 text-destructive" />,
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">KYC Verification</h1>
          <p className="text-muted-foreground">Submit your documents for verification.</p>
        </div>
        <Badge variant={
          appUser?.kycStatus === "approved" ? "default" :
          appUser?.kycStatus === "rejected" ? "destructive" : "secondary"
        } className="capitalize gap-1">
          {statusIcon[appUser?.kycStatus || "pending"]}
          {appUser?.kycStatus || "pending"}
        </Badge>
      </div>

      {appUser?.kycStatus === "approved" && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Award className="w-10 h-10 text-green-600" />
                <div>
                  <p className="font-bold text-foreground text-lg">🎉 KYC Approved!</p>
                  <p className="text-sm text-muted-foreground">Your Franchise Certificate is ready to download.</p>
                </div>
              </div>
              <Button
                size="lg"
                className="gap-2"
                onClick={() => {
                  const uid = appUser.uid || "";
                  const idSuffix = uid.substring(0, 8).toUpperCase();
                  downloadCertificate({
                    name: appUser.name || "Retailer",
                    franchiseeId: `#CSC${new Date().getFullYear()}${idSuffix}`,
                    centerName: (appUser as any).shopName || "Training Center",
                    agreementDate: new Date().toLocaleDateString("en-IN", {
                      year: "numeric", month: "long", day: "numeric",
                    }),
                  });
                }}
              >
                <Download className="w-5 h-5" />
                Download Certificate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <p className="font-semibold text-foreground">KYC Submitted Successfully!</p>
            <p className="text-muted-foreground text-sm mt-1">Your documents are under review.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>KYC Application</CardTitle>
            <CardDescription>Fill in your details and upload required documents.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Aadhaar Number</Label>
                  <Input value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>PAN Number</Label>
                  <Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Shop Name</Label>
                  <Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <p className="font-semibold text-foreground mb-3">Upload Documents</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: "aadhaarFront", label: "Aadhaar Front" },
                    { key: "aadhaarBack", label: "Aadhaar Back" },
                    { key: "panCard", label: "PAN Card" },
                    { key: "photo", label: "Photo" },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setFiles({ ...files, [key]: e.target.files?.[0] || null })}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit KYC"}
                {!loading && <Upload className="w-4 h-4 ml-2" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

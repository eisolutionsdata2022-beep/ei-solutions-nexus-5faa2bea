import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Search, Eye, Download, FileText, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/kyc")({
  ssr: false,
  component: AdminKYC,
});

const DOC_LABELS: Record<string, string> = {
  aadhaarFront: "Aadhaar Front",
  aadhaarBack: "Aadhaar Back",
  panCard: "PAN Card",
  photo: "Photo",
};

function AdminKYC() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<any | null>(null);

  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    const list: any[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    setUsers(list.filter((u) => u.role === "retailer"));
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateKYC = async (uid: string, status: "approved" | "rejected") => {
    await updateDoc(doc(db, "users", uid), { kycStatus: status });
    fetchUsers();
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const statusRank = (s?: string) => {
    const v = (s || "pending").toLowerCase();
    if (v === "pending" || v === "" || v === "submitted") return 0;
    if (v === "rejected") return 1;
    return 2; // approved
  };

  const filtered = users
    .filter((u) => (u.name || u.email).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const r = statusRank(a.kycStatus) - statusRank(b.kycStatus);
      if (r !== 0) return r;
      // Newest submissions first within the same status bucket
      const at = a.kycSubmittedAt || a.updatedAt || a.createdAt || "";
      const bt = b.kycSubmittedAt || b.updatedAt || b.createdAt || "";
      return String(bt).localeCompare(String(at));
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">KYC Requests</h1>
        <p className="text-muted-foreground">Review and approve retailer KYC submissions.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No KYC requests found.</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((u) => {
            const docs = (u.kycDocuments || {}) as Record<string, string>;
            const docCount = Object.values(docs).filter(Boolean).length;
            return (
              <Card key={u.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{u.name || "Unnamed"}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                      {u.phone && <p className="text-sm text-muted-foreground">📞 {u.phone}</p>}
                      {u.shopName && <p className="text-sm text-muted-foreground">🏪 {u.shopName}</p>}
                      {u.aadhaar && <p className="text-sm text-muted-foreground">Aadhaar: {u.aadhaar}</p>}
                      {u.pan && <p className="text-sm text-muted-foreground">PAN: {u.pan}</p>}
                      {docCount > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <FileText className="w-3 h-3" /> {docCount} document{docCount > 1 ? "s" : ""} uploaded
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={
                        u.kycStatus === "approved" ? "default" :
                        u.kycStatus === "rejected" ? "destructive" : "secondary"
                      } className="capitalize">
                        {u.kycStatus || "pending"}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => setViewing(u)} disabled={docCount === 0}>
                        <Eye className="w-4 h-4 mr-1" /> View Docs
                      </Button>
                      {u.kycStatus !== "approved" && (
                        <Button size="sm" onClick={() => updateKYC(u.id, "approved")}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve
                        </Button>
                      )}
                      {u.kycStatus !== "rejected" && (
                        <Button size="sm" variant="destructive" onClick={() => updateKYC(u.id, "rejected")}>
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KYC Documents — {viewing?.name || viewing?.email}</DialogTitle>
            <DialogDescription>View or download submitted documents.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries((viewing.kycDocuments || {}) as Record<string, string>).map(([key, url]) => {
                if (!url) return null;
                const label = DOC_LABELS[key] || key;
                const ext = (url.split("?")[0].split(".").pop() || "jpg").toLowerCase();
                const filename = `${(viewing.name || viewing.email || "kyc").replace(/\s+/g, "_")}_${key}.${ext}`;
                return (
                  <div key={key} className="border border-border rounded-lg overflow-hidden bg-muted/30">
                    <div className="aspect-square bg-background flex items-center justify-center overflow-hidden">
                      <img src={url} alt={label} className="w-full h-full object-contain" />
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="font-medium text-sm text-foreground">{label}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 mr-1" /> View
                          </a>
                        </Button>
                        <Button size="sm" className="flex-1" onClick={() => downloadFile(url, filename)}>
                          <Download className="w-3 h-3 mr-1" /> Download
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

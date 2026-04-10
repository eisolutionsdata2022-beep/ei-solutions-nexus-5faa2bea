import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Search } from "lucide-react";

export const Route = createFileRoute("/admin/kyc")({
  component: AdminKYC,
});

function AdminKYC() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

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

  const filtered = users.filter((u) =>
    (u.name || u.email).toLowerCase().includes(search.toLowerCase())
  );

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
          {filtered.map((u) => (
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
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      u.kycStatus === "approved" ? "default" :
                      u.kycStatus === "rejected" ? "destructive" : "secondary"
                    } className="capitalize">
                      {u.kycStatus || "pending"}
                    </Badge>
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
          ))}
        </div>
      )}
    </div>
  );
}

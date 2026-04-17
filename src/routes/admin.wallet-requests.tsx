import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, doc, updateDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { atomicCredit } from "@/lib/firebase-transactions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, Search, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/wallet-requests")({
  ssr: false,
  component: AdminWalletRequests,
});

interface WalletRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  upiId?: string;
  status: string;
  remarks?: string;
  createdAt: string;
}

function AdminWalletRequests() {
  const [requests, setRequests] = useState<WalletRequest[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "walletRequests"), orderBy("createdAt", "desc")),
      (snap) => {
        const list: WalletRequest[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as WalletRequest));
        setRequests(list);
      }
    );
    return unsub;
  }, []);

  const handleAction = async (req: WalletRequest, action: "approved" | "rejected") => {
    setProcessing(req.id);
    try {
      await updateDoc(doc(db, "walletRequests", req.id), {
        status: action,
        remarks: remarks[req.id] || "",
        processedAt: new Date().toISOString(),
      });

      if (action === "approved") {
        await atomicCredit(req.userId, req.amount, {
          source: "wallet_topup",
          description: `Wallet top-up approved (${req.paymentMethod})`,
        });
      }
      toast.success(`Request ${action}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to process request");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wallet Requests</h1>
        <p className="text-muted-foreground">Approve or reject retailer wallet top-up requests.</p>
      </div>

      {/* Search & filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Transaction ID, UPI ID, email, or amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)}
                className="capitalize"
              >
                {s} {s !== "all" && `(${requests.filter((r) => r.status === s).length})`}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {(() => {
        const q = search.trim().toLowerCase();
        const filtered = requests.filter((r) => {
          if (statusFilter !== "all" && r.status !== statusFilter) return false;
          if (!q) return true;
          return (
            (r.transactionId || "").toLowerCase().includes(q) ||
            (r.upiId || "").toLowerCase().includes(q) ||
            (r.userEmail || "").toLowerCase().includes(q) ||
            String(r.amount).includes(q) ||
            (r.paymentMethod || "").toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q)
          );
        });
        return filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {requests.length === 0 ? "No wallet requests yet." : "No requests match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{req.userEmail}</p>
                    <p className="text-2xl font-bold text-primary">₹{req.amount}</p>
                    <p className="text-sm text-muted-foreground">Method: {req.paymentMethod}</p>
                    {req.transactionId && <p className="text-sm text-muted-foreground">Txn ID: <span className="font-mono font-semibold text-foreground">{req.transactionId}</span></p>}
                    {req.upiId && <p className="text-sm text-muted-foreground">UPI ID: <span className="font-mono font-semibold text-foreground">{req.upiId}</span></p>}
                    <p className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <Badge variant={
                      req.status === "approved" ? "default" :
                      req.status === "rejected" ? "destructive" : "secondary"
                    } className="capitalize w-fit">
                      {req.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                      {req.status === "approved" && <CheckCircle className="w-3 h-3 mr-1" />}
                      {req.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                      {req.status}
                    </Badge>
                    {req.status === "pending" && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Remarks</Label>
                          <Input
                            placeholder="Optional remarks..."
                            value={remarks[req.id] || ""}
                            onChange={(e) => setRemarks({ ...remarks, [req.id]: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAction(req, "approved")} disabled={processing === req.id}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleAction(req, "rejected")} disabled={processing === req.id}>
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </>
                    )}
                    {req.remarks && <p className="text-xs text-muted-foreground">Remarks: {req.remarks}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        );
      })()}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/wallet-requests")({
  component: AdminWalletRequests,
});

interface WalletRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  paymentMethod: string;
  screenshotUrl: string;
  status: string;
  remarks?: string;
  createdAt: string;
}

function AdminWalletRequests() {
  const [requests, setRequests] = useState<WalletRequest[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = async () => {
    const snap = await getDocs(query(collection(db, "walletRequests"), orderBy("createdAt", "desc")));
    const list: WalletRequest[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as WalletRequest));
    setRequests(list);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (req: WalletRequest, action: "approved" | "rejected") => {
    setProcessing(req.id);
    try {
      await updateDoc(doc(db, "walletRequests", req.id), {
        status: action,
        remarks: remarks[req.id] || "",
        processedAt: new Date().toISOString(),
      });

      if (action === "approved") {
        const walletRef = doc(db, "wallets", req.userId);
        const walletSnap = await getDoc(walletRef);
        const currentBalance = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0;
        await updateDoc(walletRef, { balance: currentBalance + req.amount });

        await addDoc(collection(db, "transactions"), {
          userId: req.userId,
          amount: req.amount,
          type: "credit",
          source: "wallet_topup",
          description: `Wallet top-up approved (${req.paymentMethod})`,
          createdAt: new Date().toISOString(),
        });
      }
      fetchRequests();
    } finally {
      setProcessing(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "secondary",
    approved: "default",
    rejected: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wallet Requests</h1>
        <p className="text-muted-foreground">Approve or reject retailer wallet top-up requests.</p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No wallet requests yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{req.userEmail}</p>
                    <p className="text-2xl font-bold text-primary">₹{req.amount}</p>
                    <p className="text-sm text-muted-foreground">Method: {req.paymentMethod}</p>
                    <p className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleString()}</p>
                    {req.screenshotUrl && (
                      <a href={req.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> View Screenshot
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <Badge variant={statusColors[req.status] as any} className="capitalize w-fit">
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
      )}
    </div>
  );
}

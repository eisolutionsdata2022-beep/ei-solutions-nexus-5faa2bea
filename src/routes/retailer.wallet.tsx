import { createFileRoute } from "@tanstack/react-router";
import paytmQr from "@/assets/paytm-qr.jpeg";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { doc, onSnapshot, collection, query, where, orderBy, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/wallet")({
  ssr: false,
  component: RetailerWallet,
});

interface Transaction {
  id: string;
  amount: number;
  type: string;
  source: string;
  description?: string;
  createdAt: string;
}

interface WalletRequest {
  id: string;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

function RetailerWallet() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletRequests, setWalletRequests] = useState<WalletRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!appUser) return;
    const unsub1 = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });

    const unsub2 = onSnapshot(
      query(collection(db, "transactions"), where("userId", "==", appUser.uid), orderBy("createdAt", "desc")),
      (snap) => {
        const list: Transaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Transaction));
        setTransactions(list);
      }
    );

    const unsub3 = onSnapshot(
      query(collection(db, "walletRequests"), where("userId", "==", appUser.uid), orderBy("createdAt", "desc")),
      (snap) => {
        const list: WalletRequest[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as WalletRequest));
        setWalletRequests(list);
      }
    );

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [appUser]);

  const submitRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      let screenshotUrl = "";
      if (screenshot) {
        const storageRef = ref(storage, `wallet-screenshots/${appUser.uid}/${Date.now()}`);
        await uploadBytes(storageRef, screenshot);
        screenshotUrl = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, "walletRequests"), {
        userId: appUser.uid,
        userEmail: appUser.email,
        amount: parseFloat(amount),
        paymentMethod,
        screenshotUrl,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      toast.success("Wallet request submitted!");
      setOpen(false);
      setAmount("");
      setScreenshot(null);
    } catch {
      toast.error("Failed to submit request.");
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Wallet</h1>
          <p className="text-muted-foreground">Manage your balance and view transactions.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Money</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Money Request</DialogTitle></DialogHeader>
            <form onSubmit={submitRequest} className="space-y-4">
              {/* QR Code for Payment */}
              <div className="flex flex-col items-center gap-2 p-3 bg-muted rounded-lg border">
                <img src={paytmQr} alt="Paytm UPI QR Code" className="w-48 h-48 object-contain rounded" />
                <p className="text-xs text-muted-foreground font-medium">Scan to pay via UPI</p>
                <p className="text-xs text-muted-foreground">UPI ID: paytmqr5hnp9y@ptys</p>
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Screenshot</Label>
                <Input type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balance Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-8 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-4xl font-bold text-foreground mt-1">₹{balance.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Requests */}
      {walletRequests.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Top-up Requests</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {walletRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">₹{r.amount}</p>
                    <p className="text-xs text-muted-foreground">{r.paymentMethod} · {new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="capitalize gap-1">
                    {r.status === "pending" && <Clock className="w-3 h-3" />}
                    {r.status === "approved" && <CheckCircle className="w-3 h-3" />}
                    {r.status === "rejected" && <XCircle className="w-3 h-3" />}
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Transaction History</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    {tx.type === "credit" ? (
                      <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                        <ArrowDownLeft className="w-4 h-4 text-success" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4 text-destructive" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.description || tx.source}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                    {tx.type === "credit" ? "+" : "-"}₹{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

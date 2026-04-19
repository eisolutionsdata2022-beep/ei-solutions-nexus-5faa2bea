import { createFileRoute } from "@tanstack/react-router";
import paytmQr from "@/assets/paytm-qr.jpeg";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { doc, onSnapshot, collection, query, where, orderBy, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
  const [transactionId, setTransactionId] = useState("");
  const [upiId, setUpiId] = useState("");
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
      await addDoc(collection(db, "walletRequests"), {
        userId: appUser.uid,
        userEmail: appUser.email,
        amount: parseFloat(amount),
        paymentMethod,
        transactionId,
        upiId,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      toast.success("Wallet request submitted!");
      setOpen(false);
      setAmount("");
      setTransactionId("");
      setUpiId("");
    } catch {
      toast.error("Failed to submit request.");
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const credits = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const debits = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Premium hero balance card */}
      <div className="relative overflow-hidden rounded-2xl bg-premium-gradient p-6 sm:p-8 text-white shadow-premium">
        <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-white/15 blur-3xl animate-blob" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl animate-blob [animation-delay:-7s]" aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center shadow-md">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/80 font-semibold">Available Balance</p>
              <p className="text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums">
                ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-white/75">Live wallet · updates instantly</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-foreground hover:bg-white/90 font-bold shadow-md h-11 px-6">
                <Plus className="w-4 h-4 mr-2" /> Add Money
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Money Request</DialogTitle></DialogHeader>
              <form onSubmit={submitRequest} className="space-y-4">
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
                  <Label>Transaction ID</Label>
                  <Input placeholder="Enter transaction/UTR ID" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>UPI ID</Label>
                  <Input placeholder="e.g. name@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-premium-gradient text-white font-bold border-0" disabled={submitting}>
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

        {/* Mini stats row */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-xl bg-white/15 backdrop-blur-md ring-1 ring-white/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/75 font-semibold">Total Credits</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">+ ₹{credits.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur-md ring-1 ring-white/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/75 font-semibold">Total Debits</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">− ₹{debits.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* Wallet Requests */}
      {walletRequests.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="border-b border-border/60 bg-background/40 px-5 py-3.5 flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-premium-gradient" aria-hidden />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Top-up Requests</h2>
          </div>
          <div className="p-4 space-y-2">
            {walletRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                <div>
                  <p className="font-bold text-foreground tabular-nums">₹{r.amount.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground">{r.paymentMethod} · {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge
                  variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}
                  className="capitalize gap-1 rounded-full"
                >
                  {r.status === "pending" && <Clock className="w-3 h-3" />}
                  {r.status === "approved" && <CheckCircle className="w-3 h-3" />}
                  {r.status === "rejected" && <XCircle className="w-3 h-3" />}
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="border-b border-border/60 bg-background/40 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-premium-gradient" aria-hidden />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Transaction History</h2>
          </div>
          <span className="text-xs text-muted-foreground">{transactions.length} record{transactions.length === 1 ? "" : "s"}</span>
        </div>
        <div className="p-4">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    {tx.type === "credit" ? (
                      <div className="w-9 h-9 rounded-xl bg-success/10 text-success flex items-center justify-center">
                        <ArrowDownLeft className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tx.description || tx.source}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`font-bold tabular-nums ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                    {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { atomicCredit, atomicDebit } from "@/lib/firebase-transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/wallets")({
  component: AdminWallets,
});

interface UserWallet {
  userId: string;
  email: string;
  name: string;
  role: string;
  balance: number;
}

function AdminWallets() {
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [selected, setSelected] = useState<UserWallet | null>(null);
  const [amount, setAmount] = useState("");
  const [txType, setTxType] = useState("credit");
  const [processing, setProcessing] = useState(false);

  const fetchWallets = async () => {
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const list: UserWallet[] = [];
      const promises = usersSnap.docs.map(async (userDoc) => {
        const u = userDoc.data();
        return new Promise<UserWallet>((resolve) => {
          const unsub = onSnapshot(doc(db, "wallets", userDoc.id), (snap) => {
            unsub(); // one-time read via onSnapshot
            resolve({
              userId: userDoc.id,
              email: u.email || "",
              name: u.name || "",
              role: u.role || "",
              balance: snap.exists() ? (snap.data().balance || 0) : 0,
            });
          });
        });
      });
      const results = await Promise.all(promises);
      setWallets(results);
    } catch (err) {
      console.error("Error fetching wallets:", err);
    }
  };

  useEffect(() => { fetchWallets(); }, []);

  const handleTransaction = async () => {
    if (!selected) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid positive amount.");
      return;
    }
    setProcessing(true);
    try {
      if (txType === "credit") {
        await atomicCredit(selected.userId, amt, {
          source: "admin_manual",
          description: "Admin credit adjustment",
        });
      } else {
        await atomicDebit(selected.userId, amt, {
          source: "admin_manual",
          description: "Admin debit adjustment",
        });
      }
      toast.success(`₹${amt} ${txType}ed to ${selected.email}`);
      setSelected(null);
      setAmount("");
      fetchWallets();
    } catch (err: any) {
      toast.error(err?.message || "Transaction failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Wallets</h1>
        <p className="text-muted-foreground">View and manage all user wallet balances.</p>
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Wallet: {selected?.email}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Current balance: <span className="font-bold text-foreground">₹{selected?.balance.toFixed(2)}</span></p>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={txType} onValueChange={setTxType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit (Add)</SelectItem>
                  <SelectItem value="debit">Debit (Deduct)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" />
            </div>
            <Button className="w-full" onClick={handleTransaction} disabled={processing}>
              {processing ? "Processing..." : "Apply"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.map((w) => (
          <Card key={w.userId} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(w)}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {w.name?.[0] || w.email[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{w.name || w.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{w.role}</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-primary">₹{w.balance.toFixed(2)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

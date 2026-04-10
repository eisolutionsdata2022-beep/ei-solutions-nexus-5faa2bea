import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { doc, onSnapshot, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/money-transfer")({
  component: MoneyTransfer,
});

function MoneyTransfer() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [form, setForm] = useState({ accountNumber: "", confirmAccount: "", ifsc: "", name: "", amount: "" });
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });
    return unsub;
  }, [appUser]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    if (form.accountNumber !== form.confirmAccount) {
      toast.error("Account numbers do not match!");
      return;
    }
    const amount = parseFloat(form.amount);
    if (amount <= 0) { toast.error("Invalid amount."); return; }
    if (balance < amount) { toast.error("Insufficient balance!"); return; }

    setProcessing(true);
    try {
      const walletRef = doc(db, "wallets", appUser.uid);
      const walletSnap = await getDoc(walletRef);
      const currentBalance = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0;
      await updateDoc(walletRef, { balance: currentBalance - amount });

      await addDoc(collection(db, "transactions"), {
        userId: appUser.uid,
        amount,
        type: "debit",
        source: "money_transfer",
        description: `Transfer to A/C ${form.accountNumber} (${form.name})`,
        metadata: { accountNumber: form.accountNumber, ifsc: form.ifsc, beneficiaryName: form.name },
        createdAt: new Date().toISOString(),
      });

      setSuccess(true);
      toast.success("Money transfer successful!");
    } catch {
      toast.error("Transfer failed.");
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Transfer Successful!</h2>
            <p className="text-muted-foreground mb-1">₹{form.amount} sent to {form.name}</p>
            <p className="text-sm text-muted-foreground">A/C: {form.accountNumber} | IFSC: {form.ifsc}</p>
            <Button className="mt-6" onClick={() => { setSuccess(false); setForm({ accountNumber: "", confirmAccount: "", ifsc: "", name: "", amount: "" }); }}>
              New Transfer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Money Transfer</h1>
        <p className="text-muted-foreground">Send money directly from your wallet. Balance: <span className="font-semibold text-primary">₹{balance.toFixed(2)}</span></p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
          <CardDescription>Enter beneficiary details and amount.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Beneficiary Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Confirm Account Number</Label>
              <Input value={form.confirmAccount} onChange={(e) => setForm({ ...form, confirmAccount: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>IFSC Code</Label>
              <Input value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })} required />
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="1" />
            </div>
            {parseFloat(form.amount) > balance && form.amount && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">Insufficient balance</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={processing}>
              <Send className="w-4 h-4 mr-2" />
              {processing ? "Processing..." : "Transfer Money"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

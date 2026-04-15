import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  SERVICE_CATALOG,
  DEFAULT_COMMISSION_RATES,
  type ServiceType,
  type CommissionRate,
} from "@/lib/commission-config";
import { executeRechargeTransaction } from "@/lib/recharge-transaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/recharge")({
  ssr: false,
  component: RetailerRecharge,
});

function RetailerRecharge() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [mobileNumber, setMobileNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; txId: string } | null>(null);
  const processingRef = useRef(false);

  // Real-time balance
  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });
    return unsub;
  }, [appUser]);

  // Get commission rate for selected operator
  const getRate = async (): Promise<CommissionRate> => {
    if (!selectedType || !selectedOperator) throw new Error("Select service");

    // Try Firestore first, fall back to defaults on any error (e.g. missing index)
    try {
      const q = query(
        collection(db, "commissionRates"),
        where("serviceType", "==", selectedType),
        where("operator", "==", selectedOperator)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as CommissionRate;
      }
    } catch {
      // Firestore composite index may not exist — use defaults
    }

    const def = DEFAULT_COMMISSION_RATES.find(
      (r) => r.serviceType === selectedType && r.operator === selectedOperator
    );
    if (!def) throw new Error("Commission rate not configured for this operator");
    return def as CommissionRate;
  };

  const handleRecharge = async () => {
    if (!appUser || processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    try {
      const rate = await getRate();
      const amt = parseFloat(amount);
      if (!amt || amt < 10) throw new Error("Minimum amount is ₹10");
      if (!mobileNumber || mobileNumber.length < 10) throw new Error("Enter a valid number");

      const res = await executeRechargeTransaction(
        {
          userId: appUser.uid,
          userEmail: appUser.email,
          serviceType: selectedType!,
          operator: selectedOperator!,
          mobileNumber,
          amount: amt,
        },
        rate
      );

      setResult({ success: true, message: res.message, txId: res.transactionId });
      setShowConfirm(false);
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err?.message || "Transaction failed");
      setResult({ success: false, message: err?.message || "Failed", txId: "" });
      setShowConfirm(false);
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  };

  const resetForm = () => {
    setSelectedOperator(null);
    setMobileNumber("");
    setAmount("");
    setResult(null);
  };

  const serviceTypes = Object.entries(SERVICE_CATALOG) as [ServiceType, (typeof SERVICE_CATALOG)[string]][];

  // Result screen
  if (result) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardContent className="p-8 text-center">
            {result.success ? (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            ) : (
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            )}
            <h2 className="text-xl font-bold mb-2">
              {result.success ? "Transaction Successful!" : "Transaction Failed"}
            </h2>
            <p className="text-muted-foreground mb-2">{result.message}</p>
            {result.txId && (
              <p className="text-xs text-muted-foreground">Ref: {result.txId.slice(0, 12)}...</p>
            )}
            <div className="flex gap-2 mt-6 justify-center">
              <Button variant="outline" onClick={resetForm}>
                New Transaction
              </Button>
              <Button onClick={() => { resetForm(); setSelectedType(null); }}>
                Back to Services
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Operator selection + form
  if (selectedType && selectedOperator) {
    const catalog = SERVICE_CATALOG[selectedType];
    const op = catalog.operators.find((o) => o.id === selectedOperator);
    const serviceCharge = DEFAULT_COMMISSION_RATES.find(
      (r) => r.serviceType === selectedType && r.operator === selectedOperator
    )?.serviceCharge || 0;
    const parsedAmount = parseFloat(amount) || 0;
    const totalDebit = parsedAmount + serviceCharge;

    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedOperator(null); setMobileNumber(""); setAmount(""); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Operators
        </Button>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-2xl">{op?.logo}</span>
              {op?.name} {catalog.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "hsl(var(--gov-blue) / 0.05)" }}>
              <Wallet className="w-4 h-4" style={{ color: "hsl(var(--gov-blue))" }} />
              <span className="text-sm">Balance: <strong>₹{balance.toFixed(2)}</strong></span>
            </div>

            <div className="space-y-2">
              <Label>{selectedType === "mobile_recharge" ? "Mobile Number" : "Account / ID Number"}</Label>
              <Input
                placeholder={selectedType === "mobile_recharge" ? "Enter 10-digit mobile number" : "Enter account number"}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                maxLength={12}
              />
            </div>

            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="10"
              />
            </div>

            {parsedAmount > 0 && (
              <div className="text-sm space-y-1 p-3 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span>Recharge Amount</span>
                  <span>₹{parsedAmount.toFixed(2)}</span>
                </div>
                {serviceCharge > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Service Charge</span>
                    <span>₹{serviceCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-1 mt-1">
                  <span>Total Debit</span>
                  <span>₹{totalDebit.toFixed(2)}</span>
                </div>
              </div>
            )}

            {balance < totalDebit && parsedAmount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">Insufficient balance</p>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!mobileNumber || !parsedAmount || parsedAmount < 10 || balance < totalDebit || processing}
              onClick={() => setShowConfirm(true)}
            >
              Proceed to Pay ₹{totalDebit.toFixed(2)}
            </Button>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Transaction</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{op?.name}</span>
                <span className="text-muted-foreground">Number</span>
                <span className="font-medium">{mobileNumber}</span>
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">₹{parsedAmount.toFixed(2)}</span>
                <span className="text-muted-foreground">Service Charge</span>
                <span className="font-medium">₹{serviceCharge.toFixed(2)}</span>
                <span className="text-muted-foreground font-bold">Total Debit</span>
                <span className="font-bold">₹{totalDebit.toFixed(2)}</span>
              </div>
              <Button
                className="w-full"
                onClick={handleRecharge}
                disabled={processing}
              >
                {processing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  `Confirm & Pay ₹${totalDebit.toFixed(2)}`
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Operator list for selected service type
  if (selectedType) {
    const catalog = SERVICE_CATALOG[selectedType];
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedType(null)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Services
        </Button>
        <h2 className="text-xl font-bold">{catalog.icon} {catalog.label}</h2>
        <p className="text-muted-foreground">Select an operator</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {catalog.operators.map((op) => (
            <Card
              key={op.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedOperator(op.id)}
            >
              <CardContent className="p-5 text-center">
                <span className="text-3xl block mb-2">{op.logo}</span>
                <p className="font-semibold text-sm">{op.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Service category selection
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recharge & Bill Payment</h1>
        <p className="text-muted-foreground">
          Select a service to get started. Balance: <span className="font-semibold" style={{ color: "hsl(var(--gov-blue))" }}>₹{balance.toFixed(2)}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {serviceTypes.map(([key, catalog]) => (
          <Card
            key={key}
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => setSelectedType(key)}
          >
            <CardContent className="p-6 text-center">
              <span className="text-4xl block mb-3">{catalog.icon}</span>
              <p className="font-semibold text-sm">{catalog.label}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {catalog.operators.length} operator{catalog.operators.length > 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

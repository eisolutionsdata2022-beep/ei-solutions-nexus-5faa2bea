import { createFileRoute } from "@tanstack/react-router";
import paytmQr from "@/assets/paytm-qr.jpeg";
import { useEffect, useState, useRef, type FormEvent } from "react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FloatingInput } from "@/components/ui/floating-input";

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

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

function RetailerWallet() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletRequests, setWalletRequests] = useState<WalletRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionId, setTransactionId] = useState("");
  const [upiId, setUpiId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    amount?: string;
    transactionId?: string;
    upiId?: string;
  }>({});

  useEffect(() => {
    if (!appUser) return;
    const unsub1 = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });

    const unsub2 = onSnapshot(
      query(
        collection(db, "transactions"),
        where("userId", "==", appUser.uid),
        orderBy("createdAt", "desc"),
      ),
      (snap) => {
        const list: Transaction[] = [];
        snap.forEach((d) =>
          list.push({ id: d.id, ...d.data() } as Transaction),
        );
        setTransactions(list);
        setLoading(false);
      },
    );

    const unsub3 = onSnapshot(
      query(
        collection(db, "walletRequests"),
        where("userId", "==", appUser.uid),
        orderBy("createdAt", "desc"),
      ),
      (snap) => {
        const list: WalletRequest[] = [];
        snap.forEach((d) =>
          list.push({ id: d.id, ...d.data() } as WalletRequest),
        );
        setWalletRequests(list);
      },
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [appUser]);

  const validate = () => {
    const e: typeof errors = {};
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) e.amount = "Enter a valid amount";
    else if (amt < 1) e.amount = "Minimum ₹1";
    else if (amt > 500000) e.amount = "Maximum ₹5,00,000 per request";
    if (!transactionId.trim() || transactionId.trim().length < 6)
      e.transactionId = "Enter the UTR / transaction ID (6+ chars)";
    if (paymentMethod === "UPI" && !upiId.trim())
      e.upiId = "UPI ID is required for UPI payments";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser || submittingRef.current) return;
    if (!validate()) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "walletRequests"), {
        userId: appUser.uid,
        userEmail: appUser.email,
        amount: parseFloat(amount),
        paymentMethod,
        transactionId: transactionId.trim(),
        upiId: upiId.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      toast.success("Wallet top-up request submitted! Awaiting admin approval.");
      setOpen(false);
      setAmount("");
      setTransactionId("");
      setUpiId("");
      setErrors({});
    } catch {
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const credits = transactions
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);
  const debits = transactions
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + t.amount, 0);

  const pendingCount = walletRequests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Premium hero balance card */}
      <div className="relative overflow-hidden rounded-3xl bg-premium-gradient p-6 sm:p-8 text-white shadow-premium">
        <div
          className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-white/15 blur-3xl animate-blob"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl animate-blob [animation-delay:-7s]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center shadow-md">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/80 font-semibold">
                Available Balance
              </p>
              <p className="text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums">
                ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-white/75">
                Live wallet · updates instantly
              </p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-foreground hover:bg-white/90 font-bold shadow-md h-11 px-6">
                <Plus className="w-4 h-4 mr-2" /> Add Money
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" /> Add Money to Wallet
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={submitRequest} className="space-y-4">
                {/* QR Block */}
                <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/60 bg-gradient-to-br from-muted/60 to-muted/20">
                  <img
                    src={paytmQr}
                    alt="Paytm UPI QR Code"
                    className="w-44 h-44 object-contain rounded-xl shadow-sm bg-white p-2"
                  />
                  <p className="text-xs text-muted-foreground font-medium">
                    Scan to pay via any UPI app
                  </p>
                  <p className="text-xs font-mono font-bold text-foreground">
                    paytmqr5hnp9y@ptys
                  </p>
                </div>

                {/* Quick amount chips */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Quick Amount
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setAmount(String(amt));
                          setErrors((p) => ({ ...p, amount: undefined }));
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                          amount === String(amt)
                            ? "bg-premium-gradient text-white border-transparent shadow-md"
                            : "bg-background border-border/70 hover:bg-muted"
                        }`}
                      >
                        ₹{amt.toLocaleString("en-IN")}
                      </button>
                    ))}
                  </div>
                </div>

                <FloatingInput
                  label="Amount (₹)"
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrors((p) => ({ ...p, amount: undefined }));
                  }}
                  error={errors.amount}
                  hint="Minimum ₹1 · Maximum ₹5,00,000 per request"
                  min="1"
                  required
                />

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Payment Method
                  </Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <FloatingInput
                  label="Transaction / UTR ID"
                  value={transactionId}
                  onChange={(e) => {
                    setTransactionId(e.target.value);
                    setErrors((p) => ({ ...p, transactionId: undefined }));
                  }}
                  error={errors.transactionId}
                  hint="The reference number from your payment app"
                  required
                />

                <FloatingInput
                  label={
                    paymentMethod === "UPI" ? "Your UPI ID" : "Sender Name / UPI"
                  }
                  placeholder={
                    paymentMethod === "UPI" ? "e.g. name@upi" : "e.g. John Doe"
                  }
                  value={upiId}
                  onChange={(e) => {
                    setUpiId(e.target.value);
                    setErrors((p) => ({ ...p, upiId: undefined }));
                  }}
                  error={errors.upiId}
                />

                <Button
                  type="submit"
                  className="w-full h-11 bg-premium-gradient text-white font-bold border-0 shadow-premium hover:opacity-95"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" /> Submit Top-up Request
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-center text-muted-foreground">
                  ⚡ Wallet credited within minutes after admin verification.
                </p>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mini stats row */}
        <div className="relative mt-6 grid grid-cols-3 gap-3 sm:max-w-2xl">
          <div className="rounded-xl bg-white/15 backdrop-blur-md ring-1 ring-white/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/75 font-semibold">
              Credits
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">
              + ₹{credits.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur-md ring-1 ring-white/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/75 font-semibold">
              Debits
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">
              − ₹{debits.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur-md ring-1 ring-white/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/75 font-semibold">
              Pending
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Wallet Requests — premium DataTable */}
      <DataTable
        title="Top-up Requests"
        subtitle="Track your add-money requests · Live status"
        searchPlaceholder="Search by amount or method..."
        exportFilename={`wallet-requests-${new Date().toISOString().slice(0, 10)}`}
        pageSize={5}
        emptyMessage="No top-up requests yet. Click 'Add Money' to get started."
        loading={loading}
        data={walletRequests}
        columns={
          [
            {
              key: "amount",
              header: "Amount",
              value: (r) => r.amount,
              render: (r) => (
                <span className="font-bold tabular-nums text-foreground">
                  ₹{r.amount.toLocaleString("en-IN")}
                </span>
              ),
            },
            {
              key: "method",
              header: "Method",
              value: (r) => r.paymentMethod,
              render: (r) => (
                <span className="text-muted-foreground">{r.paymentMethod}</span>
              ),
            },
            {
              key: "date",
              header: "Date",
              hideOnMobile: true,
              value: (r) => new Date(r.createdAt).toLocaleString(),
              render: (r) => (
                <span className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              value: (r) => r.status,
              render: (r) => (
                <Badge
                  variant={
                    r.status === "approved"
                      ? "default"
                      : r.status === "rejected"
                        ? "destructive"
                        : "secondary"
                  }
                  className="capitalize gap-1 rounded-full"
                >
                  {r.status === "pending" && <Clock className="w-3 h-3" />}
                  {r.status === "approved" && <CheckCircle className="w-3 h-3" />}
                  {r.status === "rejected" && <XCircle className="w-3 h-3" />}
                  {r.status}
                </Badge>
              ),
            },
          ] as DataTableColumn<WalletRequest>[]
        }
      />

      {/* Transaction History — premium DataTable */}
      <DataTable
        title="Transaction History"
        subtitle="Complete log of credits and debits"
        searchPlaceholder="Search transactions..."
        exportFilename={`transactions-${new Date().toISOString().slice(0, 10)}`}
        pageSize={10}
        emptyMessage="No transactions yet."
        loading={loading}
        data={transactions}
        columns={
          [
            {
              key: "type",
              header: "Type",
              value: (t) => t.type,
              render: (t) =>
                t.type === "credit" ? (
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-success/10 text-success flex items-center justify-center">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    <span className="hidden sm:inline text-xs font-bold uppercase text-success">
                      Credit
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <span className="hidden sm:inline text-xs font-bold uppercase text-destructive">
                      Debit
                    </span>
                  </div>
                ),
            },
            {
              key: "description",
              header: "Description",
              value: (t) => t.description || t.source,
              render: (t) => (
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {t.description || t.source}
                  </p>
                  <p className="text-xs text-muted-foreground sm:hidden">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ),
            },
            {
              key: "date",
              header: "Date",
              hideOnMobile: true,
              value: (t) => new Date(t.createdAt).toLocaleString(),
              render: (t) => (
                <span className="text-xs text-muted-foreground">
                  {new Date(t.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ),
            },
            {
              key: "amount",
              header: "Amount",
              value: (t) => (t.type === "credit" ? t.amount : -t.amount),
              render: (t) => (
                <span
                  className={`font-bold tabular-nums ${
                    t.type === "credit" ? "text-success" : "text-destructive"
                  }`}
                >
                  {t.type === "credit" ? "+" : "−"}₹
                  {t.amount.toLocaleString("en-IN")}
                </span>
              ),
            },
          ] as DataTableColumn<Transaction>[]
        }
      />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { atomicDebit } from "@/lib/firebase-transactions";
import {
  loadDmtConfig,
  findCustomerByMobile,
  createCustomer,
  bumpCustomerUsage,
  listenBeneficiaries,
  addBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  createTransfer,
  listenRetailerTransfers,
} from "@/lib/dmt-firebase";
import {
  type DmtCustomer,
  type DmtBeneficiary,
  type DmtTransfer,
  type DmtConfig,
  type DmtMode,
  DEFAULT_DMT_CONFIG,
  calculateDmtCharges,
  detectBankFromIfsc,
  currentMonthKey,
} from "@/lib/dmt-types";
import { downloadDmtReceipt } from "@/lib/dmt-receipt-pdf";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Banknote, Search, UserPlus, Plus, Trash2, Pencil, Send, CheckCircle2,
  Clock, XCircle, RefreshCcw, Download, Share2, Printer, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/money-transfer")({
  ssr: false,
  component: MoneyTransferPage,
});

function MoneyTransferPage() {
  const { appUser } = useAuth();
  const [cfg, setCfg] = useState<DmtConfig>(DEFAULT_DMT_CONFIG);
  const [balance, setBalance] = useState(0);
  const [transfers, setTransfers] = useState<DmtTransfer[]>([]);
  const [tab, setTab] = useState("transfer");

  useEffect(() => { loadDmtConfig().then(setCfg).catch(() => {}); }, []);

  useEffect(() => {
    if (!appUser) return;
    const u1 = onSnapshot(doc(db, "wallets", appUser.uid), (s) => {
      if (s.exists()) setBalance(s.data().balance || 0);
    });
    const u2 = listenRetailerTransfers(appUser.uid, setTransfers);
    return () => { u1(); u2(); };
  }, [appUser]);

  const today = new Date().toDateString();
  const stats = useMemo(() => {
    const todays = transfers.filter((t) => new Date(t.createdAt).toDateString() === today);
    return {
      total: todays.length,
      success: todays.filter((t) => t.status === "success").length,
      failed: todays.filter((t) => t.status === "failed" || t.status === "refunded").length,
      pending: todays.filter((t) => t.status === "pending" || t.status === "processing").length,
      amount: todays.filter((t) => t.status === "success").reduce((s, t) => s + t.amount, 0),
      charges: todays.filter((t) => t.status === "success").reduce((s, t) => s + t.charge + t.gst, 0),
    };
  }, [transfers, today]);

  if (!cfg.enabled) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card><CardContent className="p-8 text-center">
          <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold">Money Transfer Service Unavailable</h2>
          <p className="text-sm text-muted-foreground">Admin has disabled DMT temporarily.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Banknote className="w-6 h-6 text-primary" /> Money Transfer (DMT)
          </h1>
          <p className="text-muted-foreground text-sm">
            Wallet: <span className="font-bold text-primary">₹{balance.toFixed(2)}</span> ·
            Limit ₹{cfg.minPerTxn}–₹{cfg.maxPerTxn} per txn
          </p>
        </div>
        <Link to="/retailer/wallet"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Wallet</Button></Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatTile label="Today" value={stats.total} color="bg-blue-500/10 text-blue-700" />
        <StatTile label="Success" value={stats.success} color="bg-green-500/10 text-green-700" />
        <StatTile label="Failed" value={stats.failed} color="bg-red-500/10 text-red-700" />
        <StatTile label="Pending" value={stats.pending} color="bg-amber-500/10 text-amber-700" />
        <StatTile label="Amount" value={`₹${stats.amount.toFixed(0)}`} color="bg-primary/10 text-primary" />
        <StatTile label="Charges" value={`₹${stats.charges.toFixed(0)}`} color="bg-violet-500/10 text-violet-700" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="transfer">New Transfer</TabsTrigger>
          <TabsTrigger value="history">History ({transfers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="transfer" className="mt-4">
          <TransferFlow cfg={cfg} balance={balance} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTab transfers={transfers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <Card><CardContent className="p-3">
      <div className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${color}`}>{label}</div>
      <p className="text-xl font-bold mt-1">{value}</p>
    </CardContent></Card>
  );
}

// ── Transfer Flow ──────────────────────────────────────────────────────
function TransferFlow({ cfg, balance }: { cfg: DmtConfig; balance: number }) {
  const { appUser } = useAuth();
  const [step, setStep] = useState<"customer" | "beneficiary" | "amount" | "review">("customer");
  const [mobile, setMobile] = useState("");
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<DmtCustomer | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [newName, setNewName] = useState("");

  const [beneficiaries, setBeneficiaries] = useState<DmtBeneficiary[]>([]);
  const [selectedBene, setSelectedBene] = useState<DmtBeneficiary | null>(null);
  const [showBeneDialog, setShowBeneDialog] = useState(false);
  const [editingBene, setEditingBene] = useState<DmtBeneficiary | null>(null);

  const [mode, setMode] = useState<DmtMode>("IMPS");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<DmtTransfer | null>(null);

  // Subscribe to beneficiaries when customer set
  useEffect(() => {
    if (!customer) { setBeneficiaries([]); return; }
    return listenBeneficiaries(customer.id, setBeneficiaries);
  }, [customer]);

  const handleSearch = async () => {
    if (!appUser) return;
    if (!/^\d{10}$/.test(mobile)) {
      toast.error("Enter valid 10-digit mobile");
      return;
    }
    setSearching(true);
    try {
      const c = await findCustomerByMobile(appUser.uid, mobile);
      if (c) {
        setCustomer(c);
        setStep("beneficiary");
        toast.success(`Welcome back ${c.name}`);
      } else {
        setShowRegister(true);
      }
    } finally { setSearching(false); }
  };

  const handleRegister = async () => {
    if (!appUser || !newName.trim()) return;
    const c = await createCustomer(appUser.uid, mobile, newName.trim(), cfg.customerMonthlyLimit);
    setCustomer(c);
    setShowRegister(false);
    setNewName("");
    setStep("beneficiary");
    toast.success("Customer registered");
  };

  const charges = useMemo(() => {
    const a = parseFloat(amount) || 0;
    return calculateDmtCharges(a, cfg);
  }, [amount, cfg]);

  const monthRemaining = useMemo(() => {
    if (!customer) return cfg.customerMonthlyLimit;
    const used = customer.monthKey === currentMonthKey() ? customer.monthlyUsed || 0 : 0;
    return Math.max(0, customer.monthlyLimit - used);
  }, [customer, cfg]);

  const validAmount = (): string | null => {
    const a = parseFloat(amount);
    if (!a || a <= 0) return "Enter a valid amount";
    if (a < cfg.minPerTxn) return `Minimum ₹${cfg.minPerTxn}`;
    if (a > cfg.maxPerTxn) return `Maximum ₹${cfg.maxPerTxn} per transfer`;
    if (a > monthRemaining) return `Customer monthly limit exceeded (₹${monthRemaining} left)`;
    if (charges.totalDebit > balance) return `Insufficient wallet balance (need ₹${charges.totalDebit.toFixed(2)})`;
    return null;
  };

  const handleSubmit = async () => {
    if (!appUser || !customer || !selectedBene) return;
    const err = validAmount();
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      const a = parseFloat(amount);
      // Atomic debit first
      await atomicDebit(appUser.uid, charges.totalDebit, {
        source: "dmt_transfer",
        description: `DMT ${mode} → ${selectedBene.name} (${selectedBene.accountNumber})`,
      });

      const tx: Omit<DmtTransfer, "id" | "createdAt" | "status"> = {
        retailerId: appUser.uid,
        retailerEmail: appUser.email,
        customerId: customer.id,
        customerMobile: customer.mobile,
        customerName: customer.name,
        beneficiaryId: selectedBene.id,
        beneficiaryName: selectedBene.name,
        beneficiaryAccount: selectedBene.accountNumber,
        beneficiaryIfsc: selectedBene.ifsc,
        beneficiaryBank: selectedBene.bankName,
        beneficiaryMobile: selectedBene.mobile,
        mode,
        amount: a,
        charge: charges.charge,
        gst: charges.gst,
        totalDebit: charges.totalDebit,
        purpose: purpose.trim() || undefined,
      };
      const id = await createTransfer(tx);
      await bumpCustomerUsage(customer.id, a);

      setCompleted({ ...tx, id, status: "pending", createdAt: new Date().toISOString() });
      toast.success("Transfer request submitted!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit");
    } finally { setSubmitting(false); }
  };

  const reset = () => {
    setStep("customer"); setMobile(""); setCustomer(null); setSelectedBene(null);
    setAmount(""); setPurpose(""); setCompleted(null); setBeneficiaries([]);
  };

  // ── Completed view ──
  if (completed) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Transfer Request Submitted</h2>
            <p className="text-muted-foreground text-sm">
              Staff will process this manually. You'll see status updates in History.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-left max-w-sm mx-auto space-y-1 text-sm">
            <Row k="Txn ID" v={completed.id ?? "—"} />
            <Row k="Beneficiary" v={completed.beneficiaryName} />
            <Row k="A/C" v={completed.beneficiaryAccount} />
            <Row k="Amount" v={`₹${completed.amount.toFixed(2)}`} />
            <Row k="Total Debited" v={`₹${completed.totalDebit.toFixed(2)}`} />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => downloadDmtReceipt(completed)}><Download className="w-4 h-4 mr-1" /> PDF</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> Print</Button>
            <Button variant="outline" onClick={() => shareWhatsApp(completed)}>
              <Share2 className="w-4 h-4 mr-1" /> WhatsApp
            </Button>
            <Button variant="secondary" onClick={reset}>New Transfer</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step 1: customer */}
      <Card className={step === "customer" ? "" : "opacity-60"}>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
          Customer
        </CardTitle></CardHeader>
        <CardContent>
          {!customer ? (
            <div className="flex gap-2 max-w-md">
              <Input
                inputMode="numeric"
                maxLength={10}
                placeholder="Customer 10-digit mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              />
              <Button onClick={handleSearch} disabled={searching}>
                <Search className="w-4 h-4 mr-1" /> {searching ? "..." : "Find"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold">{customer.name} <Badge variant="outline" className="ml-1 text-[10px]">{customer.kycStatus}</Badge></p>
                <p className="text-xs text-muted-foreground">{customer.mobile} · Monthly left ₹{monthRemaining.toLocaleString()}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={reset}>Change</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Customer</DialogTitle>
            <DialogDescription>{mobile} not registered. Add them now.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Customer Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" />
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly limit ₹{cfg.customerMonthlyLimit.toLocaleString()} (RBI basic KYC).
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleRegister} disabled={!newName.trim()}>
              <UserPlus className="w-4 h-4 mr-1" /> Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: beneficiary */}
      {customer && (
        <Card className={step === "beneficiary" || step === "amount" || step === "review" ? "" : "opacity-60"}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">2</span>
              Beneficiary
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => { setEditingBene(null); setShowBeneDialog(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {beneficiaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved beneficiaries. Add one to continue.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {beneficiaries.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => { setSelectedBene(b); setStep("amount"); }}
                    className={`border rounded-lg p-3 cursor-pointer transition ${
                      selectedBene?.id === b.id ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "hover:border-primary/50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.accountNumber} · {b.ifsc}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.bankName}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); setEditingBene(b); setShowBeneDialog(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`Delete ${b.name}?`)) {
                              await deleteBeneficiary(b.id);
                              if (selectedBene?.id === b.id) setSelectedBene(null);
                              toast.success("Deleted");
                            }
                          }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <BeneficiaryDialog
        open={showBeneDialog}
        onClose={() => setShowBeneDialog(false)}
        existing={editingBene}
        customer={customer}
        retailerId={appUser?.uid ?? ""}
      />

      {/* Step 3: amount */}
      {customer && selectedBene && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">3</span>
            Amount & Mode
          </CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as DmtMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cfg.modes.map((m) => <SelectItem key={m} value={m}>{m === "IMPS" ? "IMPS (Instant)" : "NEFT"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (₹)</Label>
                <Input type="number" inputMode="numeric"
                  min={cfg.minPerTxn} max={cfg.maxPerTxn}
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder={`${cfg.minPerTxn} – ${cfg.maxPerTxn}`} />
              </div>
            </div>
            <div>
              <Label>Purpose (optional)</Label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. salary, family support" />
            </div>

            {parseFloat(amount) > 0 && (
              <div className="bg-muted/50 border rounded-lg p-3 text-sm space-y-1">
                <Row k="Amount to beneficiary" v={`₹${parseFloat(amount).toFixed(2)}`} />
                <Row k="Service charge" v={`₹${charges.charge.toFixed(2)}`} />
                <Row k={`GST (${cfg.gstPercent}%)`} v={`₹${charges.gst.toFixed(2)}`} />
                <div className="border-t pt-1 mt-1 font-semibold flex justify-between">
                  <span>Total wallet debit</span>
                  <span className="text-primary">₹{charges.totalDebit.toFixed(2)}</span>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={handleSubmit} disabled={submitting || !!validAmount()}>
              <Send className="w-4 h-4 mr-1" />
              {submitting ? "Submitting..." : `Transfer ₹${parseFloat(amount || "0").toFixed(2)}`}
            </Button>
            {validAmount() && parseFloat(amount) > 0 && (
              <p className="text-xs text-destructive">{validAmount()}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

// ── Beneficiary Dialog ──
function BeneficiaryDialog({
  open, onClose, existing, customer, retailerId,
}: {
  open: boolean; onClose: () => void;
  existing: DmtBeneficiary | null; customer: DmtCustomer | null; retailerId: string;
}) {
  const [name, setName] = useState("");
  const [acc, setAcc] = useState("");
  const [accConfirm, setAccConfirm] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (open) {
      if (existing) {
        setName(existing.name); setAcc(existing.accountNumber);
        setAccConfirm(existing.accountNumber); setIfsc(existing.ifsc);
        setMobile(existing.mobile || "");
      } else {
        setName(""); setAcc(""); setAccConfirm(""); setIfsc(""); setMobile("");
      }
    }
  }, [open, existing]);

  const bankName = useMemo(() => detectBankFromIfsc(ifsc), [ifsc]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!customer) return;
    if (acc !== accConfirm) { toast.error("Account numbers don't match"); return; }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
      toast.error("Invalid IFSC format"); return;
    }
    submittingRef.current = true; setBusy(true);
    try {
      if (existing) {
        await updateBeneficiary(existing.id, {
          name, accountNumber: acc, ifsc: ifsc.toUpperCase(), bankName, mobile: mobile || undefined,
        });
        toast.success("Beneficiary updated");
      } else {
        await addBeneficiary({
          customerId: customer.id, retailerId,
          name, accountNumber: acc, ifsc: ifsc.toUpperCase(), bankName,
          mobile: mobile || undefined, pennyDropStatus: "skipped",
        });
        toast.success("Beneficiary added");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed");
    } finally { setBusy(false); submittingRef.current = false; }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Beneficiary" : "Add Beneficiary"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Account Number</Label>
            <Input required inputMode="numeric" value={acc} onChange={(e) => setAcc(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div><Label>Re-enter Account Number</Label>
            <Input required inputMode="numeric" value={accConfirm} onChange={(e) => setAccConfirm(e.target.value.replace(/\D/g, ""))} />
            {acc && accConfirm && acc !== accConfirm && (
              <p className="text-xs text-destructive mt-1">Account numbers don't match</p>
            )}
          </div>
          <div><Label>IFSC Code</Label>
            <Input required value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} placeholder="SBIN0001234" />
            {ifsc && <p className="text-xs text-muted-foreground mt-1">Bank: <span className="font-medium">{bankName}</span></p>}
          </div>
          <div><Label>Beneficiary Mobile (optional)</Label>
            <Input inputMode="numeric" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : existing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── History tab ──
function HistoryTab({ transfers }: { transfers: DmtTransfer[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return [t.customerMobile, t.customerName, t.beneficiaryName, t.beneficiaryAccount, t.utr, t.id]
        .filter(Boolean).some((x) => String(x).toLowerCase().includes(s));
    });
  }, [transfers, search, filter]);

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search mobile, name, A/C, UTR..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No transfers found</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className="border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">₹{t.amount.toFixed(2)}</p>
                  <StatusBadge status={t.status} />
                  <span className="text-xs text-muted-foreground">{t.mode}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {t.beneficiaryName} · {t.beneficiaryAccount} · {t.beneficiaryBank}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.customerName} ({t.customerMobile}) · {new Date(t.createdAt).toLocaleString()}
                  {t.utr && ` · UTR ${t.utr}`}
                  {t.refundRef && ` · Refund ${t.refundRef}`}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => downloadDmtReceipt(t)}>
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => shareWhatsApp(t)}>
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent></Card>
  );
}

function StatusBadge({ status }: { status: DmtTransfer["status"] }) {
  const map = {
    pending: { c: "bg-amber-500/10 text-amber-700", I: Clock, t: "Pending" },
    processing: { c: "bg-blue-500/10 text-blue-700", I: RefreshCcw, t: "Processing" },
    success: { c: "bg-green-500/10 text-green-700", I: CheckCircle2, t: "Success" },
    failed: { c: "bg-red-500/10 text-red-700", I: XCircle, t: "Failed" },
    refunded: { c: "bg-violet-500/10 text-violet-700", I: RefreshCcw, t: "Refunded" },
  } as const;
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold ${s.c}`}>
      <s.I className="w-3 h-3" /> {s.t}
    </span>
  );
}

function shareWhatsApp(t: DmtTransfer) {
  const msg = encodeURIComponent(
    `*EI Solutions DMT Receipt*\n` +
    `Txn: ${t.id}\n` +
    `Status: ${t.status.toUpperCase()}\n` +
    `Amount: ₹${t.amount.toFixed(2)}\n` +
    `To: ${t.beneficiaryName} (${t.beneficiaryAccount})\n` +
    `Bank: ${t.beneficiaryBank}\n` +
    (t.utr ? `UTR: ${t.utr}\n` : "") +
    `Date: ${new Date(t.createdAt).toLocaleString()}`
  );
  window.open(`https://wa.me/?text=${msg}`, "_blank");
}

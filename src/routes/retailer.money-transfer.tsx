import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { atomicDebit } from "@/lib/firebase-transactions";
import {
  type DmtCustomer,
  type DmtBeneficiary,
  type DmtTransfer,
  type DmtMode,
  DMT_MODES,
  DMT_MIN_TXN,
  DMT_MAX_TXN,
  DMT_CUSTOMER_MONTHLY_LIMIT,
  calculateDmtCharges,
  detectBankFromIfsc,
  formatDmtDate,
  getDmtStatusColor,
} from "@/lib/dmt-types";
import {
  findCustomerByMobile,
  createCustomer,
  bumpCustomerUsage,
  listenBeneficiaries,
  addBeneficiary,
  deleteBeneficiary,
  createTransfer,
  listenRetailerTransfers,
} from "@/lib/dmt-firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Banknote, Search, UserPlus, Plus, Trash2, Send, CheckCircle2,
  Clock, XCircle, RefreshCcw, ArrowLeft, Wallet, IndianRupee, Eye, Building2, Landmark,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/money-transfer")({
  ssr: false,
  component: MoneyTransferPage,
});

function MoneyTransferPage() {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [searchMobile, setSearchMobile] = useState("");
  const [customer, setCustomer] = useState<DmtCustomer | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<DmtBeneficiary[]>([]);
  const [transfers, setTransfers] = useState<DmtTransfer[]>([]);
  const [searching, setSearching] = useState(false);

  // Dialogs
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);
  const [transferTarget, setTransferTarget] = useState<DmtBeneficiary | null>(null);
  const [viewingTx, setViewingTx] = useState<DmtTransfer | null>(null);

  // Wallet listener
  useEffect(() => {
    if (!appUser?.uid) return;
    const u = onSnapshot(doc(db, "wallets", appUser.uid), (s) => {
      if (s.exists()) setBalance(s.data().balance || 0);
    });
    return u;
  }, [appUser?.uid]);

  // Transfers listener
  useEffect(() => {
    if (!appUser?.uid) return;
    return listenRetailerTransfers(appUser.uid, setTransfers);
  }, [appUser?.uid]);

  // Beneficiaries listener
  useEffect(() => {
    if (!customer?.id) { setBeneficiaries([]); return; }
    return listenBeneficiaries(customer.id, setBeneficiaries);
  }, [customer?.id]);

  const stats = useMemo(() => {
    const success = transfers.filter((t) => t.status === "success").length;
    const pending = transfers.filter((t) => t.status === "pending" || t.status === "processing").length;
    const failed = transfers.filter((t) => t.status === "failed" || t.status === "refunded").length;
    const totalSent = transfers.filter((t) => t.status === "success").reduce((s, t) => s + t.amount, 0);
    return { total: transfers.length, success, pending, failed, totalSent };
  }, [transfers]);

  const handleSearchCustomer = async () => {
    if (!appUser) return;
    if (!/^\d{10}$/.test(searchMobile)) {
      toast.error("Enter valid 10-digit mobile");
      return;
    }
    setSearching(true);
    try {
      const found = await findCustomerByMobile(appUser.uid, searchMobile);
      if (found) {
        setCustomer(found);
        toast.success(`Customer found: ${found.name}`);
      } else {
        setCustomer(null);
        setShowAddCustomer(true);
      }
    } catch (e: any) {
      toast.error(e?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-premium-gradient p-6 sm:p-8 text-white shadow-premium">
        <div className="pointer-events-none absolute -top-16 -right-12 h-56 w-56 rounded-full bg-white/15 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-blob" style={{ animationDelay: "2s" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/75 font-bold">Domestic Money Transfer</p>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Money Transfer · DMT</h1>
              </div>
            </div>
            <p className="text-white/85 text-sm max-w-xl">
              Send money instantly to any bank account in India. Powered by IMPS, NEFT & RTGS. All transfers handled by our staff.
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur-md ring-1 ring-white/30 rounded-2xl px-5 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/75 font-semibold">Wallet Balance</p>
            <p className="text-2xl font-bold tabular-nums">₹{balance.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total Transfers" value={String(stats.total)} icon={Send} gradient="from-blue-500 to-indigo-600" />
        <StatTile label="Successful" value={String(stats.success)} icon={CheckCircle2} gradient="from-emerald-500 to-teal-600" />
        <StatTile label="Pending" value={String(stats.pending)} icon={Clock} gradient="from-amber-500 to-orange-600" />
        <StatTile label="Total Sent" value={`₹${stats.totalSent.toLocaleString("en-IN")}`} icon={IndianRupee} gradient="from-fuchsia-500 to-pink-600" />
      </div>

      <Tabs defaultValue="transfer">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="transfer">New Transfer</TabsTrigger>
          <TabsTrigger value="history">History ({transfers.length})</TabsTrigger>
        </TabsList>

        {/* TRANSFER TAB */}
        <TabsContent value="transfer" className="space-y-4 mt-4">
          {/* Customer search */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <SectionTitle title="Step 1 · Find or Add Customer" />
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Customer mobile (10 digits)"
                value={searchMobile}
                onChange={(e) => setSearchMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="flex-1"
              />
              <Button onClick={handleSearchCustomer} disabled={searching}>
                <Search className="w-4 h-4 mr-2" /> {searching ? "Searching..." : "Find Customer"}
              </Button>
            </div>

            {customer && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div>
                  <p className="font-semibold text-foreground">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.mobile} · Used ₹{customer.monthlyUsed.toLocaleString("en-IN")} of ₹{customer.monthlyLimit.toLocaleString("en-IN")} this month</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setCustomer(null); setSearchMobile(""); }}>
                  <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Change
                </Button>
              </div>
            )}
          </div>

          {/* Beneficiaries */}
          {customer && (
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <SectionTitle title="Step 2 · Choose Beneficiary" />
                <Button size="sm" onClick={() => setShowAddBeneficiary(true)}>
                  <UserPlus className="w-4 h-4 mr-1" /> Add Beneficiary
                </Button>
              </div>

              {beneficiaries.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No beneficiaries yet. Add one to start transferring.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {beneficiaries.map((b) => (
                    <div key={b.id} className="rounded-xl border border-border/60 p-3 bg-background/50 hover:shadow-md transition">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-premium-gradient text-white flex items-center justify-center shrink-0">
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{b.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{b.bankName}</p>
                          <p className="text-xs font-mono text-muted-foreground">A/C: {b.accountNumber} · {b.ifsc}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="flex-1" onClick={() => setTransferTarget(b)}>
                          <Send className="w-3.5 h-3.5 mr-1" /> Send Money
                        </Button>
                        <Button size="sm" variant="outline" onClick={async () => {
                          if (!confirm(`Delete beneficiary ${b.name}?`)) return;
                          await deleteBeneficiary(b.id!);
                          toast.success("Beneficiary deleted");
                        }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="mt-4">
          <div className="glass-card rounded-2xl overflow-hidden">
            {transfers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No transfers yet.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {transfers.map((t) => (
                  <div key={t.id} className="p-4 hover:bg-muted/30 transition flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-premium-gradient text-white flex items-center justify-center shrink-0">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{t.beneficiaryName}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getDmtStatusColor(t.status)}`}>{t.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{t.beneficiaryBank} · {t.beneficiaryAccount} · {t.mode}</p>
                        <p className="text-xs text-muted-foreground">{formatDmtDate(t.createdAt)}{t.utr ? ` · UTR: ${t.utr}` : ""}</p>
                        {t.staffRemark && <p className="text-xs text-blue-700 mt-0.5">📝 {t.staffRemark}</p>}
                        {t.failureReason && <p className="text-xs text-rose-700 mt-0.5">❌ {t.failureReason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-bold tabular-nums text-foreground">₹{t.amount.toLocaleString("en-IN")}</p>
                        <p className="text-[10px] text-muted-foreground">+ ₹{(t.charge + t.gst).toFixed(2)} fee</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setViewingTx(t)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Customer Dialog */}
      {showAddCustomer && (
        <AddCustomerDialog
          mobile={searchMobile}
          retailerId={appUser?.uid || ""}
          retailerEmail={appUser?.email || ""}
          onClose={() => setShowAddCustomer(false)}
          onCreated={(c) => { setCustomer(c); setShowAddCustomer(false); }}
        />
      )}

      {/* Add Beneficiary Dialog */}
      {customer && showAddBeneficiary && (
        <AddBeneficiaryDialog
          customer={customer}
          retailerId={appUser?.uid || ""}
          onClose={() => setShowAddBeneficiary(false)}
        />
      )}

      {/* Transfer Dialog */}
      {customer && transferTarget && (
        <TransferDialog
          customer={customer}
          beneficiary={transferTarget}
          balance={balance}
          retailerId={appUser?.uid || ""}
          retailerEmail={appUser?.email || ""}
          retailerName={appUser?.name || appUser?.email || "Retailer"}
          onClose={() => setTransferTarget(null)}
        />
      )}

      {/* Tx Viewer */}
      {viewingTx && <TransferViewer tx={viewingTx} onClose={() => setViewingTx(null)} />}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-6 w-1 rounded-full bg-premium-gradient" />
      <h3 className="font-bold text-foreground uppercase tracking-wider text-sm">{title}</h3>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, gradient }: { label: string; value: string; icon: any; gradient: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl glass-card p-4 transition-all hover:-translate-y-0.5">
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-25 blur-2xl group-hover:opacity-40 transition`} />
      <div className="relative flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{label}</p>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="relative text-xl font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function AddCustomerDialog({
  mobile, retailerId, retailerEmail, onClose, onCreated,
}: {
  mobile: string;
  retailerId: string;
  retailerEmail: string;
  onClose: () => void;
  onCreated: (c: DmtCustomer) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    setBusy(true);
    try {
      const c = await createCustomer({
        retailerId, retailerEmail, mobile, name: name.trim(),
        monthlyLimit: DMT_CUSTOMER_MONTHLY_LIMIT,
      });
      toast.success("Customer added");
      onCreated(c);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> New Customer</DialogTitle>
          <DialogDescription>Mobile {mobile} not registered. Add a quick customer record.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <p className="text-xs text-muted-foreground">Monthly limit: ₹{DMT_CUSTOMER_MONTHLY_LIMIT.toLocaleString("en-IN")}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handle} disabled={busy}>{busy ? "Saving..." : "Add Customer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddBeneficiaryDialog({
  customer, retailerId, onClose,
}: {
  customer: DmtCustomer;
  retailerId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);

  const bankName = useMemo(() => ifsc.length >= 4 ? detectBankFromIfsc(ifsc) : "", [ifsc]);

  const handle = async () => {
    if (!name.trim() || !/^\d{9,18}$/.test(account) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
      toast.error("Fill all fields with valid Account & IFSC");
      return;
    }
    setBusy(true);
    try {
      await addBeneficiary({
        retailerId,
        customerId: customer.id!,
        customerMobile: customer.mobile,
        name: name.trim(),
        accountNumber: account,
        ifsc: ifsc.toUpperCase(),
        bankName,
        mobile,
      });
      toast.success("Beneficiary added");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Add Beneficiary</DialogTitle>
          <DialogDescription>For customer {customer.name} ({customer.mobile})</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Beneficiary Name *"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Mobile (optional)"><Input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} /></Field>
          <Field label="Account Number *"><Input value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, "").slice(0, 18))} /></Field>
          <Field label="IFSC *"><Input value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase().slice(0, 11))} placeholder="SBIN0001234" /></Field>
          {bankName && (
            <div className="sm:col-span-2 text-xs bg-blue-50 border border-blue-200 rounded-lg p-2">
              <span className="font-semibold">Bank:</span> {bankName}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handle} disabled={busy}>{busy ? "Saving..." : "Add Beneficiary"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({
  customer, beneficiary, balance, retailerId, retailerEmail, retailerName, onClose,
}: {
  customer: DmtCustomer;
  beneficiary: DmtBeneficiary;
  balance: number;
  retailerId: string;
  retailerEmail: string;
  retailerName: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<DmtMode>("IMPS");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);

  const amt = parseFloat(amount) || 0;
  const charges = useMemo(() => calculateDmtCharges(amt), [amt]);
  const remainingMonthlyLimit = customer.monthlyLimit - customer.monthlyUsed;

  const validate = () => {
    if (amt < DMT_MIN_TXN) return `Minimum ₹${DMT_MIN_TXN}`;
    if (amt > DMT_MAX_TXN) return `Maximum ₹${DMT_MAX_TXN}`;
    if (amt > remainingMonthlyLimit) return `Exceeds monthly limit (₹${remainingMonthlyLimit.toLocaleString("en-IN")} left)`;
    if (charges.totalDebit > balance) return `Insufficient wallet balance`;
    return null;
  };

  const handle = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      // Debit wallet first
      await atomicDebit(retailerId, charges.totalDebit, {
        source: "dmt_transfer",
        description: `DMT · ${beneficiary.name} · ₹${amt}`,
        beneficiary: beneficiary.name,
        beneficiaryAccount: beneficiary.accountNumber,
      });

      // Create transfer (status: pending → staff queue)
      await createTransfer({
        retailerId,
        retailerEmail,
        retailerName,
        customerId: customer.id!,
        customerName: customer.name,
        customerMobile: customer.mobile,
        beneficiaryId: beneficiary.id!,
        beneficiaryName: beneficiary.name,
        beneficiaryAccount: beneficiary.accountNumber,
        beneficiaryIfsc: beneficiary.ifsc,
        beneficiaryBank: beneficiary.bankName,
        beneficiaryMobile: beneficiary.mobile || "",
        mode,
        amount: amt,
        charge: charges.charge,
        gst: charges.gst,
        totalDebit: charges.totalDebit,
        purpose,
        utr: "",
        staffRemark: "",
        failureReason: "",
        staffId: "",
        staffName: "",
        processedAt: "",
        refundedAt: "",
        refundRef: "",
        walletDebited: true,
        retailerCommission: 0,
      });

      // Bump customer monthly usage
      await bumpCustomerUsage(customer.id!, amt);

      toast.success("Transfer request submitted to staff!");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Transfer failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> New Transfer</DialogTitle>
          <DialogDescription>To {beneficiary.name} · {beneficiary.bankName} · {beneficiary.accountNumber}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Amount (₹) *">
            <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`${DMT_MIN_TXN} - ${DMT_MAX_TXN}`} />
          </Field>
          <Field label="Transfer Mode *">
            <Select value={mode} onValueChange={(v) => setMode(v as DmtMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DMT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Purpose (optional)">
            <Textarea rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Salary, family support, etc." />
          </Field>

          {amt > 0 && (
            <div className="rounded-xl bg-muted/40 p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span>Amount</span><span className="tabular-nums">₹{amt.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Service Charge</span><span className="tabular-nums">₹{charges.charge.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>GST (18%)</span><span className="tabular-nums">₹{charges.gst.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold pt-1.5 border-t border-border/60"><span>Total Debit</span><span className="tabular-nums">₹{charges.totalDebit.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Wallet after</span><span className="tabular-nums">₹{(balance - charges.totalDebit).toFixed(2)}</span></div>
            </div>
          )}

          <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-2">
            <Wallet className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-800">Wallet debited immediately. If staff marks failed, full refund auto-credited to wallet.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handle} disabled={busy || amt <= 0}>{busy ? "Sending..." : "Submit Transfer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferViewer({ tx, onClose }: { tx: DmtTransfer; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Banknote className="w-5 h-5 text-primary" /> Transfer Details</DialogTitle>
          <DialogDescription>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getDmtStatusColor(tx.status)}`}>{tx.status}</span>
            {tx.utr && <span className="ml-2 font-mono text-xs">UTR: {tx.utr}</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 text-sm">
          <Row label="From" value={`${tx.customerName} (${tx.customerMobile})`} />
          <Row label="To" value={tx.beneficiaryName} />
          <Row label="Bank" value={`${tx.beneficiaryBank} · ${tx.beneficiaryIfsc}`} />
          <Row label="Account" value={tx.beneficiaryAccount} />
          <Row label="Mode" value={tx.mode} />
          <Row label="Amount" value={`₹${tx.amount.toFixed(2)}`} />
          <Row label="Charges" value={`₹${(tx.charge + tx.gst).toFixed(2)} (incl. GST)`} />
          <Row label="Total Debit" value={`₹${tx.totalDebit.toFixed(2)}`} />
          {tx.purpose && <Row label="Purpose" value={tx.purpose} />}
          <Row label="Submitted" value={formatDmtDate(tx.createdAt)} />
          {tx.processedAt && <Row label="Processed" value={formatDmtDate(tx.processedAt)} />}
          {tx.staffName && <Row label="Staff" value={tx.staffName} />}
          {tx.staffRemark && <Row label="Remark" value={tx.staffRemark} />}
          {tx.failureReason && <Row label="Failure" value={tx.failureReason} />}
          {tx.refundRef && <Row label="Refund Ref" value={tx.refundRef} />}
          {tx.retailerCommission > 0 && <Row label="Your Commission" value={`₹${tx.retailerCommission.toFixed(2)}`} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/40">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="col-span-2 text-foreground">{value}</span>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { atomicDebit } from "@/lib/firebase-transactions";
import {
  EDIS_SERVICES,
  KERALA_DISTRICTS,
  generateEdisAppNo,
  formatEdisDate,
  getEdisStatusColor,
  uploadEdisDocuments,
  type EdisServiceInfo,
  type EdisApplication,
  type EdisUploadProgress,
} from "@/lib/edis-types";
import {
  createEdisApplication,
  listenRetailerApplications,
} from "@/lib/edis-firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  FileText, Sparkles, Search, ArrowRight, IndianRupee, Wallet,
  CheckCircle2, Clock, XCircle, Award, Upload, ArrowLeft, Eye, Download, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/services")({
  ssr: false,
  component: EdisPage,
});

type View = "catalog" | "form" | "history";

function EdisPage() {
  const { appUser } = useAuth();
  const [view, setView] = useState<View>("catalog");
  const [balance, setBalance] = useState(0);
  const [applications, setApplications] = useState<EdisApplication[]>([]);
  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState<EdisServiceInfo | null>(null);
  const [viewingApp, setViewingApp] = useState<EdisApplication | null>(null);

  useEffect(() => {
    if (!appUser?.uid) return;
    const unsubW = onSnapshot(doc(db, "wallets", appUser.uid), (s) => {
      if (s.exists()) setBalance(s.data().balance || 0);
    });
    const unsubA = listenRetailerApplications(appUser.uid, setApplications);
    return () => { unsubW(); unsubA(); };
  }, [appUser?.uid]);

  const stats = useMemo(() => {
    const pending = applications.filter((a) => a.status === "pending").length;
    const approved = applications.filter((a) => a.status === "approved" || a.status === "completed").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    return { total: applications.length, pending, approved, rejected };
  }, [applications]);

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EDIS_SERVICES;
    return EDIS_SERVICES.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.malayalam || "").toLowerCase().includes(q) ||
      s.key.includes(q),
    );
  }, [search]);

  if (view === "form" && selectedService) {
    return (
      <ApplicationForm
        service={selectedService}
        balance={balance}
        onBack={() => { setView("catalog"); setSelectedService(null); }}
        onSubmitted={() => { setView("history"); setSelectedService(null); toast.success("Application submitted to staff!"); }}
      />
    );
  }

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
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/75 font-bold">Government of Kerala</p>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">E-dis · E-Governance</h1>
              </div>
            </div>
            <p className="text-white/85 text-sm max-w-xl">
              Apply for 26+ government certificates. All applications routed directly to our staff for processing.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="bg-white/15 backdrop-blur-md ring-1 ring-white/30 rounded-2xl px-5 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/75 font-semibold">Wallet Balance</p>
              <p className="text-2xl font-bold tabular-nums">₹{balance.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total" value={stats.total} icon={FileText} gradient="from-blue-500 to-indigo-600" />
        <StatTile label="Pending" value={stats.pending} icon={Clock} gradient="from-amber-500 to-orange-600" />
        <StatTile label="Approved" value={stats.approved} icon={CheckCircle2} gradient="from-emerald-500 to-teal-600" />
        <StatTile label="Rejected" value={stats.rejected} icon={XCircle} gradient="from-rose-500 to-pink-600" />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="catalog">Apply</TabsTrigger>
          <TabsTrigger value="history">History ({applications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search certificate (e.g. income, caste, birth)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredServices.map((svc) => (
              <button
                key={svc.key}
                onClick={() => { setSelectedService(svc); setView("form"); }}
                className="group glass-card rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-premium"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-premium-gradient text-white flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-primary tabular-nums">₹{svc.fee}</span>
                </div>
                <h3 className="font-semibold text-foreground text-sm leading-snug mb-1">{svc.name}</h3>
                {svc.malayalam && <p className="text-xs text-muted-foreground mb-2">{svc.malayalam}</p>}
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground border-t border-border/40 pt-2 mt-2">
                  <span>{svc.processingDays}</span>
                  <span className="flex items-center gap-1 text-primary font-bold opacity-0 group-hover:opacity-100 transition">
                    Apply <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            ))}
            {filteredServices.length === 0 && (
              <div className="col-span-full text-center py-10 text-muted-foreground text-sm">
                No services match "{search}".
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="glass-card rounded-2xl overflow-hidden">
            {applications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No applications yet. Apply for a certificate to see it here.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {applications.map((app) => (
                  <div key={app.id} className="p-4 hover:bg-muted/30 transition flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{app.applicationNo}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getEdisStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                      <p className="font-semibold text-foreground text-sm">{app.serviceName}</p>
                      <p className="text-xs text-muted-foreground">{app.fullName} · {app.mobile} · {formatEdisDate(app.createdAt)}</p>
                      {app.staffRemark && (
                        <p className="text-xs text-blue-700 mt-1">📝 {app.staffRemark}</p>
                      )}
                      {app.rejectionReason && (
                        <p className="text-xs text-rose-700 mt-1">❌ {app.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-primary tabular-nums">₹{app.fee}</span>
                      <Button size="sm" variant="outline" onClick={() => setViewingApp(app)}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {viewingApp && (
        <ApplicationViewer app={viewingApp} onClose={() => setViewingApp(null)} />
      )}
    </div>
  );
}

function StatTile({ label, value, icon: Icon, gradient }: { label: string; value: number; icon: any; gradient: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl glass-card p-4 transition-all hover:-translate-y-0.5">
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-25 blur-2xl group-hover:opacity-40 transition`} />
      <div className="relative flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{label}</p>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="relative text-2xl font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function ApplicationForm({
  service, balance, onBack, onSubmitted,
}: {
  service: EdisServiceInfo;
  balance: number;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const { appUser } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [pincode, setPincode] = useState("");
  const [purpose, setPurpose] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [progress, setProgress] = useState<Record<string, EdisUploadProgress>>({});

  const fee = service.fee;
  const insufficient = balance < fee;

  const validateStep1 = () => {
    if (!fullName.trim()) return "Full name is required";
    if (!dob) return "Date of birth is required";
    if (!gender) return "Gender is required";
    if (!/^\d{10}$/.test(mobile)) return "Valid 10-digit mobile is required";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email";
    if (!/^\d{12}$/.test(aadhaar)) return "Valid 12-digit Aadhaar is required";
    return null;
  };

  const validateStep2 = () => {
    if (!address.trim()) return "Address is required";
    if (!district) return "District is required";
    if (!/^\d{6}$/.test(pincode)) return "Valid 6-digit pincode required";
    if (!purpose.trim()) return "Purpose is required";
    return null;
  };

  const handleSubmit = async () => {
    if (!appUser) return;
    if (insufficient) {
      toast.error(`Insufficient balance. Need ₹${fee}.`);
      return;
    }
    const missing = service.requiredDocuments.filter((d) => !files[d]);
    if (missing.length > 0) {
      toast.error(`Upload required documents: ${missing.join(", ")}`);
      return;
    }

    setSubmitting(true);
    setProgress({}); // reset progress bars at start of upload
    const appNo = generateEdisAppNo();
    let uploaded = false;
    let debited = false;
    try {
      // Upload first (with 90s safety timeout so the button never spins forever)
      const uploadPromise = uploadEdisDocuments({
        appNo,
        retailerId: appUser.uid,
        documents: service.requiredDocuments
          .filter((name) => files[name])
          .map((name) => ({ name, file: files[name]! })),
        onProgress: (p) => setProgress((prev) => ({ ...prev, [p.docName]: p })),
      });
      const timeoutPromise = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("UPLOAD_TIMEOUT")), 90_000)
      );
      const docs = await Promise.race([uploadPromise, timeoutPromise]);
      uploaded = true;

      // Debit wallet atomically
      await atomicDebit(appUser.uid, fee, {
        source: "edis_application",
        description: `E-dis · ${service.name} · ${appNo}`,
        applicationNo: appNo,
      });
      debited = true;

      // Create application
      await createEdisApplication({
        applicationNo: appNo,
        serviceKey: service.key,
        serviceName: service.name,
        fee,
        fullName, dob, gender, mobile, email, aadhaar, address, district, pincode, purpose,
        documents: docs,
        status: "pending",
        staffRemark: "",
        rejectionReason: "",
        govReceiptNo: "",
        reviewedBy: "",
        reviewedAt: "",
        retailerId: appUser.uid,
        retailerEmail: appUser.email || "",
        retailerName: appUser.name || appUser.email || "Retailer",
        walletDebited: true,
        refundedAt: "",
        createdAt: new Date().toISOString(),
      });

      toast.success("Application submitted! Staff will review shortly.");
      onSubmitted();
    } catch (e: any) {
      // Structured upload errors from edis-types
      if (e?.name === "EdisUploadError") {
        const titleMap: Record<string, string> = {
          INVALID_FILE_TYPE: "Invalid file type",
          FILE_TOO_LARGE: "File too large",
          STORAGE_PERMISSION_DENIED: "Permission denied",
          STORAGE_QUOTA: "Storage full",
          NETWORK: "Network problem",
          CANCELED: "Upload canceled",
          UNKNOWN: "Upload failed",
        };
        toast.error(titleMap[e.code] || "Upload failed", { description: e.message });
      } else if (e?.message === "UPLOAD_TIMEOUT") {
        toast.error("Upload timed out", {
          description: "Your connection seems slow. Please retry with smaller files or a better network.",
        });
      } else if (/insufficient/i.test(String(e?.message))) {
        toast.error("Insufficient balance", { description: `₹${fee} required to submit this application.` });
      } else if (e?.code === "permission-denied") {
        toast.error("Permission denied", {
          description: "You're not allowed to submit. Please re-login and try again.",
        });
      } else if (debited && !uploaded) {
        // Defensive: shouldn't normally reach here
        toast.error("Submission failed after debit", {
          description: "Wallet was debited but the record wasn't saved. Please contact support with App No: " + appNo,
        });
      } else {
        toast.error("Failed to submit application", {
          description: e?.message || "Please try again. If the problem persists, contact support.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-premium-gradient p-5 text-white shadow-premium">
        <div className="pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full bg-white/15 blur-3xl animate-blob" />
        <div className="relative flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/15">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-white/75 font-bold">New Application</p>
            <h2 className="text-xl font-bold truncate">{service.name}</h2>
            {service.malayalam && <p className="text-xs text-white/85">{service.malayalam}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-white/75 font-semibold">Fee</p>
            <p className="text-2xl font-bold tabular-nums">₹{fee}</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex-1 flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= n ? "bg-premium-gradient text-white shadow-md" : "bg-muted text-muted-foreground"
            }`}>
              {step > n ? <CheckCircle2 className="w-4 h-4" /> : n}
            </div>
            <span className={`text-xs font-semibold ${step >= n ? "text-foreground" : "text-muted-foreground"}`}>
              {n === 1 ? "Personal" : n === 2 ? "Address" : "Documents"}
            </span>
            {n < 3 && <div className={`flex-1 h-0.5 ${step > n ? "bg-premium-gradient" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
        {step === 1 && (
          <>
            <SectionTitle title="Personal Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name *"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As per Aadhaar" /></Field>
              <Field label="Date of Birth *"><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></Field>
              <Field label="Gender *">
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Mobile (10 digits) *"><Input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" /></Field>
              <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional@example.com" /></Field>
              <Field label="Aadhaar (12 digits) *"><Input value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="123412341234" /></Field>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => {
                const err = validateStep1();
                if (err) { toast.error(err); return; }
                setStep(2);
              }}>Next <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <SectionTitle title="Address & Purpose" />
            <Field label="Full Address *"><Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="House No, Street, Area, City" /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="District *">
                <Select value={district} onValueChange={setDistrict}>
                  <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    {KERALA_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Pincode (6 digits) *"><Input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="682001" /></Field>
            </div>
            <Field label="Purpose of Application *"><Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} placeholder="Why do you need this certificate?" /></Field>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
              <Button onClick={() => {
                const err = validateStep2();
                if (err) { toast.error(err); return; }
                setStep(3);
              }}>Next <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <SectionTitle title="Required Documents" />
            <p className="text-xs text-muted-foreground -mt-2">Upload all required documents below. JPG, PNG, or PDF.</p>
            <div className="space-y-3">
              {service.requiredDocuments.map((docName) => {
                const p = progress[docName];
                const showBar = !!p && p.state !== "success";
                const isError = p?.state === "error";
                const isDone = p?.state === "success";
                return (
                  <div key={docName} className="rounded-xl border border-border/60 p-3 bg-background/40">
                    <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-primary" /> {docName} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={submitting}
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setFiles((prev) => ({ ...prev, [docName]: f }));
                        // reset progress for this doc when a new file is picked
                        setProgress((prev) => {
                          const next = { ...prev };
                          delete next[docName];
                          return next;
                        });
                      }}
                      className="text-xs"
                    />
                    {files[docName] && !showBar && !isDone && (
                      <p className="text-xs text-emerald-700 mt-1">✓ {files[docName]!.name}</p>
                    )}
                    {showBar && (
                      <div className="mt-2 space-y-1">
                        <Progress value={p.percent} className={isError ? "[&>div]:bg-rose-500" : ""} />
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                          <span className="truncate pr-2">
                            {isError ? "Upload failed" : p.state === "paused" ? "Paused" : `Uploading ${formatBytes(p.bytesTransferred)} / ${formatBytes(p.totalBytes)}`}
                          </span>
                          <span className="font-semibold">{p.percent}%</span>
                        </div>
                      </div>
                    )}
                    {isDone && (
                      <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded · {files[docName]?.name}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
              <Wallet className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-amber-900">Wallet Debit on Submit</p>
                <p className="text-amber-800">₹{fee} will be debited immediately. If staff rejects, the amount will be refunded automatically.</p>
                <p className="text-amber-800 mt-1">Current balance: <span className="font-bold tabular-nums">₹{balance.toLocaleString("en-IN")}</span></p>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
              <Button onClick={handleSubmit} disabled={submitting || insufficient}>
                {submitting ? "Submitting..." : insufficient ? "Insufficient Balance" : <>Submit <IndianRupee className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
          </>
        )}
      </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

function ApplicationViewer({ app, onClose }: { app: EdisApplication; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> {app.serviceName}
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono">{app.applicationNo}</span>
            <span className={`ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getEdisStatusColor(app.status)}`}>{app.status}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <Row label="Applicant" value={app.fullName} />
          <Row label="DOB / Gender" value={`${app.dob} · ${app.gender}`} />
          <Row label="Mobile / Email" value={`${app.mobile}${app.email ? ` · ${app.email}` : ""}`} />
          <Row label="Aadhaar" value={app.aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")} />
          <Row label="Address" value={`${app.address}, ${app.district} - ${app.pincode}`} />
          <Row label="Purpose" value={app.purpose} />
          <Row label="Fee" value={`₹${app.fee}`} />
          <Row label="Submitted" value={formatEdisDate(app.createdAt)} />
          {app.govReceiptNo && <Row label="Gov Receipt No" value={app.govReceiptNo} />}
          {app.staffRemark && <Row label="Staff Remark" value={app.staffRemark} />}
          {app.rejectionReason && <Row label="Rejection Reason" value={app.rejectionReason} />}

          <div className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Documents ({app.documents.length})</p>
            <div className="space-y-1.5">
              {app.documents.map((d, i) => (
                <a
                  key={i}
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline px-3 py-2 rounded-lg bg-muted/40"
                >
                  <Download className="w-4 h-4" />
                  <span className="font-medium">{d.name}</span>
                  <span className="text-xs text-muted-foreground truncate ml-auto">{d.fileName}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ))}
              {app.documents.length === 0 && <p className="text-xs text-muted-foreground">No documents uploaded.</p>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

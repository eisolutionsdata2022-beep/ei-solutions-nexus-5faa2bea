import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SERVICE_CATALOG, DISTRICTS, type ServiceInfo } from "@/lib/service-catalog";
import { FileText, Upload, CreditCard, CheckCircle, ArrowLeft, ArrowRight, RotateCcw, Send, Shield, Calendar, User, Briefcase, FileUp, IndianRupee } from "lucide-react";

interface ApplicationFormProps {
  balance: number;
  feeOverrides?: Record<string, number>;
  onSubmit: (data: ApplicationData) => Promise<void>;
  onBack: () => void;
}

export interface ApplicationData {
  fullName: string;
  dob: string;
  gender: string;
  mobile: string;
  email: string;
  aadhaar: string;
  address: string;
  district: string;
  serviceType: string;
  purpose: string;
  applicationDate: string;
  documents: { name: string; file: File | null; remarks: string }[];
  declared: boolean;
  signature: string;
}

const STEPS = [
  { label: "Application", icon: FileText },
  { label: "Attachments", icon: FileUp },
  { label: "Payment", icon: CreditCard },
];

export function ApplicationForm({ balance, feeOverrides = {}, onSubmit, onBack }: ApplicationFormProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [documents, setDocuments] = useState<{ name: string; file: File | null; remarks: string }[]>([]);
  const [declared, setDeclared] = useState(false);
  const [signature, setSignature] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const selectedService = useMemo(
    () => SERVICE_CATALOG.find((s) => s.name === serviceType),
    [serviceType]
  );

  const selectedFee = useMemo(() => {
    if (!serviceType) return 0;
    return feeOverrides[serviceType] ?? selectedService?.fee ?? 0;
  }, [feeOverrides, selectedService?.fee, serviceType]);

  // Update documents when service changes
  const handleServiceChange = (val: string) => {
    setServiceType(val);
    const svc = SERVICE_CATALOG.find((s) => s.name === val);
    if (svc) {
      setDocuments(svc.requiredDocuments.map((d) => ({ name: d, file: null, remarks: "" })));
    }
  };

  const handleFileChange = (idx: number, file: File | null) => {
    setDocuments((prev) => prev.map((d, i) => (i === idx ? { ...d, file } : d)));
  };

  const handleRemarkChange = (idx: number, remarks: string) => {
    setDocuments((prev) => prev.map((d, i) => (i === idx ? { ...d, remarks } : d)));
  };

  const reset = () => {
    setStep(0);
    setFullName(""); setDob(""); setGender("Male"); setMobile(""); setEmail("");
    setAadhaar(""); setAddress(""); setDistrict(""); setServiceType("");
    setPurpose(""); setDocuments([]); setDeclared(false); setSignature("");
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        fullName, dob, gender, mobile, email, aadhaar, address, district,
        serviceType, purpose, applicationDate: today, documents, declared, signature,
      });
      reset();
    } catch (err: any) {
      console.error("ApplicationForm submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedStep0 = fullName && dob && mobile && aadhaar && district && serviceType && purpose;
  const canProceedStep1 = documents.length > 0 && documents.every((document) => !!document.file);
  const canSubmit = declared && signature && balance >= selectedFee;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gov-blue text-white p-4 rounded-t-lg border-b-4 border-gov-saffron">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8" />
          <div>
            <h2 className="text-lg font-bold tracking-wide">EI SOLUTIONS APPLICATION FORM</h2>
            <p className="text-xs opacity-80">E-Governance &amp; Digital India Services</p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 py-3">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              i === step ? "bg-gov-blue text-white" : i < step ? "bg-gov-green text-white" : "bg-muted text-muted-foreground"
            }`}>
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </div>
            {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-gov-green" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Application Details */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Section A */}
          <Card className="border-gov-blue/30">
            <CardHeader className="bg-gov-blue-light py-3 px-4 border-b border-gov-blue/20">
              <CardTitle className="text-sm font-bold text-gov-blue flex items-center gap-2">
                <User className="w-4 h-4" /> SECTION A: Applicant Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Name <span className="text-destructive">*</span></Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter full name as per Aadhaar" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date of Birth <span className="text-destructive">*</span></Label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Gender <span className="text-destructive">*</span></Label>
                <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4 pt-1">
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="Male" id="male" />
                    <Label htmlFor="male" className="text-xs">Male</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="Female" id="female" />
                    <Label htmlFor="female" className="text-xs">Female</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mobile Number <span className="text-destructive">*</span></Label>
                <Input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Aadhaar Number <span className="text-destructive">*</span></Label>
                <Input value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="12-digit Aadhaar" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Address</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">District <span className="text-destructive">*</span></Label>
                <Select value={district} onValueChange={setDistrict}>
                  <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Section B */}
          <Card className="border-gov-blue/30">
            <CardHeader className="bg-gov-blue-light py-3 px-4 border-b border-gov-blue/20">
              <CardTitle className="text-sm font-bold text-gov-blue flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> SECTION B: Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Service Type <span className="text-destructive">*</span></Label>
                <Select value={serviceType} onValueChange={handleServiceChange}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATALOG.map((s) => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Purpose <span className="text-destructive">*</span></Label>
                <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose of application" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Application Date</Label>
                <Input value={today} readOnly className="bg-muted" />
              </div>
              {selectedService && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Service Info</Label>
                  <div className="text-xs space-y-1 p-2 bg-muted rounded border">
                    <p>Processing: <strong>{selectedService.processingDays}</strong></p>
                    <p>Validity: <strong>{selectedService.validity}</strong></p>
                    <p>Fee: <strong>₹{selectedFee}</strong></p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={() => setStep(1)} disabled={!canProceedStep0}><ArrowRight className="w-4 h-4 mr-1" /> Next: Attachments</Button>
          </div>
        </div>
      )}

      {/* Step 1: Document Upload */}
      {step === 1 && (
        <div className="space-y-4">
          <Card className="border-gov-blue/30">
            <CardHeader className="bg-gov-blue-light py-3 px-4 border-b border-gov-blue/20">
              <CardTitle className="text-sm font-bold text-gov-blue flex items-center gap-2">
                <Upload className="w-4 h-4" /> SECTION C: Document Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Please select a service type first.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Upload all required documents before continuing to payment.
                  </p>
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gov-blue/5">
                        <TableHead className="w-12 text-xs font-bold">Sl No</TableHead>
                        <TableHead className="text-xs font-bold">Document Name</TableHead>
                        <TableHead className="text-xs font-bold">Upload File</TableHead>
                        <TableHead className="text-xs font-bold">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">{i + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{doc.name}</TableCell>
                          <TableCell>
                            <Input
                              type="file"
                              accept="image/*,.pdf"
                              className="text-xs h-8"
                              onChange={(e) => handleFileChange(i, e.target.files?.[0] || null)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={doc.remarks}
                              onChange={(e) => handleRemarkChange(i, e.target.value)}
                              placeholder="Optional"
                              className="text-xs h-8"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={() => setStep(2)} disabled={!canProceedStep1}><ArrowRight className="w-4 h-4 mr-1" /> Next: Payment</Button>
          </div>
        </div>
      )}

      {/* Step 2: Payment & Declaration */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Section D: Payment */}
          <Card className="border-gov-blue/30">
            <CardHeader className="bg-gov-blue-light py-3 px-4 border-b border-gov-blue/20">
              <CardTitle className="text-sm font-bold text-gov-blue flex items-center gap-2">
                <IndianRupee className="w-4 h-4" /> SECTION D: Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-muted rounded border text-center">
                  <p className="text-xs text-muted-foreground">Service Charge</p>
                  <p className="text-xl font-bold text-gov-blue">₹{selectedFee}</p>
                </div>
                <div className="p-3 bg-muted rounded border text-center">
                  <p className="text-xs text-muted-foreground">Wallet Balance</p>
                  <p className={`text-xl font-bold ${balance >= selectedFee ? "text-gov-green" : "text-destructive"}`}>₹{balance.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-muted rounded border text-center">
                  <p className="text-xs text-muted-foreground">Payment Status</p>
                  <Badge variant={balance >= selectedFee ? "default" : "destructive"} className="mt-1">
                    {balance >= selectedFee ? "Ready to Pay" : "Insufficient"}
                  </Badge>
                </div>
              </div>
              {balance < selectedFee && (
                <p className="text-xs text-destructive">⚠ Please add funds to your wallet before submitting.</p>
              )}
            </CardContent>
          </Card>

          {/* Section E: Declaration */}
          <Card className="border-gov-blue/30">
            <CardHeader className="bg-gov-blue-light py-3 px-4 border-b border-gov-blue/20">
              <CardTitle className="text-sm font-bold text-gov-blue flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> SECTION E: Declaration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start gap-2">
                <Checkbox id="declare" checked={declared} onCheckedChange={(v) => setDeclared(!!v)} />
                <Label htmlFor="declare" className="text-xs leading-relaxed">
                  I hereby declare that all information provided in this application is true and correct to the best of my knowledge and belief. I understand that any false statement may result in rejection of my application.
                </Label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Signature (Full Name) <span className="text-destructive">*</span></Label>
                  <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Type your full name as signature" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Date</Label>
                  <Input value={today} readOnly className="bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}><RotateCcw className="w-4 h-4 mr-1" /> Reset</Button>
              <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
                <Send className="w-4 h-4 mr-1" /> {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

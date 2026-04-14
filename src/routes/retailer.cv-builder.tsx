import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { atomicDebit } from "@/lib/firebase-transactions";
import { CV_TEMPLATES, DEFAULT_CV_FEE, type CVData } from "@/lib/cv-templates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Download, User, Mail, Phone, MapPin, GraduationCap, Briefcase, Target, Check, IndianRupee } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/cv-builder")({
  ssr: false,
  component: CVBuilder,
});

function CVBuilder() {
  const { user } = useAuth();
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [cvFee, setCvFee] = useState(DEFAULT_CV_FEE);
  const [downloading, setDownloading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "",
    objective: "", education: "", experience: "", skills: "",
  });

  useEffect(() => {
    // Fetch admin-configured CV fee
    const fetchFee = async () => {
      try {
        const snap = await getDoc(doc(db, "platformFees", "cv_builder"));
        if (snap.exists()) setCvFee(snap.data().fee || DEFAULT_CV_FEE);
      } catch { /* use default */ }
    };
    fetchFee();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhoto(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    if (!user || downloading) return;
    setDownloading(true);

    try {
      // Debit wallet
      await atomicDebit(user.uid, cvFee, {
        source: "cv_builder",
        description: `CV Builder - ${selectedTemplate} template`,
      });

      // Generate and print
      const template = CV_TEMPLATES.find(t => t.id === selectedTemplate) || CV_TEMPLATES[0];
      const cvData: CVData = { ...form, photo };
      const html = template.generateHTML(cvData);

      const printWindow = window.open("", "_blank");
      if (!printWindow) { toast.error("Popup blocked. Please allow popups."); return; }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();

      toast.success(`CV downloaded! ₹${cvFee} charged from wallet.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to download CV");
    } finally {
      setDownloading(false);
    }
  };

  const field = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  const currentTemplate = CV_TEMPLATES.find(t => t.id === selectedTemplate) || CV_TEMPLATES[0];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CV Builder</h1>
          <p className="text-muted-foreground">Choose a template, fill details, and download as PDF.</p>
        </div>
        <Badge variant="outline" className="text-sm gap-1">
          <IndianRupee className="w-3.5 h-3.5" /> ₹{cvFee} per download
        </Badge>
      </div>

      {/* Template Selector */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Select Template</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {CV_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              className={`relative rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${
                selectedTemplate === t.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {selectedTemplate === t.id && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <div className="flex gap-1 mb-2">
                <div className="w-4 h-8 rounded-sm" style={{ background: t.previewColors.sidebar }} />
                <div className="flex-1 h-8 rounded-sm" style={{ background: t.previewColors.bg, border: '1px solid #e2e8f0' }}>
                  <div className="w-3/4 h-1.5 rounded mt-1.5 ml-1" style={{ background: t.previewColors.accent }} />
                  <div className="w-1/2 h-1 rounded mt-1 ml-1" style={{ background: '#e2e8f0' }} />
                </div>
              </div>
              <p className="text-xs font-semibold">{t.name}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Your Details</CardTitle>
            <CardDescription>Fill in your information below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Photo</Label>
              <Input type="file" accept="image/*" onChange={handlePhotoChange} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Full Name</Label>
              <Input value={form.name} onChange={(e) => field("name", e.target.value)} placeholder="John Doe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => field("email", e.target.value)} placeholder="john@email.com" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Phone</Label>
                <Input value={form.phone} onChange={(e) => field("phone", e.target.value)} placeholder="+91 9876543210" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Address</Label>
              <Input value={form.address} onChange={(e) => field("address", e.target.value)} placeholder="City, State" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Objective</Label>
              <Textarea value={form.objective} onChange={(e) => field("objective", e.target.value)} rows={2} placeholder="Brief career objective..." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Education</Label>
              <Textarea value={form.education} onChange={(e) => field("education", e.target.value)} rows={3} placeholder="Degree, University, Year..." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Experience</Label>
              <Textarea value={form.experience} onChange={(e) => field("experience", e.target.value)} rows={3} placeholder="Company, Role, Duration..." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Skills</Label>
              <Textarea value={form.skills} onChange={(e) => field("skills", e.target.value)} rows={2} placeholder="Skill 1, Skill 2, Skill 3..." />
            </div>
            <Button className="w-full" onClick={handleDownload} disabled={!form.name || downloading}>
              <Download className="w-4 h-4 mr-2" /> {downloading ? "Processing..." : `Download CV (₹${cvFee})`}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-3 overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Live Preview</span>
              <Badge variant="secondary" className="text-[10px]">{currentTemplate.name}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <CVPreview form={form} photo={photo} templateId={selectedTemplate} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Inline preview component for the selected template
function CVPreview({ form, photo, templateId }: { form: Record<string, string>; photo: string | null; templateId: string }) {
  if (templateId === "classic") {
    return (
      <div className="flex min-h-[600px]">
        <div className="w-[200px] bg-primary text-primary-foreground p-5 flex flex-col items-center shrink-0">
          {photo ? (
            <img src={photo} className="w-20 h-20 rounded-full object-cover border-2 border-primary-foreground/30 mb-3" />
          ) : (
            <div className="w-20 h-20 rounded-full border-2 border-primary-foreground/30 mb-3 flex items-center justify-center bg-primary-foreground/10">
              <User className="w-8 h-8 text-primary-foreground/50" />
            </div>
          )}
          <p className="text-base font-bold text-center leading-tight">{form.name || "Your Name"}</p>
          <p className="text-[10px] uppercase tracking-widest text-primary-foreground/60 mt-1 mb-5">Professional</p>
          {(form.email || form.phone || form.address) && (
            <div className="w-full mb-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold border-b border-primary-foreground/20 pb-1 mb-2">Contact</p>
              {form.email && <p className="text-[11px] text-primary-foreground/85 flex items-start gap-1.5 mb-1.5"><Mail className="w-3 h-3 mt-0.5 shrink-0" />{form.email}</p>}
              {form.phone && <p className="text-[11px] text-primary-foreground/85 flex items-start gap-1.5 mb-1.5"><Phone className="w-3 h-3 mt-0.5 shrink-0" />{form.phone}</p>}
              {form.address && <p className="text-[11px] text-primary-foreground/85 flex items-start gap-1.5 mb-1.5"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{form.address}</p>}
            </div>
          )}
          {form.skills && (
            <div className="w-full">
              <p className="text-[10px] uppercase tracking-widest font-semibold border-b border-primary-foreground/20 pb-1 mb-2">Skills</p>
              {form.skills.split(",").map((s, i) => (
                <p key={i} className="text-[11px] text-primary-foreground/85 mb-1">• {s.trim()}</p>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 p-6 space-y-5">
          {form.objective && <PreviewSection icon={<Target className="w-3.5 h-3.5 text-primary" />} title="Career Objective" content={form.objective} />}
          {form.education && <PreviewSection icon={<GraduationCap className="w-3.5 h-3.5 text-primary" />} title="Education" content={form.education} />}
          {form.experience && <PreviewSection icon={<Briefcase className="w-3.5 h-3.5 text-primary" />} title="Work Experience" content={form.experience} />}
        </div>
      </div>
    );
  }

  // Generic preview for other templates
  return (
    <div className="min-h-[600px] p-6 space-y-4" style={{ background: templateId === "bold" ? "#0f172a" : "#fff" }}>
      <div className="text-center pb-4 border-b" style={{ borderColor: templateId === "bold" ? "#334155" : "#e2e8f0" }}>
        {photo && <img src={photo} className="w-16 h-16 rounded-full object-cover mx-auto mb-2 border-2 border-muted" />}
        <p className="text-xl font-bold" style={{ color: templateId === "bold" ? "#f8fafc" : templateId === "elegant" ? "#5b21b6" : "#0f172a" }}>
          {form.name || "Your Name"}
        </p>
        <p className="text-[11px] mt-1" style={{ color: templateId === "bold" ? "#94a3b8" : "#6b7280" }}>
          {[form.email, form.phone, form.address].filter(Boolean).join(" · ")}
        </p>
      </div>
      {form.objective && <GenericSection title="Objective" content={form.objective} templateId={templateId} />}
      {form.education && <GenericSection title="Education" content={form.education} templateId={templateId} />}
      {form.experience && <GenericSection title="Experience" content={form.experience} templateId={templateId} />}
      {form.skills && (
        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{
            color: templateId === "bold" ? "#f59e0b" : templateId === "elegant" ? "#7c3aed" : templateId === "modern" ? "#6366f1" : "#111827"
          }}>Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {form.skills.split(",").map((s, i) => (
              <span key={i} className="text-[10px] px-2.5 py-1 rounded-full font-medium" style={{
                background: templateId === "bold" ? "#1e293b" : templateId === "elegant" ? "#f3e8ff" : templateId === "modern" ? "#eef2ff" : "#f3f4f6",
                color: templateId === "bold" ? "#fbbf24" : templateId === "elegant" ? "#6d28d9" : templateId === "modern" ? "#4338ca" : "#374151",
                border: templateId === "bold" ? "1px solid #334155" : "none",
              }}>{s.trim()}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewSection({ icon, title, content }: { icon: React.ReactNode; title: string; content: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">{icon}<p className="text-xs uppercase tracking-widest font-semibold text-primary">{title}</p></div>
      <div className="border-b border-border mb-2" />
      <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{content}</p>
    </div>
  );
}

function GenericSection({ title, content, templateId }: { title: string; content: string; templateId: string }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{
        color: templateId === "bold" ? "#f59e0b" : templateId === "elegant" ? "#7c3aed" : templateId === "modern" ? "#6366f1" : "#111827"
      }}>{title}</p>
      <div className="border-b mb-2" style={{ borderColor: templateId === "bold" ? "#334155" : "#e2e8f0" }} />
      <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: templateId === "bold" ? "#cbd5e1" : "#4b5563" }}>{content}</p>
    </div>
  );
}

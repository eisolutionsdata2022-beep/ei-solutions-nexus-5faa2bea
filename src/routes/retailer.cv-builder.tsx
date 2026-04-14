import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { atomicDebit } from "@/lib/firebase-transactions";
import { CV_TEMPLATES, DEFAULT_CV_FEE, type CVData, type WorkEntry, type EducationEntry, type LanguageSkill } from "@/lib/cv-templates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Plus, Trash2, Check, IndianRupee, User, Briefcase, GraduationCap, Globe, Cpu, Users, Settings, FileText, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/cv-builder")({
  ssr: false,
  component: CVBuilder,
});

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const emptyWork = (): WorkEntry => ({ title: "", company: "", location: "", from: "", to: "", responsibilities: "" });
const emptyEdu = (): EducationEntry => ({ course: "", institution: "", location: "", year: "", subjects: "" });
const emptyLang = (): LanguageSkill => ({ language: "", listening: "A1", reading: "A1", writing: "A1", speaking: "A1" });

function CVBuilder() {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState("minimal-professional");
  const [cvFee, setCvFee] = useState(DEFAULT_CV_FEE);
  const [downloading, setDownloading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const [personal, setPersonal] = useState({ name: "", address: "", phone: "", email: "", dob: "", nationality: "" });
  const [jobAppliedFor, setJobAppliedFor] = useState("");
  const [work, setWork] = useState<WorkEntry[]>([emptyWork()]);
  const [education, setEducation] = useState<EducationEntry[]>([emptyEdu()]);
  const [languages, setLanguages] = useState<LanguageSkill[]>([emptyLang()]);
  const [digitalSkills, setDigitalSkills] = useState("");
  const [communicationSkills, setCommunicationSkills] = useState("");
  const [organisationalSkills, setOrganisationalSkills] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [annexes, setAnnexes] = useState("");
  const [declarationPlace, setDeclarationPlace] = useState("");
  const [declarationDate, setDeclarationDate] = useState("");

  useEffect(() => {
    const fetchFee = async () => {
      try {
        const snap = await getDoc(doc(db, "platformFees", "cv_builder"));
        if (snap.exists()) setCvFee(snap.data().fee || DEFAULT_CV_FEE);
      } catch { /* use default */ }
    };
    fetchFee();
  }, []);

  const buildCVData = (): CVData => ({
    ...personal,
    photo,
    jobAppliedFor,
    workExperience: work,
    education,
    languages,
    digitalSkills,
    communicationSkills,
    organisationalSkills,
    additionalInfo,
    annexes,
    declarationPlace,
    declarationDate,
  });

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
      await atomicDebit(user.uid, cvFee, { source: "cv_builder", description: `CV Builder - ${selectedTemplate} template` });
      const template = CV_TEMPLATES.find(t => t.id === selectedTemplate) || CV_TEMPLATES[0];
      const html = template.generateHTML(buildCVData());
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

  const steps = [
    { label: "Template", icon: <FileText className="w-3.5 h-3.5" /> },
    { label: "Personal", icon: <User className="w-3.5 h-3.5" /> },
    { label: "Experience", icon: <Briefcase className="w-3.5 h-3.5" /> },
    { label: "Education", icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { label: "Skills", icon: <Cpu className="w-3.5 h-3.5" /> },
    { label: "Finish", icon: <Check className="w-3.5 h-3.5" /> },
  ];

  const previewHTML = (() => {
    const template = CV_TEMPLATES.find(t => t.id === selectedTemplate) || CV_TEMPLATES[0];
    return template.generateHTML(buildCVData());
  })();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Europass CV Builder</h1>
          <p className="text-sm text-muted-foreground">Create professional European-standard CVs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={showPreview ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreview ? "Hide Preview" : "Live Preview"}
          </Button>
          <Badge variant="outline" className="text-sm gap-1">
            <IndianRupee className="w-3.5 h-3.5" /> ₹{cvFee} per download
          </Badge>
        </div>
      </div>

      <div className={`flex gap-5 ${showPreview ? "" : ""}`}>
        {/* Form column */}
        <div className={`space-y-4 ${showPreview ? "w-1/2 min-w-0" : "max-w-4xl w-full"}`}>
          {/* Step indicator */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {steps.map((s, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  step === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* Step 0: Template selection */}
          {step === 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Select Template</CardTitle>
              <CardDescription>Choose from 4 Europass-style templates</CardDescription></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {CV_TEMPLATES.map((t) => (
                    <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                      className={`relative rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${
                        selectedTemplate === t.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                      }`}>
                      {selectedTemplate === t.id && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex gap-1 mb-2">
                        <div className="w-4 h-10 rounded-sm" style={{ background: t.previewColors.sidebar }} />
                        <div className="flex-1 h-10 rounded-sm" style={{ background: t.previewColors.bg, border: "1px solid #e2e8f0" }}>
                          <div className="w-3/4 h-1.5 rounded mt-2 ml-1" style={{ background: t.previewColors.accent }} />
                          <div className="w-1/2 h-1 rounded mt-1 ml-1" style={{ background: "#e2e8f0" }} />
                        </div>
                      </div>
                      <p className="text-xs font-semibold">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{t.description}</p>
                    </button>
                  ))}
                </div>
                <Button className="mt-4" onClick={() => setStep(1)}>Next →</Button>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Personal info */}
          {step === 1 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Personal Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Photo</Label>
                  <Input type="file" accept="image/*" onChange={handlePhotoChange} className="text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Full Name *</Label><Input value={personal.name} onChange={e => setPersonal({...personal, name: e.target.value})} placeholder="John Doe" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input type="email" value={personal.email} onChange={e => setPersonal({...personal, email: e.target.value})} placeholder="john@email.com" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={personal.phone} onChange={e => setPersonal({...personal, phone: e.target.value})} placeholder="+91 9876543210" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Date of Birth</Label><Input value={personal.dob} onChange={e => setPersonal({...personal, dob: e.target.value})} placeholder="01/01/1990" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Nationality</Label><Input value={personal.nationality} onChange={e => setPersonal({...personal, nationality: e.target.value})} placeholder="Indian" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Address</Label><Input value={personal.address} onChange={e => setPersonal({...personal, address: e.target.value})} placeholder="City, State, Country" /></div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Job Applied For / Position</Label>
                  <Input value={jobAppliedFor} onChange={e => setJobAppliedFor(e.target.value)} placeholder="e.g. Customer Support Executive" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(0)}>← Back</Button>
                  <Button onClick={() => setStep(2)}>Next →</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Work Experience */}
          {step === 2 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /> Work Experience</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {work.map((w, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">Experience {i + 1}</Badge>
                      {work.length > 1 && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => setWork(work.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3" /></Button>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-xs">Job Title</Label><Input value={w.title} onChange={e => { const a = [...work]; a[i] = {...a[i], title: e.target.value}; setWork(a); }} placeholder="Software Developer" /></div>
                      <div className="space-y-1"><Label className="text-xs">Company</Label><Input value={w.company} onChange={e => { const a = [...work]; a[i] = {...a[i], company: e.target.value}; setWork(a); }} placeholder="Company Name" /></div>
                      <div className="space-y-1"><Label className="text-xs">Location</Label><Input value={w.location} onChange={e => { const a = [...work]; a[i] = {...a[i], location: e.target.value}; setWork(a); }} placeholder="City" /></div>
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1"><Label className="text-xs">From</Label><Input value={w.from} onChange={e => { const a = [...work]; a[i] = {...a[i], from: e.target.value}; setWork(a); }} placeholder="2020" /></div>
                        <div className="flex-1 space-y-1"><Label className="text-xs">To</Label><Input value={w.to} onChange={e => { const a = [...work]; a[i] = {...a[i], to: e.target.value}; setWork(a); }} placeholder="Present" /></div>
                      </div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Responsibilities</Label><Textarea value={w.responsibilities} onChange={e => { const a = [...work]; a[i] = {...a[i], responsibilities: e.target.value}; setWork(a); }} rows={2} placeholder="- Responsibility 1&#10;- Achievement" /></div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setWork([...work, emptyWork()])}><Plus className="w-3 h-3" /> Add Experience</Button>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                  <Button onClick={() => setStep(3)}>Next →</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Education */}
          {step === 3 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" /> Education and Training</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {education.map((ed, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">Education {i + 1}</Badge>
                      {education.length > 1 && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => setEducation(education.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3" /></Button>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-xs">Course / Degree</Label><Input value={ed.course} onChange={e => { const a = [...education]; a[i] = {...a[i], course: e.target.value}; setEducation(a); }} placeholder="BSc Computer Science" /></div>
                      <div className="space-y-1"><Label className="text-xs">Institution</Label><Input value={ed.institution} onChange={e => { const a = [...education]; a[i] = {...a[i], institution: e.target.value}; setEducation(a); }} placeholder="University Name" /></div>
                      <div className="space-y-1"><Label className="text-xs">Location</Label><Input value={ed.location} onChange={e => { const a = [...education]; a[i] = {...a[i], location: e.target.value}; setEducation(a); }} placeholder="City" /></div>
                      <div className="space-y-1"><Label className="text-xs">Year</Label><Input value={ed.year} onChange={e => { const a = [...education]; a[i] = {...a[i], year: e.target.value}; setEducation(a); }} placeholder="2018-2022" /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Key Subjects / Skills</Label><Textarea value={ed.subjects} onChange={e => { const a = [...education]; a[i] = {...a[i], subjects: e.target.value}; setEducation(a); }} rows={2} placeholder="Key subjects covered..." /></div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setEducation([...education, emptyEdu()])}><Plus className="w-3 h-3" /> Add Education</Button>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
                  <Button onClick={() => setStep(4)}>Next →</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Skills */}
          {step === 4 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Skills</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1 mb-2">🗣 Language Skills</Label>
                  {languages.map((l, i) => (
                    <div key={i} className="border rounded-lg p-3 mb-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <Input value={l.language} onChange={e => { const a = [...languages]; a[i] = {...a[i], language: e.target.value}; setLanguages(a); }} placeholder="Language name" className="w-40 h-8 text-xs" />
                        {languages.length > 1 && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => setLanguages(languages.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3" /></Button>}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {(["listening", "reading", "writing", "speaking"] as const).map(sk => (
                          <div key={sk} className="space-y-1">
                            <Label className="text-[10px] capitalize">{sk}</Label>
                            <Select value={l[sk]} onValueChange={v => { const a = [...languages]; a[i] = {...a[i], [sk]: v}; setLanguages(a); }}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{LEVELS.map(lv => <SelectItem key={lv} value={lv}>{lv}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setLanguages([...languages, emptyLang()])}><Plus className="w-3 h-3" /> Add Language</Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">💻 Digital Skills</Label>
                  <Textarea value={digitalSkills} onChange={e => setDigitalSkills(e.target.value)} rows={2} placeholder="MS Office, Internet & Email, Software tools..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">🤝 Communication Skills</Label>
                  <Textarea value={communicationSkills} onChange={e => setCommunicationSkills(e.target.value)} rows={2} placeholder="Good communication ability, customer handling, teamwork..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">🧩 Organisational Skills</Label>
                  <Textarea value={organisationalSkills} onChange={e => setOrganisationalSkills(e.target.value)} rows={2} placeholder="Time management, leadership, problem solving..." />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(3)}>← Back</Button>
                  <Button onClick={() => setStep(5)}>Next →</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Finish */}
          {step === 5 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Additional & Declaration</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">📄 Additional Information</Label>
                  <Textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} rows={2} placeholder="Certifications, projects, achievements..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">📎 Annexes</Label>
                  <Textarea value={annexes} onChange={e => setAnnexes(e.target.value)} rows={2} placeholder="Aadhaar / ID Proof, certificates, experience letters..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Declaration Place</Label><Input value={declarationPlace} onChange={e => setDeclarationPlace(e.target.value)} placeholder="City name" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Declaration Date</Label><Input value={declarationDate} onChange={e => setDeclarationDate(e.target.value)} placeholder="14/04/2026" /></div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setStep(4)}>← Back</Button>
                  <Button className="flex-1 gap-2" onClick={handleDownload} disabled={!personal.name || downloading}>
                    <Download className="w-4 h-4" /> {downloading ? "Processing..." : `Download CV (₹${cvFee})`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Live Preview column */}
        {showPreview && (
          <div className="w-1/2 min-w-0 sticky top-4 self-start">
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-primary" /> Live Preview</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{CV_TEMPLATES.find(t => t.id === selectedTemplate)?.name}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[70vh] overflow-auto bg-muted/30">
                  <iframe
                    srcDoc={previewHTML}
                    title="CV Preview"
                    className="w-full border-0"
                    style={{ height: "1123px", transform: "scale(0.55)", transformOrigin: "top left", width: "182%" }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

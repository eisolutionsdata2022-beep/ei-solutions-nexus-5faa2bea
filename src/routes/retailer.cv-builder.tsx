import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { atomicDebit } from "@/lib/firebase-transactions";
import {
  ALL_TEMPLATES,
  DEFAULT_CV_FEE,
  findTemplate,
  type CVTemplate,
  type CVData,
  type WorkEntry,
  type EducationEntry,
  type LanguageSkill,
  type TemplateCustomization,
} from "@/lib/cv-template-engine";
import { saveCVDraft, loadCVDraft } from "@/lib/cv-draft";
import { TemplateGallery } from "@/components/cv/TemplateGallery";
import { CustomizationPanel } from "@/components/cv/CustomizationPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Download, Plus, Trash2, IndianRupee, User, Briefcase, GraduationCap,
  Cpu, FileText, Eye, ArrowLeft, Save, Sparkles, Settings2, Maximize2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/cv-builder")({
  ssr: false,
  component: CVBuilder,
});

const emptyWork = (): WorkEntry => ({ title: "", company: "", location: "", from: "", to: "", responsibilities: "" });
const emptyEdu = (): EducationEntry => ({ course: "", institution: "", location: "", year: "", subjects: "" });
const emptyLang = (): LanguageSkill => ({ language: "", listening: "B1", reading: "B1", writing: "B1", speaking: "B1" });

const DEFAULT_SECTION_ORDER = ["objective", "experience", "education", "skills", "languages", "certifications", "additional"];

type Phase = "gallery" | "form";

function CVBuilder() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("gallery");
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>(ALL_TEMPLATES[0]);
  const [customization, setCustomization] = useState<TemplateCustomization>({ fontScale: 1 });
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [cvFee, setCvFee] = useState(DEFAULT_CV_FEE);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullPreview, setFullPreview] = useState(false);

  // Form state
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [personal, setPersonal] = useState({ name: "", address: "", phone: "", email: "", dob: "", nationality: "" });
  const [jobAppliedFor, setJobAppliedFor] = useState("");
  const [careerObjective, setCareerObjective] = useState("");
  const [work, setWork] = useState<WorkEntry[]>([emptyWork()]);
  const [education, setEducation] = useState<EducationEntry[]>([emptyEdu()]);
  const [languages, setLanguages] = useState<LanguageSkill[]>([emptyLang()]);
  const [digitalSkills, setDigitalSkills] = useState("");
  const [communicationSkills, setCommunicationSkills] = useState("");
  const [organisationalSkills, setOrganisationalSkills] = useState("");
  const [certifications, setCertifications] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [declarationPlace, setDeclarationPlace] = useState("");
  const [declarationDate, setDeclarationDate] = useState("");

  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // Load fee + draft on mount
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "platformFees", "cv_builder"));
        if (snap.exists()) setCvFee(snap.data().fee || DEFAULT_CV_FEE);
      } catch { /* default */ }
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const draft = await loadCVDraft(user.uid);
        if (!draft) return;
        const t = findTemplate(draft.templateId);
        if (t) setSelectedTemplate(t);
        setCustomization(draft.customization || { fontScale: 1 });
        setSectionOrder(draft.sectionOrder?.length ? draft.sectionOrder : DEFAULT_SECTION_ORDER);
        const d = draft.data;
        if (d) {
          setPhoto(d.photo || null);
          setSignature(d.signature || null);
          setPersonal({
            name: d.name || "", address: d.address || "", phone: d.phone || "",
            email: d.email || "", dob: d.dob || "", nationality: d.nationality || "",
          });
          setJobAppliedFor(d.jobAppliedFor || "");
          setCareerObjective(d.careerObjective || "");
          setWork(d.workExperience?.length ? d.workExperience : [emptyWork()]);
          setEducation(d.education?.length ? d.education : [emptyEdu()]);
          setLanguages(d.languages?.length ? d.languages : [emptyLang()]);
          setDigitalSkills(d.digitalSkills || "");
          setCommunicationSkills(d.communicationSkills || "");
          setOrganisationalSkills(d.organisationalSkills || "");
          setCertifications(d.certifications || "");
          setAdditionalInfo(d.additionalInfo || "");
          setDeclarationPlace(d.declarationPlace || "");
          setDeclarationDate(d.declarationDate || "");
          toast.info("Draft restored");
        }
      } catch { /* no draft */ }
    })();
  }, [user]);

  const cvData: CVData = useMemo(() => ({
    ...personal,
    photo,
    signature,
    jobAppliedFor,
    careerObjective,
    workExperience: work,
    education,
    languages,
    digitalSkills,
    communicationSkills,
    organisationalSkills,
    certifications,
    additionalInfo,
    annexes: "",
    declarationPlace,
    declarationDate,
  }), [personal, photo, signature, jobAppliedFor, careerObjective, work, education, languages, digitalSkills, communicationSkills, organisationalSkills, certifications, additionalInfo, declarationPlace, declarationDate]);

  const html = useMemo(() => selectedTemplate.generateHTML(cvData, customization), [selectedTemplate, cvData, customization]);

  // Update iframe live
  useEffect(() => {
    const iframe = previewIframeRef.current;
    if (!iframe) return;
    const t = setTimeout(() => {
      try {
        iframe.srcdoc = html;
      } catch { /* noop */ }
    }, 150);
    return () => clearTimeout(t);
  }, [html]);

  const handleFileToDataURL = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveDraft = async () => {
    if (!user) { toast.error("Please log in"); return; }
    setSaving(true);
    try {
      await saveCVDraft(user.uid, {
        templateId: selectedTemplate.id,
        data: cvData,
        customization,
        sectionOrder,
      });
      toast.success("Draft saved — you can return anytime");
    } catch (e: any) {
      toast.error(e.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!user || downloading) return;
    if (!personal.name.trim()) {
      toast.error("Please enter your name first");
      return;
    }
    setDownloading(true);
    try {
      await atomicDebit(user.uid, cvFee, {
        source: "cv_builder",
        description: `CV Builder - ${selectedTemplate.name}`,
      });
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Popup blocked. Please allow popups for this site.");
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      // Wait for fonts/images to load before printing
      setTimeout(() => {
        try { printWindow.focus(); printWindow.print(); } catch { /* noop */ }
      }, 800);
      toast.success(`CV ready! ₹${cvFee} debited from wallet.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate CV");
    } finally {
      setDownloading(false);
    }
  };

  // ─── Gallery phase ───
  if (phase === "gallery") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              CV Builder Studio
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose from {ALL_TEMPLATES.length}+ professional templates · 16 categories · Live preview
            </p>
          </div>
          <Badge variant="outline" className="text-sm gap-1">
            <IndianRupee className="w-3.5 h-3.5" /> ₹{cvFee} per download
          </Badge>
        </div>

        <Card>
          <CardContent className="pt-5">
            <TemplateGallery
              selectedId={selectedTemplate.id}
              onSelect={(t) => setSelectedTemplate(t)}
              onContinue={() => setPhase("form")}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Form phase with live preview ───
  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap sticky top-0 z-20 bg-background/95 backdrop-blur py-2 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setPhase("gallery")}>
            <ArrowLeft className="w-4 h-4" /> Templates
          </Button>
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Using:</span>
            <Badge variant="secondary" className="font-semibold">{selectedTemplate.name}</Badge>
            <Badge variant="outline" className="text-[10px]">{selectedTemplate.category}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFullPreview(true)}>
            <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSaveDraft} disabled={saving}>
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleDownload} disabled={downloading}>
            <Download className="w-3.5 h-3.5" /> {downloading ? "Processing..." : `Download ₹${cvFee}`}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* LEFT — Form */}
        <div className="space-y-3 min-w-0">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid grid-cols-5 h-auto">
              <TabsTrigger value="personal" className="text-[11px] gap-1 py-1.5"><User className="w-3 h-3" /> Personal</TabsTrigger>
              <TabsTrigger value="experience" className="text-[11px] gap-1 py-1.5"><Briefcase className="w-3 h-3" /> Work</TabsTrigger>
              <TabsTrigger value="education" className="text-[11px] gap-1 py-1.5"><GraduationCap className="w-3 h-3" /> Edu</TabsTrigger>
              <TabsTrigger value="skills" className="text-[11px] gap-1 py-1.5"><Cpu className="w-3 h-3" /> Skills</TabsTrigger>
              <TabsTrigger value="customize" className="text-[11px] gap-1 py-1.5"><Settings2 className="w-3 h-3" /> Style</TabsTrigger>
            </TabsList>

            {/* Personal */}
            <TabsContent value="personal" className="mt-3">
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Photo</Label><Input type="file" accept="image/*" onChange={e => handleFileToDataURL(e, setPhoto)} className="text-xs h-9" /></div>
                    <div className="space-y-1"><Label className="text-xs">Signature</Label><Input type="file" accept="image/*" onChange={e => handleFileToDataURL(e, setSignature)} className="text-xs h-9" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Full Name *</Label><Input value={personal.name} onChange={e => setPersonal({ ...personal, name: e.target.value })} placeholder="John Doe" /></div>
                    <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={personal.email} onChange={e => setPersonal({ ...personal, email: e.target.value })} placeholder="john@email.com" /></div>
                    <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={personal.phone} onChange={e => setPersonal({ ...personal, phone: e.target.value })} placeholder="+91 9876543210" /></div>
                    <div className="space-y-1"><Label className="text-xs">Date of Birth</Label><Input value={personal.dob} onChange={e => setPersonal({ ...personal, dob: e.target.value })} placeholder="01/01/1995" /></div>
                    <div className="space-y-1"><Label className="text-xs">Nationality</Label><Input value={personal.nationality} onChange={e => setPersonal({ ...personal, nationality: e.target.value })} placeholder="Indian" /></div>
                    <div className="space-y-1"><Label className="text-xs">Address</Label><Input value={personal.address} onChange={e => setPersonal({ ...personal, address: e.target.value })} placeholder="City, State" /></div>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Position Applying For</Label><Input value={jobAppliedFor} onChange={e => setJobAppliedFor(e.target.value)} placeholder="e.g. Senior Software Developer" /></div>
                  <div className="space-y-1"><Label className="text-xs">Career Objective / Profile Summary</Label><Textarea value={careerObjective} onChange={e => setCareerObjective(e.target.value)} rows={3} placeholder="A brief summary highlighting your strengths and goals..." /></div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Experience */}
            <TabsContent value="experience" className="mt-3">
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-base">Work Experience</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {work.map((w, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-[10px]">Experience {i + 1}</Badge>
                        {work.length > 1 && (
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => setWork(work.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3" /></Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><Label className="text-xs">Job Title</Label><Input value={w.title} onChange={e => { const a = [...work]; a[i] = { ...a[i], title: e.target.value }; setWork(a); }} placeholder="Software Developer" /></div>
                        <div className="space-y-1"><Label className="text-xs">Company</Label><Input value={w.company} onChange={e => { const a = [...work]; a[i] = { ...a[i], company: e.target.value }; setWork(a); }} placeholder="Company Name" /></div>
                        <div className="space-y-1"><Label className="text-xs">Location</Label><Input value={w.location} onChange={e => { const a = [...work]; a[i] = { ...a[i], location: e.target.value }; setWork(a); }} placeholder="City" /></div>
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-1"><Label className="text-xs">From</Label><Input value={w.from} onChange={e => { const a = [...work]; a[i] = { ...a[i], from: e.target.value }; setWork(a); }} placeholder="2020" /></div>
                          <div className="flex-1 space-y-1"><Label className="text-xs">To</Label><Input value={w.to} onChange={e => { const a = [...work]; a[i] = { ...a[i], to: e.target.value }; setWork(a); }} placeholder="Present" /></div>
                        </div>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Responsibilities & Achievements</Label><Textarea value={w.responsibilities} onChange={e => { const a = [...work]; a[i] = { ...a[i], responsibilities: e.target.value }; setWork(a); }} rows={3} placeholder="• Built scalable APIs serving 1M+ users&#10;• Led a team of 5 engineers" /></div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setWork([...work, emptyWork()])}><Plus className="w-3 h-3" /> Add Experience</Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Education */}
            <TabsContent value="education" className="mt-3">
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-base">Education</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {education.map((ed, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-[10px]">Education {i + 1}</Badge>
                        {education.length > 1 && (
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => setEducation(education.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3" /></Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><Label className="text-xs">Course / Degree</Label><Input value={ed.course} onChange={e => { const a = [...education]; a[i] = { ...a[i], course: e.target.value }; setEducation(a); }} placeholder="B.Tech Computer Science" /></div>
                        <div className="space-y-1"><Label className="text-xs">Institution</Label><Input value={ed.institution} onChange={e => { const a = [...education]; a[i] = { ...a[i], institution: e.target.value }; setEducation(a); }} placeholder="University Name" /></div>
                        <div className="space-y-1"><Label className="text-xs">Location</Label><Input value={ed.location} onChange={e => { const a = [...education]; a[i] = { ...a[i], location: e.target.value }; setEducation(a); }} placeholder="City" /></div>
                        <div className="space-y-1"><Label className="text-xs">Year</Label><Input value={ed.year} onChange={e => { const a = [...education]; a[i] = { ...a[i], year: e.target.value }; setEducation(a); }} placeholder="2018-2022" /></div>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Subjects / Achievements</Label><Textarea value={ed.subjects} onChange={e => { const a = [...education]; a[i] = { ...a[i], subjects: e.target.value }; setEducation(a); }} rows={2} placeholder="Specialization, GPA, key subjects..." /></div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setEducation([...education, emptyEdu()])}><Plus className="w-3 h-3" /> Add Education</Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skills */}
            <TabsContent value="skills" className="mt-3">
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-base">Skills & More</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Digital / Technical Skills (comma separated)</Label>
                    <Textarea value={digitalSkills} onChange={e => setDigitalSkills(e.target.value)} rows={2} placeholder="React, Node.js, Python, AWS, Docker" />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Languages Known</Label>
                    {languages.map((l, i) => (
                      <div key={i} className="border rounded-lg p-2 mb-2 bg-muted/20">
                        <div className="flex items-center justify-between mb-1.5">
                          <Input value={l.language} onChange={e => { const a = [...languages]; a[i] = { ...a[i], language: e.target.value }; setLanguages(a); }} placeholder="Language" className="w-44 h-8 text-xs" />
                          {languages.length > 1 && <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => setLanguages(languages.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3" /></Button>}
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(["listening", "reading", "writing", "speaking"] as const).map(k => (
                            <div key={k}>
                              <Label className="text-[9px] capitalize text-muted-foreground">{k}</Label>
                              <select value={l[k]} onChange={e => { const a = [...languages]; a[i] = { ...a[i], [k]: e.target.value }; setLanguages(a); }} className="w-full h-7 text-xs border rounded px-1 bg-background">
                                {["A1", "A2", "B1", "B2", "C1", "C2", "Native"].map(lvl => <option key={lvl}>{lvl}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setLanguages([...languages, emptyLang()])}><Plus className="w-3 h-3" /> Add Language</Button>
                  </div>

                  <div className="space-y-1"><Label className="text-xs">Communication Skills</Label><Textarea value={communicationSkills} onChange={e => setCommunicationSkills(e.target.value)} rows={2} placeholder="Strong written and verbal communication..." /></div>
                  <div className="space-y-1"><Label className="text-xs">Organisational Skills</Label><Textarea value={organisationalSkills} onChange={e => setOrganisationalSkills(e.target.value)} rows={2} placeholder="Team leadership, project management..." /></div>
                  <div className="space-y-1"><Label className="text-xs">Certifications</Label><Textarea value={certifications} onChange={e => setCertifications(e.target.value)} rows={2} placeholder="• AWS Certified Solutions Architect&#10;• Google PMP" /></div>
                  <div className="space-y-1"><Label className="text-xs">Additional Information</Label><Textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} rows={2} placeholder="Hobbies, interests, references..." /></div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <div className="space-y-1"><Label className="text-xs">Declaration Place</Label><Input value={declarationPlace} onChange={e => setDeclarationPlace(e.target.value)} placeholder="Mumbai" /></div>
                    <div className="space-y-1"><Label className="text-xs">Declaration Date</Label><Input value={declarationDate} onChange={e => setDeclarationDate(e.target.value)} placeholder="01/01/2024" /></div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Customize */}
            <TabsContent value="customize" className="mt-3">
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-base">Customize Style</CardTitle></CardHeader>
                <CardContent>
                  <CustomizationPanel
                    customization={customization}
                    onChange={setCustomization}
                    defaultAccent={selectedTemplate.palette.primary}
                    sectionOrder={sectionOrder}
                    onReorder={setSectionOrder}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT — Live preview */}
        <div className="hidden lg:block sticky top-16 h-[calc(100vh-5rem)]">
          <Card className="h-full flex flex-col">
            <CardHeader className="py-2.5 px-4 border-b flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-primary" /> Live Preview
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">A4 · {selectedTemplate.layout}</Badge>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <iframe ref={previewIframeRef} className="w-full h-full border-0" title="CV Preview" sandbox="allow-same-origin" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fullscreen preview modal */}
      {fullPreview && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Fullscreen Preview · {selectedTemplate.name}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleDownload} disabled={downloading} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Download ₹{cvFee}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setFullPreview(false)}>Close</Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-muted p-6 flex justify-center">
            <iframe srcDoc={html} className="w-full max-w-[820px] h-full bg-white shadow-2xl border-0" title="Fullscreen Preview" sandbox="allow-same-origin" />
          </div>
        </div>
      )}
    </div>
  );
}

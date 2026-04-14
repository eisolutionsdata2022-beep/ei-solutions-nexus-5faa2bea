import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, User, Mail, Phone, MapPin, GraduationCap, Briefcase, Target, Wrench } from "lucide-react";

export const Route = createFileRoute("/retailer/cv-builder")({
  ssr: false,
  component: CVBuilder,
});

function CVBuilder() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "",
    objective: "", education: "", experience: "", skills: "",
  });
  const printRef = useRef<HTMLDivElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhoto(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>CV - ${form.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Open+Sans:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Open Sans', sans-serif; color: #2d3748; max-width: 800px; margin: 0 auto; }
        .cv-container { display: flex; min-height: 100vh; }
        .sidebar { width: 260px; background: linear-gradient(180deg, #1a365d 0%, #2b4c7e 100%); color: #fff; padding: 40px 24px; }
        .main { flex: 1; padding: 40px 32px; background: #fff; }
        .photo-container { width: 120px; height: 120px; border-radius: 50%; overflow: hidden; border: 4px solid rgba(255,255,255,0.3); margin: 0 auto 20px; }
        .photo-container img { width: 100%; height: 100%; object-fit: cover; }
        .photo-placeholder { width: 120px; height: 120px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.3); margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); font-size: 40px; color: rgba(255,255,255,0.5); }
        .sidebar-name { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 4px; letter-spacing: 0.5px; }
        .sidebar-title { font-size: 12px; text-align: center; color: rgba(255,255,255,0.7); margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }
        .sidebar-section { margin-bottom: 24px; }
        .sidebar-section-title { font-family: 'Poppins', sans-serif; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid rgba(255,255,255,0.2); }
        .sidebar-item { font-size: 13px; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; color: rgba(255,255,255,0.9); }
        .sidebar-icon { font-size: 12px; margin-top: 3px; opacity: 0.7; }
        .main-name { font-family: 'Poppins', sans-serif; font-size: 32px; font-weight: 700; color: #1a365d; margin-bottom: 4px; }
        .main-section { margin-bottom: 28px; }
        .main-section-title { font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #1a365d; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; position: relative; }
        .main-section-title::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 40px; height: 2px; background: #3182ce; }
        .main-content { font-size: 14px; line-height: 1.8; color: #4a5568; white-space: pre-line; }
        .skill-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .skill-tag { background: #ebf4ff; color: #2b6cb0; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; }
      </style></head><body>
      <div class="cv-container">
        <div class="sidebar">
          ${photo ? `<div class="photo-container"><img src="${photo}" /></div>` : `<div class="photo-placeholder">👤</div>`}
          <div class="sidebar-name">${form.name || "Your Name"}</div>
          <div class="sidebar-title">Professional</div>
          
          <div class="sidebar-section">
            <div class="sidebar-section-title">Contact</div>
            ${form.email ? `<div class="sidebar-item"><span class="sidebar-icon">✉</span> ${form.email}</div>` : ""}
            ${form.phone ? `<div class="sidebar-item"><span class="sidebar-icon">☎</span> ${form.phone}</div>` : ""}
            ${form.address ? `<div class="sidebar-item"><span class="sidebar-icon">📍</span> ${form.address}</div>` : ""}
          </div>
          
          ${form.skills ? `
          <div class="sidebar-section">
            <div class="sidebar-section-title">Skills</div>
            ${form.skills.split(",").map((s: string) => `<div class="sidebar-item">• ${s.trim()}</div>`).join("")}
          </div>` : ""}
        </div>
        <div class="main">
          ${form.objective ? `<div class="main-section"><div class="main-section-title">Career Objective</div><div class="main-content">${form.objective}</div></div>` : ""}
          ${form.education ? `<div class="main-section"><div class="main-section-title">Education</div><div class="main-content">${form.education}</div></div>` : ""}
          ${form.experience ? `<div class="main-section"><div class="main-section-title">Work Experience</div><div class="main-content">${form.experience}</div></div>` : ""}
        </div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const field = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CV Builder</h1>
        <p className="text-muted-foreground">Create a professional CV and download as PDF.</p>
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
            <Button className="w-full" onClick={handleDownload} disabled={!form.name}>
              <Download className="w-4 h-4 mr-2" /> Download CV as PDF
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-3 overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-sm">Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={printRef} className="flex min-h-[600px]">
              {/* Sidebar */}
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

              {/* Main content */}
              <div className="flex-1 p-6 space-y-5">
                {form.objective && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs uppercase tracking-widest font-semibold text-primary">Career Objective</p>
                    </div>
                    <div className="border-b border-border mb-2" />
                    <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{form.objective}</p>
                  </div>
                )}
                {form.education && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs uppercase tracking-widest font-semibold text-primary">Education</p>
                    </div>
                    <div className="border-b border-border mb-2" />
                    <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{form.education}</p>
                  </div>
                )}
                {form.experience && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs uppercase tracking-widest font-semibold text-primary">Work Experience</p>
                    </div>
                    <div className="border-b border-border mb-2" />
                    <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{form.experience}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, FileText, Upload } from "lucide-react";

export const Route = createFileRoute("/retailer/cv-builder")({
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
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
        .header { display: flex; gap: 20px; align-items: center; margin-bottom: 30px; border-bottom: 3px solid #0A3D91; padding-bottom: 20px; }
        .photo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #0A3D91; }
        .name { font-size: 28px; font-weight: bold; color: #0A3D91; }
        .contact { font-size: 13px; color: #666; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 16px; font-weight: bold; color: #0A3D91; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; }
        .content { font-size: 14px; line-height: 1.6; white-space: pre-line; }
      </style></head><body>
      <div class="header">
        ${photo ? `<img src="${photo}" class="photo" />` : ""}
        <div>
          <div class="name">${form.name}</div>
          <div class="contact">${form.email} | ${form.phone}</div>
          <div class="contact">${form.address}</div>
        </div>
      </div>
      ${form.objective ? `<div class="section"><div class="section-title">Objective</div><div class="content">${form.objective}</div></div>` : ""}
      ${form.education ? `<div class="section"><div class="section-title">Education</div><div class="content">${form.education}</div></div>` : ""}
      ${form.experience ? `<div class="section"><div class="section-title">Experience</div><div class="content">${form.experience}</div></div>` : ""}
      ${form.skills ? `<div class="section"><div class="section-title">Skills</div><div class="content">${form.skills}</div></div>` : ""}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CV Builder</h1>
        <p className="text-muted-foreground">Create your professional CV and download as PDF.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Your Details</CardTitle>
            <CardDescription>Fill in your information below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Photo</Label>
              <Input type="file" accept="image/*" onChange={handlePhotoChange} />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Objective</Label>
              <Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Education</Label>
              <Textarea value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} rows={3} placeholder="Degree, University, Year..." />
            </div>
            <div className="space-y-2">
              <Label>Experience</Label>
              <Textarea value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} rows={3} placeholder="Company, Role, Duration..." />
            </div>
            <div className="space-y-2">
              <Label>Skills</Label>
              <Textarea value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} rows={2} placeholder="Skill 1, Skill 2..." />
            </div>
            <Button className="w-full" onClick={handleDownload} disabled={!form.name}>
              <Download className="w-4 h-4 mr-2" /> Download CV as PDF
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent>
            <div ref={printRef} className="text-sm space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b-2 border-primary">
                {photo && <img src={photo} className="w-16 h-16 rounded-full object-cover border-2 border-primary" />}
                <div>
                  <p className="text-xl font-bold text-primary">{form.name || "Your Name"}</p>
                  <p className="text-xs text-muted-foreground">{form.email} {form.phone && `| ${form.phone}`}</p>
                  {form.address && <p className="text-xs text-muted-foreground">{form.address}</p>}
                </div>
              </div>
              {form.objective && (
                <div>
                  <p className="font-semibold text-primary text-xs uppercase border-b border-border pb-1 mb-1">Objective</p>
                  <p className="text-xs text-foreground whitespace-pre-line">{form.objective}</p>
                </div>
              )}
              {form.education && (
                <div>
                  <p className="font-semibold text-primary text-xs uppercase border-b border-border pb-1 mb-1">Education</p>
                  <p className="text-xs text-foreground whitespace-pre-line">{form.education}</p>
                </div>
              )}
              {form.experience && (
                <div>
                  <p className="font-semibold text-primary text-xs uppercase border-b border-border pb-1 mb-1">Experience</p>
                  <p className="text-xs text-foreground whitespace-pre-line">{form.experience}</p>
                </div>
              )}
              {form.skills && (
                <div>
                  <p className="font-semibold text-primary text-xs uppercase border-b border-border pb-1 mb-1">Skills</p>
                  <p className="text-xs text-foreground whitespace-pre-line">{form.skills}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

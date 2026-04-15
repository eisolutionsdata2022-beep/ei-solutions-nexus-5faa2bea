import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { createCustomFormSubmission } from "@/lib/custom-form-submission";
import type { CustomForm, FormSubmission } from "@/lib/custom-forms";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Send, ArrowLeft, CheckCircle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/forms")({
  ssr: false,
  component: RetailerForms,
});

function RetailerForms() {
  const { appUser } = useAuth();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [selectedForm, setSelectedForm] = useState<CustomForm | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [fileInputs, setFileInputs] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "customForms"), where("active", "==", true)),
      (snap) => {
        setForms(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomForm)));
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!appUser?.uid) return;
    const unsub = onSnapshot(
      query(collection(db, "formSubmissions"), where("userId", "==", appUser.uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FormSubmission));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSubmissions(list);
      }
    );
    return unsub;
  }, [appUser?.uid]);

  const openForm = (form: CustomForm) => {
    setSelectedForm(form);
    setFormData({});
    setFileInputs({});
  };

  const handleSubmit = async () => {
    if (!selectedForm || !appUser) return;

    // Validate required fields
    for (const field of selectedForm.fields) {
      if (field.required) {
        if (field.type === "file") {
          if (!fileInputs[field.id]) {
            toast.error(`"${field.label}" is required`);
            return;
          }
        } else if (!formData[field.id]?.trim()) {
          toast.error(`"${field.label}" is required`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const fileUrls: { fieldId: string; fileName: string; url: string }[] = [];
      for (const [fieldId, file] of Object.entries(fileInputs)) {
        if (!file) continue;
        try {
          const path = `formUploads/${appUser.uid}/${Date.now()}_${file.name}`;
          const storageRef = ref(storage, path);
          const uploadPromise = uploadBytes(storageRef, file);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("File upload timed out. Please try again.")), 30000)
          );
          await Promise.race([uploadPromise, timeoutPromise]);
          const url = await getDownloadURL(storageRef);
          fileUrls.push({ fieldId, fileName: file.name, url });
        } catch (uploadErr: any) {
          console.error("File upload error:", uploadErr);
          throw new Error(`File "${file.name}" upload failed: ${uploadErr?.message || "Unknown error"}`);
        }
      }

      const now = new Date().toISOString();
      await addDoc(collection(db, "formSubmissions"), {
        formId: selectedForm.id,
        formTitle: selectedForm.title,
        userId: appUser.uid,
        userEmail: appUser.email || "",
        userName: appUser.name || appUser.email || "",
        data: formData,
        fileUrls,
        status: "Pending",
        applicationNo: "",
        staffRemark: "",
        reviewedBy: "",
        reviewedAt: "",
        createdAt: now,
      });

      toast.success("Form submitted successfully!");
      setSelectedForm(null);
    } catch (err: any) {
      console.error("Form submission error:", err);
      toast.error(err?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "Verified") return <CheckCircle className="w-4 h-4 text-primary" />;
    if (status === "Rejected") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Forms</h1>
        <p className="text-muted-foreground">Fill and submit forms assigned by admin.</p>
      </div>

      {/* Available Forms */}
      {forms.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Available Forms</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {forms.map((form) => (
              <Card key={form.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openForm(form)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{form.title}</CardTitle>
                  {form.description && <CardDescription>{form.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{form.fields?.length || 0} field(s)</p>
                  <Button size="sm" className="mt-3">
                    <Send className="w-3.5 h-3.5 mr-1" /> Fill Form
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {forms.length === 0 && submissions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No forms available at the moment.</p>
          </CardContent>
        </Card>
      )}

      {/* My Submissions */}
      {submissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Submissions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>App No.</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.formTitle}</TableCell>
                      <TableCell className="text-sm">{new Date(sub.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {statusIcon(sub.status)}
                          <span className="text-sm">{sub.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{sub.applicationNo || "—"}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{sub.staffRemark || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Fill Dialog */}
      <Dialog open={!!selectedForm} onOpenChange={(open) => !open && setSelectedForm(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedForm?.title}</DialogTitle>
          </DialogHeader>
          {selectedForm && (
            <div className="space-y-4">
              {selectedForm.description && (
                <p className="text-sm text-muted-foreground">{selectedForm.description}</p>
              )}
              {selectedForm.fields?.map((field) => (
                <div key={field.id} className="space-y-1">
                  <Label>
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      value={formData[field.id] || ""}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      placeholder={field.placeholder}
                    />
                  ) : field.type === "select" ? (
                    <Select
                      value={formData[field.id] || ""}
                      onValueChange={(v) => setFormData({ ...formData, [field.id]: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "file" ? (
                    <Input
                      type="file"
                      onChange={(e) =>
                        setFileInputs({ ...fileInputs, [field.id]: e.target.files?.[0] || null })
                      }
                    />
                  ) : (
                    <Input
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                      value={formData[field.id] || ""}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedForm(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

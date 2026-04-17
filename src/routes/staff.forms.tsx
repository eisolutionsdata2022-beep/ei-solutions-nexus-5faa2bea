import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  CustomForm,
  FIELD_TYPES,
  FormField,
  FieldType,
  generateFieldId,
} from "@/lib/custom-forms";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Plus, Pencil, Trash2, GripVertical, Eye, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/forms")({
  ssr: false,
  component: AdminForms,
});

function AdminForms() {
  const { appUser } = useAuth();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [editing, setEditing] = useState<Partial<CustomForm> | null>(null);
  const [preview, setPreview] = useState<CustomForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "customForms")), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomForm));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setForms(list);
    });
    return unsub;
  }, []);

  const openNew = () => {
    setEditing({
      title: "",
      description: "",
      fields: [
        {
          id: generateFieldId(),
          label: "",
          type: "text" as FieldType,
          required: false,
          placeholder: "",
        },
      ],
      active: true,
    });
  };

  const openEdit = (form: CustomForm) => {
    setEditing({ ...form, fields: [...form.fields.map((f) => ({ ...f }))] });
  };

  const addField = () => {
    if (!editing) return;
    const newField: FormField = {
      id: generateFieldId(),
      label: "",
      type: "text",
      required: false,
      placeholder: "",
    };
    setEditing({ ...editing, fields: [...(editing.fields || []), newField] });
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    if (!editing?.fields) return;
    const fields = [...editing.fields];
    fields[index] = { ...fields[index], ...updates };
    setEditing({ ...editing, fields });
  };

  const removeField = (index: number) => {
    if (!editing?.fields) return;
    const fields = editing.fields.filter((_, i) => i !== index);
    setEditing({ ...editing, fields });
  };

  const handleSave = async () => {
    if (!editing?.title?.trim()) {
      toast.error("Form title is required");
      return;
    }
    if (!editing.fields?.length) {
      toast.error("Add at least one field");
      return;
    }
    for (const f of editing.fields) {
      if (!f.label.trim()) {
        toast.error("All fields must have a label");
        return;
      }
      if (f.type === "select" && (!f.options || f.options.length === 0)) {
        toast.error(`Dropdown field "${f.label}" needs at least one option`);
        return;
      }
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (editing.id) {
        await updateDoc(doc(db, "customForms", editing.id), {
          title: editing.title,
          description: editing.description || "",
          fields: editing.fields,
          active: editing.active ?? true,
          updatedAt: now,
        });
        toast.success("Form updated");
      } else {
        await addDoc(collection(db, "customForms"), {
          title: editing.title,
          description: editing.description || "",
          fields: editing.fields,
          active: editing.active ?? true,
          createdBy: appUser?.email || "admin",
          createdAt: now,
          updatedAt: now,
        });
        toast.success("Form created");
      }
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (form: CustomForm) => {
    try {
      await updateDoc(doc(db, "customForms", form.id), { active: !form.active });
      toast.success(form.active ? "Form deactivated" : "Form activated");
    } catch {
      toast.error("Failed to update form status");
    }
  };

  const deleteForm = async (form: CustomForm) => {
    if (!confirm(`Delete "${form.title}"?`)) return;
    try {
      await deleteDoc(doc(db, "customForms", form.id));
      toast.success("Form deleted");
    } catch {
      toast.error("Failed to delete form");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Form Builder</h1>
          <p className="text-muted-foreground">Create custom forms for retailers to fill.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          New Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No forms created yet. Click "New Form" to start.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{form.title}</CardTitle>
                    {form.description && (
                      <CardDescription className="mt-1">{form.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant={form.active ? "default" : "secondary"}>
                    {form.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {form.fields?.length || 0} field(s)
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setPreview(form)}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(form)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(form)}>
                    {form.active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteForm(form)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Editor Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Form" : "Create New Form"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Form Title *</Label>
                <Input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. Income Certificate Application"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Brief description of this form"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.active ?? true}
                  onCheckedChange={(checked) => setEditing({ ...editing, active: checked })}
                />
                <Label>Active (visible to retailers)</Label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Fields</Label>
                  <Button size="sm" variant="outline" onClick={addField}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
                  </Button>
                </div>

                {editing.fields?.map((field, index) => (
                  <Card key={field.id} className="p-3">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          placeholder="Field label"
                          className="flex-1"
                        />
                        <Select
                          value={field.type}
                          onValueChange={(v) => updateField(index, { type: v as FieldType })}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((ft) => (
                              <SelectItem key={ft.value} value={ft.value}>
                                {ft.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => removeField(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 pl-6">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) =>
                              updateField(index, { required: checked })
                            }
                          />
                          <Label className="text-sm">Required</Label>
                        </div>
                        <Input
                          value={field.placeholder || ""}
                          onChange={(e) =>
                            updateField(index, { placeholder: e.target.value })
                          }
                          placeholder="Placeholder text"
                          className="flex-1 h-8 text-sm"
                        />
                      </div>

                      {field.type === "select" && (
                        <div className="pl-6 space-y-2">
                          <Label className="text-sm">
                            Options (comma separated)
                          </Label>
                          <Input
                            value={(field.options || []).join(", ")}
                            onChange={(e) =>
                              updateField(index, {
                                options: e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="Option 1, Option 2, Option 3"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}

                {(!editing.fields || editing.fields.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No fields added yet. Click "Add Field" to start building your form.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing?.id ? "Update Form" : "Create Form"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              {preview.description && (
                <p className="text-sm text-muted-foreground">{preview.description}</p>
              )}
              {preview.fields?.map((field) => (
                <div key={field.id} className="space-y-1">
                  <Label>
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea placeholder={field.placeholder} disabled />
                  ) : field.type === "select" ? (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "file" ? (
                    <Input type="file" disabled />
                  ) : (
                    <Input
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                      placeholder={field.placeholder}
                      disabled
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

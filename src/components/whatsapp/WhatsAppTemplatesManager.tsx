import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, MessageSquareQuote, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeTemplates, createTemplate, updateTemplate, deleteTemplate,
} from "@/lib/whatsapp-firebase";
import type { WaTemplate } from "@/lib/whatsapp-types";

export function WhatsAppTemplatesManager() {
  const { appUser } = useAuth();
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [editing, setEditing] = useState<WaTemplate | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeTemplates(setTemplates), []);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (t: WaTemplate) => { setEditing(t); setOpen(true); };

  const onDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
      toast.success("Template deleted");
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-emerald-600" />
            Quick-reply templates
          </h2>
          <p className="text-xs text-muted-foreground">
            Saved replies staff can pick from the inbox composer. Use{" "}
            <code className="text-[11px] bg-muted px-1 py-0.5 rounded">{"{{name}}"}</code> to insert the contact's name.
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> New template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquareQuote className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No templates yet. Create your first quick reply.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className="hover:shadow-sm transition">
              <CardHeader className="p-3 pb-1.5 flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm truncate">{t.title}</CardTitle>
                  <div className="flex items-center gap-1 mt-1">
                    {t.category && <Badge variant="outline" className="text-[9px] h-4 px-1">{t.category}</Badge>}
                    {/\{\{\s*name\s*\}\}/i.test(t.body) && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">{"{{name}}"}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{t.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Staff will no longer see this template in the quick-reply picker.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(t.id)} className="bg-destructive text-destructive-foreground">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{t.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateEditorDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        appUserUid={appUser?.uid || ""}
      />
    </div>
  );
}

function TemplateEditorDialog({
  open, onOpenChange, editing, appUserUid,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: WaTemplate | null;
  appUserUid: string;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title || "");
      setCategory(editing?.category || "");
      setBody(editing?.body || "");
    }
  }, [open, editing]);

  const save = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    if (title.length > 60) { toast.error("Title max 60 chars"); return; }
    if (body.length > 4096) { toast.error("Body max 4096 chars (WhatsApp limit)"); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateTemplate(editing.id, { title, body, category });
        toast.success("Template updated");
      } else {
        await createTemplate({ title, body, category, createdBy: appUserUid });
        toast.success("Template created");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit template" : "New quick-reply template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title <span className="text-muted-foreground">({title.length}/60)</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="e.g. Documents received"
            />
          </div>
          <div>
            <Label className="text-xs">Category (optional)</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Greetings, Follow-up, Payment"
            />
          </div>
          <div>
            <Label className="text-xs">
              Message body <span className="text-muted-foreground">({body.length}/4096)</span>
              <span className="ml-2 text-[10px] text-emerald-600">Use {"{{name}}"} for contact name</span>
            </Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={4096}
              rows={6}
              placeholder={"Hi {{name}},\n\nWe've received your documents and will process them within 24 hours.\n\n- EI Solutions"}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            {editing ? "Save changes" : "Create template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

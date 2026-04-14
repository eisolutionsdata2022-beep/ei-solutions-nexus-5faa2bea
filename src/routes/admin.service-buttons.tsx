import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, ExternalLink, Link2, Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/service-buttons")({
  ssr: false,
  component: AdminServiceButtons,
});

type ButtonStyle = "solid" | "outline" | "gradient";

interface ServiceButton {
  id: string;
  name: string;
  url: string;
  style: ButtonStyle;
  enabled: boolean;
  createdAt: string;
  iconUrl?: string;
}

const BUTTON_STYLES: { value: ButtonStyle; label: string; description: string }[] = [
  { value: "solid", label: "Solid", description: "Filled background color" },
  { value: "outline", label: "Outline", description: "Border with transparent background" },
  { value: "gradient", label: "Gradient", description: "Gradient background effect" },
];

function getButtonClasses(style: ButtonStyle) {
  switch (style) {
    case "solid":
      return "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md";
    case "outline":
      return "border-2 border-primary text-primary bg-transparent hover:bg-primary/10";
    case "gradient":
      return "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:opacity-90";
  }
}

function AdminServiceButtons() {
  const [buttons, setButtons] = useState<ServiceButton[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [style, setStyle] = useState<ButtonStyle>("solid");
  const [open, setOpen] = useState(false);
  const [editBtn, setEditBtn] = useState<ServiceButton | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchButtons = async () => {
    const snap = await getDocs(collection(db, "serviceButtons"));
    const list: ServiceButton[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ServiceButton));
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    setButtons(list);
  };

  useEffect(() => { fetchButtons(); }, []);

  const resetForm = () => {
    setName(""); setUrl(""); setStyle("solid");
    setIconFile(null); setIconPreview("");
  };

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Icon must be under 2MB.");
      return;
    }
    setIconFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setIconPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadIcon = async (): Promise<string | undefined> => {
    if (!iconFile) return iconPreview || undefined;
    const fileName = `service-icons/${Date.now()}-${iconFile.name}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, iconFile);
    return getDownloadURL(storageRef);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      toast.error("Name and URL are required.");
      return;
    }
    setUploading(true);
    try {
      const iconUrl = await uploadIcon();
      await addDoc(collection(db, "serviceButtons"), {
        name: name.trim(),
        url: url.trim(),
        style,
        iconUrl: iconUrl || "",
        enabled: true,
        createdAt: new Date().toISOString(),
      });
      resetForm();
      setOpen(false);
      fetchButtons();
      toast.success("Service button created!");
    } catch {
      toast.error("Failed to create button.");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editBtn) return;
    setUploading(true);
    try {
      const iconUrl = await uploadIcon();
      const updateData: Record<string, string> = {
        name: name.trim(), url: url.trim(), style,
      };
      if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
      await updateDoc(doc(db, "serviceButtons", editBtn.id), updateData);
      resetForm();
      setEditBtn(null);
      fetchButtons();
      toast.success("Button updated!");
    } catch {
      toast.error("Failed to update button.");
    } finally {
      setUploading(false);
    }
  };

  const toggleEnabled = async (b: ServiceButton) => {
    await updateDoc(doc(db, "serviceButtons", b.id), { enabled: !b.enabled });
    fetchButtons();
  };

  const handleDelete = async (b: ServiceButton) => {
    if (!confirm(`Delete "${b.name}"?`)) return;
    if (b.iconUrl) {
      try { await deleteObject(ref(storage, b.iconUrl)); } catch { /* ignore */ }
    }
    await deleteDoc(doc(db, "serviceButtons", b.id));
    fetchButtons();
    toast.success("Button deleted.");
  };

  const openEdit = (b: ServiceButton) => {
    setName(b.name); setUrl(b.url); setStyle(b.style || "solid");
    setIconPreview(b.iconUrl || ""); setIconFile(null);
    setEditBtn(b);
  };

  const removeIcon = () => {
    setIconFile(null); setIconPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const renderButtonIcon = (b: ServiceButton, size = 20) => {
    if (b.iconUrl) {
      return <img src={b.iconUrl} alt="" className="rounded-sm object-contain" style={{ width: size, height: size }} />;
    }
    return <Link2 style={{ width: size, height: size }} />;
  };

  const formFields = (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Service Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aadhaar Services" required />
      </div>
      <div className="space-y-2">
        <Label>Link URL</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" required />
      </div>

      {/* Icon Upload */}
      <div className="space-y-2">
        <Label>Button Icon (Optional)</Label>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleIconSelect} className="hidden" />
        {iconPreview ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <img src={iconPreview} alt="icon" className="w-10 h-10 rounded-md object-contain border border-border bg-card" />
            <span className="text-sm text-foreground flex-1 truncate">{iconFile?.name || "Current icon"}</span>
            <Button type="button" variant="ghost" size="icon" onClick={removeIcon} className="text-destructive">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" /> Upload Icon Image
          </Button>
        )}
        <p className="text-xs text-muted-foreground">PNG, JPG, SVG — max 2MB. Square icons work best.</p>
      </div>

      <div className="space-y-3">
        <Label>Button Design</Label>
        <RadioGroup value={style} onValueChange={(v) => setStyle(v as ButtonStyle)} className="space-y-3">
          {BUTTON_STYLES.map((bs) => (
            <label key={bs.value} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
              <RadioGroupItem value={bs.value} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{bs.label}</p>
                <p className="text-xs text-muted-foreground">{bs.description}</p>
              </div>
              <div className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${getButtonClasses(bs.value)}`}>
                Preview
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Service Buttons</h1>
          <p className="text-muted-foreground">Create link buttons with custom designs for retailer dashboard.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Button</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Service Button</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate}>
              {formFields}
              <Button type="submit" className="w-full mt-4" disabled={uploading}>
                {uploading ? "Uploading..." : "Create Button"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editBtn} onOpenChange={(v) => { if (!v) { setEditBtn(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Service Button</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            {formFields}
            <Button type="submit" className="w-full mt-4" disabled={uploading}>
              {uploading ? "Uploading..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview section */}
      {buttons.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground mb-3">Retailer Dashboard Preview</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {buttons.filter((b) => b.enabled).map((b) => (
                <a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-base font-bold transition-all min-h-[56px] ${getButtonClasses(b.style)}`}>
                  {renderButtonIcon(b)} {b.name}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Button list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {buttons.map((b) => (
          <Card key={b.id} className={!b.enabled ? "opacity-50" : ""}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  {b.iconUrl ? (
                    <img src={b.iconUrl} alt="" className="w-8 h-8 rounded-md object-contain border border-border bg-card" />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{b.name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{b.url}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(b)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="mb-3">
                <a href={b.url} target="_blank" rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-base font-bold transition-all min-h-[50px] ${getButtonClasses(b.style)}`}>
                  {renderButtonIcon(b)} {b.name}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground capitalize">{b.style} style</span>
                <Switch checked={b.enabled !== false} onCheckedChange={() => toggleEnabled(b)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {buttons.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No service buttons yet. Click "Add Button" to create one.</p>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { toast } from "sonner";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2,
  List, ListOrdered, Link2, Image as ImageIcon, Undo, Redo, AlignLeft, AlignCenter,
  AlignRight, Sparkles, Loader2, Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMAIL_TEMPLATES } from "@/lib/email-templates";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

const BTN = "h-8 w-8 inline-flex items-center justify-center rounded hover:bg-muted text-foreground/80 hover:text-foreground transition-colors data-[active=true]:bg-primary/15 data-[active=true]:text-primary";

export function RichEmailEditor({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [btnOpen, setBtnOpen] = useState(false);
  const [btnLabel, setBtnLabel] = useState("Click here");
  const [btnUrl, setBtnUrl] = useState("https://");
  const [btnColor, setBtnColor] = useState("#1e3a8a");
  const [tplOpen, setTplOpen] = useState(false);
  const [htmlOpen, setHtmlOpen] = useState(false);
  const [rawHtml, setRawHtml] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Image.configure({ inline: false, HTMLAttributes: { style: "max-width:100%;height:auto;border-radius:8px" } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { style: "color:#3b82f6;text-decoration:underline" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[320px] focus:outline-none px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external value (e.g., template insertion via parent)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onPickImage = useCallback(() => fileInputRef.current?.click(), []);

  const handleImageUpload = async (file: File) => {
    if (!editor) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const path = `bulk-email-images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      toast.success("Image uploaded");
    } catch (err: any) {
      console.error(err);
      toast.error(`Upload failed: ${err?.message || "unknown"}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const insertLink = () => {
    if (!editor || !linkUrl) return;
    if (linkText) {
      editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    setLinkOpen(false);
    setLinkUrl(""); setLinkText("");
  };

  const insertButton = () => {
    if (!editor || !btnUrl || !btnLabel) return;
    const html = `<p style="text-align:center;margin:20px 0"><a href="${btnUrl}" style="display:inline-block;background:${btnColor};color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px">${btnLabel}</a></p>`;
    editor.chain().focus().insertContent(html).run();
    setBtnOpen(false);
  };

  const applyTemplate = (html: string) => {
    if (!editor) return;
    editor.commands.setContent(html);
    onChange(html);
    setTplOpen(false);
    toast.success("Template applied");
  };

  if (!editor) return <div className="border border-border rounded-lg h-80 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border bg-muted/30">
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="h-4 w-4" /></ToolbarBtn>
        <Sep />
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1"><Heading1 className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2"><Heading2 className="h-4 w-4" /></ToolbarBtn>
        <Sep />
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strike"><Strikethrough className="h-4 w-4" /></ToolbarBtn>
        <Sep />
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list"><ListOrdered className="h-4 w-4" /></ToolbarBtn>
        <Sep />
        <ToolbarBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left"><AlignLeft className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align center"><AlignCenter className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align right"><AlignRight className="h-4 w-4" /></ToolbarBtn>
        <Sep />
        <ToolbarBtn onClick={() => setLinkOpen(true)} title="Insert link"><Link2 className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={onPickImage} title="Upload image" disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </ToolbarBtn>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />

        <Sep />
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 gap-1" onClick={() => setBtnOpen(true)}>
          <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-primary text-primary-foreground">CTA</span>
          <span className="text-xs">Button</span>
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 gap-1 text-amber-600 hover:text-amber-700" onClick={() => setTplOpen(true)}>
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold">Templates</span>
        </Button>

        <div className="ml-auto">
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 gap-1" onClick={() => { setRawHtml(editor.getHTML()); setHtmlOpen(true); }}>
            <Code className="h-4 w-4" />
            <span className="text-xs">HTML</span>
          </Button>
        </div>
      </div>

      <EditorContent editor={editor} />

      {/* Insert Link */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Insert link</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">URL</Label><Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" /></div>
            <div><Label className="text-xs">Display text (optional — leave blank to link selected text)</Label><Input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Click here" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button onClick={insertLink} disabled={!linkUrl}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insert CTA Button */}
      <Dialog open={btnOpen} onOpenChange={setBtnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Insert CTA button</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Button label</Label><Input value={btnLabel} onChange={(e) => setBtnLabel(e.target.value)} /></div>
            <div><Label className="text-xs">URL</Label><Input value={btnUrl} onChange={(e) => setBtnUrl(e.target.value)} placeholder="https://…" /></div>
            <div>
              <Label className="text-xs">Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={btnColor} onChange={(e) => setBtnColor(e.target.value)} className="h-9 w-12 rounded border border-border cursor-pointer" />
                <Input value={btnColor} onChange={(e) => setBtnColor(e.target.value)} className="flex-1" />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["#1e3a8a", "#dc2626", "#059669", "#f59e0b", "#7c3aed", "#0891b2"].map((c) => (
                  <button key={c} type="button" onClick={() => setBtnColor(c)} className="h-7 w-7 rounded border border-border" style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="border border-border rounded-lg p-4 bg-muted/20 text-center">
              <Label className="text-xs text-muted-foreground block mb-2">Preview</Label>
              <a style={{ display: "inline-block", background: btnColor, color: "#fff", padding: "12px 28px", borderRadius: "8px", fontWeight: 700, textDecoration: "none", fontSize: "16px" }}>{btnLabel}</a>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBtnOpen(false)}>Cancel</Button>
            <Button onClick={insertButton} disabled={!btnLabel || !btnUrl}>Insert button</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates */}
      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-500" />Email templates</DialogTitle>
            <p className="text-xs text-muted-foreground">Click a template to replace your current email body. {"{{name}}"} will be personalized per recipient.</p>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {EMAIL_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t.html)}
                className="text-left p-4 border border-border rounded-lg hover:border-primary hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{t.preview}</span>
                  <span className="font-semibold text-foreground group-hover:text-primary">{t.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* HTML source */}
      <Dialog open={htmlOpen} onOpenChange={setHtmlOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>HTML source</DialogTitle></DialogHeader>
          <Tabs defaultValue="source">
            <TabsList><TabsTrigger value="source">Source</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger></TabsList>
            <TabsContent value="source">
              <textarea
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                className="w-full h-80 font-mono text-xs p-3 border border-border rounded-lg bg-muted/30"
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="border border-border rounded-lg p-4 max-h-80 overflow-auto bg-white" dangerouslySetInnerHTML={{ __html: rawHtml }} />
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHtmlOpen(false)}>Cancel</Button>
            <Button onClick={() => { editor.commands.setContent(rawHtml); onChange(rawHtml); setHtmlOpen(false); toast.success("HTML applied"); }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolbarBtn({ children, onClick, active, title, disabled }: { children: React.ReactNode; onClick: () => void; active?: boolean; title?: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} title={title} data-active={active || false} disabled={disabled} className={BTN}>
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-6 w-px bg-border" />;
}

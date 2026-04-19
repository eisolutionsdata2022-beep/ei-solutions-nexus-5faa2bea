import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Upload, Plus, Trash2, ImageIcon, RefreshCw, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import {
  getLandingContent,
  saveLandingContent,
  uploadLandingImage,
  DEFAULT_LANDING_CONTENT,
  type LandingContent,
  type CmsStat,
  type CmsService,
  type CmsReview,
} from "@/lib/landing-cms";

export const Route = createFileRoute("/admin/landing-cms")({
  ssr: false,
  component: LandingCmsPage,
});

function LandingCmsPage() {
  const { appUser } = useAuth();
  const [content, setContent] = useState<LandingContent>(DEFAULT_LANDING_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  useEffect(() => {
    getLandingContent()
      .then(setContent)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!appUser?.uid) return;
    setSaving(true);
    try {
      await saveLandingContent(content, appUser.email || appUser.uid);
      toast.success("Landing page content saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!confirm("Reset all CMS content to factory defaults? This will not save until you click Save Changes.")) return;
    setContent(DEFAULT_LANDING_CONTENT);
    toast.info("Reverted to defaults — click Save to apply.");
  };

  const handleImageUpload = async (slot: "logo" | "hero" | "bookletCover", file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5MB)");
      return;
    }
    setUploadingSlot(slot);
    try {
      const url = await uploadLandingImage(file, slot);
      setContent((c) => ({
        ...c,
        images: {
          ...c.images,
          ...(slot === "logo" && { logoUrl: url }),
          ...(slot === "hero" && { heroImageUrl: url }),
          ...(slot === "bookletCover" && { bookletCoverUrl: url }),
        },
      }));
      toast.success(`${slot} image uploaded`);
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploadingSlot(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Landing & Booklet CMS</h1>
          <p className="text-sm text-muted-foreground">
            Edit hero, stats, services, reviews, contact and images. Changes apply to <code>/welcome</code> and <code>/booklet</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/welcome" target="_blank" rel="noreferrer"><Eye className="h-4 w-4 mr-1.5" /> Preview /welcome</a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/booklet" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1.5" /> Preview /booklet</a>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleResetDefaults}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save Changes
          </Button>
        </div>
      </div>

      {content.updatedAt && (
        <div className="text-xs text-muted-foreground">
          Last updated: {new Date(content.updatedAt).toLocaleString()} {content.updatedBy && `· by ${content.updatedBy}`}
        </div>
      )}

      <Tabs defaultValue="hero">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        {/* HERO */}
        <TabsContent value="hero" className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Hero Section</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Big Heading" hint="Main headline on /welcome">
                <Input
                  value={content.hero.heading}
                  onChange={(e) => setContent((c) => ({ ...c, hero: { ...c.hero, heading: e.target.value } }))}
                />
              </Field>
              <Field label="Sub Heading">
                <Textarea
                  rows={3}
                  value={content.hero.subHeading}
                  onChange={(e) => setContent((c) => ({ ...c, hero: { ...c.hero, subHeading: e.target.value } }))}
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Tagline (Malayalam)">
                  <Input
                    value={content.hero.tagline}
                    onChange={(e) => setContent((c) => ({ ...c, hero: { ...c.hero, tagline: e.target.value } }))}
                  />
                </Field>
                <Field label="Tagline (English)">
                  <Input
                    value={content.hero.taglineEn}
                    onChange={(e) => setContent((c) => ({ ...c, hero: { ...c.hero, taglineEn: e.target.value } }))}
                  />
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Primary CTA Label">
                  <Input
                    value={content.hero.ctaPrimary}
                    onChange={(e) => setContent((c) => ({ ...c, hero: { ...c.hero, ctaPrimary: e.target.value } }))}
                  />
                </Field>
                <Field label="Secondary CTA Label">
                  <Input
                    value={content.hero.ctaSecondary}
                    onChange={(e) => setContent((c) => ({ ...c, hero: { ...c.hero, ctaSecondary: e.target.value } }))}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IMAGES */}
        <TabsContent value="images" className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Brand Images</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ImageSlot
                label="Logo"
                url={content.images.logoUrl}
                uploading={uploadingSlot === "logo"}
                onUpload={(f) => handleImageUpload("logo", f)}
                onClear={() => setContent((c) => ({ ...c, images: { ...c.images, logoUrl: undefined } }))}
              />
              <ImageSlot
                label="Hero Image"
                url={content.images.heroImageUrl}
                uploading={uploadingSlot === "hero"}
                onUpload={(f) => handleImageUpload("hero", f)}
                onClear={() => setContent((c) => ({ ...c, images: { ...c.images, heroImageUrl: undefined } }))}
              />
              <ImageSlot
                label="Booklet Cover"
                url={content.images.bookletCoverUrl}
                uploading={uploadingSlot === "bookletCover"}
                onUpload={(f) => handleImageUpload("bookletCover", f)}
                onClear={() => setContent((c) => ({ ...c, images: { ...c.images, bookletCoverUrl: undefined } }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATS */}
        <TabsContent value="stats" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Stats
                <Button size="sm" variant="outline" onClick={() => setContent((c) => ({ ...c, stats: [...c.stats, { number: "0", label: "New stat", labelMl: "" }] }))}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {content.stats.map((s, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <Label className="text-xs">Number</Label>
                    <Input value={s.number} onChange={(e) => updateArr(setContent, "stats", i, { ...s, number: e.target.value })} />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs">Label (EN)</Label>
                    <Input value={s.label} onChange={(e) => updateArr(setContent, "stats", i, { ...s, label: e.target.value })} />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs">Label (ML)</Label>
                    <Input value={s.labelMl} onChange={(e) => updateArr(setContent, "stats", i, { ...s, labelMl: e.target.value })} />
                  </div>
                  <div className="col-span-1">
                    <Button size="icon" variant="ghost" onClick={() => removeArr<CmsStat>(setContent, "stats", i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SERVICES */}
        <TabsContent value="services" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Services
                <Button size="sm" variant="outline" onClick={() => setContent((c) => ({ ...c, services: [...c.services, { icon: "✨", name: "New service", ml: "" }] }))}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {content.services.map((s, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-2">
                    <Label className="text-xs">Icon (emoji)</Label>
                    <Input value={s.icon} onChange={(e) => updateArr(setContent, "services", i, { ...s, icon: e.target.value })} />
                  </div>
                  <div className="col-span-5">
                    <Label className="text-xs">Name</Label>
                    <Input value={s.name} onChange={(e) => updateArr(setContent, "services", i, { ...s, name: e.target.value })} />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs">Malayalam</Label>
                    <Input value={s.ml} onChange={(e) => updateArr(setContent, "services", i, { ...s, ml: e.target.value })} />
                  </div>
                  <div className="col-span-1">
                    <Button size="icon" variant="ghost" onClick={() => removeArr<CmsService>(setContent, "services", i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REVIEWS */}
        <TabsContent value="reviews" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Customer Reviews
                <Button size="sm" variant="outline" onClick={() => setContent((c) => ({ ...c, reviews: [...c.reviews, { stars: 5, name: "", place: "", text: "" }] }))}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {content.reviews.map((r, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-2">
                      <Label className="text-xs">Stars</Label>
                      <Input type="number" min={1} max={5} value={r.stars} onChange={(e) => updateArr(setContent, "reviews", i, { ...r, stars: Math.min(5, Math.max(1, Number(e.target.value) || 5)) })} />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Name</Label>
                      <Input value={r.name} onChange={(e) => updateArr(setContent, "reviews", i, { ...r, name: e.target.value })} />
                    </div>
                    <div className="col-span-5">
                      <Label className="text-xs">Place / Role</Label>
                      <Input value={r.place} onChange={(e) => updateArr(setContent, "reviews", i, { ...r, place: e.target.value })} />
                    </div>
                    <div className="col-span-1">
                      <Button size="icon" variant="ghost" onClick={() => removeArr<CmsReview>(setContent, "reviews", i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Review text</Label>
                    <Textarea rows={2} value={r.text} onChange={(e) => updateArr(setContent, "reviews", i, { ...r, text: e.target.value })} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTACT */}
        <TabsContent value="contact" className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Contact & Brand</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Brand Name">
                  <Input value={content.contact.brand} onChange={(e) => setContent((c) => ({ ...c, contact: { ...c.contact, brand: e.target.value } }))} />
                </Field>
                <Field label="Legal Name">
                  <Input value={content.contact.legalName} onChange={(e) => setContent((c) => ({ ...c, contact: { ...c.contact, legalName: e.target.value } }))} />
                </Field>
                <Field label="Phone (display)">
                  <Input value={content.contact.phone} onChange={(e) => setContent((c) => ({ ...c, contact: { ...c.contact, phone: e.target.value } }))} />
                </Field>
                <Field label="WhatsApp (digits only, e.g. 918921479506)">
                  <Input value={content.contact.whatsapp} onChange={(e) => setContent((c) => ({ ...c, contact: { ...c.contact, whatsapp: e.target.value.replace(/\D/g, "") } }))} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={content.contact.email} onChange={(e) => setContent((c) => ({ ...c, contact: { ...c.contact, email: e.target.value } }))} />
                </Field>
                <Field label="Website">
                  <Input value={content.contact.website} onChange={(e) => setContent((c) => ({ ...c, contact: { ...c.contact, website: e.target.value } }))} />
                </Field>
              </div>
              <Field label="Office Address">
                <Textarea rows={2} value={content.contact.address} onChange={(e) => setContent((c) => ({ ...c, contact: { ...c.contact, address: e.target.value } }))} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-3 z-10 flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={saving} className="shadow-xl">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

/* ───────── Helpers ───────── */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ImageSlot({
  label, url, uploading, onUpload, onClear,
}: {
  label: string;
  url?: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-muted-foreground truncate">{url || "No image set — falls back to default"}</div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
          <span className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload"}
          </span>
        </label>
        {url && (
          <Button size="sm" variant="ghost" onClick={onClear}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function updateArr<T>(
  setter: React.Dispatch<React.SetStateAction<LandingContent>>,
  key: "stats" | "services" | "reviews",
  index: number,
  value: T,
) {
  setter((c) => {
    const next = [...(c[key] as any[])];
    next[index] = value;
    return { ...c, [key]: next } as LandingContent;
  });
}

function removeArr<T>(
  setter: React.Dispatch<React.SetStateAction<LandingContent>>,
  key: "stats" | "services" | "reviews",
  index: number,
) {
  setter((c) => {
    const next = [...(c[key] as any[])];
    next.splice(index, 1);
    return { ...c, [key]: next } as LandingContent;
  });
}

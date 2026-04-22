import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Download,
  Share2,
  FileText,
  Image as ImageIcon,
  Globe,
  Copy,
  Check,
  Presentation,
  ExternalLink,
  Rocket,
  LayoutTemplate,
  Users,
  Megaphone,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

type GrowthTool = {
  title: string;
  malayalam: string;
  description: string;
  to: string;
  icon: typeof Rocket;
  gradient: string;
  badge?: string;
  adminOnly?: boolean;
};

const GROWTH_TOOLS: GrowthTool[] = [
  {
    title: "Landing & Booklet CMS",
    malayalam: "ലാൻഡിംഗ് & ബുക്ക്‌ലെറ്റ് CMS",
    description: "Edit website hero, services, testimonials, pricing & company booklet — live in seconds.",
    to: "/admin/landing-cms",
    icon: LayoutTemplate,
    gradient: "from-blue-600 via-indigo-600 to-violet-600",
    badge: "Live site",
    adminOnly: true,
  },
  {
    title: "Lead Management",
    malayalam: "ലീഡ് മാനേജ്മെന്റ്",
    description: "All leads in one place — call logs, follow-ups, drip status, conversion tracking.",
    to: "/admin/crm-leads",
    icon: Users,
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    badge: "Hot",
  },
  {
    title: "Bulk Email Campaigns",
    malayalam: "ബൾക്ക് ഇമെയിൽ കാമ്പെയ്ൻ",
    description: "Send personalized email blasts to retailers, leads & uploaded contacts. Open tracking included.",
    to: "/admin/crm-bulk-comm",
    icon: Megaphone,
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    badge: "Resend",
    adminOnly: true,
  },
  {
    title: "WhatsApp Inbox",
    malayalam: "വാട്സ്ആപ്പ് ഇൻബോക്സ്",
    description: "2-way WhatsApp chat, quick-reply templates, auto drip sequences, bulk broadcasts.",
    to: "/admin/whatsapp",
    icon: MessageCircle,
    gradient: "from-green-500 via-emerald-500 to-lime-500",
    badge: "Bridge",
    adminOnly: true,
  },
];

type DocItem = {
  title: string;
  description: string;
  path: string;
  type: "pdf" | "pptx";
  badge?: string;
};

type PosterItem = {
  title: string;
  size: string;
  channel: string;
  path: string;
};

const BROCHURES: DocItem[] = [
  {
    title: "Franchise Brochure (Premium)",
    description: "9-page navy + gold franchise pitch deck. Best for new partner conversations.",
    path: "/marketing/EI-Solutions-Franchise-Brochure.pdf",
    type: "pdf",
    badge: "Recommended",
  },
  {
    title: "Franchise Brochure — Editable",
    description: "PowerPoint source. Edit pricing, contact details, charts.",
    path: "/marketing/EI-Solutions-Franchise-Brochure.pptx",
    type: "pptx",
  },
  {
    title: "Service Catalogue Brochure",
    description: "Customer-facing brochure showing all platform services.",
    path: "/marketing/EI-Solutions-Brochure.pdf",
    type: "pdf",
  },
  {
    title: "Service Catalogue — Editable",
    description: "PowerPoint source for the service catalogue brochure.",
    path: "/marketing/EI-Solutions-Brochure.pptx",
    type: "pptx",
  },
];

const POSTERS: PosterItem[] = [
  {
    title: "Instagram Square",
    size: "1080 × 1080",
    channel: "Instagram feed, Facebook feed",
    path: "/marketing/social/01-instagram-square-1080x1080.png",
  },
  {
    title: "Instagram Story",
    size: "1080 × 1920",
    channel: "Instagram / WhatsApp Status",
    path: "/marketing/social/02-instagram-story-1080x1920.png",
  },
  {
    title: "Facebook / LinkedIn Post",
    size: "1200 × 630",
    channel: "Link previews, LinkedIn feed",
    path: "/marketing/social/03-facebook-post-1200x630.png",
  },
  {
    title: "WhatsApp Share",
    size: "1080 × 1080",
    channel: "WhatsApp broadcasts & DMs",
    path: "/marketing/social/04-whatsapp-share-1080x1080.png",
  },
];

const WEB_LINKS = [
  {
    title: "Public Brochure Page",
    description: "Mobile-friendly web brochure to share with prospects.",
    path: "/brochure",
  },
  {
    title: "Company Booklet",
    description: "Long-form company booklet for distributors and partners.",
    path: "/booklet",
  },
  {
    title: "Landing Page",
    description: "Main marketing landing page (home).",
    path: "/",
  },
];

function getOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function shareOrCopy(title: string, url: string) {
  if (typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      await (navigator as any).share({ title, url });
      return "shared";
    } catch {
      // user cancelled — fall through to copy
    }
  }
  const ok = await copyToClipboard(url);
  return ok ? "copied" : "failed";
}

function whatsappShareUrl(text: string, url: string) {
  const message = encodeURIComponent(`${text}\n${url}`);
  return `https://wa.me/?text=${message}`;
}

export function MarketingMaterials() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const origin = getOrigin();

  const handleCopy = async (key: string, url: string) => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedKey(key);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800);
    } else {
      toast.error("Could not copy. Long-press the link instead.");
    }
  };

  const handleShare = async (title: string, url: string) => {
    const result = await shareOrCopy(title, url);
    if (result === "shared") toast.success("Shared");
    else if (result === "copied") toast.success("Link copied — paste it anywhere");
    else toast.error("Sharing not supported");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marketing Materials</h1>
        <p className="text-muted-foreground">
          Download or share the official EI Solutions brochures, social posters, and web pages.
        </p>
      </div>

      <Tabs defaultValue="brochures" className="space-y-4">
        <TabsList>
          <TabsTrigger value="brochures">
            <FileText className="w-4 h-4 mr-2" /> Brochures
          </TabsTrigger>
          <TabsTrigger value="posters">
            <ImageIcon className="w-4 h-4 mr-2" /> Social Posters
          </TabsTrigger>
          <TabsTrigger value="web">
            <Globe className="w-4 h-4 mr-2" /> Web Pages
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Brochures ---------------- */}
        <TabsContent value="brochures">
          <div className="grid gap-4 md:grid-cols-2">
            {BROCHURES.map((doc) => {
              const fullUrl = `${origin}${doc.path}`;
              const key = `doc-${doc.path}`;
              const Icon = doc.type === "pptx" ? Presentation : FileText;
              return (
                <Card key={doc.path}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{doc.title}</CardTitle>
                          <CardDescription className="mt-1">{doc.description}</CardDescription>
                        </div>
                      </div>
                      {doc.badge && <Badge>{doc.badge}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <a href={doc.path} download>
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a href={doc.path} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Preview
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShare(doc.title, fullUrl)}
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(key, fullUrl)}
                    >
                      {copiedKey === key ? (
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Copy link
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={whatsappShareUrl(`${doc.title} — EI Solutions`, fullUrl)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ---------------- Posters ---------------- */}
        <TabsContent value="posters">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {POSTERS.map((p) => {
              const fullUrl = `${origin}${p.path}`;
              const key = `poster-${p.path}`;
              return (
                <Card key={p.path} className="overflow-hidden">
                  <div className="bg-muted aspect-square flex items-center justify-center">
                    <img
                      src={p.path}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <CardDescription>
                      {p.size} • {p.channel}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <a href={p.path} download>
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShare(p.title, fullUrl)}
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(key, fullUrl)}
                    >
                      {copiedKey === key ? (
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Copy
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={whatsappShareUrl(`${p.title} — EI Solutions`, fullUrl)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ---------------- Web pages ---------------- */}
        <TabsContent value="web">
          <div className="grid gap-4 md:grid-cols-2">
            {WEB_LINKS.map((w) => {
              const fullUrl = `${origin}${w.path}`;
              const key = `web-${w.path}`;
              return (
                <Card key={w.path}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{w.title}</CardTitle>
                        <CardDescription className="mt-1">{w.description}</CardDescription>
                        <p className="text-xs text-muted-foreground mt-2 break-all">{fullUrl}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <a href={w.path} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShare(w.title, fullUrl)}
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(key, fullUrl)}
                    >
                      {copiedKey === key ? (
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Copy link
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={whatsappShareUrl(`${w.title} — EI Solutions`, fullUrl)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

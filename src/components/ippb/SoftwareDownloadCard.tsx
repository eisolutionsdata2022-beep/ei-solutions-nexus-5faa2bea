/**
 * Reusable card showing the download link for IPPB native software.
 * Used on:
 *  - /retailer/ippb  (PC Agent for Windows shop PC)
 *  - /staff/ippb     (Staff APK for Android tablet)
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Monitor, Smartphone, AlertCircle, ShieldCheck } from "lucide-react";
import {
  DEFAULT_IPPB_SOFTWARE,
  getIPPBSoftwareConfig,
  type IPPBSoftwareConfig,
} from "@/lib/ippb-software-config";

interface Props {
  variant: "pcAgent" | "staffApk";
}

export function SoftwareDownloadCard({ variant }: Props) {
  const [cfg, setCfg] = useState<IPPBSoftwareConfig>(DEFAULT_IPPB_SOFTWARE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIPPBSoftwareConfig()
      .then(setCfg)
      .finally(() => setLoading(false));
  }, []);

  const data = variant === "pcAgent" ? cfg.pcAgent : cfg.staffApk;
  const isPC = variant === "pcAgent";
  const Icon = isPC ? Monitor : Smartphone;
  const title = isPC ? "PC Agent (Windows)" : "Staff Tablet App (Android)";
  const subtitle = isPC
    ? "Fingerprint scanner-മായി connect ചെയ്യാൻ shop computer-ൽ install ചെയ്യണം."
    : "IPPB workflow drive ചെയ്യാൻ staff tablet-ൽ install ചെയ്യണം.";
  const fileLabel = isPC ? ".exe installer" : ".apk file";
  const accent = isPC
    ? "from-blue-500 to-indigo-600"
    : "from-emerald-500 to-teal-600";

  if (loading) return null;
  if (!data.enabled || !data.url) return null;

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span
            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent} text-white flex items-center justify-center`}
          >
            <Icon className="w-4 h-4" />
          </span>
          {title}
          <Badge variant="outline" className="ml-auto text-xs">
            v{data.version}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{subtitle}</p>

        {data.releaseNotes && (
          <div className="text-xs bg-muted/50 rounded-md p-2 border">
            <span className="font-semibold">📝 Notes: </span>
            {data.releaseNotes}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            asChild
            size="sm"
            className={`bg-gradient-to-r ${accent} text-white gap-2`}
          >
            <a href={data.url} target="_blank" rel="noopener noreferrer" download>
              <Download className="w-4 h-4" />
              Download {fileLabel}
            </a>
          </Button>
          {data.sizeMB ? (
            <Badge variant="secondary" className="text-xs">
              {data.sizeMB} MB
            </Badge>
          ) : null}
          <Badge variant="outline" className="text-xs gap-1">
            <ShieldCheck className="w-3 h-3" /> Signed
          </Badge>
        </div>

        {!isPC && (
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              Android-ൽ "Install from Unknown Sources" enable ചെയ്യണം. Settings →
              Security-ൽ allow ചെയ്യുക.
            </span>
          </div>
        )}

        {isPC && (
          <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              Install ചെയ്ത ശേഷം RD Service (Mantra/Morpho/Startek) driver-ഉം
              install ചെയ്യണം. Login ചെയ്യാൻ ഈ retailer account use ചെയ്യുക.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

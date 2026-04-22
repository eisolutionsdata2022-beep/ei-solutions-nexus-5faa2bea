/**
 * Premium "View Training Guide" card — links to the Malayalam UTI PAN
 * Coupon training PDF stored at /uti-pan-training-malayalam.pdf.
 *
 * Used on both the retailer PAN Portal and the Staff dashboard so every
 * team member has one-click access to the same playbook.
 */
import { BookOpenCheck, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PDF_URL = "/uti-pan-training-malayalam.pdf";

export function UtiTrainingPdfCard({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="overflow-hidden border-indigo-200/70 dark:border-indigo-900/50 shadow-md">
      <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 p-1" />
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 flex items-center justify-center shrink-0">
            <BookOpenCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-bold text-base">UTI PAN Training Guide</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              12-page Malayalam playbook — coupon flow, profit calc, FAQ &amp; daily checklist.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={PDF_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" /> View
              </a>
            </Button>
            <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <a href={PDF_URL} download>
                <Download className="h-4 w-4 mr-1.5" /> Download
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

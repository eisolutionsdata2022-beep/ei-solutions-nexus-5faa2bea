/**
 * Visual lock state shown when it's NOT this side's turn.
 * Displays who we're waiting on with a friendly Malayalam tagline.
 */
import { Lock, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  waitingFor: "retailer" | "staff";
  message?: string;
}

export function TurnLockCard({ waitingFor, message }: Props) {
  const otherSide = waitingFor === "retailer" ? "Retailer" : "Staff";
  return (
    <Card className="border-dashed border-2 border-amber-300 bg-amber-50/60">
      <CardContent className="py-6 text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Lock className="w-5 h-5 text-amber-600" />
          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
        </div>
        <p className="text-sm font-semibold text-amber-900">
          Waiting for {otherSide}…
        </p>
        <p className="text-xs text-amber-800/80 max-w-xs mx-auto">
          {message ?? `${otherSide} ഇപ്പോൾ action എടുക്കണം. അവർ complete ചെയ്താൽ next step open ആകും.`}
        </p>
      </CardContent>
    </Card>
  );
}

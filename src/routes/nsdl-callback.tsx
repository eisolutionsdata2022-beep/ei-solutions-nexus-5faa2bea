import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/nsdl-callback")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    tx: typeof s.tx === "string" ? s.tx : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
    ack_no: typeof s.ack_no === "string" ? s.ack_no : undefined,
  }),
  component: NsdlCallback,
});

function NsdlCallback() {
  const { tx, status, ack_no } = useSearch({ from: "/nsdl-callback" });
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!tx) return;
    (async () => {
      try {
        const ref = doc(db, "pan_transactions", tx);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        await updateDoc(ref, {
          status: status === "FAILED" ? "failed" : "success",
          ...(ack_no ? { providerRef: ack_no } : {}),
          completedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error("[NSDL callback] update failed", err);
      } finally {
        setDone(true);
      }
    })();
  }, [tx, status, ack_no]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {done ? (
              <CheckCircle2 className="h-6 w-6 text-success" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin" />
            )}
            NSDL eKYC Response
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {done
              ? "Your PAN application response has been recorded. You can return to the PAN PORTAL to check status."
              : "Recording your NSDL response…"}
          </p>
          {ack_no && (
            <p>
              Acknowledgement: <code className="font-mono">{ack_no}</code>
            </p>
          )}
          <Link to="/retailer/pan-portal">
            <Button className="w-full">Back to PAN Portal</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

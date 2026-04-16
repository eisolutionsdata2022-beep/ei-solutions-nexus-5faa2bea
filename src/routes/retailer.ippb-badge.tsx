import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Banknote, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  applyForIPPBBadge,
  type IPPBBadgeApplicationDoc,
} from "@/lib/ippb-badge";

export const Route = createFileRoute("/retailer/ippb-badge")({
  ssr: false,
  component: IPPBBadgePage,
});

function IPPBBadgePage() {
  const { appUser } = useAuth();
  const [apps, setApps] = useState<IPPBBadgeApplicationDoc[]>([]);
  const [branchLocation, setBranchLocation] = useState("");
  const [hasDevice, setHasDevice] = useState(false);
  const [deviceModel, setDeviceModel] = useState("");
  const [experience, setExperience] = useState("");
  const [authorizationDoc, setAuthorizationDoc] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!appUser) return;
    const unsub = onSnapshot(
      query(
        collection(db, "ippbBadgeApplications"),
        where("userId", "==", appUser.uid)
      ),
      (snap) => {
        const list: IPPBBadgeApplicationDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setApps(list);
      }
    );
    return unsub;
  }, [appUser?.uid]);

  if (!appUser) return null;

  const hasBadge = !!appUser.ippbBadge;
  const pending = apps.find((a) => a.status === "pending");

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await applyForIPPBBadge({
        userId: appUser.uid,
        userName: appUser.name || appUser.email,
        userEmail: appUser.email,
        userPhone: appUser.phone,
        branchLocation,
        hasDevice,
        deviceModel: hasDevice ? deviceModel : undefined,
        experience,
        authorizationDoc: authorizationDoc || undefined,
      });
      toast.success("Application submitted. Admin will review shortly.");
      setBranchLocation("");
      setHasDevice(false);
      setDeviceModel("");
      setExperience("");
      setAuthorizationDoc("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="w-6 h-6 text-gov-blue" /> IPPB Badge
        </h1>
        <p className="text-muted-foreground text-sm">
          IPPB അക്കൗണ്ട് ഓപ്പണിങ്ങും biometric capture-ഉം ചെയ്യാൻ admin
          approval വേണം.
        </p>
      </div>

      {hasBadge && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4 text-sm text-green-900 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <div>
                <p className="font-semibold">✅ IPPB Badge Active</p>
                <p className="text-xs">
                  നിങ്ങൾക്ക് IPPB requests create ചെയ്യാനും tablet-ൽ നിന്ന്
                  വരുന്ന biometric requests catch ചെയ്യാനും കഴിയും.
                </p>
              </div>
            </div>
            <Link to="/retailer/ippb">
              <Button size="sm">
                Open IPPB <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!hasBadge && pending && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            ⏳ നിങ്ങളുടെ application admin review-ൽ ആണ്. Approval വരുമ്പോൾ
            IPPB section auto-enable ആകും.
          </CardContent>
        </Card>
      )}

      {!hasBadge && !pending && (
        <Card>
          <CardHeader>
            <CardTitle>Apply for IPPB Badge</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApply} className="space-y-3">
              <div>
                <Label>Branch / City *</Label>
                <Input
                  required
                  placeholder="ഉദാ: Kollam, Trivandrum"
                  value={branchLocation}
                  onChange={(e) => setBranchLocation(e.target.value)}
                />
              </div>

              <div className="flex items-start gap-2 p-3 border rounded-md bg-muted/30">
                <Checkbox
                  id="hasDevice"
                  checked={hasDevice}
                  onCheckedChange={(v) => setHasDevice(!!v)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label htmlFor="hasDevice" className="cursor-pointer">
                    എനിക്ക് RD-Service certified fingerprint device ഉണ്ട്
                    (MFS110 / Mantra / Startek)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Real biometric capture-ന് വേണം. ഇല്ലെങ്കിലും apply ചെയ്യാം
                    (L1 simulation mode).
                  </p>
                </div>
              </div>

              {hasDevice && (
                <div>
                  <Label>Device Model</Label>
                  <Input
                    placeholder="ഉദാ: Mantra MFS110, Startek FM220U"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label>Experience / Note *</Label>
                <Textarea
                  required
                  rows={3}
                  placeholder="IPPB / India Post / banking experience ഉണ്ടെങ്കിൽ എഴുതുക"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>

              <div>
                <Label>Authorization Document Link (optional)</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={authorizationDoc}
                  onChange={(e) => setAuthorizationDoc(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={busy} className="w-full">
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {apps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Application History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {apps.map((a) => (
              <div key={a.id} className="p-3 border rounded">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                  <Badge
                    variant={
                      a.status === "approved"
                        ? "default"
                        : a.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {a.status}
                  </Badge>
                </div>
                <p className="text-xs">
                  <strong>Branch:</strong> {a.branchLocation}
                </p>
                {a.reviewNote && (
                  <p className="text-xs mt-1">
                    <strong>Admin note:</strong> {a.reviewNote}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

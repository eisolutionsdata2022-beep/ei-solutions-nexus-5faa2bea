import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { generateVleId } from "@/lib/pan-vle-id";
import { downloadVleIdCard } from "@/lib/vle-id-card-pdf";
import { openVleCertificate } from "@/lib/vle-certificate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  User as UserIcon, IdCard, Mail, Phone, Calendar, ShieldCheck,
  Download, FileText, Edit3, Lock, Camera, RefreshCw, Award,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateProfileName, updateProfileAddress, uploadProfilePhoto,
  changeUserPassword, getEditHistory, type UserEditLog,
} from "@/lib/profile-edits";
import { requestReissue, subscribeMyReissues, type CertificateReissueRequest } from "@/lib/certificate-reissue";
import { getPsaIdRecord, countSuccessfulCouponPurchases, type PsaIdRecord, PSA_AUTO_THRESHOLD } from "@/lib/psa-auto-id";

export const Route = createFileRoute("/retailer/profile")({
  ssr: false,
  component: RetailerProfile,
});

function RetailerProfile() {
  const { appUser, user } = useAuth();
  const vleId = generateVleId(appUser?.uid);
  const [editName, setEditName] = useState(false);
  const [editAddr, setEditAddr] = useState(false);
  const [editPwd, setEditPwd] = useState(false);
  const [reissueOpen, setReissueOpen] = useState<"franchise" | "vle" | null>(null);
  const [name, setName] = useState(appUser?.name || "");
  const [address, setAddress] = useState((appUser as any)?.address || "");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<UserEditLog[]>([]);
  const [reissues, setReissues] = useState<CertificateReissueRequest[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [psa, setPsa] = useState<PsaIdRecord | null>(null);
  const [couponCount, setCouponCount] = useState(0);

  useEffect(() => {
    setName(appUser?.name || "");
    setAddress((appUser as any)?.address || "");
  }, [appUser]);

  useEffect(() => {
    if (!appUser) return;
    getEditHistory(appUser.uid).then(setHistory).catch(() => {});
    const unsub = subscribeMyReissues(appUser.uid, setReissues);
    getDocs(query(collection(db, "users"), where("parentRetailerId", "==", appUser.uid)))
      .then((snap) => setStaffCount(snap.size)).catch(() => setStaffCount(0));
    getPsaIdRecord(appUser.uid).then(setPsa).catch(() => setPsa(null));
    countSuccessfulCouponPurchases(appUser.uid).then(setCouponCount).catch(() => setCouponCount(0));
    return unsub;
  }, [appUser]);

  if (!appUser) return null;

  const joinDate = appUser.createdAt || (user?.metadata?.creationTime ?? "");

  const saveName = async () => {
    try {
      await updateProfileName(appUser.uid, appUser.name || "", name);
      toast.success("Name updated");
      setEditName(false);
    } catch (e: any) { toast.error(e.message); }
  };
  const saveAddress = async () => {
    try {
      await updateProfileAddress(appUser.uid, (appUser as any).address || "", address);
      toast.success("Address updated");
      setEditAddr(false);
    } catch (e: any) { toast.error(e.message); }
  };
  const savePassword = async () => {
    if (newPwd.length < 6) return toast.error("Password must be 6+ chars");
    try {
      await changeUserPassword(oldPwd, newPwd);
      toast.success("Password changed");
      setEditPwd(false); setOldPwd(""); setNewPwd("");
    } catch (e: any) { toast.error(e.message); }
  };
  const onPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await uploadProfilePhoto(appUser.uid, f);
      toast.success("Photo uploaded");
    } catch (e: any) { toast.error(e.message); }
  };
  const submitReissue = async () => {
    if (!reissueOpen) return;
    if (reason.trim().length < 10) return toast.error("Please describe the reason (min 10 chars)");
    await requestReissue({
      userId: appUser.uid,
      userName: appUser.name || appUser.email,
      userEmail: appUser.email,
      type: reissueOpen,
      reason,
    });
    toast.success("Reissue request submitted for admin approval");
    setReissueOpen(null); setReason("");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="relative">
              {appUser.photoURL ? (
                <img src={appUser.photoURL} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-gov-blue/20" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gov-blue text-white flex items-center justify-center text-3xl font-bold">
                  {(appUser.name || appUser.email)[0].toUpperCase()}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-gov-blue text-white rounded-full p-1.5 cursor-pointer hover:opacity-90">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={onPhotoUpload} />
              </label>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{appUser.name || "—"}</h1>
                <Badge variant="secondary" className="capitalize">{appUser.role}</Badge>
                <Badge variant={
                  appUser.kycStatus === "approved" ? "default" :
                  appUser.kycStatus === "rejected" ? "destructive" : "secondary"
                } className="capitalize">
                  KYC: {appUser.kycStatus || "pending"}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><IdCard className="w-4 h-4" /> <span className="font-mono font-bold text-foreground">{vleId}</span></div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> {appUser.email}</div>
                {appUser.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> {appUser.phone}</div>}
                {joinDate && <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Joined {new Date(joinDate).toLocaleDateString("en-IN")}</div>}
                <div className="flex items-center gap-2"><UserIcon className="w-4 h-4" /> Staff: <span className="font-semibold text-foreground">{staffCount}</span></div>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <Button
                onClick={() =>
                  downloadVleIdCard({
                    name: appUser.name || appUser.email,
                    vleId,
                    email: appUser.email,
                    phone: appUser.phone,
                    joinDate,
                    kycStatus: appUser.kycStatus,
                  })
                }
                className="bg-gov-blue text-white"
              >
                <Download className="w-4 h-4 mr-2" /> VLE ID Card (PDF)
              </Button>
              <Button asChild variant="outline">
                <Link to="/retailer/staff">
                  <UserIcon className="w-4 h-4 mr-2" /> Manage Staff
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PSA ID Status */}
      <Card className={psa ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-dashed"}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${psa ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-muted"}`}>
                <Award className={`w-6 h-6 ${psa ? "text-white" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">PSA ID</p>
                {psa ? (
                  <>
                    <p className="text-2xl font-bold font-mono tracking-wider text-foreground">{psa.psaId}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      Generated {new Date(psa.generatedAt).toLocaleDateString("en-IN")}
                      <Badge className="bg-emerald-600 text-[10px] py-0">ACTIVE</Badge>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-semibold text-foreground">Not yet generated</p>
                    <p className="text-xs text-muted-foreground">
                      Purchase {Math.max(0, PSA_AUTO_THRESHOLD - couponCount)} more coupon{PSA_AUTO_THRESHOLD - couponCount === 1 ? "" : "s"} to auto-generate ({couponCount}/{PSA_AUTO_THRESHOLD} successful).
                    </p>
                  </>
                )}
              </div>
            </div>
            {!psa && (
              <Button asChild variant="outline" size="sm">
                <Link to="/retailer/pan-portal">Buy Coupons</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edits + Certificates grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Profile Edits</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div>
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              {editName ? (
                <div className="flex gap-2 mt-1">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                  <Button size="sm" onClick={saveName}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditName(false); setName(appUser.name || ""); }}>Cancel</Button>
                </div>
              ) : (
                <div className="flex justify-between items-center mt-1">
                  <p className="font-medium">{appUser.name || "—"}</p>
                  <Button size="sm" variant="ghost" onClick={() => setEditName(true)}><Edit3 className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                </div>
              )}
            </div>
            {/* Address */}
            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              {editAddr ? (
                <div className="space-y-2 mt-1">
                  <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveAddress}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditAddr(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start mt-1">
                  <p className="font-medium whitespace-pre-line">{address || "—"}</p>
                  <Button size="sm" variant="ghost" onClick={() => setEditAddr(true)}><Edit3 className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                </div>
              )}
            </div>
            {/* Password */}
            <div>
              <Label className="text-xs text-muted-foreground">Password</Label>
              {editPwd ? (
                <div className="space-y-2 mt-1">
                  <Input type="password" placeholder="Current password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
                  <Input type="password" placeholder="New password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={savePassword}>Update</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditPwd(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center mt-1">
                  <p className="font-medium">••••••••</p>
                  <Button size="sm" variant="ghost" onClick={() => setEditPwd(true)}><Lock className="w-3.5 h-3.5 mr-1" /> Change</Button>
                </div>
              )}
            </div>
            {/* KYC link */}
            <div className="pt-2 border-t">
              <Button asChild variant="outline" className="w-full">
                <Link to="/retailer/kyc"><RefreshCw className="w-4 h-4 mr-2" /> Update / Re-Submit KYC</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4" /> Certificates</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border">
              <div>
                <p className="font-semibold">Franchise Certificate</p>
                <p className="text-xs text-muted-foreground">Authorized franchise partner certificate</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openFranchise(appUser, vleId)}>
                  <FileText className="w-3.5 h-3.5 mr-1" /> View
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReissueOpen("franchise")}>Reissue</Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border">
              <div>
                <p className="font-semibold">VLE Authorization Certificate</p>
                <p className="text-xs text-muted-foreground">VLE ID certificate for PAN/PSA services</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() =>
                  openVleCertificate({
                    name: appUser.name || appUser.email,
                    vleId,
                    email: appUser.email,
                    phone: appUser.phone,
                    issueDate: joinDate || new Date().toISOString(),
                  })
                }>
                  <FileText className="w-3.5 h-3.5 mr-1" /> View
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReissueOpen("vle")}>Reissue</Button>
              </div>
            </div>
            {reissues.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Reissue Requests</p>
                <div className="space-y-1">
                  {reissues.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <span className="capitalize">{r.type} · {new Date(r.createdAt).toLocaleDateString()}</span>
                      <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit history */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Edit History</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No edits yet.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {history.slice(0, 10).map((h) => (
                <div key={h.id} className="flex justify-between border-b last:border-0 pb-2">
                  <span><b className="capitalize">{h.field}</b>: {String(h.oldValue || "—").slice(0, 30)} → {String(h.newValue || "—").slice(0, 30)}</span>
                  <span className="text-muted-foreground">{new Date(h.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reissue dialog */}
      <Dialog open={!!reissueOpen} onOpenChange={(o) => !o && setReissueOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request {reissueOpen === "vle" ? "VLE" : "Franchise"} Certificate Reissue</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Why do you need a reissue? (lost, damaged, name changed, etc.)" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReissueOpen(null)}>Cancel</Button>
            <Button onClick={submitReissue}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function openFranchise(appUser: any, vleId: string) {
  // Lazy import the existing franchise template
  import("@/lib/franchise-certificate").then(({ generateCertificateHTML }) => {
    const html = generateCertificateHTML({
      name: appUser.name || appUser.email,
      franchiseeId: vleId,
      centerName: appUser.name || "EI Solutions Center",
      agreementDate: appUser.createdAt || new Date().toISOString(),
    });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  });
}

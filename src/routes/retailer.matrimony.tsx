import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  subscribeMatrimonyProfiles, addMatrimonyProfile, updateMatrimonyProfile,
  uploadProfilePhoto, subscribeMatrimonyRequests, updateMatrimonyRequest,
} from "@/lib/matrimony-firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RELIGIONS, MARITAL_STATUSES, HEIGHTS, NAKSHATRAS } from "@/lib/matrimony-types";
import type { MatrimonyProfile, MatrimonyRequest } from "@/lib/matrimony-types";
import { Plus, Upload, Users, Heart, MessageSquare, Phone, Mail, MapPin, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/matrimony")({
  ssr: false,
  component: RetailerMatrimonyDashboard,
});

const EMPTY_FORM = {
  name: "" as string, gender: "Male" as string, age: "" as string, dob: "" as string, nakshatram: "" as string,
  religion: "" as string, caste: "" as string, education: "" as string, job: "" as string, location: "" as string,
  maritalStatus: "Never Married" as string, height: "" as string, bio: "" as string,
};

function RetailerMatrimonyDashboard() {
  const { appUser } = useAuth();
  const [profiles, setProfiles] = useState<MatrimonyProfile[]>([]);
  const [assignedRequests, setAssignedRequests] = useState<MatrimonyRequest[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!appUser) return;
    const unsub = subscribeMatrimonyProfiles((data) => setProfiles(data), appUser.uid);
    return unsub;
  }, [appUser]);

  // Subscribe to requests assigned to this franchise
  useEffect(() => {
    if (!appUser?.uid) return;
    const q = query(
      collection(db, "matrimonyRequests"),
      where("assignedFranchiseId", "==", appUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setAssignedRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as MatrimonyRequest)));
    });
    return unsub;
  }, [appUser?.uid]);

  const handleSubmit = async () => {
    if (!form.name || !form.gender || !form.age || !form.dob || !form.religion || !form.location || !appUser) {
      toast.error("Please fill required fields");
      return;
    }
    setSubmitting(true);
    try {
      const genderVal = form.gender === "Female" ? "Female" : "Male";
      const profileData = {
        franchiseId: appUser.uid,
        franchiseName: appUser.name || appUser.email,
        name: form.name,
        gender: genderVal as "Male" | "Female",
        age: parseInt(form.age),
        dob: form.dob,
        nakshatram: form.nakshatram,
        religion: form.religion,
        caste: form.caste,
        education: form.education,
        job: form.job,
        location: form.location,
        maritalStatus: form.maritalStatus,
        height: form.height,
        bio: form.bio,
        photoUrl: "",
        status: "Delivered" as const,
        isDemo: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editId) {
        let photoUrl = profiles.find(p => p.id === editId)?.photoUrl || "";
        if (photo) photoUrl = await uploadProfilePhoto(photo, editId);
        await updateMatrimonyProfile(editId, { ...profileData, photoUrl });
        toast.success("Profile updated!");
      } else {
        const docRef = await addMatrimonyProfile(profileData);
        if (photo) {
          const photoUrl = await uploadProfilePhoto(photo, docRef.id);
          await updateMatrimonyProfile(docRef.id, { photoUrl });
        }
        toast.success("Profile published successfully! ✅");
      }
      setForm(EMPTY_FORM);
      setPhoto(null);
      setEditId(null);
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    }
    setSubmitting(false);
  };

  const handleUpdateStatus = async (id: string, status: "New" | "Contacted" | "Converted") => {
    try {
      await updateMatrimonyRequest(id, { status });
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const startEdit = (p: MatrimonyProfile) => {
    setForm({
      name: p.name, gender: p.gender, age: String(p.age), dob: p.dob,
      nakshatram: p.nakshatram, religion: p.religion, caste: p.caste,
      education: p.education, job: p.job, location: p.location,
      maritalStatus: p.maritalStatus, height: p.height, bio: p.bio,
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const newRequests = assignedRequests.filter(r => r.status === "New");

  const statusColor = (s: string) => {
    if (s === "New") return "bg-blue-100 text-blue-700";
    if (s === "Contacted") return "bg-amber-100 text-amber-700";
    if (s === "Converted") return "bg-green-100 text-green-700";
    return "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-pink-600">💕 Kukku Life Matrimony</h1>
          <p className="text-sm text-muted-foreground">Franchise Dashboard</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM); }} className="bg-pink-500 hover:bg-pink-600">
          <Plus className="w-4 h-4 mr-1" /> Add Profile
        </Button>
      </div>

      {/* Alert for new requests */}
      {newRequests.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-blue-800">🔔 {newRequests.length} New Matrimony Request{newRequests.length > 1 ? "s" : ""} Received!</p>
            <p className="text-sm text-blue-600 mt-0.5">Check the "Assigned Requests" tab to contact customers and convert leads.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-pink-100"><CardContent className="p-4 text-center"><Users className="w-6 h-6 text-pink-500 mx-auto" /><p className="text-2xl font-bold mt-1">{profiles.length}</p><p className="text-xs text-muted-foreground">My Profiles</p></CardContent></Card>
        <Card className="border-blue-100"><CardContent className="p-4 text-center"><MessageSquare className="w-6 h-6 text-blue-500 mx-auto" /><p className="text-2xl font-bold mt-1">{assignedRequests.length}</p><p className="text-xs text-muted-foreground">Assigned Requests</p></CardContent></Card>
        <Card className="border-amber-100"><CardContent className="p-4 text-center"><AlertCircle className="w-6 h-6 text-amber-500 mx-auto" /><p className="text-2xl font-bold mt-1">{newRequests.length}</p><p className="text-xs text-muted-foreground">New / Pending</p></CardContent></Card>
        <Card className="border-green-100"><CardContent className="p-4 text-center"><Heart className="w-6 h-6 text-green-500 mx-auto" /><p className="text-2xl font-bold mt-1">{assignedRequests.filter(r => r.status === "Converted").length}</p><p className="text-xs text-muted-foreground">Converted</p></CardContent></Card>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-pink-200 animate-in fade-in slide-in-from-top-4">
          <CardHeader><CardTitle>{editId ? "Edit Profile" : "Add New Profile"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Full Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div><Label>Gender *</Label>
                <Select value={form.gender} onValueChange={v => set("gender", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Age *</Label><Input type="number" value={form.age} onChange={e => set("age", e.target.value)} /></div>
              <div><Label>Date of Birth *</Label><Input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} /></div>
              <div><Label>⭐ Janma Nakshatram</Label>
                <Select value={form.nakshatram} onValueChange={v => set("nakshatram", v)}>
                  <SelectTrigger><SelectValue placeholder="Select Nakshatram" /></SelectTrigger>
                  <SelectContent>{NAKSHATRAS.map(n => <SelectItem key={n.id} value={`${n.ml} (${n.en})`}>{n.ml} ({n.en})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Religion *</Label>
                <Select value={form.religion} onValueChange={v => set("religion", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{RELIGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Caste</Label><Input value={form.caste} onChange={e => set("caste", e.target.value)} /></div>
              <div><Label>Education</Label><Input value={form.education} onChange={e => set("education", e.target.value)} /></div>
              <div><Label>Job / Profession</Label><Input value={form.job} onChange={e => set("job", e.target.value)} /></div>
              <div><Label>Location *</Label><Input value={form.location} onChange={e => set("location", e.target.value)} /></div>
              <div><Label>Marital Status</Label>
                <Select value={form.maritalStatus} onValueChange={v => set("maritalStatus", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MARITAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Height</Label>
                <Select value={form.height} onValueChange={v => set("height", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{HEIGHTS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Bio</Label><Textarea value={form.bio} onChange={e => set("bio", e.target.value)} rows={3} /></div>
            <div>
              <Label>Photo</Label>
              <Input type="file" accept="image/*" ref={fileRef} onChange={e => setPhoto(e.target.files?.[0] || null)} />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={submitting} className="bg-pink-500 hover:bg-pink-600">
                <Upload className="w-4 h-4 mr-1" /> {submitting ? "Saving..." : editId ? "Update" : "Submit & Publish"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests" className="relative">
            Assigned Requests
            {newRequests.length > 0 && (
              <span className="ml-1.5 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full inline-flex items-center justify-center font-bold">{newRequests.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="profiles">My Profiles ({profiles.length})</TabsTrigger>
        </TabsList>

        {/* ─── Assigned Requests ─── */}
        <TabsContent value="requests" className="space-y-3">
          {assignedRequests.length === 0 && <p className="text-center py-8 text-muted-foreground">No requests assigned to you yet</p>}
          {assignedRequests.map(r => (
            <Card key={r.id} className={`${r.status === "New" ? "border-blue-300 bg-blue-50/30" : "border-gray-200"} transition-colors`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-lg">{r.requesterName}</p>
                      <Badge className={`${statusColor(r.status)} text-xs border-0`}>{r.status}</Badge>
                      {r.status === "New" && <span className="text-xs text-red-500 font-semibold animate-pulse">● NEW</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Interested in: <strong>{r.profileName}</strong>
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="flex items-center gap-1 text-gray-700"><Phone className="w-3.5 h-3.5 text-green-500" /><strong>{r.phone}</strong></span>
                      {r.email && <span className="flex items-center gap-1 text-gray-600"><Mail className="w-3.5 h-3.5 text-blue-400" />{r.email}</span>}
                      <span className="flex items-center gap-1 text-gray-600"><MapPin className="w-3.5 h-3.5 text-rose-400" />{r.district || "N/A"}</span>
                    </div>
                    {r.message && <p className="text-sm mt-2 italic text-gray-500 bg-white/60 rounded-lg p-2 border">"{r.message}"</p>}
                    <p className="text-[11px] text-muted-foreground mt-2">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Select value={r.status} onValueChange={(v) => handleUpdateStatus(r.id, v as "New" | "Contacted" | "Converted")}>
                      <SelectTrigger className="w-[130px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Converted">Converted</SelectItem>
                      </SelectContent>
                    </Select>
                    <a href={`tel:${r.phone}`} className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-colors">
                      <Phone className="w-3.5 h-3.5" /> Call Now
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ─── Profiles ─── */}
        <TabsContent value="profiles">
          <div className="space-y-3">
            {profiles.length === 0 && <p className="text-center py-8 text-muted-foreground">No profiles yet. Add your first profile!</p>}
            {profiles.map(p => (
              <Card key={p.id} className="border-pink-100">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden shrink-0">
                    {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl font-bold text-pink-400">{p.name[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{p.name}</p>
                      <Badge className="bg-green-500 text-white border-0 text-[10px]">Delivered</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{p.age} yrs • {p.gender} • {p.location}</p>
                    <p className="text-xs text-muted-foreground">{p.education} • {p.job}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => startEdit(p)}>Edit</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

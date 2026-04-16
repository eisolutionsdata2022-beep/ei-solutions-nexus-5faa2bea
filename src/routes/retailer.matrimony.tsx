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
  uploadProfilePhoto, subscribeMatrimonyRequests,
} from "@/lib/matrimony-firebase";
import { generateDemoProfiles, RELIGIONS, MARITAL_STATUSES, HEIGHTS, NAKSHATRAS } from "@/lib/matrimony-types";
import type { MatrimonyProfile, MatrimonyRequest } from "@/lib/matrimony-types";
import { Plus, Upload, Users, Heart, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/matrimony")({
  ssr: false,
  component: RetailerMatrimonyDashboard,
});

const EMPTY_FORM = {
  name: "", gender: "Male" as const, age: "", dob: "", nakshatram: "",
  religion: "", caste: "", education: "", job: "", location: "",
  maritalStatus: "Never Married", height: "", bio: "",
};

function RetailerMatrimonyDashboard() {
  const { appUser } = useAuth();
  const [profiles, setProfiles] = useState<MatrimonyProfile[]>([]);
  const [requests, setRequests] = useState<MatrimonyRequest[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!appUser) return;
    const unsub1 = subscribeMatrimonyProfiles((data) => setProfiles(data), appUser.uid);
    return unsub1;
  }, [appUser]);

  useEffect(() => {
    if (profiles.length === 0) return;
    const ids = profiles.map(p => p.id);
    const unsub = subscribeMatrimonyRequests((data) => setRequests(data), ids);
    return unsub;
  }, [profiles]);

  const handleSubmit = async () => {
    if (!form.name || !form.gender || !form.age || !form.dob || !form.religion || !form.location || !appUser) {
      toast.error("Please fill required fields");
      return;
    }
    setSubmitting(true);
    try {
      const profileData = {
        franchiseId: appUser.uid,
        franchiseName: appUser.name || appUser.email,
        name: form.name,
        gender: form.gender as "Male" | "Female",
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-pink-100"><CardContent className="p-4 text-center"><Users className="w-6 h-6 text-pink-500 mx-auto" /><p className="text-2xl font-bold mt-1">{profiles.length}</p><p className="text-xs text-muted-foreground">My Profiles</p></CardContent></Card>
        <Card className="border-green-100"><CardContent className="p-4 text-center"><Badge className="bg-green-500 text-white border-0 mx-auto">Auto</Badge><p className="text-lg font-bold mt-1">Delivered</p><p className="text-xs text-muted-foreground">Status</p></CardContent></Card>
        <Card className="border-blue-100"><CardContent className="p-4 text-center"><MessageSquare className="w-6 h-6 text-blue-500 mx-auto" /><p className="text-2xl font-bold mt-1">{requests.length}</p><p className="text-xs text-muted-foreground">Requests</p></CardContent></Card>
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

      <Tabs defaultValue="profiles">
        <TabsList><TabsTrigger value="profiles">My Profiles</TabsTrigger><TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger></TabsList>
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
        <TabsContent value="requests">
          <div className="space-y-3">
            {requests.length === 0 && <p className="text-center py-8 text-muted-foreground">No requests yet</p>}
            {requests.map(r => (
              <Card key={r.id} className="border-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{r.requesterName}</p>
                    <Badge variant="outline" className="text-xs">{new Date(r.createdAt).toLocaleDateString()}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">For: <strong>{r.profileName}</strong></p>
                  <p className="text-sm">📞 {r.phone} {r.email && `• ✉️ ${r.email}`}</p>
                  {r.message && <p className="text-sm mt-1 text-muted-foreground italic">"{r.message}"</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

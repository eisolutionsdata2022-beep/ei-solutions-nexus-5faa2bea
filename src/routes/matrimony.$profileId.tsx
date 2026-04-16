import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { addMatrimonyRequest } from "@/lib/matrimony-firebase";
import type { MatrimonyProfile } from "@/lib/matrimony-types";
import { ArrowLeft, MapPin, GraduationCap, Briefcase, Heart, Star, User, Calendar, Ruler, BookOpen, Send } from "lucide-react";
import { toast } from "sonner";
import godIcon from "@/assets/matrimony-god-icon.png";

export const Route = createFileRoute("/matrimony/$profileId")({
  ssr: false,
  component: ProfileDetailPage,
});

function ProfileDetailPage() {
  const { profileId } = Route.useParams();
  const [profile, setProfile] = useState<MatrimonyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });

  useEffect(() => {
    getDoc(doc(db, "matrimonyProfiles", profileId)).then((snap) => {
      if (snap.exists()) setProfile({ id: snap.id, ...snap.data() } as MatrimonyProfile);
      setLoading(false);
    });
  }, [profileId]);

  const handleSubmitRequest = async () => {
    if (!form.name || !form.phone) {
      toast.error("Name and Phone are required");
      return;
    }
    setSubmitting(true);
    try {
      await addMatrimonyRequest({
        profileId,
        profileName: profile?.name || "",
        requesterName: form.name,
        phone: form.phone,
        email: form.email,
        message: form.message,
        createdAt: new Date().toISOString(),
      });
      toast.success("Interest request sent successfully!");
      setShowRequestForm(false);
      setForm({ name: "", phone: "", email: "", message: "" });
    } catch {
      toast.error("Failed to send request");
    }
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-pink-50"><p>Loading...</p></div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center bg-pink-50"><p>Profile not found</p></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/matrimony" className="flex items-center gap-2 text-white/90 hover:text-white">
            <ArrowLeft className="w-5 h-5" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <img src={godIcon} alt="" width={32} height={32} />
            <span className="font-bold">Kukku Life Matrimony</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* God Image Header */}
        <div className="text-center mb-6">
          <img src={godIcon} alt="Ganapathi" width={80} height={80} className="mx-auto drop-shadow-md" />
          <p className="text-xs text-muted-foreground mt-1">ശ്രീ ഗണേശായ നമഃ</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Photo */}
          <div className="aspect-[3/4] bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl overflow-hidden shadow-lg">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center text-6xl font-bold text-white">
                  {profile.name.charAt(0)}
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <Badge className={`${profile.gender === "Male" ? "bg-blue-500" : "bg-pink-500"} text-white border-0 mb-2`}>
                {profile.gender === "Male" ? "🤵 Groom" : "👰 Bride"}
              </Badge>
              <h1 className="text-3xl font-bold">{profile.name}</h1>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailItem icon={Calendar} label="Age" value={`${profile.age} years`} />
              <DetailItem icon={Calendar} label="DOB" value={profile.dob} />
              <DetailItem icon={Star} label="Nakshatram" value={profile.nakshatram} />
              <DetailItem icon={Ruler} label="Height" value={profile.height} />
              <DetailItem icon={MapPin} label="Location" value={profile.location} />
              <DetailItem icon={BookOpen} label="Religion" value={`${profile.religion} - ${profile.caste}`} />
              <DetailItem icon={GraduationCap} label="Education" value={profile.education} />
              <DetailItem icon={Briefcase} label="Job" value={profile.job} />
              <DetailItem icon={User} label="Marital Status" value={profile.maritalStatus} />
            </div>

            {profile.bio && (
              <Card className="border-pink-100">
                <CardContent className="p-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white py-6 text-lg rounded-xl shadow-lg"
            >
              <Heart className="w-5 h-5 mr-2" /> Send Interest Request
            </Button>
          </div>
        </div>

        {/* Request Form */}
        {showRequestForm && (
          <Card className="mt-6 border-pink-200 animate-in fade-in slide-in-from-top-4 duration-300">
            <CardHeader>
              <CardTitle className="text-pink-600 flex items-center gap-2"><Send className="w-5 h-5" /> Send Interest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Your Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Enter your name" /></div>
                <div><Label>Phone *</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone number" /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email (optional)" type="email" /></div>
              </div>
              <div><Label>Message</Label><Textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Write a message..." rows={3} /></div>
              <Button onClick={handleSubmitRequest} disabled={submitting} className="bg-pink-500 hover:bg-pink-600">
                {submitting ? "Sending..." : "Submit Request"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

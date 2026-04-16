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
import { addMatrimonyRequest, findFranchiseByDistrict, addNotification } from "@/lib/matrimony-firebase";
import type { MatrimonyProfile } from "@/lib/matrimony-types";
import { ArrowLeft, MapPin, GraduationCap, Briefcase, Heart, Star, User, Calendar, Ruler, BookOpen, Send, Sparkles, Share2, Check } from "lucide-react";
import { toast } from "sonner";

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
  const [copied, setCopied] = useState(false);

  const handleShareLink = () => {
    const url = `${window.location.origin}/matrimony/${profileId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

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
    if (!profile) return;
    setSubmitting(true);
    try {
      // Auto-detect district from profile location
      const district = profile.location;

      // Find franchise for this district
      const franchise = await findFranchiseByDistrict(district);

      await addMatrimonyRequest({
        profileId,
        profileName: profile.name,
        requesterName: form.name,
        phone: form.phone,
        email: form.email,
        message: form.message,
        district,
        assignedFranchiseId: franchise?.id || "",
        assignedFranchiseName: franchise?.name || "Unassigned",
        status: "New",
        createdAt: new Date().toISOString(),
      });

      // Send notification to franchise if found
      if (franchise) {
        await addNotification(franchise.id, {
          type: "matrimony_request",
          title: "New Matrimony Request Received",
          message: `${form.name} (${form.phone}) is interested in ${profile.name}`,
          data: { profileId, profileName: profile.name, requesterName: form.name, phone: form.phone },
        });
      }

      toast.success("Interest request sent successfully!");
      setShowRequestForm(false);
      setForm({ name: "", phone: "", email: "", message: "" });
    } catch {
      toast.error("Failed to send request");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50">
        <div className="w-12 h-12 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50 gap-4">
        <Heart className="w-16 h-16 text-pink-200" />
        <p className="text-xl font-semibold text-muted-foreground">Profile not found</p>
        <Link to="/matrimony" className="text-pink-500 hover:text-pink-600 underline">← Back to profiles</Link>
      </div>
    );
  }

  const isMale = profile.gender === "Male";

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/matrimony" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <span className="font-bold text-white tracking-wide">💕 Kukku Life Matrimony</span>
          <Button variant="ghost" size="sm" onClick={handleShareLink} className="text-white/80 hover:text-white hover:bg-white/10">
            {copied ? <Check className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
            {copied ? "Copied!" : "Share"}
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Photo — 2 cols */}
          <div className="md:col-span-2">
            <div className="sticky top-6">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 bg-gradient-to-br from-pink-100 to-rose-100">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-300 to-rose-400 flex items-center justify-center text-5xl font-bold text-white shadow-lg">
                      {profile.name.charAt(0)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details — 3 cols */}
          <div className="md:col-span-3 space-y-6">
            {/* Name & Badge */}
            <div>
              <Badge className={`${isMale ? "bg-blue-500/90" : "bg-pink-500/90"} text-white border-0 mb-3 text-xs px-3 py-1 rounded-full shadow-sm`}>
                {isMale ? "🤵 Groom" : "👰 Bride"}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">{profile.name}</h1>
              <p className="text-muted-foreground mt-1 text-sm">{profile.age} yrs · {profile.height} · {profile.location}</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoCard icon={Calendar} label="Age" value={`${profile.age} years`} color="blue" />
              <InfoCard icon={Calendar} label="DOB" value={profile.dob} color="indigo" />
              <InfoCard icon={Star} label="Nakshatram" value={profile.nakshatram} color="amber" />
              <InfoCard icon={Ruler} label="Height" value={profile.height} color="teal" />
              <InfoCard icon={MapPin} label="Location" value={profile.location} color="rose" />
              <InfoCard icon={BookOpen} label="Religion" value={profile.religion} color="purple" />
              <InfoCard icon={GraduationCap} label="Education" value={profile.education} color="emerald" />
              <InfoCard icon={Briefcase} label="Occupation" value={profile.job} color="orange" />
              <InfoCard icon={User} label="Status" value={profile.maritalStatus} color="sky" />
            </div>

            {/* Caste */}
            {profile.caste && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-gray-700">Caste:</span> {profile.caste}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <div className="rounded-xl bg-gradient-to-br from-pink-50/80 to-rose-50/80 border border-pink-100/60 p-5 relative">
                <Sparkles className="absolute top-3 right-3 w-4 h-4 text-pink-300" />
                <p className="text-sm leading-relaxed text-gray-600 italic">"{profile.bio}"</p>
              </div>
            )}

            {/* CTA Button */}
            <Button
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:via-rose-600 hover:to-pink-700 text-white py-6 text-base font-semibold rounded-xl shadow-lg shadow-pink-500/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              <Heart className="w-5 h-5 mr-2" />
              {showRequestForm ? "Close Form" : "Send Interest Request"}
            </Button>
          </div>
        </div>

        {/* Request Form */}
        {showRequestForm && (
          <div className="mt-8 max-w-2xl mx-auto">
            <Card className="border-pink-200/60 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100/50 pb-4">
                <CardTitle className="text-pink-600 flex items-center gap-2 text-lg">
                  <Send className="w-5 h-5" /> Express Your Interest
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Fill the form below and we'll connect you with the nearest franchise.</p>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Your Name *</Label>
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Enter your full name" className="rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone *</Label>
                    <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone number" className="rounded-lg" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email (optional)</Label>
                    <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="your@email.com" type="email" className="rounded-lg" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Message</Label>
                  <Textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Write a brief message about yourself..." rows={4} className="rounded-lg resize-none" />
                </div>
                <Button
                  onClick={handleSubmitRequest}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 py-5 rounded-xl font-semibold shadow-md"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Sending...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Submit Interest Request</span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-pink-100 bg-gradient-to-r from-pink-50/50 to-rose-50/50 py-6 text-center mt-8">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Kukku Life Matrimony — Powered by EI SOLUTIONS</p>
      </footer>
    </div>
  );
}

const colorMap: Record<string, string> = {
  blue: "bg-blue-50 border-blue-100 text-blue-600",
  indigo: "bg-indigo-50 border-indigo-100 text-indigo-600",
  amber: "bg-amber-50 border-amber-100 text-amber-600",
  teal: "bg-teal-50 border-teal-100 text-teal-600",
  rose: "bg-rose-50 border-rose-100 text-rose-600",
  purple: "bg-purple-50 border-purple-100 text-purple-600",
  emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
  orange: "bg-orange-50 border-orange-100 text-orange-600",
  sky: "bg-sky-50 border-sky-100 text-sky-600",
};

function InfoCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  const classes = colorMap[color] || colorMap.blue;
  return (
    <div className={`rounded-xl border p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${classes}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 opacity-70" />
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{label}</span>
      </div>
      <p className="font-semibold text-sm text-gray-800 leading-tight truncate">{value}</p>
    </div>
  );
}

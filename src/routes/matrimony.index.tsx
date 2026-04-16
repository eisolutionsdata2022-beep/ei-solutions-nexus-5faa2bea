import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subscribeMatrimonyProfiles } from "@/lib/matrimony-firebase";
import type { MatrimonyProfile } from "@/lib/matrimony-types";
import { RELIGIONS } from "@/lib/matrimony-types";
import { Search, MapPin, GraduationCap, Briefcase, Heart, Shield, Eye } from "lucide-react";

export const Route = createFileRoute("/matrimony/")({
  ssr: false,
  component: MatrimonyPublicPage,
});

function MatrimonyPublicPage() {
  const [profiles, setProfiles] = useState<MatrimonyProfile[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [religionFilter, setReligionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("latest");

  useEffect(() => {
    const unsub = subscribeMatrimonyProfiles((data) => setProfiles(data));
    return unsub;
  }, []);

  let filtered = profiles.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.location.toLowerCase().includes(search.toLowerCase())) return false;
    if (genderFilter !== "all" && p.gender !== genderFilter) return false;
    if (religionFilter !== "all" && p.religion !== religionFilter) return false;
    return true;
  });

  if (sortBy === "age-asc") filtered.sort((a, b) => a.age - b.age);
  else if (sortBy === "age-desc") filtered.sort((a, b) => b.age - a.age);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">💕 Kukku Life Matrimony</h1>
          <p className="text-pink-100 text-sm mt-2">Find Your Perfect Life Partner</p>
        </div>
      </header>

      {/* Notice Banner */}
      <div className="bg-amber-50 border-b-2 border-amber-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-start gap-2 text-amber-800 text-sm">
            <Shield className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold">📋 Registration EI SOLUTIONS Franchise outlets വഴി മാത്രം ലഭ്യമാണ്</p>
              <p>Direct online registration ലഭ്യമല്ല. നിങ്ങളുടെ അടുത്തുള്ള EI SOLUTIONS franchise ബന്ധപ്പെടുക.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gender</SelectItem>
                <SelectItem value="Male">Groom</SelectItem>
                <SelectItem value="Female">Bride</SelectItem>
              </SelectContent>
            </Select>
            <Select value={religionFilter} onValueChange={setReligionFilter}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Religion" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Religions</SelectItem>
                {RELIGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest First</SelectItem>
                <SelectItem value="age-asc">Age: Low to High</SelectItem>
                <SelectItem value="age-desc">Age: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">{filtered.length} profiles found</p>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-pink-200 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">No profiles found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 text-center py-6 mt-12">
        <p className="text-sm">© {new Date().getFullYear()} Kukku Life Matrimony — Powered by EI SOLUTIONS</p>
      </footer>
    </div>
  );
}

function ProfileCard({ profile }: { profile: MatrimonyProfile }) {
  const isMale = profile.gender === "Male";

  return (
    <Link to="/matrimony/$profileId" params={{ profileId: profile.id }} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden border border-pink-100/60 shadow-sm hover:shadow-xl transition-all duration-300 group-hover:-translate-y-2 group-hover:border-pink-200">
        {/* Image */}
        <div className="aspect-[4/5] bg-gradient-to-br from-pink-50 to-rose-100 relative overflow-hidden">
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center text-5xl font-bold text-white shadow-inner">
                {profile.name.charAt(0)}
              </div>
            </div>
          )}
          <Badge className={`absolute top-3 right-3 ${isMale ? "bg-blue-500" : "bg-pink-500"} text-white border-0 shadow-md text-xs`}>
            {isMale ? "Groom" : "Bride"}
          </Badge>
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
            <Button size="sm" className="bg-white/90 text-pink-600 hover:bg-white rounded-full px-5 shadow-lg font-semibold text-xs gap-1.5">
              <Eye className="w-3.5 h-3.5" /> View Profile
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-pink-600 transition-colors">{profile.name}</h3>
          <p className="text-sm text-muted-foreground">{profile.age} yrs • {profile.height}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-rose-400" /><span className="truncate">{profile.location}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" /><span className="truncate">{profile.education}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" /><span className="truncate">{profile.job}</span>
            </div>
          </div>
          <div className="pt-2 flex items-center justify-between border-t border-gray-100">
            <Badge variant="outline" className="text-xs rounded-full">{profile.religion}</Badge>
            <span className="text-xs text-pink-500 font-semibold group-hover:text-pink-600">View →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

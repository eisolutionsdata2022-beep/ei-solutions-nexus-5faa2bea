import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subscribeMatrimonyProfiles, getMatrimonyPricing } from "@/lib/matrimony-firebase";
import type { MatrimonyProfile, MatrimonyPricing } from "@/lib/matrimony-types";
import { RELIGIONS, DEFAULT_PRICING } from "@/lib/matrimony-types";
import { Search, MapPin, GraduationCap, Briefcase, Heart, Star, Shield, Crown, Users, ChevronRight } from "lucide-react";
import godIcon from "@/assets/matrimony-god-icon.png";

export const Route = createFileRoute("/matrimony")({
  ssr: false,
  component: MatrimonyPublicPage,
});

function MatrimonyPublicPage() {
  const [profiles, setProfiles] = useState<MatrimonyProfile[]>([]);
  const [pricing, setPricing] = useState<MatrimonyPricing>(DEFAULT_PRICING);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [religionFilter, setReligionFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => {
    const unsub = subscribeMatrimonyProfiles((data) => setProfiles(data));
    getMatrimonyPricing().then(setPricing);
    return unsub;
  }, []);

  const locations = [...new Set(profiles.map(p => p.location))].sort();

  let filtered = profiles.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.location.toLowerCase().includes(search.toLowerCase())) return false;
    if (genderFilter !== "all" && p.gender !== genderFilter) return false;
    if (religionFilter !== "all" && p.religion !== religionFilter) return false;
    if (locationFilter !== "all" && p.location !== locationFilter) return false;
    return true;
  });

  if (sortBy === "age-asc") filtered.sort((a, b) => a.age - b.age);
  else if (sortBy === "age-desc") filtered.sort((a, b) => b.age - a.age);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-4 mb-2">
            <img src={godIcon} alt="Ganapathi" width={48} height={48} className="drop-shadow-lg" />
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">💕 Kukku Life Matrimony</h1>
              <p className="text-pink-100 text-sm mt-1">Find Your Perfect Life Partner</p>
            </div>
            <img src={godIcon} alt="Ganapathi" width={48} height={48} className="drop-shadow-lg" />
          </div>
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
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-pink-100 text-center">
            <Users className="w-6 h-6 text-pink-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-pink-600">{profiles.length}</p>
            <p className="text-xs text-muted-foreground">Total Profiles</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 text-center">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">{profiles.filter(p => p.gender === "Male").length}</p>
            <p className="text-xs text-muted-foreground">Grooms</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-rose-100 text-center">
            <Heart className="w-6 h-6 text-rose-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-rose-600">{profiles.filter(p => p.gender === "Female").length}</p>
            <p className="text-xs text-muted-foreground">Brides</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100 text-center cursor-pointer" onClick={() => setShowPricing(!showPricing)}>
            <Crown className="w-6 h-6 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-600">Plans</p>
            <p className="text-xs text-muted-foreground">View Pricing</p>
          </div>
        </div>

        {/* Pricing Cards */}
        {showPricing && (
          <div className="grid md:grid-cols-3 gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <Card className="border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white overflow-hidden">
              <div className="bg-blue-500 text-white text-center py-2 font-bold">BASIC</div>
              <CardContent className="p-6 text-center">
                <p className="text-4xl font-bold text-blue-600 mb-2">₹{pricing.basicPrice}</p>
                <ul className="text-sm text-left space-y-2 mt-4">
                  {pricing.basicFeatures.map((f, i) => <li key={i} className="flex gap-2"><Star className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />{f}</li>)}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-2 border-pink-300 bg-gradient-to-b from-pink-50 to-white overflow-hidden scale-105 shadow-lg">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-center py-2 font-bold">⭐ PREMIUM</div>
              <CardContent className="p-6 text-center">
                <p className="text-4xl font-bold text-pink-600 mb-2">₹{pricing.premiumPrice}</p>
                <ul className="text-sm text-left space-y-2 mt-4">
                  {pricing.premiumFeatures.map((f, i) => <li key={i} className="flex gap-2"><Star className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />{f}</li>)}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center py-2 font-bold">👑 VIP</div>
              <CardContent className="p-6 text-center">
                <p className="text-4xl font-bold text-amber-600 mb-2">₹{pricing.vipPrice}</p>
                <ul className="text-sm text-left space-y-2 mt-4">
                  {pricing.vipFeatures.map((f, i) => <li key={i} className="flex gap-2"><Star className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />{f}</li>)}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gender</SelectItem>
                <SelectItem value="Male">Groom</SelectItem>
                <SelectItem value="Female">Bride</SelectItem>
              </SelectContent>
            </Select>
            <Select value={religionFilter} onValueChange={setReligionFilter}>
              <SelectTrigger><SelectValue placeholder="Religion" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Religions</SelectItem>
                {RELIGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest First</SelectItem>
                <SelectItem value="age-asc">Age: Low to High</SelectItem>
                <SelectItem value="age-desc">Age: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((profile) => (
            <Link key={profile.id} to="/matrimony/$profileId" params={{ profileId: profile.id }} className="group">
              <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-pink-100 group-hover:border-pink-300 group-hover:-translate-y-1">
                <div className="aspect-[3/4] bg-gradient-to-br from-pink-100 to-rose-100 relative overflow-hidden">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center text-4xl font-bold text-white">
                        {profile.name.charAt(0)}
                      </div>
                    </div>
                  )}
                  <Badge className={`absolute top-2 right-2 ${profile.gender === "Male" ? "bg-blue-500" : "bg-pink-500"} text-white border-0`}>
                    {profile.gender === "Male" ? "Groom" : "Bride"}
                  </Badge>
                  {profile.isDemo && <Badge className="absolute top-2 left-2 bg-amber-500 text-white border-0 text-[10px]">Demo</Badge>}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg truncate">{profile.name}</h3>
                  <p className="text-sm text-muted-foreground">{profile.age} yrs • {profile.height}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />{profile.location}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <GraduationCap className="w-3 h-3" />{profile.education}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Briefcase className="w-3 h-3" />{profile.job}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{profile.religion}</Badge>
                    <span className="text-xs text-pink-500 font-medium flex items-center gap-1 group-hover:text-pink-600">
                      View <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
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

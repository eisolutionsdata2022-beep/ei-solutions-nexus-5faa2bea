import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getActivatableServices,
  listActivationConfigs,
  subscribeUserActivations,
  subscribeUserActivationHistory,
  activateServiceForUser,
  type ActivationConfig,
  type ServiceActivation,
} from "@/lib/service-activation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2, Loader2, Wallet as WalletIcon, History, Sparkles,
  Search, Star, ArrowRight, RefreshCw, Zap, Shield, TrendingUp,
  Smartphone, FileText, Send, Building2, CreditCard, IdCard,
  Sun, Heart, FileUser, Coins, GraduationCap, Bot, Wrench,
  ClipboardList, Briefcase, BadgeCheck, Layers,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/my-services")({
  ssr: false,
  component: MyServicesPage,
});

// ───── Service icon + gradient mapping ─────
const SERVICE_META: Record<string, { icon: any; gradient: string; glow: string }> = {
  "recharge-bbps":   { icon: Smartphone,    gradient: "from-violet-500 via-fuchsia-500 to-pink-500",  glow: "shadow-fuchsia-500/30" },
  "e-dis":           { icon: FileText,      gradient: "from-blue-500 via-indigo-500 to-purple-600",   glow: "shadow-indigo-500/30" },
  "money-transfer":  { icon: Send,          gradient: "from-emerald-500 via-teal-500 to-cyan-500",    glow: "shadow-teal-500/30"    },
  "ippb":            { icon: Building2,     gradient: "from-amber-500 via-orange-500 to-red-500",     glow: "shadow-orange-500/30"  },
  "ei-pay":          { icon: CreditCard,    gradient: "from-cyan-500 via-sky-500 to-blue-600",        glow: "shadow-sky-500/30"     },
  
  "horoscope":       { icon: Sun,           gradient: "from-yellow-400 via-amber-500 to-orange-500",  glow: "shadow-amber-500/30"   },
  "matrimony":       { icon: Heart,         gradient: "from-pink-500 via-rose-500 to-red-500",        glow: "shadow-rose-500/30"    },
  "cv-builder":      { icon: FileUser,      gradient: "from-indigo-500 via-blue-500 to-cyan-500",     glow: "shadow-blue-500/30"    },
  "finance":         { icon: Coins,         gradient: "from-yellow-500 via-amber-500 to-yellow-600",  glow: "shadow-yellow-500/30"  },
  "trainings":       { icon: GraduationCap, gradient: "from-purple-500 via-violet-500 to-indigo-600", glow: "shadow-violet-500/30"  },
  "virtual-trainer": { icon: Bot,           gradient: "from-cyan-400 via-teal-500 to-emerald-500",    glow: "shadow-cyan-500/30"    },
  "page-tools":      { icon: Wrench,        gradient: "from-slate-500 via-gray-600 to-zinc-700",      glow: "shadow-slate-500/30"   },
  "forms":           { icon: ClipboardList, gradient: "from-green-500 via-emerald-500 to-teal-500",   glow: "shadow-emerald-500/30" },
  "jobs":            { icon: Briefcase,     gradient: "from-orange-500 via-red-500 to-rose-500",      glow: "shadow-red-500/30"     },
  "work-badge":      { icon: BadgeCheck,    gradient: "from-emerald-500 via-green-500 to-lime-500",   glow: "shadow-green-500/30"   },
};

const FALLBACK_META = { icon: Layers, gradient: "from-slate-500 to-slate-700", glow: "shadow-slate-500/30" };

// localStorage key for favorites
const FAV_KEY = "my-services:favorites:v1";

function MyServicesPage() {
  const { appUser } = useAuth();
  const services = useMemo(() => getActivatableServices(), []);
  const [configs, setConfigs] = useState<Record<string, ActivationConfig>>({});
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [activeList, setActiveList] = useState<ServiceActivation[]>([]);
  const [history, setHistory] = useState<Array<ServiceActivation & { eventId: string }>>([]);
  const [balance, setBalance] = useState(0);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "available" | "favorites">("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => { listActivationConfigs().then(setConfigs); }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavorites(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  useEffect(() => {
    if (!appUser?.uid) return;
    const unsubA = subscribeUserActivations(appUser.uid, (set, list) => {
      setActiveKeys(set);
      setActiveList(list);
    });
    const unsubH = subscribeUserActivationHistory(appUser.uid, setHistory);
    const unsubW = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      setBalance(snap.exists() ? (snap.data().balance || 0) : 0);
    });
    return () => { unsubA(); unsubH(); unsubW(); };
  }, [appUser?.uid]);

  const toggleFav = (key: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleActivate = async (serviceKey: string, serviceName: string) => {
    if (!appUser?.uid) return;
    setProcessing(serviceKey);
    try {
      await activateServiceForUser({ uid: appUser.uid, serviceKey, serviceName });
      toast.success(`${serviceName} activated successfully!`);
    } catch (e: any) {
      const msg = String(e?.message || "Activation failed");
      if (/insufficient/i.test(msg)) toast.error("Insufficient Balance — please recharge your wallet.");
      else toast.error(msg);
    } finally {
      setProcessing(null);
      setConfirmKey(null);
    }
  };

  // Build enriched list
  const enriched = useMemo(() => {
    return services.map((s) => {
      const cfg = configs[s.key];
      const isActive = activeKeys.has(s.key);
      const activation = activeList.find((x) => x.serviceKey === s.key);
      const meta = SERVICE_META[s.key] || FALLBACK_META;
      return { ...s, cfg, isActive, activation, meta, isFav: favorites.has(s.key) };
    });
  }, [services, configs, activeKeys, activeList, favorites]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((s) => {
      if (filter === "active" && !s.isActive) return false;
      if (filter === "available" && (s.isActive || !s.cfg?.enabled)) return false;
      if (filter === "favorites" && !s.isFav) return false;
      if (q && !(`${s.name} ${s.description} ${s.category}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [enriched, filter, search]);

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach((s) => { (map[s.category] ||= []).push(s); });
    return map;
  }, [filtered]);

  // Stats
  const stats = useMemo(() => {
    const total = enriched.length;
    const active = enriched.filter((s) => s.isActive).length;
    const available = enriched.filter((s) => s.cfg?.enabled && !s.isActive).length;
    const favs = enriched.filter((s) => s.isFav).length;
    return { total, active, available, favs };
  }, [enriched]);

  const fmtDate = (iso: string) => new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="space-y-6 pb-10">
      {/* ───── HERO HEADER ───── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 lg:p-8 shadow-premium">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-blob" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium border border-white/25">
              <Sparkles className="w-3.5 h-3.5" /> Premium Service Hub
            </div>
            <h1 className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight">My Services</h1>
            <p className="mt-1 text-sm text-white/80 max-w-lg">
              Activate, manage & launch every business service from one luxury dashboard.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 rounded-2xl bg-white/15 backdrop-blur-xl px-4 py-3 border border-white/25 shadow-lg">
              <WalletIcon className="w-5 h-5 text-white" />
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-wider text-white/70">Wallet</div>
                <div className="text-lg font-bold text-white">₹{balance.toLocaleString("en-IN")}</div>
              </div>
            </div>
            <Link to="/retailer/wallet">
              <Button size="sm" className="bg-white text-indigo-700 hover:bg-white/90 font-semibold shadow-lg">
                <Zap className="w-4 h-4 mr-1.5" /> Recharge
              </Button>
            </Link>
          </div>
        </div>

        {/* Stat chips */}
        <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatChip icon={Layers}      label="Total Services" value={stats.total}     accent="from-blue-400 to-cyan-400" />
          <StatChip icon={CheckCircle2} label="Active"        value={stats.active}    accent="from-emerald-400 to-teal-400" />
          <StatChip icon={Sparkles}    label="Available"      value={stats.available} accent="from-amber-400 to-orange-400" />
          <StatChip icon={Star}        label="Favorites"      value={stats.favs}      accent="from-pink-400 to-rose-400" />
        </div>
      </div>

      {/* ───── SEARCH + FILTERS ───── */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search services, e.g. PAN, Horoscope, Finance..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-indigo-400/40 bg-card"
          />
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 backdrop-blur border">
          {(["all", "active", "available", "favorites"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ───── SERVICE GROUPS ───── */}
      {Object.keys(grouped).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Search className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
            <p className="text-sm text-muted-foreground">No services match your filter.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="space-y-3 animate-fade-up">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-purple-600" />
              <h2 className="text-base font-bold text-foreground">{category}</h2>
              <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((s) => (
                <ServiceCard
                  key={s.key}
                  service={s}
                  onActivate={() => setConfirmKey(s.key)}
                  onToggleFav={() => toggleFav(s.key)}
                  processing={processing === s.key}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {/* ───── HISTORY ───── */}
      <Card className="border-border/60 overflow-hidden">
        <CardHeader className="py-3 px-4 border-b bg-gradient-to-r from-slate-50 to-indigo-50/50 dark:from-slate-900/50 dark:to-indigo-950/30">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" /> Activation History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 font-semibold">Service</th>
                  <th className="text-left px-3 py-2 font-semibold">Amount</th>
                  <th className="text-left px-3 py-2 font-semibold">Validity</th>
                  <th className="text-left px-3 py-2 font-semibold">Date / Time</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No activations yet.</td></tr>
                ) : history.map((h) => (
                  <tr key={h.eventId} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-medium">{h.serviceName}</td>
                    <td className="px-3 py-2">
                      {h.feePaid > 0 ? (
                        <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-700 dark:text-amber-300">₹{h.feePaid}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-emerald-400/50 text-emerald-700 dark:text-emerald-300">Free</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 capitalize">{h.validity}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(h.activatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ───── CONFIRM DIALOG ───── */}
      <AlertDialog open={!!confirmKey} onOpenChange={(v) => { if (!v) setConfirmKey(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" /> Activate this service?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm">
                {(() => {
                  const s = enriched.find((x) => x.key === confirmKey);
                  if (!s) return null;
                  const fee = Number(s.cfg?.fee || 0);
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
                        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.meta.gradient} flex items-center justify-center text-white shadow-md`}>
                          <s.meta.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{s.name}</div>
                          <div className="text-[11px] text-muted-foreground capitalize">Validity: {s.cfg?.validity || "lifetime"}</div>
                        </div>
                        <div className="ml-auto text-right">
                          <div className="text-[10px] text-muted-foreground">Cost</div>
                          <div className="font-bold text-foreground">{fee > 0 ? `₹${fee}` : "Free"}</div>
                        </div>
                      </div>
                      <p className="text-muted-foreground">
                        {fee > 0
                          ? <>A one-time charge will be deducted from your wallet (current balance <strong className="text-foreground">₹{balance.toLocaleString("en-IN")}</strong>).</>
                          : <>No charge will be deducted from your wallet.</>}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95"
              onClick={() => {
                const s = enriched.find((x) => x.key === confirmKey);
                if (s) handleActivate(s.key, s.name);
              }}
              disabled={!!processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              Confirm & Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ───── Sub: Stat Chip ─────
function StatChip({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 p-3 flex items-center gap-3 shadow-lg hover:bg-white/20 transition-colors">
      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-md`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-white/70">{label}</div>
        <div className="text-xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

// ───── Sub: Service Card ─────
function ServiceCard({
  service, onActivate, onToggleFav, processing,
}: {
  service: any;
  onActivate: () => void;
  onToggleFav: () => void;
  processing: boolean;
}) {
  const Icon = service.meta.icon;
  const fee = Number(service.cfg?.fee || 0);
  const validity = service.cfg?.validity || "lifetime";
  const enabled = service.cfg?.enabled;
  const expiresLabel = service.activation?.expiresAt
    ? new Date(service.activation.expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Lifetime";

  return (
    <div className="group relative">
      {/* Glow halo */}
      <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${service.meta.gradient} opacity-0 group-hover:opacity-40 blur-lg transition-opacity duration-500`} />

      <div className="relative h-full rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl overflow-hidden card-tilt flex flex-col">
        {/* Top color bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${service.meta.gradient}`} />

        <div className="p-4 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${service.meta.gradient} flex items-center justify-center text-white shadow-lg ${service.meta.glow} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
              <Icon className="w-6 h-6" />
            </div>
            <button
              type="button"
              onClick={onToggleFav}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label={service.isFav ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={`w-4 h-4 transition-all ${service.isFav ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" : "text-muted-foreground"}`} />
            </button>
          </div>

          {/* Title */}
          <div className="mt-3">
            <h3 className="font-bold text-sm text-foreground leading-tight">{service.name}</h3>
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
          </div>

          {/* Meta row */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {service.isActive ? (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-semibold">
                <CheckCircle2 className="w-3 h-3 mr-0.5" /> Active
              </Badge>
            ) : enabled ? (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-[10px] font-semibold">
                <TrendingUp className="w-3 h-3 mr-0.5" /> Available
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
            )}
            <Badge variant="outline" className="text-[10px]">
              {fee > 0 ? `₹${fee}` : "Free"}
            </Badge>
            <Badge variant="outline" className="text-[10px] capitalize">{validity}</Badge>
          </div>

          {/* Expiry strip for active */}
          {service.isActive && (
            <div className="mt-3 text-[10px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3" /> Valid till: <span className="font-semibold text-foreground">{expiresLabel}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-auto pt-4 flex items-center gap-2">
            {service.isActive ? (
              <>
                <Link to={service.route as any} className="flex-1">
                  <Button size="sm" className={`w-full bg-gradient-to-r ${service.meta.gradient} text-white hover:opacity-95 shadow-md font-semibold`}>
                    Open <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onActivate}
                  disabled={processing}
                  className="px-2.5"
                  title="Renew"
                >
                  {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </Button>
              </>
            ) : enabled ? (
              <Button
                size="sm"
                onClick={onActivate}
                disabled={processing}
                className={`w-full bg-gradient-to-r ${service.meta.gradient} text-white hover:opacity-95 shadow-md font-semibold`}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Zap className="w-3.5 h-3.5 mr-1" /> Activate Now</>
                )}
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled className="w-full">
                Not Available
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

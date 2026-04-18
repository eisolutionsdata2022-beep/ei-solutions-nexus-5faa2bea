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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Loader2, Wallet as WalletIcon, History, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/retailer/my-services")({
  ssr: false,
  component: MyServicesPage,
});

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

  useEffect(() => { listActivationConfigs().then(setConfigs); }, []);

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

  const handleActivate = async (serviceKey: string, serviceName: string) => {
    if (!appUser?.uid) return;
    setProcessing(serviceKey);
    try {
      await activateServiceForUser({ uid: appUser.uid, serviceKey, serviceName });
      toast.success(`${serviceName} activated successfully!`);
    } catch (e: any) {
      const msg = String(e?.message || "Activation failed");
      if (/insufficient/i.test(msg)) {
        toast.error("Insufficient Balance — please recharge your wallet.");
      } else {
        toast.error(msg);
      }
    } finally {
      setProcessing(null);
      setConfirmKey(null);
    }
  };

  const pending = services.filter((s) => {
    const cfg = configs[s.key];
    return cfg?.enabled && !activeKeys.has(s.key);
  });
  const active = services.filter((s) => activeKeys.has(s.key));

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Services</h1>
          <p className="text-sm text-muted-foreground">Activate services to start using them.</p>
        </div>
        <div className="flex items-center gap-2 bg-card border rounded-md px-3 py-2">
          <WalletIcon className="w-4 h-4 text-gov-blue" />
          <span className="text-xs text-muted-foreground">Wallet:</span>
          <span className="font-bold text-gov-blue">₹{balance.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Pending activation */}
      <Card className="border-gov-saffron/40">
        <CardHeader className="bg-gov-saffron/10 py-3 px-4 border-b">
          <CardTitle className="text-sm font-bold text-gov-saffron flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Available to Activate
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">All eligible services are already active. 🎉</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pending.map((s) => {
                const cfg = configs[s.key];
                const fee = Number(cfg?.fee || 0);
                const validity = cfg?.validity || "lifetime";
                return (
                  <div key={s.key} className="border rounded-md p-3 flex flex-col gap-2 bg-card">
                    <div>
                      <p className="font-semibold text-sm">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{s.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {fee > 0 ? `₹${fee}` : "Free"}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">{validity}</Badge>
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-gov-saffron hover:opacity-90 text-white"
                      onClick={() => setConfirmKey(s.key)}
                      disabled={processing === s.key}
                    >
                      {processing === s.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Activate Now"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active services */}
      <Card className="border-gov-green/40">
        <CardHeader className="bg-gov-green/10 py-3 px-4 border-b">
          <CardTitle className="text-sm font-bold text-gov-green flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Active Services ({active.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active services yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {active.map((s) => {
                const a = activeList.find((x) => x.serviceKey === s.key);
                return (
                  <Link
                    key={s.key}
                    to={s.route as any}
                    className="border rounded-md p-3 hover:border-gov-green/60 transition-colors bg-card"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm">{s.name}</p>
                      <CheckCircle2 className="w-4 h-4 text-gov-green shrink-0" />
                    </div>
                    {a && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Activated {fmtDate(a.activatedAt)}
                        {a.expiresAt ? ` · expires ${new Date(a.expiresAt).toLocaleDateString()}` : ""}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4" /> Activation History
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
                  <tr key={h.eventId} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium">{h.serviceName}</td>
                    <td className="px-3 py-2">{h.feePaid > 0 ? `₹${h.feePaid}` : "Free"}</td>
                    <td className="px-3 py-2 capitalize">{h.validity}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(h.activatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmKey} onOpenChange={(v) => { if (!v) setConfirmKey(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate this service?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const s = services.find((x) => x.key === confirmKey);
                const cfg = confirmKey ? configs[confirmKey] : undefined;
                const fee = Number(cfg?.fee || 0);
                if (!s) return null;
                return (
                  <>
                    <strong className="text-foreground">{s.name}</strong> will be activated for{" "}
                    <strong className="text-foreground">{cfg?.validity || "lifetime"}</strong>.
                    {fee > 0 ? (
                      <> A one-time charge of <strong className="text-foreground">₹{fee}</strong> will be deducted from your wallet.</>
                    ) : (
                      <> No charge will be deducted.</>
                    )}
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const s = services.find((x) => x.key === confirmKey);
                if (s) handleActivate(s.key, s.name);
              }}
              disabled={!!processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm & Pay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

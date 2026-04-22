import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, IdCard, Banknote, ArrowLeftRight, ShoppingBag, User } from "lucide-react";
import { generateVleId } from "@/lib/vle-id";

export const Route = createFileRoute("/operator/")({
  ssr: false,
  component: OperatorDashboard,
});

function OperatorDashboard() {
  const { appUser } = useAuth();
  const [parent, setParent] = useState<any>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const parentId = (appUser as any)?.parentRetailerId;
    if (!parentId) return;
    getDoc(doc(db, "users", parentId)).then((s) => s.exists() && setParent(s.data()));
    const unsub = onSnapshot(doc(db, "wallets", parentId), (snap) => {
      if (snap.exists()) setBalance(snap.data().balance || 0);
    });
    return unsub;
  }, [appUser]);

  if (!appUser) return null;
  const parentId = (appUser as any)?.parentRetailerId;
  const parentPhone = (parent as any)?.phone || (parent as any)?.mobile || null;
  const vleId = generateVleId(parentId, parentPhone);

  if (!parentId) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center">
        <Card><CardContent className="pt-6">
          <h2 className="font-bold text-lg">Operator account not linked</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your operator login is not linked to any retailer. Please contact your retailer.
          </p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white rounded-xl p-6">
        <p className="text-xs uppercase opacity-80">Operator Dashboard</p>
        <h1 className="text-2xl font-bold mt-1">Welcome, {appUser.name || appUser.email}</h1>
        <p className="text-sm opacity-80 mt-1">Operating under: <b>{parent?.name || "Retailer"}</b></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card><CardContent className="pt-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gov-blue text-white flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Retailer Wallet (shared)</p>
              <p className="text-2xl font-bold">₹{balance.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center"><IdCard className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-muted-foreground">VLE ID</p>
            <p className="text-xl font-mono font-bold">{vleId}</p>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ActionLink to="/retailer/recharge" icon={Banknote} label="Recharge" />
          <ActionLink to="/retailer/services" icon={ShoppingBag} label="E-dis" />
          <ActionLink to="/retailer/transactions" icon={ArrowLeftRight} label="Transactions" />
          <ActionLink to="/retailer/profile" icon={User} label="Profile" />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Operator role gives you a dedicated dashboard. All transactions still post to the parent retailer's wallet
        and earnings.
      </p>
    </div>
  );
}

function ActionLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to as any} className="block">
      <Button variant="outline" className="w-full h-20 flex-col gap-1">
        <Icon className="w-5 h-5" />
        <span className="text-xs">{label}</span>
      </Button>
    </Link>
  );
}

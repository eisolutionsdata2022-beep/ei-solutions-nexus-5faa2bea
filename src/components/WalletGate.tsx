import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Link, useLocation } from "@tanstack/react-router";
import { AlertTriangle, Wallet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

const MIN_BALANCE = 100;

interface WalletGateProps {
  children: React.ReactNode;
}

export function WalletGate({ children }: WalletGateProps) {
  const { appUser } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!appUser || appUser.role !== "retailer") {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "wallets", appUser.uid), (snap) => {
      if (snap.exists()) {
        setBalance(snap.data().balance || 0);
      } else {
        setBalance(0);
      }
      setLoading(false);
    });

    return unsub;
  }, [appUser]);

  // Non-retailer roles pass through
  if (!appUser || appUser.role !== "retailer") {
    return <>{children}</>;
  }

  if (loading) return null;

  const isBlocked = balance !== null && balance < MIN_BALANCE;

  if (isBlocked) {
    return (
      <>
        {/* Blocked overlay */}
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="bg-card border-2 border-destructive/30 rounded-2xl p-8 max-w-md w-full text-center space-y-5 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Insufficient Balance</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Please recharge your software first. Minimum recharge amount is <span className="font-bold text-foreground">₹{MIN_BALANCE}</span>.
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Current Balance</span>
              </div>
              <p className="text-2xl font-bold text-destructive">₹{(balance ?? 0).toFixed(2)}</p>
            </div>
            <Link to="/retailer/wallet">
              <Button className="w-full bg-gov-blue hover:opacity-90 text-white font-bold gap-2">
                <Wallet className="w-4 h-4" />
                Recharge Now
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Popup dialog */}
        <AlertDialog open={showPopup} onOpenChange={setShowPopup}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Recharge Required
              </AlertDialogTitle>
              <AlertDialogDescription>
                Please recharge your software first. Minimum recharge amount is ₹{MIN_BALANCE}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Link to="/retailer/wallet">
                <Button className="bg-gov-blue text-white font-bold">Recharge Now</Button>
              </Link>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return <>{children}</>;
}

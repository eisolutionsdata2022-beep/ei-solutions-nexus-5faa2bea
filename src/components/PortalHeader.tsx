import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bell, LogOut, User, Wallet, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { subscribeNotifications, markNotificationRead } from "@/lib/matrimony-firebase";
import { Link } from "@tanstack/react-router";
import { JobNotificationsBell } from "@/components/JobNotificationsBell";

export function PortalHeader() {
  const { appUser, logout } = useAuth();
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      read: boolean;
      createdAt: string;
      data?: Record<string, string>;
    }>
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!appUser?.uid) return;
    const unsub = subscribeNotifications(appUser.uid, setNotifications);
    return unsub;
  }, [appUser?.uid]);

  // Live wallet balance subscription (only when user has a wallet doc)
  useEffect(() => {
    if (!appUser?.uid) return;
    const unsub = onSnapshot(
      doc(db, "wallets", appUser.uid),
      (snap) => {
        if (snap.exists()) setWalletBalance(snap.data().balance ?? 0);
      },
      () => setWalletBalance(null),
    );
    return unsub;
  }, [appUser?.uid]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
  };

  const initial = (appUser?.name || appUser?.email || "U").charAt(0).toUpperCase();
  const walletHref =
    appUser?.role === "trainer"
      ? "/trainer/wallet"
      : appUser?.role === "distributor"
        ? "/distributor/wallet"
        : "/retailer/wallet";

  return (
    <>
      {/* Premium glassy navy header with subtle gradient */}
      <header className="relative bg-gradient-to-r from-[hsl(222_70%_14%)] via-[hsl(216_75%_22%)] to-[hsl(232_70%_20%)] text-white px-3 md:px-6 py-3 flex items-center gap-3 md:gap-4 overflow-hidden border-b border-white/5">
        {/* Decorative glow */}
        <div
          className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 right-1/3 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl"
          aria-hidden
        />

        {/* Brand */}
        <div className="relative shrink-0 min-w-0">
          <h1 className="text-base md:text-lg font-bold tracking-tight leading-none">
            EI <span className="text-premium-gradient">SOLUTIONS</span>
          </h1>
          <p className="hidden md:block text-[10px] opacity-70 mt-0.5">
            E-Governance &amp; Digital India Solutions
          </p>
        </div>

        {/* Search bar (desktop) */}
        <div className="relative hidden md:flex flex-1 max-w-md ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input
            placeholder="Search services, transactions..."
            className="pl-9 h-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-full backdrop-blur focus-visible:ring-white/30 focus-visible:bg-white/15"
          />
        </div>

        <div className="flex-1 md:hidden" />

        {appUser && (
          <div className="relative flex items-center gap-2 md:gap-3 shrink-0">
            {/* Wallet pill — only show if balance is loaded */}
            {walletBalance !== null && (
              <Link
                to={walletHref as any}
                className="hidden sm:inline-flex items-center gap-2 wallet-pill text-white text-xs md:text-sm font-bold px-3 py-1.5 rounded-full hover:scale-[1.02] active:scale-95 transition-transform"
                title="Wallet balance — click to recharge"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span className="tabular-nums">
                  ₹{walletBalance.toLocaleString("en-IN")}
                </span>
              </Link>
            )}

            {/* Job notifications bell */}
            <JobNotificationsBell />

            {/* Notification Bell */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-[hsl(216_75%_22%)] animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white text-foreground rounded-xl shadow-2xl border z-50 overflow-hidden animate-stat-rise">
                  <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                      <Badge className="bg-rose-500 text-white text-[10px] border-0">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto thin-scroll">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No notifications
                      </p>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleMarkRead(n.id)}
                          className={`w-full text-left px-4 py-3 border-b border-border/40 hover:bg-muted/40 transition-colors ${
                            !n.read ? "bg-blue-50/60 dark:bg-blue-950/30" : ""
                          }`}
                        >
                          <p
                            className={`text-sm ${
                              !n.read ? "font-semibold" : "text-muted-foreground"
                            }`}
                          >
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-sm font-bold ring-2 ring-white/20">
                  {initial}
                </div>
                <span className="hidden md:inline text-xs font-semibold max-w-[100px] truncate">
                  {appUser.name || appUser.email.split("@")[0]}
                </span>
                <ChevronDown className="hidden md:block w-3.5 h-3.5 opacity-70" />
              </button>

              {showProfile && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white text-foreground rounded-xl shadow-2xl border z-50 overflow-hidden animate-stat-rise">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/40 dark:to-violet-950/40 border-b">
                    <p className="text-sm font-bold truncate">
                      {appUser.name || appUser.email.split("@")[0]}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{appUser.email}</p>
                    <p className="text-[10px] uppercase tracking-wider text-primary font-bold mt-1">
                      {appUser.role}
                    </p>
                  </div>
                  <div className="p-1">
                    {(appUser.role === "retailer" || appUser.role === "staffSub") && (
                      <Link
                        to="/retailer/profile"
                        onClick={() => setShowProfile(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                      >
                        <User className="w-4 h-4" />
                        My Profile
                      </Link>
                    )}
                    <Link
                      to={walletHref as any}
                      onClick={() => setShowProfile(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                    >
                      <Wallet className="w-4 h-4" />
                      Wallet
                      {walletBalance !== null && (
                        <span className="ml-auto text-xs font-bold text-emerald-600 tabular-nums">
                          ₹{walletBalance.toLocaleString("en-IN")}
                        </span>
                      )}
                    </Link>
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Compact desktop logout (kept for muscle memory) */}
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="hidden lg:inline-flex border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Logout
            </Button>
          </div>
        )}
      </header>

      {/* Tricolor strip */}
      <div className="flex h-1">
        <div className="flex-1 bg-gov-saffron" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-gov-green" />
      </div>
    </>
  );
}

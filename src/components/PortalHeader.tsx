import { useAuth } from "@/lib/auth-context";
import { Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PortalHeader() {
  const { appUser, logout } = useAuth();

  return (
    <>
      {/* Blue header */}
      <header className="bg-gov-blue text-white px-4 md:px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-wide">EI SOLUTIONS Portal</h1>
          <p className="text-xs md:text-sm opacity-80">E-Governance &amp; Digital India Solutions</p>
        </div>
        {appUser && (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm font-medium">
              Welcome <strong>{appUser.name || appUser.email.split("@")[0]}</strong>
            </span>
            <Bell className="w-5 h-5 opacity-70 cursor-pointer hover:opacity-100" />
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="border-white/40 text-white hover:bg-white/10 hover:text-white text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Logout
            </Button>
          </div>
        )}
      </header>

      {/* Tricolor strip */}
      <div className="flex h-1.5">
        <div className="flex-1 bg-gov-saffron" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-gov-green" />
      </div>
    </>
  );
}

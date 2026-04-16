import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useRef } from "react";
import { Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { subscribeNotifications, markNotificationRead } from "@/lib/matrimony-firebase";
import { Link } from "@tanstack/react-router";
import { JobNotificationsBell } from "@/components/JobNotificationsBell";

export function PortalHeader() {
  const { appUser, logout } = useAuth();
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; title: string; message: string; read: boolean; createdAt: string; data?: Record<string, string> }>>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!appUser?.uid) return;
    const unsub = subscribeNotifications(appUser.uid, setNotifications);
    return unsub;
  }, [appUser?.uid]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
  };

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

            {/* Job notifications bell */}
            <JobNotificationsBell />

            {/* Notification Bell */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border z-50 overflow-hidden">
                  <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">Notifications</span>
                    {unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white text-[10px] border-0">{unreadCount} new</Badge>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
                    ) : (
                      notifications.slice(0, 20).map(n => (
                        <button
                          key={n.id}
                          onClick={() => handleMarkRead(n.id)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.read ? "bg-blue-50/50" : ""}`}
                        >
                          <p className={`text-sm ${!n.read ? "font-semibold text-gray-900" : "text-gray-600"}`}>{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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

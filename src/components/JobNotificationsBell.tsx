import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { collection, onSnapshot, query, where, doc, updateDoc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import type { JobNotificationDoc } from "@/lib/job-marketplace-types";

export function JobNotificationsBell() {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<JobNotificationDoc[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!appUser?.uid) return;
    const q = query(collection(db, "jobNotifications"), where("userId", "==", appUser.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: JobNotificationDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setItems(list.slice(0, 30));
      },
      (error) => {
        console.warn("[JobNotificationsBell] listener skipped:", error.message);
        setItems([]);
      },
    );
    return unsub;
  }, [appUser?.uid]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  const handleClick = async (n: JobNotificationDoc) => {
    try {
      await updateDoc(doc(db, "jobNotifications", n.id), { read: true });
    } catch {}
    setOpen(false);
    navigate({ to: "/retailer/jobs/$jobId", params: { jobId: n.jobId } });
  };

  const markAllRead = async () => {
    if (!appUser) return;
    const q = query(
      collection(db, "jobNotifications"),
      where("userId", "==", appUser.uid),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  };

  if (!appUser) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Job notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border z-50 overflow-hidden text-foreground">
          <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold">Job Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && <Badge className="bg-orange-500 text-white text-[10px] border-0">{unread} new</Badge>}
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-blue-600 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No job notifications</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${!n.read ? "bg-orange-50/40" : ""}`}
                >
                  <p className={`text-sm ${!n.read ? "font-semibold" : "text-gray-600"}`}>{n.jobTitle}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

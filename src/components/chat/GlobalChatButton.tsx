import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GlobalChatPanel } from "./GlobalChatPanel";

export function GlobalChatButton() {
  const { appUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // Listen for unread messages
  useEffect(() => {
    if (!appUser?.uid) return;
    const q = query(
      collection(db, "chat_messages"),
      where("toUserId", "==", appUser.uid),
      where("read", "==", false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setUnread(snap.size);
    });
    return unsub;
  }, [appUser]);

  if (!appUser) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-105 active:scale-95"
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center animate-in zoom-in">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat panel */}
      {open && <GlobalChatPanel onClose={() => setOpen(false)} />}
    </>
  );
}

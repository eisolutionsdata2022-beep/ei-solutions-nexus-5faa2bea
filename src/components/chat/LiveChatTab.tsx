import { useState, useRef, useEffect } from "react";
import { Send, User, Shield, Loader2 } from "lucide-react";
import { useAuth, type UserRole } from "@/lib/auth-context";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  limit,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  id: string;
  fromUserId: string;
  fromName: string;
  fromRole: UserRole;
  toUserId: string;
  content: string;
  read: boolean;
  createdAt: Timestamp | null;
}

function getChatTarget(role: UserRole): { targetRole: string; label: string } {
  switch (role) {
    case "admin":
      return { targetRole: "all", label: "All Users" };
    case "retailer":
      return { targetRole: "admin", label: "Admin / Staff" };
    case "trainer":
      return { targetRole: "admin", label: "Admin" };
    case "staff":
      return { targetRole: "admin", label: "Admin" };
    case "distributor":
      return { targetRole: "admin", label: "Admin" };
    default:
      return { targetRole: "admin", label: "Support" };
  }
}

export function LiveChatTab() {
  const { appUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatTarget = appUser ? getChatTarget(appUser.role) : null;

  // Listen to messages for this user's conversation
  useEffect(() => {
    if (!appUser) return;

    // For admin: show all messages sent to admin
    // For others: show messages in their conversation thread
    const q = appUser.role === "admin"
      ? query(
          collection(db, "chat_messages"),
          where("toUserId", "==", appUser.uid),
          orderBy("createdAt", "asc"),
          limit(100)
        )
      : query(
          collection(db, "chat_messages"),
          where("threadId", "==", appUser.uid),
          orderBy("createdAt", "asc"),
          limit(100)
        );

    const unsub = onSnapshot(q, (snap) => {
      const msgs: ChatMessage[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ChatMessage[];
      setMessages(msgs);

      // Mark messages as read
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.toUserId === appUser.uid && !data.read) {
          updateDoc(doc(db, "chat_messages", d.id), { read: true });
        }
      });
    });
    return unsub;
  }, [appUser]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !appUser || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");

    try {
      // Find an admin to send to
      let toUserId = "admin"; // fallback
      if (appUser.role !== "admin") {
        const adminQuery = query(
          collection(db, "users"),
          where("role", "==", "admin"),
          limit(1)
        );
        const adminSnap = await getDocs(adminQuery);
        if (!adminSnap.empty) {
          toUserId = adminSnap.docs[0].id;
        }
      }

      await addDoc(collection(db, "chat_messages"), {
        fromUserId: appUser.uid,
        fromName: appUser.name || appUser.email.split("@")[0],
        fromRole: appUser.role,
        toUserId,
        threadId: appUser.role === "admin" ? toUserId : appUser.uid,
        content: text,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Send message error:", err);
    }
    setSending(false);
  };

  if (!appUser) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Chat target info */}
      <div className="px-3 py-2 bg-muted/50 border-b border-border shrink-0">
        <p className="text-xs text-muted-foreground">
          Chatting with: <span className="font-medium text-foreground">{chatTarget?.label}</span>
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Shield className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No messages yet.</p>
            <p className="text-xs text-muted-foreground">Start a conversation!</p>
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.fromUserId === appUser.uid;
          return (
            <div key={m.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full bg-gov-green/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-gov-green" />
                </div>
              )}
              <div>
                {!isMe && (
                  <p className="text-[10px] text-muted-foreground mb-0.5 px-1">{m.fromName}</p>
                )}
                <div className={`max-w-[220px] rounded-2xl px-3 py-2 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.content}</p>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5 px-1">
                  {m.createdAt ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "..."}
                </p>
              </div>
              {isMe && (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-9 rounded-full border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={sending}
          />
          <Button size="icon" className="h-9 w-9 rounded-full shrink-0" onClick={sendMessage} disabled={sending || !input.trim()}>
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

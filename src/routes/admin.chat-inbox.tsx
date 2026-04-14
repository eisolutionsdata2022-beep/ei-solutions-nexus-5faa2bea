import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  where,
  getDocs,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Send, User, MessageSquare, Loader2, Inbox, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/chat-inbox")({
  ssr: false,
  component: AdminChatInbox,
});

interface ChatMessage {
  id: string;
  fromUserId: string;
  fromName: string;
  fromRole: string;
  toUserId: string;
  threadId: string;
  content: string;
  read: boolean;
  createdAt: Timestamp | null;
}

interface ThreadSummary {
  threadId: string;
  userName: string;
  userRole: string;
  lastMessage: string;
  lastTimestamp: Timestamp | null;
  unreadCount: number;
}

function AdminChatInbox() {
  const { appUser } = useAuth();
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen to all chat messages
  useEffect(() => {
    if (!appUser || appUser.role !== "admin") return;

    const q = query(collection(db, "chat_messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const msgs: ChatMessage[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ChatMessage[];
      setAllMessages(msgs);
    });
    return unsub;
  }, [appUser]);

  // Build thread summaries
  const threads: ThreadSummary[] = (() => {
    const threadMap = new Map<string, ThreadSummary>();
    for (const msg of allMessages) {
      const tid = msg.threadId;
      if (!tid || tid === appUser?.uid) continue; // skip admin's own thread

      const existing = threadMap.get(tid);
      const isUnread = msg.toUserId === appUser?.uid && !msg.read;

      if (!existing) {
        // Use the non-admin user's info
        const isFromUser = msg.fromUserId === tid;
        threadMap.set(tid, {
          threadId: tid,
          userName: isFromUser ? msg.fromName : "User",
          userRole: isFromUser ? msg.fromRole : "",
          lastMessage: msg.content,
          lastTimestamp: msg.createdAt,
          unreadCount: isUnread ? 1 : 0,
        });
      } else {
        existing.lastMessage = msg.content;
        existing.lastTimestamp = msg.createdAt;
        if (isUnread) existing.unreadCount++;
        // Update name from user messages
        if (msg.fromUserId === tid) {
          existing.userName = msg.fromName;
          existing.userRole = msg.fromRole;
        }
      }
    }
    return Array.from(threadMap.values()).sort((a, b) => {
      const aTime = a.lastTimestamp?.seconds ?? 0;
      const bTime = b.lastTimestamp?.seconds ?? 0;
      return bTime - aTime;
    });
  })();

  // Messages for selected thread
  const threadMessages = selectedThread
    ? allMessages.filter((m) => m.threadId === selectedThread)
    : [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [threadMessages.length]);

  const selectedThreadInfo = threads.find((t) => t.threadId === selectedThread);

  const sendReply = async () => {
    if (!input.trim() || !appUser || !selectedThread || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");

    try {
      await addDoc(collection(db, "chat_messages"), {
        fromUserId: appUser.uid,
        fromName: appUser.name || "Admin",
        fromRole: "admin",
        toUserId: selectedThread,
        threadId: selectedThread,
        content: text,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Send reply error:", err);
    }
    setSending(false);
  };

  if (!appUser) return null;

  return (
    <div className="h-[calc(100vh-12rem)]">
      <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Inbox className="w-5 h-5" />
        Chat Inbox
      </h1>

      <div className="flex border border-border rounded-xl overflow-hidden h-[calc(100%-3rem)] bg-card">
        {/* Thread list */}
        <div className={`w-full md:w-80 border-r border-border flex flex-col ${selectedThread ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b border-border bg-muted/30">
            <p className="text-sm font-semibold text-foreground">Conversations</p>
            <p className="text-xs text-muted-foreground">{threads.length} thread{threads.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.threadId}
                  onClick={() => setSelectedThread(t.threadId)}
                  className={`w-full text-left p-3 border-b border-border/50 hover:bg-muted/50 transition-colors ${selectedThread === t.threadId ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.userName}</p>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{t.userRole}</Badge>
                      </div>
                    </div>
                    {t.unreadCount > 0 && (
                      <span className="h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center shrink-0">
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate pl-10">{t.lastMessage}</p>
                  {t.lastTimestamp && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 pl-10">
                      {new Date(t.lastTimestamp.seconds * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col ${!selectedThread ? "hidden md:flex" : "flex"}`}>
          {!selectedThread ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-3">
                <button onClick={() => setSelectedThread(null)} className="md:hidden p-1 rounded hover:bg-muted">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{selectedThreadInfo?.userName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{selectedThreadInfo?.userRole}</p>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {threadMessages.map((m) => {
                  const isAdmin = m.fromRole === "admin";
                  return (
                    <div key={m.id} className={`flex gap-2 ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%]`}>
                        {!isAdmin && (
                          <p className="text-[10px] text-muted-foreground mb-0.5 px-1">{m.fromName}</p>
                        )}
                        <div className={`rounded-2xl px-3 py-2 ${isAdmin ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5 px-1">
                          {m.createdAt ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "..."}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply input */}
              <div className="p-3 border-t border-border">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a reply..."
                    className="flex-1 h-10 rounded-full border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    onKeyDown={(e) => e.key === "Enter" && sendReply()}
                    disabled={sending}
                  />
                  <Button size="icon" className="h-10 w-10 rounded-full" onClick={sendReply} disabled={sending || !input.trim()}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

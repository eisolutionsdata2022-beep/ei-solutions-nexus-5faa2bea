import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface TrainingChatProps {
  trainingId: string;
}

export function TrainingChat({ trainingId }: TrainingChatProps) {
  const { appUser } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "trainings", trainingId, "chat"), (snap) => {
      const msgs: any[] = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
      setMessages(msgs);
    });
    return unsub;
  }, [trainingId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!msg.trim() || !appUser) return;
    try {
      await addDoc(collection(db, "trainings", trainingId, "chat"), {
        userId: appUser.uid,
        userName: appUser.name || appUser.email,
        message: msg.trim(),
        createdAt: new Date().toISOString(),
      });
      setMsg("");
    } catch {
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-white/30 text-xs text-center py-8">No messages yet. Start the conversation!</p>
        )}
        {messages.map((m) => {
          const isMe = m.userId === appUser?.uid;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isMe ? "bg-blue-600 text-white" : "bg-white/10 text-white/90"}`}>
                {!isMe && <p className="text-[10px] font-semibold text-blue-300 mb-0.5">{m.userName}</p>}
                <p className="text-xs leading-relaxed">{m.message}</p>
                <p className="text-[9px] mt-1 opacity-50 text-right">
                  {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-white/10 flex gap-2">
        <Input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type a message..."
          className="bg-white/5 border-white/10 text-white text-xs h-9 placeholder:text-white/30"
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button size="icon" className="h-9 w-9 shrink-0 bg-blue-600 hover:bg-blue-700" onClick={send}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

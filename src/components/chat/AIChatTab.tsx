import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, ArrowRight } from "lucide-react";
import { askChatBot } from "@/lib/chat-bot.functions";
import { Button } from "@/components/ui/button";

interface AIChatTabProps {
  onSwitchToLive: () => void;
}

interface BotMessage {
  id: string;
  role: "user" | "bot";
  content: string;
}

export function AIChatTab({ onSwitchToLive }: AIChatTabProps) {
  const [messages, setMessages] = useState<BotMessage[]>([
    {
      id: "welcome",
      role: "bot",
      content: "Hi! 👋 I'm your EI Solutions assistant. Ask me anything about the portal, services, or training. Need human support? Switch to Live Chat anytime.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await askChatBot({
        data: {
          question: text,
          history: messages.slice(-8).map((m) => ({
            role: m.role === "bot" ? "assistant" as const : "user" as const,
            content: m.content,
          })),
        },
      });
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "bot", content: res.answer }]);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "bot", content: "Sorry, something went wrong. Try again or switch to Live Chat." }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "bot" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.content}</p>
            </div>
            {m.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-center">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl px-3 py-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border space-y-2 shrink-0">
        <button
          onClick={onSwitchToLive}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-primary hover:bg-primary/5 rounded-lg py-1.5 transition-colors"
        >
          Need human support? <ArrowRight className="w-3 h-3" />
        </button>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 h-9 rounded-full border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={loading}
          />
          <Button size="icon" className="h-9 w-9 rounded-full shrink-0" onClick={send} disabled={loading}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Loader2, HandHelping } from "lucide-react";
import { toast } from "sonner";
import { askTrainingBot } from "@/lib/training-bot.functions";

interface TrainingAIBotProps {
  trainingTitle: string;
  onEscalateToTrainer?: (question: string) => void;
}

interface BotMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: string;
}

export function TrainingAIBot({ trainingTitle, onEscalateToTrainer }: TrainingAIBotProps) {
  const [messages, setMessages] = useState<BotMessage[]>([
    {
      id: "welcome",
      role: "bot",
      content: `Hi! I'm your AI training assistant for "${trainingTitle}". Ask me anything about the session, topics being discussed, or general doubts. If I can't help, I'll escalate to the trainer.`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: BotMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await askTrainingBot({
        data: {
          question: userMsg.content,
          trainingTitle,
          history: messages.slice(-6).map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content })),
        },
      });

      const botMsg: BotMessage = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: response.answer,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: BotMessage = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: "Sorry, I'm having trouble right now. Try again or escalate to the trainer.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
    setLoading(false);
  };

  const escalate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg && onEscalateToTrainer) {
      onEscalateToTrainer(lastUserMsg.content);
      toast.success("Question escalated to trainer!");
    } else {
      toast.info("Type a question first, then escalate if needed.");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "bot" && (
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.role === "user" ? "bg-blue-600 text-white" : "bg-emerald-500/10 text-white/90 border border-emerald-500/20"}`}>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.content}</p>
            </div>
            {m.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="bg-emerald-500/10 rounded-2xl px-3 py-2 border border-emerald-500/20">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/10 space-y-2">
        {onEscalateToTrainer && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-amber-400 text-xs hover:bg-amber-500/10"
            onClick={escalate}
          >
            <HandHelping className="w-3.5 h-3.5 mr-1" /> Escalate to Trainer
          </Button>
        )}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a doubt..."
            className="bg-white/5 border-white/10 text-white text-xs h-9 placeholder:text-white/30"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={loading}
          />
          <Button size="icon" className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-700" onClick={sendMessage} disabled={loading}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

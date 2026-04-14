import { useState } from "react";
import { Bot, MessageSquare, X } from "lucide-react";
import { AIChatTab } from "./AIChatTab";
import { LiveChatTab } from "./LiveChatTab";
import { cn } from "@/lib/utils";

interface GlobalChatPanelProps {
  onClose: () => void;
}

export function GlobalChatPanel({ onClose }: GlobalChatPanelProps) {
  const [tab, setTab] = useState<"ai" | "live">("ai");

  return (
    <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-semibold text-sm">EI Solutions Support</h3>
          <p className="text-xs opacity-80">We're here to help</p>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-full hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setTab("ai")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
            tab === "ai"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bot className="w-3.5 h-3.5" />
          AI Assistant
        </button>
        <button
          onClick={() => setTab("live")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
            tab === "live"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Live Chat
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {tab === "ai" ? (
          <AIChatTab onSwitchToLive={() => setTab("live")} />
        ) : (
          <LiveChatTab />
        )}
      </div>
    </div>
  );
}

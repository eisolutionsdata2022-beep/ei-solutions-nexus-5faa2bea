import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Volume2, VolumeX, Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { askVirtualTrainer } from "@/lib/virtual-trainer.functions";
import trainerAvatar from "@/assets/elzu-trainer-avatar.jpg";

export const Route = createFileRoute("/retailer/virtual-trainer")({
  ssr: false,
  component: VirtualTrainerPage,
});

interface ChatMessage {
  id: string;
  role: "user" | "trainer";
  content: string;
  timestamp: string;
}

const QUICK_ACTIONS = [
  { label: "PAN Card സഹായം", query: "PAN Card എങ്ങനെ അപ്ലൈ ചെയ്യാം?" },
  { label: "Aadhaar സേവനങ്ങൾ", query: "Aadhaar സേവനങ്ങൾ എന്തൊക്കെയാണ്?" },
  { label: "Loan സേവനങ്ങൾ", query: "Loan-ന് എങ്ങനെ അപ്ലൈ ചെയ്യാം?" },
  { label: "Training സഹായം", query: "ട്രെയിനിംഗ് എങ്ങനെ ജോയിൻ ചെയ്യാം?" },
];

function VirtualTrainerPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "trainer",
      content: "സുഹൃത്തേ, ഞാൻ എൽസുതത്താ ആണ്! നിങ്ങളുടെ ഡിജിറ്റൽ ട്രെയിനർ. എനിക്ക് എങ്ങനെ സഹായിക്കാം? 😊",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const speak = useCallback((text: string) => {
    if (!ttsEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ml-IN";
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({
        role: (m.role === "trainer" ? "assistant" : "user") as "user" | "assistant",
        content: m.content,
      }));

      const response = await askVirtualTrainer({
        data: { question: msg, history },
      });

      const trainerMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "trainer",
        content: response.answer,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, trainerMsg]);
      speak(response.answer);
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "trainer",
        content: "ക്ഷമിക്കണം, ഒരു പ്രശ്നം ഉണ്ടായി. വീണ്ടും ശ്രമിക്കുക 🙏",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
    setLoading(false);
  };

  const toggleListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("നിങ്ങളുടെ ബ്രൗസർ വോയ്സ് ഇൻപുട്ട് സപ്പോർട്ട് ചെയ്യുന്നില്ല");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "ml-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
      toast.error("വോയ്സ് ഇൻപുട്ട് പ്രശ്നം. വീണ്ടും ശ്രമിക്കുക.");
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-600 text-white px-4 py-3 rounded-t-xl flex items-center gap-3">
        <div className="relative">
          <img
            src={trainerAvatar}
            alt="എൽസുതത്താ"
            className="w-12 h-12 rounded-full border-2 border-white/30 object-cover"
            width={48}
            height={48}
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-emerald-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold">എൽസുതത്താ വിർച്വൽ ട്രെയിനർ</h1>
          <p className="text-xs text-white/70">
            {loading ? "ടൈപ്പ് ചെയ്യുന്നു..." : isSpeaking ? "സംസാരിക്കുന്നു..." : "നിങ്ങളുടെ ഡിജിറ്റൽ ട്രെയിനർ"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={() => {
            if (!ttsEnabled) { setTtsEnabled(true); } else { window.speechSynthesis.cancel(); setIsSpeaking(false); setTtsEnabled(false); }
          }}
        >
          {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>
      </div>

      {/* Trainer Avatar Section + Chat */}
      <div className="flex flex-1 min-h-0 bg-gradient-to-b from-muted/30 to-background">
        {/* Avatar - visible on lg+ */}
        <div className="hidden lg:flex flex-col items-center justify-center w-64 border-r border-border p-4 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
          <div className={`relative ${isSpeaking ? "animate-pulse" : ""}`}>
            <img
              src={trainerAvatar}
              alt="എൽസുതത്താ"
              className="w-44 h-44 rounded-full border-4 border-emerald-500/30 object-cover shadow-lg"
              width={176}
              height={176}
            />
            {isSpeaking && (
              <div className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-30" />
            )}
          </div>
          <h2 className="mt-4 font-bold text-lg text-foreground">എൽസുതത്താ</h2>
          <p className="text-xs text-muted-foreground text-center mt-1">EI Solutions ട്രെയിനർ</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">ഓൺലൈൻ</span>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "trainer" && (
                  <img src={trainerAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-1" width={32} height={32} />
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    m.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-card text-foreground border border-border rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${m.role === "user" ? "text-white/60" : "text-muted-foreground"}`}>
                    {new Date(m.timestamp).toLocaleTimeString("ml-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-start">
                <img src={trainerAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" width={32} height={32} />
                <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((qa) => (
                <Button
                  key={qa.label}
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-full border-emerald-300 text-emerald-700 dark:text-emerald-400 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  onClick={() => sendMessage(qa.query)}
                  disabled={loading}
                >
                  {qa.label}
                </Button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border bg-card/50">
            <div className="flex gap-2 items-center">
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={toggleListening}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യുക..."
                className="h-10 rounded-full"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
              />
              <Button
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {isListening && (
              <p className="text-xs text-center text-red-500 mt-2 animate-pulse">🎤 കേൾക്കുന്നു... സംസാരിക്കുക</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

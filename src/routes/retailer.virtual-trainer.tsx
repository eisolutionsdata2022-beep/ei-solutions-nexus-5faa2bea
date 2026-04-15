import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { atomicDebit } from "@/lib/firebase-transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Mic, MicOff, Volume2, VolumeX, Loader2, Lock, Wallet, Sparkles, History, Plus, Trash2, FileDown, Monitor, Globe, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { askVirtualTrainer } from "@/lib/virtual-trainer.functions";
import elzuAvatar from "@/assets/elzu-avatar.png";
import elzuIntroVideo from "@/assets/elzu-intro-video.mp4.asset.json";

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
  { label: "📋 PAN Card", query: "PAN Card എങ്ങനെ അപ്ലൈ ചെയ്യാം?", icon: "📋" },
  { label: "🪪 Aadhaar", query: "Aadhaar സേവനങ്ങൾ എന്തൊക്കെയാണ്?", icon: "🪪" },
  { label: "📄 eDistrict", query: "E-dis സർട്ടിഫിക്കറ്റ് സേവനങ്ങൾ എന്തൊക്കെ?", icon: "📄" },
  { label: "💰 Loan", query: "Loan-ന് എങ്ങനെ അപ്ലൈ ചെയ്യാം?", icon: "💰" },
  { label: "🎓 Training", query: "ട്രെയിനിംഗ് എങ്ങനെ ജോയിൻ ചെയ്യാം?", icon: "🎓" },
  { label: "📱 Recharge", query: "Recharge, Bill Payment എങ്ങനെ ചെയ്യാം?", icon: "📱" },
];

interface ChatSession {
  id: string;
  title: string;
  createdAt: any;
  updatedAt: any;
  messageCount: number;
}

// CSS for animations
const avatarStyles = `
@keyframes idleFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
@keyframes idleBreathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.015); }
}
@keyframes talkingBounce {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-5px) rotate(0.5deg); }
  75% { transform: translateY(-3px) rotate(-0.5deg); }
}
@keyframes handGesture {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-3deg); }
  50% { transform: rotate(2deg); }
  75% { transform: rotate(-1deg); }
}
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(16,185,129,0.2), 0 0 40px rgba(16,185,129,0.1); }
  50% { box-shadow: 0 0 30px rgba(16,185,129,0.4), 0 0 60px rgba(16,185,129,0.2); }
}
@keyframes boardSlideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes talkBar {
  from { height: 4px; }
  to { height: 16px; }
}
@keyframes eyeGlow {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
@keyframes scanLine {
  0% { top: 0%; }
  100% { top: 100%; }
}
`;

function VirtualTrainerPage() {
  const { appUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [trainerFee, setTrainerFee] = useState(0);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [sessionPaid, setSessionPaid] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [boardContent, setBoardContent] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Detect board-worthy content from trainer responses
  useEffect(() => {
    const lastTrainerMsg = [...messages].reverse().find(m => m.role === "trainer" && m.id !== "welcome");
    if (lastTrainerMsg) {
      const content = lastTrainerMsg.content;
      // Show board for step-by-step or list content
      if (content.includes("Step") || content.includes("സ്റ്റെപ്") || content.includes("1.") || content.includes("✅") || content.length > 200) {
        setBoardContent(content);
      } else {
        setBoardContent(null);
      }
    }
  }, [messages]);

  // --- Chat History Functions ---
  const loadChatSessions = useCallback(async () => {
    if (!appUser) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "trainerChatSessions"),
        where("userId", "==", appUser.uid),
        orderBy("updatedAt", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      const sessions: ChatSession[] = [];
      snap.forEach((d) => sessions.push({ id: d.id, ...d.data() } as ChatSession));
      setChatSessions(sessions);
    } catch { /* ignore */ }
    setLoadingHistory(false);
  }, [appUser]);

  const saveMessagesToSession = useCallback(async (sessionId: string, msgs: ChatMessage[]) => {
    if (!appUser || msgs.length <= 1) return;
    try {
      const sessionRef = doc(db, "trainerChatSessions", sessionId);
      const firstUserMsg = msgs.find(m => m.role === "user");
      await updateDoc(sessionRef, {
        messages: msgs.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
        title: firstUserMsg?.content.slice(0, 50) || "ചാറ്റ്",
        messageCount: msgs.length,
        updatedAt: serverTimestamp(),
      });
    } catch { /* ignore */ }
  }, [appUser]);

  const createNewSession = useCallback(async (): Promise<string | null> => {
    if (!appUser) return null;
    try {
      const docRef = await addDoc(collection(db, "trainerChatSessions"), {
        userId: appUser.uid,
        title: "പുതിയ ചാറ്റ്",
        messages: [],
        messageCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch { return null; }
  }, [appUser]);

  const loadSession = async (session: ChatSession) => {
    try {
      const snap = await getDoc(doc(db, "trainerChatSessions", session.id));
      if (snap.exists()) {
        const data = snap.data();
        const msgs: ChatMessage[] = (data.messages || []).map((m: any, i: number) => ({
          id: `${session.id}_${i}`,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));
        setMessages(msgs);
        setCurrentSessionId(session.id);
        setShowHistory(false);
      }
    } catch { toast.error("ചാറ്റ് ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല"); }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await deleteDoc(doc(db, "trainerChatSessions", sessionId));
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        startNewChat();
      }
      toast.success("ചാറ്റ് ഡിലീറ്റ് ചെയ്തു");
    } catch { toast.error("ഡിലീറ്റ് ചെയ്യാൻ കഴിഞ്ഞില്ല"); }
  };

  const startNewChat = async () => {
    const sessionId = await createNewSession();
    setCurrentSessionId(sessionId);
    initWelcome();
    setShowHistory(false);
    setBoardContent(null);
  };

  useEffect(() => {
    if (currentSessionId && messages.length > 1) {
      const timeout = setTimeout(() => {
        saveMessagesToSession(currentSessionId, messages);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [messages, currentSessionId, saveMessagesToSession]);

  useEffect(() => {
    const loadFee = async () => {
      try {
        const snap = await getDoc(doc(db, "platformFees", "virtual_trainer"));
        const fee = snap.exists() ? (snap.data().fee || 0) : 0;
        setTrainerFee(fee);
        if (fee === 0) {
          setAccessGranted(true);
          setSessionPaid(true);
          initWelcomeWithSession();
        }
      } catch {
        setAccessGranted(true);
        setSessionPaid(true);
        initWelcomeWithSession();
      }
      setCheckingAccess(false);
    };
    loadFee();
  }, []);

  const initWelcomeWithSession = async () => {
    const sessionId = await createNewSession();
    setCurrentSessionId(sessionId);
    initWelcome();
  };

  const initWelcome = () => {
    setMessages([{
      id: "welcome",
      role: "trainer",
      content: "നമസ്കാരം, ഞാൻ Elzu ആണ്! 🤖 നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?\n\nPAN Card, Aadhaar, E-dis സർട്ടിഫിക്കറ്റ്, Loan, Recharge, Training - എന്തിനെ കുറിച്ചും ചോദിക്കാം! താഴെയുള്ള Quick Buttons ഉപയോഗിച്ചും ചോദ്യങ്ങൾ ചോദിക്കാം 👇",
      timestamp: new Date().toISOString(),
    }]);
  };

  const handlePayAndAccess = async () => {
    if (!appUser) return;
    try {
      await atomicDebit(appUser.uid, trainerFee, {
        source: "virtual_trainer",
        description: "Virtual Trainer Session Fee",
      });
      toast.success("പേയ്മെന്റ് വിജയകരമായി! ട്രെയിനർ റെഡി ✅");
      setAccessGranted(true);
      setSessionPaid(true);
      initWelcomeWithSession();
    } catch (err: any) {
      toast.error(err?.message || "Wallet balance insufficient. Please add funds.");
    }
  };

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
        content: "ക്ഷമിക്കണം, ഒരു പ്രശ്നം ഉണ്ടായി. വീണ്ടും ശ്രമിക്കുക 🙏\n\n👉 ഈ വിവരം confirm ചെയ്യാൻ support team-നെ contact ചെയ്യുക",
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
    recognition.onerror = () => { setIsListening(false); toast.error("വോയ്സ് ഇൻപുട്ട് പ്രശ്നം. വീണ്ടും ശ്രമിക്കുക."); };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const exportChatPDF = async () => {
    if (messages.length <= 1) { toast.error("എക്‌സ്‌പോർട്ട് ചെയ്യാൻ ചാറ്റ് ഇല്ല"); return; }
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Elzu Virtual Trainer - Training Notes", margin, y);
      y += 8;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Exported: ${new Date().toLocaleString()}  |  User: ${appUser?.name || appUser?.email || ""}`, margin, y);
      y += 4;
      pdf.setDrawColor(16, 185, 129);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;
      pdf.setTextColor(0, 0, 0);

      for (const msg of messages) {
        if (msg.id === "welcome") continue;
        const label = msg.role === "user" ? "You" : "Elzu";
        const time = new Date(msg.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(msg.role === "user" ? 16 : 5, msg.role === "user" ? 185 : 150, msg.role === "user" ? 129 : 105);
        if (y > pageHeight - 20) { pdf.addPage(); y = margin; }
        pdf.text(`${label}  (${time})`, margin, y);
        y += 5;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(30, 30, 30);
        const lines = pdf.splitTextToSize(msg.content, contentWidth);
        for (const line of lines) {
          if (y > pageHeight - 15) { pdf.addPage(); y = margin; }
          pdf.text(line, margin, y);
          y += 5;
        }
        y += 4;
      }

      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`EI Solutions - Virtual Trainer Notes  |  Page ${i}/${totalPages}`, margin, pageHeight - 8);
      }

      pdf.save(`training-notes-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF ഡൗൺലോഡ് ചെയ്തു! 📄");
    } catch { toast.error("PDF ജനറേറ്റ് ചെയ്യാൻ കഴിഞ്ഞില്ല"); }
  };

  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Payment gate
  if (!accessGranted && trainerFee > 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-b from-emerald-100 to-white dark:from-emerald-950/40 dark:to-background p-6 flex flex-col items-center">
              <div className="relative" style={{ animation: "idleFloat 3s ease-in-out infinite" }}>
                <img src={elzuAvatar} alt="Elzu" className="w-40 h-52 object-contain drop-shadow-xl" width={160} height={208} />
              </div>
              <h2 className="text-xl font-bold text-foreground mt-2">Elzu Virtual Trainer</h2>
              <p className="text-sm text-muted-foreground mt-1">
                AI ട്രെയിനർ സെഷൻ ആരംഭിക്കാൻ ₹{trainerFee} ഫീ ആവശ്യമാണ്
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-xs font-medium text-foreground">ഈ സെഷനിൽ ലഭിക്കുന്നത്:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✅ EI Solutions സേവനങ്ങളെ കുറിച്ച് മലയാളത്തിൽ ട്രെയിനിംഗ്</li>
                  <li>✅ PAN, Aadhaar, Loan, E-dis സഹായം</li>
                  <li>✅ വോയ്സ് ഇൻപുട്ട് & ഔട്ട്പുട്ട്</li>
                  <li>✅ Unlimited ചോദ്യങ്ങൾ</li>
                </ul>
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                size="lg"
                onClick={handlePayAndAccess}
              >
                <Wallet className="w-5 h-5" />
                ₹{trainerFee} അടച്ച് സെഷൻ ആരംഭിക്കുക
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">Wallet balance-ൽ നിന്ന് debit ചെയ്യും</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = isSpeaking || loading;

  return (
    <>
      <style>{avatarStyles}</style>
      <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[850px]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-600 text-white px-4 py-3 rounded-t-xl flex items-center gap-3 shadow-lg">
          <div className="relative" style={{ animation: "glowPulse 2s ease-in-out infinite" }}>
            <img src={elzuAvatar} alt="Elzu" className="w-11 h-11 rounded-full border-2 border-emerald-300/50 object-cover object-top bg-emerald-900/50" width={44} height={44} />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-emerald-700 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold flex items-center gap-2">
              🤖 Elzu Virtual Trainer
            </h1>
            <p className="text-xs text-white/70">
              {loading ? "✍️ ടൈപ്പ് ചെയ്യുന്നു..." : isSpeaking ? "🗣️ സംസാരിക്കുന്നു..." : "🟢 ഓൺലൈൻ — നിങ്ങളുടെ AI ട്രെയിനർ"}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 h-9 w-9" onClick={startNewChat} title="പുതിയ ചാറ്റ്">
              <Plus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 h-9 w-9" onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadChatSessions(); }} title="ഹിസ്റ്ററി">
              <History className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 h-9 w-9" onClick={exportChatPDF} title="PDF" disabled={messages.length <= 1}>
              <FileDown className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 h-9 w-9" onClick={() => { if (!ttsEnabled) { setTtsEnabled(true); } else { window.speechSynthesis.cancel(); setIsSpeaking(false); setTtsEnabled(false); } }}>
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex flex-1 min-h-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
          {/* Chat History Panel */}
          {showHistory && (
            <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm flex flex-col" style={{ animation: "boardSlideIn 0.3s ease-out" }}>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-foreground">📜 ചാറ്റ് ഹിസ്റ്ററി</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>✕</Button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loadingHistory ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : chatSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">ചാറ്റ് ഹിസ്റ്ററി ഇല്ല</p>
                ) : (
                  chatSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        currentSessionId === session.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => loadSession(session)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {session.messageCount} messages • {session.updatedAt?.toDate ? new Date(session.updatedAt.toDate()).toLocaleDateString("ml-IN") : ""}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-border">
                <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={startNewChat}>
                  <Plus className="w-4 h-4" /> പുതിയ ചാറ്റ്
                </Button>
              </div>
            </div>
          )}

          {/* Left: Avatar + Digital Board (visible on lg+) */}
          <div className="hidden lg:flex flex-col w-[340px] border-r border-white/5 relative">
            {/* Futuristic background */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-emerald-950/30 to-slate-950" />
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "30px 30px" }} />

            {/* Digital Board */}
            <div className="relative z-10 mx-4 mt-4 flex-shrink-0">
              <div className="bg-slate-800/80 backdrop-blur border border-emerald-500/20 rounded-xl p-3 shadow-lg" style={{ animation: boardContent ? "boardSlideIn 0.5s ease-out" : undefined }}>
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300">Digital Board</span>
                  <div className="ml-auto flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                </div>
                <div className="bg-slate-900/80 rounded-lg p-3 min-h-[80px] max-h-[140px] overflow-y-auto border border-white/5">
                  {boardContent ? (
                    <p className="text-[10px] text-emerald-100/80 leading-relaxed whitespace-pre-wrap line-clamp-[10]">{boardContent}</p>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-3 gap-2">
                      <Globe className="w-5 h-5 text-emerald-500/40" />
                      <p className="text-[10px] text-white/30">www.eisolutions.biz</p>
                      <p className="text-[9px] text-white/20">ചോദ്യം ചോദിക്കുമ്പോൾ ഇവിടെ details കാണിക്കും</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Avatar */}
            <div className="relative z-10 flex-1 flex items-end justify-center pb-0 overflow-hidden">
              {/* Glow effect behind avatar */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
              
              {messages.length <= 1 ? (
                <video
                  src={elzuIntroVideo.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-64 h-auto object-contain drop-shadow-2xl relative z-10"
                />
              ) : (
                <div
                  className="relative z-10"
                  style={{
                    animation: isActive
                      ? "talkingBounce 0.8s ease-in-out infinite, handGesture 1.2s ease-in-out infinite"
                      : "idleFloat 4s ease-in-out infinite, idleBreathe 5s ease-in-out infinite",
                  }}
                >
                  <img
                    src={elzuAvatar}
                    alt="Elzu Trainer"
                    className="w-56 h-auto object-contain drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                    width={224}
                    height={336}
                  />
                  {/* Eye glow overlay */}
                  {isActive && (
                    <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-16 h-4" style={{ animation: "eyeGlow 1s ease-in-out infinite" }}>
                      <div className="w-full h-full bg-cyan-400/20 rounded-full blur-md" />
                    </div>
                  )}
                  {/* Speaking indicator bars */}
                  {isActive && (
                    <div className="absolute bottom-[30%] left-1/2 -translate-x-1/2 flex items-end gap-[3px]">
                      {[0, 80, 160, 240, 320].map((delay) => (
                        <span
                          key={delay}
                          className="w-[3px] rounded-full bg-emerald-400/80"
                          style={{ animation: `talkBar 0.6s ease-in-out ${delay}ms infinite alternate` }}
                        />
                      ))}
                    </div>
                  )}
                  {/* Pulse ring when speaking */}
                  {isSpeaking && (
                    <div className="absolute -inset-6 rounded-full border-2 border-emerald-400/20 animate-ping" />
                  )}
                </div>
              )}

              {/* Floor reflection */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-emerald-500/5 to-transparent" />
            </div>

            {/* Status bar */}
            <div className="relative z-10 bg-black/40 backdrop-blur px-3 py-2 text-center border-t border-white/5">
              <div className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px] text-white/60">
                  {loading ? "✍️ Preparing answer..." : isSpeaking ? "🗣️ Speaking..." : "🎓 Ready to teach"}
                </p>
              </div>
              {sessionPaid && trainerFee > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 text-[9px] text-emerald-300 bg-emerald-600/20 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" /> Session Active
                </div>
              )}
            </div>
          </div>

          {/* Right: Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-background">
            {/* Mobile avatar mini bar */}
            <div className="lg:hidden flex items-center gap-3 px-4 py-2 bg-slate-900 border-b border-white/5">
              <div style={{ animation: isActive ? "talkingBounce 0.8s ease-in-out infinite" : "idleFloat 3s ease-in-out infinite" }}>
                <img src={elzuAvatar} alt="Elzu" className="w-10 h-10 object-contain" width={40} height={40} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-white">🤖 Elzu</p>
                <p className="text-[10px] text-emerald-400">{loading ? "typing..." : isSpeaking ? "speaking..." : "online"}</p>
              </div>
              {isActive && (
                <div className="flex items-end gap-[2px] mr-2">
                  {[0, 60, 120].map((d) => (
                    <span key={d} className="w-[2px] rounded-full bg-emerald-400/70" style={{ animation: `talkBar 0.5s ease-in-out ${d}ms infinite alternate` }} />
                  ))}
                </div>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "trainer" && (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
                      <img src={elzuAvatar} alt="" className="w-6 h-6 object-contain" width={24} height={24} />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    m.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-card text-foreground border border-border rounded-bl-sm"
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    <p className={`text-[10px] mt-1 ${m.role === "user" ? "text-white/60" : "text-muted-foreground"}`}>
                      {new Date(m.timestamp).toLocaleTimeString("ml-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 items-start">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <img src={elzuAvatar} alt="" className="w-6 h-6 object-contain" width={24} height={24} />
                  </div>
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
              <div className="px-4 pb-2">
                <p className="text-xs text-muted-foreground mb-2 font-medium">⚡ Quick Topics:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((qa) => (
                    <Button
                      key={qa.label}
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-full border-emerald-300 text-emerald-700 dark:text-emerald-400 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1"
                      onClick={() => sendMessage(qa.query)}
                      disabled={loading}
                    >
                      {qa.label}
                    </Button>
                  ))}
                </div>
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
                <p className="text-xs text-center text-destructive mt-2 animate-pulse">🎤 കേൾക്കുന്നു... സംസാരിക്കുക</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

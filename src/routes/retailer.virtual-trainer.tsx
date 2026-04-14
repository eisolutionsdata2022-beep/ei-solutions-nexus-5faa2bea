import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { atomicDebit } from "@/lib/firebase-transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Mic, MicOff, Volume2, VolumeX, Loader2, Lock, Wallet, Sparkles, History, Plus, Trash2, FileDown } from "lucide-react";
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
  { label: "📋 PAN Card സഹായം", query: "PAN Card എങ്ങനെ അപ്ലൈ ചെയ്യാം?" },
  { label: "🪪 Aadhaar സേവനങ്ങൾ", query: "Aadhaar സേവനങ്ങൾ എന്തൊക്കെയാണ്?" },
  { label: "💰 Loan സേവനങ്ങൾ", query: "Loan-ന് എങ്ങനെ അപ്ലൈ ചെയ്യാം?" },
  { label: "🎓 Training സഹായം", query: "ട്രെയിനിംഗ് എങ്ങനെ ജോയിൻ ചെയ്യാം?" },
  { label: "📄 E-dis സർട്ടിഫിക്കറ്റ്", query: "E-dis സർട്ടിഫിക്കറ്റ് സേവനങ്ങൾ എന്തൊക്കെ?" },
  { label: "📱 Recharge & BBPS", query: "Recharge, Bill Payment എങ്ങനെ ചെയ്യാം?" },
];

interface ChatSession {
  id: string;
  title: string;
  createdAt: any;
  updatedAt: any;
  messageCount: number;
}

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

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
      // Save messages as subcollection is complex; store in session doc directly
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
  };

  // Auto-save messages when they change
  useEffect(() => {
    if (currentSessionId && messages.length > 1) {
      const timeout = setTimeout(() => {
        saveMessagesToSession(currentSessionId, messages);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [messages, currentSessionId, saveMessagesToSession]);

  // Load fee config and check if free
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
      content: "സുഹൃത്തേ, ഞാൻ എൽസുതത്താ ആണ്! നിങ്ങളുടെ ഡിജിറ്റൽ ട്രെയിനർ. എനിക്ക് എങ്ങനെ സഹായിക്കാം? 😊\n\nPAN Card, Aadhaar, E-dis സർട്ടിഫിക്കറ്റ്, Loan, Recharge, Training - എന്തിനെ കുറിച്ചും ചോദിക്കാം!",
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

      // Title
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Elzuthatha Virtual Trainer - Training Notes", margin, y);
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
        const label = msg.role === "user" ? "You" : "Elzuthatha";
        const time = new Date(msg.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

        // Label
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(msg.role === "user" ? 16 : 5, msg.role === "user" ? 185 : 150, msg.role === "user" ? 129 : 105);
        if (y > pageHeight - 20) { pdf.addPage(); y = margin; }
        pdf.text(`${label}  (${time})`, margin, y);
        y += 5;

        // Content - wrap text
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

      // Footer on each page
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
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <img src={trainerAvatar} alt="എൽസുതത്താ" className="w-16 h-16 rounded-full object-cover" width={64} height={64} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">എൽസുതത്താ വിർച്വൽ ട്രെയിനർ</h2>
              <p className="text-sm text-muted-foreground mt-2">
                AI ട്രെയിനർ സെഷൻ ആരംഭിക്കാൻ ₹{trainerFee} ഫീ ആവശ്യമാണ്
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
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
            <p className="text-[11px] text-muted-foreground">Wallet balance-ൽ നിന്ന് debit ചെയ്യും</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-600 text-white px-4 py-3 rounded-t-xl flex items-center gap-3">
        <div className="relative">
          <img src={trainerAvatar} alt="എൽസുതത്താ" className="w-12 h-12 rounded-full border-2 border-white/30 object-cover" width={48} height={48} />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-emerald-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold">എൽസുതത്താ വിർച്വൽ ട്രെയിനർ</h1>
          <p className="text-xs text-white/70">
            {loading ? "ടൈപ്പ് ചെയ്യുന്നു..." : isSpeaking ? "സംസാരിക്കുന്നു..." : "നിങ്ങളുടെ ഡിജിറ്റൽ ട്രെയിനർ"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={startNewChat}
            title="പുതിയ ചാറ്റ്"
          >
            <Plus className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadChatSessions(); }}
            title="ചാറ്റ് ഹിസ്റ്ററി"
          >
            <History className="w-5 h-5" />
          </Button>
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
      </div>

      {/* Trainer Avatar Section + Chat */}
      <div className="flex flex-1 min-h-0 bg-gradient-to-b from-muted/30 to-background relative">
        {/* Chat History Panel */}
        {showHistory && (
          <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm flex flex-col">
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
                      currentSessionId === session.id
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => loadSession(session)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {session.messageCount} messages • {session.updatedAt?.toDate ? new Date(session.updatedAt.toDate()).toLocaleDateString("ml-IN") : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-border">
              <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={startNewChat}>
                <Plus className="w-4 h-4" /> പുതിയ ചാറ്റ് ആരംഭിക്കുക
              </Button>
            </div>
          </div>
        )}
        {/* Avatar - visible on lg+ */}
        <div className="hidden lg:flex flex-col items-center justify-center w-64 border-r border-border p-4 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
          <div className={`relative ${isSpeaking ? "animate-pulse" : ""}`}>
            <img src={trainerAvatar} alt="എൽസുതത്താ" className="w-44 h-44 rounded-full border-4 border-emerald-500/30 object-cover shadow-lg" width={176} height={176} />
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
          {sessionPaid && trainerFee > 0 && (
            <div className="mt-3 flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
              <Sparkles className="w-3 h-3" /> Session Active
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "trainer" && (
                  <img src={trainerAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-1" width={32} height={32} />
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
              <p className="text-xs text-center text-destructive mt-2 animate-pulse">🎤 കേൾക്കുന്നു... സംസാരിക്കുക</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, ExternalLink, IndianRupee, MessageCircle, Send, Video } from "lucide-react";
import { toast } from "sonner";
import { VideoRoom } from "@/components/VideoRoom";

export const Route = createFileRoute("/retailer/trainings")({
  component: RetailerTrainings,
});

function RetailerTrainings() {
  const { appUser } = useAuth();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [joining, setJoining] = useState<string | null>(null);
  const [chatTrainingId, setChatTrainingId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatMsg, setChatMsg] = useState("");
  const [liveTrainingId, setLiveTrainingId] = useState<string | null>(null);

  const fetchTrainings = async () => {
    if (!appUser) return;
    try {
      const snap = await getDocs(collection(db, "trainings"));
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.date.localeCompare(b.date));
      setTrainings(list);

      // Check which ones user already joined
      const attSnap = await getDocs(collection(db, "attendance"));
      const joined = new Set<string>();
      attSnap.forEach((d) => {
        const data = d.data();
        if (data.userId === appUser.uid) joined.add(data.trainingId);
      });
      setJoinedIds(joined);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchTrainings(); }, [appUser]);

  // Live chat listener
  useEffect(() => {
    if (!chatTrainingId) return;
    const unsub = onSnapshot(collection(db, "trainings", chatTrainingId, "chat"), (snap) => {
      const msgs: any[] = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
      setChatMessages(msgs);
    });
    return unsub;
  }, [chatTrainingId]);

  const handleJoin = async (training: any) => {
    if (!appUser) return;
    setJoining(training.id);
    try {
      // Check wallet balance
      const walletSnap = await getDoc(doc(db, "wallets", appUser.uid));
      const wallet = walletSnap.exists() ? walletSnap.data() : { balance: 0 };
      const price = training.price || 0;

      if (wallet.balance < price) {
        toast.error(`Insufficient balance! You need ₹${price} but have ₹${wallet.balance}`);
        setJoining(null);
        return;
      }

      // Deduct from retailer wallet
      await updateDoc(doc(db, "wallets", appUser.uid), {
        balance: wallet.balance - price,
      });

      // Credit trainer wallet
      const trainerEarning = training.trainerEarning || 0;
      const trainerWalletSnap = await getDoc(doc(db, "wallets", training.trainerId));
      if (trainerWalletSnap.exists()) {
        const tw = trainerWalletSnap.data();
        await updateDoc(doc(db, "wallets", training.trainerId), {
          balance: (tw.balance || 0) + trainerEarning,
        });
      }

      // Credit admin commission
      const commission = price - trainerEarning;
      // Find admin user
      const usersSnap = await getDocs(collection(db, "users"));
      let adminId: string | null = null;
      usersSnap.forEach((d) => {
        if (d.data().role === "admin" && !adminId) adminId = d.id;
      });
      if (adminId) {
        const adminWalletSnap = await getDoc(doc(db, "wallets", adminId));
        if (adminWalletSnap.exists()) {
          const aw = adminWalletSnap.data();
          await updateDoc(doc(db, "wallets", adminId), {
            balance: (aw.balance || 0) + commission,
          });
        }
      }

      // Create transactions
      const now = new Date().toISOString();
      await addDoc(collection(db, "transactions"), {
        userId: appUser.uid, amount: price, type: "debit",
        source: "training", trainingId: training.id, createdAt: now,
        description: `Training: ${training.title}`,
      });
      await addDoc(collection(db, "transactions"), {
        userId: training.trainerId, amount: trainerEarning, type: "credit",
        source: "training", trainingId: training.id, createdAt: now,
        description: `Earning: ${training.title}`,
      });
      if (adminId) {
        await addDoc(collection(db, "transactions"), {
          userId: adminId, amount: commission, type: "credit",
          source: "training_commission", trainingId: training.id, createdAt: now,
          description: `Commission: ${training.title}`,
        });
      }

      // Create attendance record
      await addDoc(collection(db, "attendance"), {
        userId: appUser.uid,
        userName: appUser.name || appUser.email,
        trainingId: training.id,
        joinTime: now,
        leaveTime: null,
        duration: 0,
      });

      toast.success("Successfully joined! Opening meeting link...");
      setJoinedIds((prev) => new Set(prev).add(training.id));
      if (training.meetingLink) {
        window.open(training.meetingLink, "_blank");
      }
      fetchTrainings();
    } catch (err) {
      console.error(err);
      toast.error("Failed to join training");
    }
    setJoining(null);
  };

  const sendChat = async () => {
    if (!chatTrainingId || !chatMsg.trim() || !appUser) return;
    try {
      await addDoc(collection(db, "trainings", chatTrainingId, "chat"), {
        userId: appUser.uid,
        userName: appUser.name || appUser.email,
        message: chatMsg.trim(),
        createdAt: new Date().toISOString(),
      });
      setChatMsg("");
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  const liveTraining = liveTrainingId ? trainings.find((t) => t.id === liveTrainingId) : null;

  if (liveTraining) {
    return (
      <VideoRoom
        trainingId={liveTraining.id}
        trainingTitle={liveTraining.title}
        role="retailer"
        onLeave={() => setLiveTrainingId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Training Sessions</h1>
        <p className="text-muted-foreground">Join available training sessions.</p>
      </div>

      {/* Chat dialog */}
      <Dialog open={!!chatTrainingId} onOpenChange={(v) => { if (!v) setChatTrainingId(null); }}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Training Chat</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[400px] p-2 border border-border rounded-lg">
            {chatMessages.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No messages yet.</p>}
            {chatMessages.map((m) => (
              <div key={m.id} className={`text-sm p-2 rounded-lg ${m.userId === appUser?.uid ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
                <p className="text-xs font-medium text-muted-foreground mb-1">{m.userName}</p>
                <p className="text-foreground">{m.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
            />
            <Button size="icon" onClick={sendChat}><Send className="w-4 h-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {trainings.map((t) => {
          const hasJoined = joinedIds.has(t.id);
          return (
            <Card key={t.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{t.title}</p>
                      <p className="text-sm text-muted-foreground">{t.date} {t.time && `at ${t.time}`} · {t.duration || 1}hr</p>
                      {t.trainerName && <p className="text-xs text-muted-foreground">Trainer: {t.trainerName}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5" /> ₹{t.price || 0}
                    </span>
                    {hasJoined ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setChatTrainingId(t.id)}>
                          <MessageCircle className="w-4 h-4 mr-1" /> Chat
                        </Button>
                        {t.meetingLink && (
                          <a href={t.meetingLink} target="_blank" rel="noopener noreferrer">
                            <Button size="sm"><ExternalLink className="w-4 h-4 mr-1" /> Rejoin</Button>
                          </a>
                        )}
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 font-medium">Joined</span>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setLiveTrainingId(t.id)}>
                          <Video className="w-4 h-4 mr-1" /> Join Live
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleJoin(t)}
                        disabled={joining === t.id}
                      >
                        {joining === t.id ? "Joining..." : "Join Training"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {trainings.length === 0 && <p className="text-muted-foreground">No training sessions available.</p>}
      </div>
    </div>
  );
}

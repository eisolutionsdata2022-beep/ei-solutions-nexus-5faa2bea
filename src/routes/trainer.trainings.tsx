import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, GraduationCap, Trash2, Edit, Users, IndianRupee, Video, Radio } from "lucide-react";
import { toast } from "sonner";
import { VideoRoom } from "@/components/VideoRoom";

export const Route = createFileRoute("/trainer/trainings")({
  ssr: false,
  component: TrainerTrainings,
});

interface Training {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  trainerEarning: number;
  meetingLink: string;
  trainerId: string;
  createdAt: string;
}

function TrainerTrainings() {
  const { appUser } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [attendance, setAttendance] = useState<Record<string, any[]>>({});
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(1);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [settings, setSettings] = useState({ pricePerHour: 300, trainerEarningPerHour: 150 });
  const [liveTrainingId, setLiveTrainingId] = useState<string | null>(null);

  const fetchAll = async () => {
    if (!appUser) return;
    try {
      const settingsSnap = await getDoc(doc(db, "settings", "training"));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setSettings({
          pricePerHour: data.pricePerHour || 300,
          trainerEarningPerHour: data.trainerEarningPerHour || 150,
        });
      }

      const snap = await getDocs(collection(db, "trainings"));
      const list: Training[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.trainerId === appUser.uid) list.push({ id: d.id, ...data } as Training);
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      setTrainings(list);

      const attSnap = await getDocs(collection(db, "attendance"));
      const attMap: Record<string, any[]> = {};
      attSnap.forEach((d) => {
        const data = d.data();
        if (!attMap[data.trainingId]) attMap[data.trainingId] = [];
        attMap[data.trainingId].push({ id: d.id, ...data });
      });
      setAttendance(attMap);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchAll(); }, [appUser]);

  const resetForm = () => {
    setTitle(""); setDate(""); setTime(""); setDuration(1); setEditId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    const price = (settings.pricePerHour || 300) * duration;
    const trainerEarning = (settings.trainerEarningPerHour || 150) * duration;

    const data = {
      title, date, time, duration, price, trainerEarning,
      meetingLink: "", trainerId: appUser.uid,
      trainerName: appUser.name || appUser.email,
      createdAt: new Date().toISOString(),
    };

    try {
      if (editId) {
        await updateDoc(doc(db, "trainings", editId), data);
        toast.success("Training updated!");
      } else {
        await addDoc(collection(db, "trainings"), data);
        toast.success("Training created!");
      }
      resetForm(); setOpen(false); fetchAll();
    } catch (err) {
      toast.error("Failed to save");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this training?")) return;
    try {
      await deleteDoc(doc(db, "trainings", id));
      toast.success("Deleted"); fetchAll();
    } catch { toast.error("Failed"); }
  };

  const handleEdit = (e: React.MouseEvent, t: Training) => {
    e.stopPropagation();
    setTitle(t.title); setDate(t.date); setTime(t.time || "");
    setDuration(t.duration || 1);
    setEditId(t.id); setOpen(true);
  };

  const liveTraining = liveTrainingId ? trainings.find((t) => t.id === liveTrainingId) : null;

  // When a training is selected, show the VideoRoom fullscreen
  if (liveTraining) {
    return (
      <VideoRoom
        trainingId={liveTraining.id}
        trainingTitle={liveTraining.title}
        role="trainer"
        onLeave={() => setLiveTrainingId(null)}
      />
    );
  }

  const computedPrice = (settings.pricePerHour || 300) * duration;
  const computedEarning = (settings.trainerEarningPerHour || 150) * duration;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Training Room</h1>
          <p className="text-muted-foreground">Click any training to start a live session with Video, Chat, Q&A & AI Bot.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Training</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Create"} Training</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Duration (hours)</Label>
                <Input type="number" min={0.5} step={0.5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} required />
              </div>
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <p className="text-muted-foreground">Price: ₹{computedPrice}</p>
                <p className="text-muted-foreground">Your Earning: <span className="text-green-600 font-semibold">₹{computedEarning}</span></p>
              </div>
              <Button type="submit" className="w-full">{editId ? "Update" : "Create"} Training</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {trainings.map((t) => (
          <Card
            key={t.id}
            className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
            onClick={() => setLiveTrainingId(t.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <Radio className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{t.title}</p>
                    <p className="text-sm text-muted-foreground">{t.date} {t.time && `at ${t.time}`} · {t.duration}hr</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" /> ₹{t.trainerEarning}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {(attendance[t.id] || []).length} joined
                  </span>
                  <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); setLiveTrainingId(t.id); }} className="bg-green-600 hover:bg-green-700">
                    <Video className="w-4 h-4 mr-1" /> Go Live
                  </Button>
                  <Button variant="outline" size="sm" onClick={(e) => handleEdit(e, t)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={(e) => handleDelete(e, t.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Video className="w-3 h-3" /> WebRTC Video
                <span className="mx-1">·</span> Live Chat
                <span className="mx-1">·</span> Q&A
                <span className="mx-1">·</span> AI Bot
              </div>
            </CardContent>
          </Card>
        ))}
        {trainings.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground">No trainings yet. Create your first live training session!</p>
          </div>
        )}
      </div>
    </div>
  );
}

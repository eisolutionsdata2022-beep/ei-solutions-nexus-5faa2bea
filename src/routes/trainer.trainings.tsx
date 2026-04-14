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
import { Plus, GraduationCap, ExternalLink, Trash2, Edit, Users, IndianRupee, Video } from "lucide-react";
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
  const [link, setLink] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewAttendanceId, setViewAttendanceId] = useState<string | null>(null);
  const [settings, setSettings] = useState({ pricePerHour: 300, trainerEarningPerHour: 150 });
  const [liveTrainingId, setLiveTrainingId] = useState<string | null>(null);

  const fetchAll = async () => {
    if (!appUser) return;
    try {
      const settingsSnap = await getDoc(doc(db, "settings", "training"));
      if (settingsSnap.exists()) setSettings(settingsSnap.data() as any);

      const snap = await getDocs(collection(db, "trainings"));
      const list: Training[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.trainerId === appUser.uid) list.push({ id: d.id, ...data } as Training);
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      setTrainings(list);

      // Attendance
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
    setTitle(""); setDate(""); setTime(""); setDuration(1); setLink(""); setEditId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    const price = settings.pricePerHour * duration;
    const trainerEarning = settings.trainerEarningPerHour * duration;

    const data = {
      title, date, time, duration, price, trainerEarning,
      meetingLink: link, trainerId: appUser.uid,
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this training?")) return;
    try {
      await deleteDoc(doc(db, "trainings", id));
      toast.success("Deleted"); fetchAll();
    } catch { toast.error("Failed"); }
  };

  const handleEdit = (t: Training) => {
    setTitle(t.title); setDate(t.date); setTime(t.time || "");
    setDuration(t.duration || 1); setLink(t.meetingLink);
    setEditId(t.id); setOpen(true);
  };

  const viewingAttendance = viewAttendanceId ? attendance[viewAttendanceId] || [] : [];
  const liveTraining = liveTrainingId ? trainings.find((t) => t.id === liveTrainingId) : null;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Trainings</h1>
          <p className="text-muted-foreground">Create and manage your training sessions.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Training</Button>
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
              <div className="space-y-2">
                <Label>Meeting Link (optional)</Label>
                <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/... (optional)" />
              </div>
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <p className="text-muted-foreground">Price: ₹{settings.pricePerHour * duration}</p>
                <p className="text-muted-foreground">Your Earning: <span className="text-green-600 font-semibold">₹{settings.trainerEarningPerHour * duration}</span></p>
              </div>
              <Button type="submit" className="w-full">{editId ? "Update" : "Create"} Training</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Attendance viewer */}
      <Dialog open={!!viewAttendanceId} onOpenChange={(v) => { if (!v) setViewAttendanceId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Joined Users</DialogTitle></DialogHeader>
          {viewingAttendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users have joined yet.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {viewingAttendance.map((a) => (
                <div key={a.id} className="flex justify-between items-center py-2 border-b border-border text-sm">
                  <span className="text-foreground">{a.userName || a.userId}</span>
                  <span className="text-muted-foreground text-xs">{a.joinTime || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {trainings.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-primary" />
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
                  <Button variant="outline" size="sm" onClick={() => setViewAttendanceId(t.id)}>
                    <Users className="w-4 h-4 mr-1" /> {(attendance[t.id] || []).length}
                  </Button>
                  {t.meetingLink && (
                    <a href={t.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                    </a>
                  )}
                  <Button variant="default" size="sm" onClick={() => setLiveTrainingId(t.id)} className="bg-green-600 hover:bg-green-700">
                    <Video className="w-4 h-4 mr-1" /> Go Live
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(t)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {trainings.length === 0 && <p className="text-muted-foreground">No trainings yet.</p>}
      </div>
    </div>
  );
}

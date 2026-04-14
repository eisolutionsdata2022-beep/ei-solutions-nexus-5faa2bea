import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, GraduationCap, ExternalLink, Trash2, Edit, Users, IndianRupee } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/trainings")({
  component: AdminTrainings,
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
  trainerName?: string;
  createdAt: string;
}

function AdminTrainings() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, number>>({});
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(1);
  const [link, setLink] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [settings, setSettings] = useState({ pricePerHour: 300, trainerEarningPerHour: 150 });

  const fetchAll = async () => {
    try {
      // Settings
      const settingsSnap = await getDoc(doc(db, "settings", "training"));
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as any);
      }

      // Trainers
      const usersSnap = await getDocs(collection(db, "users"));
      const trainerList: any[] = [];
      usersSnap.forEach((d) => {
        const data = d.data();
        if (data.role === "trainer") trainerList.push({ id: d.id, ...data });
      });
      setTrainers(trainerList);

      // Trainings
      const snap = await getDocs(collection(db, "trainings"));
      const list: Training[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Training));
      list.sort((a, b) => b.date.localeCompare(a.date));
      setTrainings(list);

      // Attendance counts
      const attSnap = await getDocs(collection(db, "attendance"));
      const counts: Record<string, number> = {};
      attSnap.forEach((d) => {
        const tid = d.data().trainingId;
        counts[tid] = (counts[tid] || 0) + 1;
      });
      setAttendance(counts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => {
    setTitle(""); setDate(""); setTime(""); setDuration(1); setLink(""); setTrainerId(""); setEditId(null);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const price = settings.pricePerHour * duration;
    const trainerEarning = settings.trainerEarningPerHour * duration;
    const trainerDoc = trainers.find((t) => t.id === trainerId);

    const data = {
      title, date, time, duration, price, trainerEarning,
      meetingLink: link, trainerId,
      trainerName: trainerDoc?.name || "",
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
      toast.error("Failed to save training");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this training?")) return;
    try {
      await deleteDoc(doc(db, "trainings", id));
      toast.success("Training deleted");
      fetchAll();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const handleEdit = (t: Training) => {
    setTitle(t.title); setDate(t.date); setTime(t.time || "");
    setDuration(t.duration || 1); setLink(t.meetingLink);
    setTrainerId(t.trainerId || ""); setEditId(t.id); setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trainings</h1>
          <p className="text-muted-foreground">Manage training sessions with pricing.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Training</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Create"} Training</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
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
                <Label>Assign Trainer</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={trainerId}
                  onChange={(e) => setTrainerId(e.target.value)}
                  required
                >
                  <option value="">Select Trainer</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name || t.email}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Meeting Link (optional - built-in video available)</Label>
                <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/... (optional)" />
              </div>
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <p className="text-muted-foreground">Price: <span className="font-semibold text-foreground">₹{settings.pricePerHour * duration}</span></p>
                <p className="text-muted-foreground">Trainer Earning: <span className="font-semibold text-green-600">₹{settings.trainerEarningPerHour * duration}</span></p>
                <p className="text-muted-foreground">Commission: <span className="font-semibold text-primary">₹{(settings.pricePerHour - settings.trainerEarningPerHour) * duration}</span></p>
              </div>
              <Button type="submit" className="w-full">{editId ? "Update" : "Create"} Training</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                    {t.trainerName && <p className="text-xs text-muted-foreground">Trainer: {t.trainerName}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <IndianRupee className="w-3.5 h-3.5" /> ₹{t.price}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-3.5 h-3.5" /> {attendance[t.id] || 0} joined
                  </div>
                  {t.meetingLink && (
                    <a href={t.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-1" /> Link</Button>
                    </a>
                  )}
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

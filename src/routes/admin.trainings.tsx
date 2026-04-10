import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, GraduationCap, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/trainings")({
  component: AdminTrainings,
});

function AdminTrainings() {
  const [trainings, setTrainings] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [link, setLink] = useState("");
  const [open, setOpen] = useState(false);

  const fetchTrainings = async () => {
    const snap = await getDocs(collection(db, "trainings"));
    const list: any[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    setTrainings(list);
  };

  useEffect(() => { fetchTrainings(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "trainings"), {
      title, date, meetingLink: link, createdAt: new Date().toISOString(),
    });
    setTitle(""); setDate(""); setLink(""); setOpen(false);
    fetchTrainings();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trainings</h1>
          <p className="text-muted-foreground">Manage training sessions.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Training</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Training</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Meeting Link</Label>
                <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/..." required />
              </div>
              <Button type="submit" className="w-full">Create Training</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {trainings.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t.title}</p>
                  <p className="text-sm text-muted-foreground">{t.date}</p>
                </div>
              </div>
              {t.meetingLink && (
                <a href={t.meetingLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-1" /> Join</Button>
                </a>
              )}
            </CardContent>
          </Card>
        ))}
        {trainings.length === 0 && <p className="text-muted-foreground">No trainings yet.</p>}
      </div>
    </div>
  );
}

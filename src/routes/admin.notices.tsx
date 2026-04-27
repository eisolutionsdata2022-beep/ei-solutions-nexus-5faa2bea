import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Trash2, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginPopupAdmin } from "@/components/admin/LoginPopupAdmin";

export const Route = createFileRoute("/admin/notices")({
  ssr: false,
  component: AdminNoticeBoard,
});

interface Notice {
  id: string;
  message: string;
  priority: "normal" | "urgent";
  active: boolean;
  createdAt: string;
}

function AdminNoticeBoard() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Notice[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Notice));
      setNotices(list);
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "notices"), {
        message: message.trim(),
        priority,
        active: true,
        createdAt: new Date().toISOString(),
      });
      toast.success("Notice published!");
      setMessage("");
      setPriority("normal");
      setOpen(false);
    } catch {
      toast.error("Failed to publish notice.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await updateDoc(doc(db, "notices", id), { active: !active });
      toast.success(active ? "Notice hidden" : "Notice activated");
    } catch {
      toast.error("Failed to update notice.");
    }
  };

  const deleteNotice = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notices", id));
      toast.success("Notice deleted");
    } catch {
      toast.error("Failed to delete notice.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notice Board</h1>
          <p className="text-muted-foreground text-sm">Manage announcements shown to retailers.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gov-blue hover:opacity-90 text-white font-bold gap-2">
              <Plus className="w-4 h-4" /> New Notice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Notice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your notice message..."
                  required
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as "normal" | "urgent")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-gov-blue text-white font-bold" disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</> : "Publish Notice"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notices list */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="bg-gov-blue-light border-b border-border px-5 py-3 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-gov-blue" />
          <h2 className="text-base font-bold text-gov-blue">All Notices ({notices.length})</h2>
        </div>
        <div className="divide-y divide-border">
          {notices.length === 0 ? (
            <div className="px-5 py-8 text-center text-muted-foreground">No notices yet.</div>
          ) : (
            notices.map((n) => (
              <div key={n.id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={n.priority === "urgent" ? "destructive" : "secondary"} className="text-xs capitalize">
                      {n.priority}
                    </Badge>
                    <Badge variant={n.active ? "default" : "outline"} className="text-xs">
                      {n.active ? "Active" : "Hidden"}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Active</Label>
                    <Switch checked={n.active} onCheckedChange={() => toggleActive(n.id, n.active)} />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteNotice(n.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/retailer/trainings")({
  component: RetailerTrainings,
});

function RetailerTrainings() {
  const [trainings, setTrainings] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "trainings"));
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setTrainings(list);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Training Sessions</h1>
        <p className="text-muted-foreground">Join available training sessions.</p>
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
                  <Button size="sm"><ExternalLink className="w-4 h-4 mr-1" /> Join</Button>
                </a>
              )}
            </CardContent>
          </Card>
        ))}
        {trainings.length === 0 && <p className="text-muted-foreground">No training sessions available.</p>}
      </div>
    </div>
  );
}

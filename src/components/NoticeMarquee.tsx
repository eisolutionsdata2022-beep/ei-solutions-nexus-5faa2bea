import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Megaphone } from "lucide-react";

interface Notice {
  id: string;
  message: string;
  priority: "normal" | "urgent";
  active: boolean;
  createdAt: string;
}

export function NoticeMarquee() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "notices"),
      where("active", "==", true)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Notice[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Notice));
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setNotices(list);
    });
    return unsub;
  }, []);

  if (notices.length === 0) return null;

  const text = notices.map((n) => `📢 ${n.message}`).join("     •     ");

  return (
    <div className="bg-gov-saffron/10 border border-gov-saffron/30 rounded-lg overflow-hidden mb-4">
      <div className="flex items-center">
        <div className="bg-gov-saffron px-3 py-2 flex items-center gap-1.5 shrink-0">
          <Megaphone className="w-4 h-4 text-white" />
          <span className="text-xs font-bold text-white uppercase tracking-wide">Notice</span>
        </div>
        <div className="flex-1 overflow-hidden py-2 px-3">
          <div className="animate-marquee whitespace-nowrap text-sm font-medium text-foreground">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, Send, CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface TrainingQAProps {
  trainingId: string;
  role: "trainer" | "retailer";
}

interface QAQuestion {
  id: string;
  question: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  active: boolean;
  answers: QAAnswer[];
}

interface QAAnswer {
  id: string;
  answer: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export function TrainingQA({ trainingId, role }: TrainingQAProps) {
  const { appUser } = useAuth();
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});

  const isTrainer = role === "trainer";

  useEffect(() => {
    const answerUnsubs: Array<() => void> = [];
    const unsub = onSnapshot(collection(db, "trainings", trainingId, "qa"), (snap) => {
      const qs: QAQuestion[] = [];
      snap.forEach((d) => qs.push({ id: d.id, answers: [], ...d.data() } as any));
      qs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setQuestions(qs);

      // Clean up old answer listeners
      answerUnsubs.forEach((u) => u());
      answerUnsubs.length = 0;

      // Listen to answers for each question
      qs.forEach((q) => {
        const ansUnsub = onSnapshot(collection(db, "trainings", trainingId, "qa", q.id, "answers"), (ansSnap) => {
          const answers: QAAnswer[] = [];
          ansSnap.forEach((d) => answers.push({ id: d.id, ...d.data() } as any));
          answers.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
          setQuestions((prev) =>
            prev.map((pq) => (pq.id === q.id ? { ...pq, answers } : pq))
          );
        });
        answerUnsubs.push(ansUnsub);
      });
    });
    return () => {
      unsub();
      answerUnsubs.forEach((u) => u());
    };
  }, [trainingId]);

  const addQuestion = async () => {
    if (!newQuestion.trim() || !appUser) return;
    try {
      await addDoc(collection(db, "trainings", trainingId, "qa"), {
        question: newQuestion.trim(),
        createdAt: new Date().toISOString(),
        createdBy: appUser.uid,
        createdByName: appUser.name || appUser.email,
        active: true,
      });
      setNewQuestion("");
      toast.success("Question posted!");
    } catch {
      toast.error("Failed to post question");
    }
  };

  const submitAnswer = async (questionId: string) => {
    const text = answerText[questionId]?.trim();
    if (!text || !appUser) return;
    try {
      await addDoc(collection(db, "trainings", trainingId, "qa", questionId, "answers"), {
        answer: text,
        userId: appUser.uid,
        userName: appUser.name || appUser.email,
        createdAt: new Date().toISOString(),
      });
      setAnswerText((prev) => ({ ...prev, [questionId]: "" }));
      toast.success("Answer submitted!");
    } catch {
      toast.error("Failed to submit answer");
    }
  };

  const closeQuestion = async (questionId: string) => {
    try {
      await updateDoc(doc(db, "trainings", trainingId, "qa", questionId), { active: false });
    } catch {
      toast.error("Failed to close question");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {questions.length === 0 && (
          <div className="text-center py-8">
            <HelpCircle className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-white/30 text-xs">No questions yet</p>
          </div>
        )}
        {questions.map((q) => {
          const isExpanded = expandedQ === q.id;
          return (
            <div key={q.id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <button
                onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                className="w-full flex items-start gap-2 p-3 text-left hover:bg-white/5 transition-colors"
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${q.active ? "bg-amber-500/20" : "bg-green-500/20"}`}>
                  {q.active ? <Clock className="w-3 h-3 text-amber-400" /> : <CheckCircle2 className="w-3 h-3 text-green-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium leading-relaxed">{q.question}</p>
                  <p className="text-[10px] text-white/40 mt-1">
                    by {q.createdByName} · {q.answers.length} answer{q.answers.length !== 1 ? "s" : ""}
                  </p>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-white/40 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="border-t border-white/10 p-3 space-y-2">
                  {q.answers.map((a) => (
                    <div key={a.id} className="bg-white/5 rounded-lg p-2">
                      <p className="text-[10px] font-semibold text-blue-300">{a.userName}</p>
                      <p className="text-xs text-white/80 mt-0.5">{a.answer}</p>
                    </div>
                  ))}

                  {q.active && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={answerText[q.id] || ""}
                        onChange={(e) => setAnswerText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="Your answer..."
                        className="bg-white/5 border-white/10 text-white text-xs h-8 placeholder:text-white/30"
                        onKeyDown={(e) => e.key === "Enter" && submitAnswer(q.id)}
                      />
                      <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => submitAnswer(q.id)}>
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  {isTrainer && q.active && (
                    <Button variant="ghost" size="sm" className="text-amber-400 text-xs w-full mt-1" onClick={() => closeQuestion(q.id)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Mark as Answered
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add question */}
      {(isTrainer || true) && (
        <div className="p-3 border-t border-white/10">
          <div className="flex gap-2">
            <Textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder={isTrainer ? "Post a question for trainees..." : "Ask a question..."}
              className="bg-white/5 border-white/10 text-white text-xs min-h-[36px] max-h-[80px] placeholder:text-white/30 resize-none"
              rows={1}
            />
            <Button size="icon" className="h-9 w-9 shrink-0 bg-amber-600 hover:bg-amber-700" onClick={addQuestion}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

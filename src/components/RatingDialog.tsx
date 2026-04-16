import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { submitRating } from "@/lib/job-ratings";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: string;
  jobTitle: string;
  workerId: string;
  workerName: string;
  uploaderId: string;
  uploaderName: string;
  onSubmitted?: () => void;
}

export function RatingDialog(p: Props) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await submitRating({
        jobId: p.jobId,
        jobTitle: p.jobTitle,
        workerId: p.workerId,
        workerName: p.workerName,
        uploaderId: p.uploaderId,
        uploaderName: p.uploaderName,
        rating,
        review,
      });
      toast.success("Thanks for your feedback!");
      p.onOpenChange(false);
      p.onSubmitted?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit rating");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate {p.workerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-3">
          <div className="flex justify-center gap-1 py-2">
            {[1, 2, 3, 4, 5].map((s) => {
              const filled = (hover || rating) >= s;
              return (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(s)}
                  className="transition-transform hover:scale-110"
                  aria-label={`${s} stars`}
                >
                  <Star className={`w-9 h-9 ${filled ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                </button>
              );
            })}
          </div>
          <Textarea
            rows={3}
            placeholder="Share your experience (optional)"
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Rating"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

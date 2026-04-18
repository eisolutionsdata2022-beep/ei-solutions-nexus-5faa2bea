import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { submitReview, getReviewByRetailer, getTrainingMeta } from "@/lib/training-reviews";
import { toast } from "sonner";

interface Props {
  open: boolean;
  trainingId: string;
  trainingTitle: string;
  onClose: () => void;
}

export function ReviewSubmitDialog({ open, trainingId, trainingTitle, onClose }: Props) {
  const { appUser } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);

  useEffect(() => {
    if (!open || !appUser) return;
    getReviewByRetailer(trainingId, appUser.uid).then((r) => {
      if (r) setAlreadySent(true);
    });
  }, [open, trainingId, appUser]);

  const handleSubmit = async () => {
    if (!appUser) return;
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setSubmitting(true);
    try {
      const meta = await getTrainingMeta(trainingId);
      await submitReview({
        trainingId,
        trainingTitle: meta?.title || trainingTitle,
        trainerId: meta?.trainerId || "",
        trainerName: meta?.trainerName || "Trainer",
        retailerId: appUser.uid,
        retailerName: appUser.name || appUser.email,
        rating,
        comments: comments.trim(),
      });
      toast.success("Thanks for your feedback!");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rate this Session</DialogTitle>
          <DialogDescription>
            How was <span className="font-semibold">{trainingTitle}</span>? Your feedback helps trainers improve.
          </DialogDescription>
        </DialogHeader>

        {alreadySent ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
              <Star className="w-7 h-7 text-emerald-500 fill-emerald-500" />
            </div>
            <p className="text-foreground font-medium">You've already reviewed this session.</p>
            <Button onClick={onClose} className="w-full">Close</Button>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-9 h-9 ${
                      (hover || rating) >= n
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {rating === 0 && "Tap a star to rate"}
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </p>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share what was helpful or what could be improved (optional)…"
              rows={4}
              maxLength={500}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Skip</Button>
              <Button onClick={handleSubmit} disabled={submitting || rating === 0} className="flex-1">
                {submitting ? "Submitting…" : "Submit Review"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

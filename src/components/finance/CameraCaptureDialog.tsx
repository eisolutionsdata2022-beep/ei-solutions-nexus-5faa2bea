/**
 * Camera capture dialog — opens device camera and returns a base64 JPEG dataURL.
 * Direct capture only; no file upload fallback (per requirement).
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Camera, RotateCcw, Check, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (dataUrl: string) => void;
  title?: string;
}

export function CameraCaptureDialog({ open, onOpenChange, onCapture, title = "Capture Photo" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");

  useEffect(() => {
    if (!open) {
      stop();
      setSnapshot(null);
      setError(null);
      return;
    }
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facing]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: any) {
      setError(e?.message || "Unable to access camera. Please grant permission.");
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function snap() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    setSnapshot(canvas.toDataURL("image/jpeg", 0.85));
  }

  function confirm() {
    if (snapshot) {
      onCapture(snapshot);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" /> {title}
          </DialogTitle>
          <DialogDescription>
            Photo will be captured directly from camera and saved to customer profile.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>{error}</div>
          </div>
        ) : (
          <div className="relative aspect-square rounded-md overflow-hidden bg-black">
            {snapshot ? (
              <img src={snapshot} alt="Captured" className="w-full h-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        <DialogFooter className="flex-row sm:justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFacing(facing === "user" ? "environment" : "user")}
            disabled={!!error || !!snapshot}
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Flip
          </Button>
          {snapshot ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSnapshot(null)}>
                Retake
              </Button>
              <Button size="sm" onClick={confirm}>
                <Check className="w-4 h-4 mr-1" /> Use Photo
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={snap} disabled={!!error}>
              <Camera className="w-4 h-4 mr-1" /> Capture
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

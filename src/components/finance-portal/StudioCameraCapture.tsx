/**
 * Camera capture — dark studio variant for the /finance subsite.
 * Opens device camera, takes a snapshot, returns base64 JPEG dataURL.
 */
import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Check, AlertTriangle } from "lucide-react";
import { StudioModal, StudioButton } from "./StudioShell";

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  title?: string;
}

export function StudioCameraCapture({
  open,
  onClose,
  onCapture,
  title = "Capture Photo",
}: Props) {
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
        video: {
          facingMode: facing,
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: any) {
      setError(
        e?.message ||
          "Unable to access camera. Please grant permission in your browser settings.",
      );
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
      onClose();
    }
  }

  return (
    <StudioModal open={open} onClose={onClose} title={title} width="max-w-md">
      <p className="mb-3 text-xs text-slate-400">
        Photo will be captured directly from your camera and stored in the customer profile.
      </p>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{error}</div>
        </div>
      ) : (
        <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black ring-1 ring-cyan-400/20">
          {snapshot ? (
            <img
              src={snapshot}
              alt="Captured"
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
          {!snapshot && !error && (
            <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-cyan-400/20" />
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-2">
        <StudioButton
          variant="secondary"
          onClick={() => setFacing(facing === "user" ? "environment" : "user")}
          disabled={!!error || !!snapshot}
        >
          <RotateCcw className="h-4 w-4" /> Flip
        </StudioButton>
        {snapshot ? (
          <div className="flex gap-2">
            <StudioButton variant="ghost" onClick={() => setSnapshot(null)}>
              Retake
            </StudioButton>
            <StudioButton onClick={confirm}>
              <Check className="h-4 w-4" /> Use Photo
            </StudioButton>
          </div>
        ) : (
          <StudioButton onClick={snap} disabled={!!error}>
            <Camera className="h-4 w-4" /> Capture
          </StudioButton>
        )}
      </div>
    </StudioModal>
  );
}

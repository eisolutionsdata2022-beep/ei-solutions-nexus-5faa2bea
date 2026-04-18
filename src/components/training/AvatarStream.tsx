import { useEffect, useRef } from "react";

export type AvatarType = "2d" | "rpm";

export interface AvatarOption {
  id: string;
  type: AvatarType;
  label: string;
  // for 2d: emoji or character key
  // for rpm: glb url
  src: string;
}

export const AVATAR_2D: AvatarOption[] = [
  { id: "pro-male", type: "2d", label: "Professional Male", src: "👨‍💼" },
  { id: "pro-female", type: "2d", label: "Professional Female", src: "👩‍💼" },
  { id: "teacher-m", type: "2d", label: "Teacher (M)", src: "👨‍🏫" },
  { id: "teacher-f", type: "2d", label: "Teacher (F)", src: "👩‍🏫" },
  { id: "scientist", type: "2d", label: "Scientist", src: "🧑‍🔬" },
  { id: "robot", type: "2d", label: "AI Robot", src: "🤖" },
  { id: "ninja", type: "2d", label: "Ninja", src: "🥷" },
  { id: "astronaut", type: "2d", label: "Astronaut", src: "🧑‍🚀" },
];

// Ready Player Me public demo avatar URLs (free tier — replace with custom RPM ids per user)
export const AVATAR_RPM: AvatarOption[] = [
  { id: "rpm-corp-m", type: "rpm", label: "Corporate Male (3D)", src: "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb" },
  { id: "rpm-corp-f", type: "rpm", label: "Corporate Female (3D)", src: "https://models.readyplayer.me/64bfa14e0e72c63d7c3934a0.glb" },
];

export const ALL_AVATARS = [...AVATAR_2D, ...AVATAR_RPM];

export function getAvatarById(id: string | undefined | null): AvatarOption | null {
  if (!id) return null;
  return ALL_AVATARS.find((a) => a.id === id) || null;
}

/**
 * Renders a 2D avatar onto a canvas with mouth-shape modulation tied to mic audio
 * amplitude. Returns a MediaStream from canvas.captureStream() so it can be sent
 * over WebRTC in place of the camera track.
 *
 * For RPM (3D) we display the glb in an iframe preview but still send the canvas
 * stream (the iframe can't be captured cross-origin). The 2D fallback art uses
 * the avatar's emoji art on a corporate gradient background — same source path
 * for both modes keeps WebRTC behavior consistent.
 */
interface Props {
  avatarId: string;
  audioStream: MediaStream | null;
  onCanvasStream: (stream: MediaStream) => void;
  width?: number;
  height?: number;
}

export function AvatarStream({ avatarId, audioStream, onCanvasStream, width = 640, height = 480 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const avatar = getAvatarById(avatarId) || AVATAR_2D[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // capture stream once
    const stream = canvas.captureStream(24);
    onCanvasStream(stream);

    // audio analyser for lip-sync
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AC();
        const source = audioCtx.createMediaStreamSource(audioStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;
      } catch (e) {
        console.warn("Avatar audio analyser failed", e);
      }
    }

    const data = analyserRef.current ? new Uint8Array(analyserRef.current.frequencyBinCount) : null;

    const draw = () => {
      // mouth opening 0..1
      let mouth = 0;
      if (analyserRef.current && data) {
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        mouth = Math.min(1, avg / 80);
      }

      // background — corporate digital studio gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(0.5, "#1e293b");
      grad.addColorStop(1, "#0c1a3a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // LED scanlines
      ctx.fillStyle = "rgba(59, 130, 246, 0.04)";
      for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);

      // glow ring
      const cx = width / 2;
      const cy = height / 2 - 20;
      const ringR = 150 + mouth * 12;
      const ringGrad = ctx.createRadialGradient(cx, cy, 80, cx, cy, ringR);
      ringGrad.addColorStop(0, "rgba(99,102,241,0.45)");
      ringGrad.addColorStop(1, "rgba(99,102,241,0)");
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.fill();

      // avatar emoji (2D) or 3D placeholder badge
      ctx.font = `${160 + mouth * 18}px system-ui, "Apple Color Emoji", "Segoe UI Emoji"`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const charSrc = avatar.type === "2d" ? avatar.src : "🧑‍💼";
      ctx.fillText(charSrc, cx, cy);

      // talking indicator bar
      if (mouth > 0.05) {
        ctx.fillStyle = "rgba(16,185,129,0.85)";
        const bw = 220 * mouth;
        ctx.fillRect(cx - bw / 2, height - 60, bw, 6);
      }

      // label strip
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, height - 36, width, 36);
      ctx.fillStyle = "#fff";
      ctx.font = "600 14px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`Avatar Mode · ${avatar.label}`, 16, height - 14);

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarId, audioStream]);

  return <canvas ref={canvasRef} width={width} height={height} className="hidden" />;
}

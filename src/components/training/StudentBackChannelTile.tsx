/**
 * Trainer-only viewer for an approved student's back-channel stream.
 * Subscribes to the student's media (mic + cam/screen) — invisible to other students.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createPeerConnection } from "@/lib/webrtc";
import {
  trainerSendOffer,
  trainerListenForAnswer,
  bcAddIce,
  onBcIce,
  clearTrainerSignaling,
  type BackChannel,
} from "@/lib/student-backchannel";
import { Mic, Video, MonitorUp, AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  trainingId: string;
  channel: BackChannel;
}

export function StudentBackChannelTile({ trainingId, channel }: Props) {
  const { appUser } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const unsubsRef = useRef<Array<() => void>>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "failed">("connecting");
  const [attempt, setAttempt] = useState(0);

  const teardown = useCallback(() => {
    unsubsRef.current.forEach((u) => { try { u(); } catch {} });
    unsubsRef.current = [];
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    remoteStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const connect = useCallback(async () => {
    if (!appUser) return;
    teardown();
    setStatus("connecting");
    try {
      await clearTrainerSignaling(trainingId, channel.id, appUser.uid);
      const pc = createPeerConnection();
      pcRef.current = pc;
      const remote = new MediaStream();
      remoteStreamRef.current = remote;
      if (videoRef.current) videoRef.current.srcObject = remote;
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? remoteStreamRef.current ?? remote;
        if (!stream.getTracks().some((t) => t.id === e.track.id)) stream.addTrack(e.track);
        if (videoRef.current) {
          if (videoRef.current.srcObject !== stream) videoRef.current.srcObject = stream;
          videoRef.current.play?.().catch(() => {});
        }
        setStatus("connected");
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setStatus("connected");
        else if (["failed", "closed"].includes(pc.connectionState)) setStatus("failed");
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) bcAddIce(trainingId, channel.id, appUser.uid, "caller", e.candidate.toJSON()).catch(() => {});
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await trainerSendOffer(trainingId, channel.id, appUser.uid, offer);

      const ansUnsub = trainerListenForAnswer(trainingId, channel.id, appUser.uid, async (ans) => {
        if (pcRef.current !== pc) return;
        if (pc.signalingState === "have-local-offer") {
          try { await pc.setRemoteDescription(new RTCSessionDescription(ans)); }
          catch (err) { console.warn("setRemoteDescription failed", err); }
        }
      });
      unsubsRef.current.push(ansUnsub);

      const iceUnsub = onBcIce(trainingId, channel.id, appUser.uid, "callee", (c) => {
        if (pcRef.current !== pc) return;
        pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      });
      unsubsRef.current.push(iceUnsub);
    } catch (err) {
      console.error("Trainer subscribe to student failed", err);
      setStatus("failed");
    }
  }, [appUser, trainingId, channel.id, teardown]);

  useEffect(() => {
    connect();
    return teardown;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId, channel.id, appUser?.uid]);

  const handleRetry = () => {
    setAttempt((a) => a + 1);
    void connect();
  };

  return (
    <div className="relative bg-gradient-to-br from-[#0c1830] to-[#1a2540] rounded-xl border border-emerald-500/30 overflow-hidden shadow-lg">
      <div className="aspect-video relative bg-black">
        <video ref={videoRef} autoPlay playsInline muted={false} className="w-full h-full object-contain" />
        {status === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mx-auto mb-1.5" />
              <p className="text-white/60 text-[11px]">Connecting to {channel.studentName}…</p>
            </div>
          </div>
        )}
        {status === "failed" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85">
            <div className="text-center">
              <AlertCircle className="w-7 h-7 text-red-300 mx-auto mb-2" />
              <p className="text-white text-xs mb-2">Connection failed</p>
              <button onClick={handleRetry} className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-3 py-1.5 rounded">
                <RefreshCw className="w-3 h-3" /> Retry {attempt > 0 && `(${attempt})`}
              </button>
            </div>
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <span className="bg-emerald-600 text-white text-[8px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 shadow">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> STUDENT
          </span>
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {channel.hasMic && <span className="bg-blue-500/80 p-1 rounded"><Mic className="w-2.5 h-2.5 text-white" /></span>}
          {channel.hasCam && <span className="bg-purple-500/80 p-1 rounded"><Video className="w-2.5 h-2.5 text-white" /></span>}
          {channel.hasScreen && <span className="bg-amber-500/80 p-1 rounded"><MonitorUp className="w-2.5 h-2.5 text-white" /></span>}
        </div>
        <div className="absolute bottom-2 left-2">
          <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded border border-white/10">
            🎤 {channel.studentName}
          </span>
        </div>
      </div>
    </div>
  );
}

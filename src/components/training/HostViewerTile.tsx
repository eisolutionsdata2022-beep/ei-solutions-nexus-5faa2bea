import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  createPeerConnection,
  viewerSendOffer,
  viewerListenForAnswer,
  addIceCandidate,
  onIceCandidates,
  type LiveHost,
} from "@/lib/webrtc";
import { Mic, MicOff, Sparkles, User2, Maximize2 } from "lucide-react";

interface Props {
  trainingId: string;
  host: LiveHost;
  onMaximize?: () => void;
}

/**
 * Subscribes to a single trainer host as a viewer (retailer or another trainer).
 * Establishes one RTCPeerConnection per host, receives the broadcast stream.
 */
export function HostViewerTile({ trainingId, host, onMaximize }: Props) {
  const { appUser } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!appUser) return;
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    const start = async () => {
      try {
        const pc = createPeerConnection();
        pcRef.current = pc;
        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });

        pc.ontrack = (e) => {
          if (videoRef.current && e.streams[0]) {
            videoRef.current.srcObject = e.streams[0];
          }
        };
        pc.onconnectionstatechange = () => {
          if (cancelled) return;
          if (pc.connectionState === "connected") setConnected(true);
          if (["disconnected", "failed", "closed"].includes(pc.connectionState)) setConnected(false);
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) addIceCandidate(trainingId, host.id, appUser.uid, "caller", e.candidate.toJSON());
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await viewerSendOffer(trainingId, host.id, appUser.uid, offer);

        const ansUnsub = viewerListenForAnswer(trainingId, host.id, appUser.uid, async (ans) => {
          if (pc.signalingState === "have-local-offer") {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(ans));
            } catch (err) { console.warn("setRemoteDescription failed", err); }
          }
        });
        unsubs.push(ansUnsub);
        const iceUnsub = onIceCandidates(trainingId, host.id, appUser.uid, "callee", (c) => {
          pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        });
        unsubs.push(iceUnsub);
      } catch (err) {
        console.error("Viewer connect failed", err);
      }
    };
    start();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, [trainingId, host.id, appUser]);

  return (
    <div className="relative bg-gradient-to-br from-[#0c1224] to-[#1a1a3a] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
      <div className="aspect-video relative bg-black">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        {!connected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-2 border-blue-400 border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-white/60 text-xs">Connecting to {host.name}…</p>
            </div>
          </div>
        )}
        {/* badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 shadow-md">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> LIVE
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${host.mode === "avatar" ? "bg-purple-500/30 text-purple-200 border border-purple-500/40" : "bg-blue-500/30 text-blue-200 border border-blue-500/40"}`}>
            {host.mode === "avatar" ? <><Sparkles className="w-2.5 h-2.5 inline mr-0.5" />Avatar</> : <><User2 className="w-2.5 h-2.5 inline mr-0.5" />Cam</>}
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {!host.micOn && <span className="bg-red-500/80 p-1 rounded"><MicOff className="w-2.5 h-2.5 text-white" /></span>}
          {onMaximize && (
            <button onClick={onMaximize} className="bg-black/50 hover:bg-black/70 p-1 rounded backdrop-blur-sm">
              <Maximize2 className="w-2.5 h-2.5 text-white" />
            </button>
          )}
        </div>
        <div className="absolute bottom-2.5 left-2.5">
          <span className="bg-black/65 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md border border-white/10 font-medium">
            🎓 {host.name}
          </span>
        </div>
      </div>
    </div>
  );
}

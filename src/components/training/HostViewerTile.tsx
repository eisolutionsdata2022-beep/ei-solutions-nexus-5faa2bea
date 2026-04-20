import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  createPeerConnection,
  viewerSendOffer,
  viewerListenForAnswer,
  addIceCandidate,
  onIceCandidates,
  clearViewerSignaling,
  type LiveHost,
} from "@/lib/webrtc";
import { logSessionQualitySample } from "@/lib/session-quality-logs";
import { Mic, MicOff, Sparkles, User2, Maximize2, RefreshCw, AlertCircle, SignalLow, SignalMedium, SignalHigh } from "lucide-react";

interface Props {
  trainingId: string;
  trainingTitle?: string;
  host: LiveHost;
  onMaximize?: () => void;
}

type Status = "connecting" | "connected" | "failed" | "timeout";
type Quality = "unknown" | "good" | "medium" | "poor";

const CONNECT_TIMEOUT_MS = 15_000;
const STATS_INTERVAL_MS = 3_000;

/**
 * Subscribes to a single trainer host as a viewer (retailer or another trainer).
 * - Cleans stale signaling docs before sending fresh offer
 * - 15s connection timeout with explicit Retry button
 * - Auto-reconnect on disconnected/failed state (one attempt before showing Retry)
 */
export function HostViewerTile({ trainingId, trainingTitle, host, onMaximize }: Props) {
  const { appUser } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const unsubsRef = useRef<Array<() => void>>([]);
  const timeoutRef = useRef<number | null>(null);
  const statsIntervalRef = useRef<number | null>(null);
  const lastStatsRef = useRef<{ packetsLost: number; packetsReceived: number; ts: number } | null>(null);
  const lastLoggedAtRef = useRef<number>(0);
  const lastLoggedQualityRef = useRef<Quality>("unknown");
  const autoRetriedRef = useRef(false);
  const [status, setStatus] = useState<Status>("connecting");
  const [errMsg, setErrMsg] = useState<string>("");
  const [attempt, setAttempt] = useState(0);
  const [quality, setQuality] = useState<Quality>("unknown");
  const [qualityDetails, setQualityDetails] = useState<{ rtt: number; jitter: number; loss: number } | null>(null);

  const teardown = useCallback(() => {
    unsubsRef.current.forEach((u) => { try { u(); } catch { /* noop */ } });
    unsubsRef.current = [];
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (statsIntervalRef.current) {
      window.clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    lastStatsRef.current = null;
    try { pcRef.current?.close(); } catch { /* noop */ }
    pcRef.current = null;
  }, []);

  const pollStats = useCallback(async (pc: RTCPeerConnection) => {
    try {
      const stats = await pc.getStats();
      let inboundVideo: any = null;
      let candidatePair: any = null;
      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.kind === "video") {
          inboundVideo = report;
        }
        if (report.type === "candidate-pair" && (report.nominated || report.selected) && report.state === "succeeded") {
          candidatePair = report;
        }
      });

      if (!inboundVideo) return;

      const now = inboundVideo.timestamp || Date.now();
      const packetsLost = inboundVideo.packetsLost || 0;
      const packetsReceived = inboundVideo.packetsReceived || 0;
      const jitter = (inboundVideo.jitter || 0) * 1000; // s → ms
      const rtt = candidatePair?.currentRoundTripTime ? candidatePair.currentRoundTripTime * 1000 : 0;

      // Compute loss % over the interval (delta) instead of cumulative
      let lossPct = 0;
      const prev = lastStatsRef.current;
      if (prev) {
        const dLost = packetsLost - prev.packetsLost;
        const dRecv = packetsReceived - prev.packetsReceived;
        const dTotal = dLost + dRecv;
        if (dTotal > 0) lossPct = (dLost / dTotal) * 100;
      }
      lastStatsRef.current = { packetsLost, packetsReceived, ts: now };

      // Score: good = low loss + low jitter + low rtt
      let score: Quality = "good";
      if (lossPct > 5 || jitter > 50 || rtt > 300) score = "poor";
      else if (lossPct > 2 || jitter > 30 || rtt > 150) score = "medium";

      setQuality(score);
      setQualityDetails({ rtt: Math.round(rtt), jitter: Math.round(jitter), loss: Math.round(lossPct * 10) / 10 });

      // Log to Firestore: on quality change, or every 30s as a heartbeat.
      if (appUser) {
        const nowMs = Date.now();
        const changed = score !== lastLoggedQualityRef.current;
        const heartbeatDue = nowMs - lastLoggedAtRef.current >= 30_000;
        if (changed || heartbeatDue) {
          lastLoggedAtRef.current = nowMs;
          lastLoggedQualityRef.current = score;
          logSessionQualitySample({
            trainingId,
            trainingTitle,
            hostId: host.id,
            hostName: host.name,
            viewerId: appUser.uid,
            viewerName: appUser.name || appUser.email,
            viewerRole: appUser.role,
            rtt: Math.round(rtt),
            jitter: Math.round(jitter),
            loss: Math.round(lossPct * 10) / 10,
            quality: score,
            reason: changed ? "change" : "interval",
          });
        }
      }
    } catch {
      /* getStats can fail mid-teardown */
    }
  }, []);

  const connect = useCallback(async () => {
    if (!appUser) return;
    teardown();
    setStatus("connecting");
    setErrMsg("");

    try {
      // Wipe last session's offer/answer/ICE for this viewer↔host pair so the
      // viewer's listener doesn't immediately resolve with a stale answer.
      await clearViewerSignaling(trainingId, host.id, appUser.uid);

      const pc = createPeerConnection();
      pcRef.current = pc;
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      pc.ontrack = (e) => {
        if (videoRef.current && e.streams[0]) {
          videoRef.current.srcObject = e.streams[0];
          videoRef.current.play?.().catch(() => { /* autoplay block handled by muted */ });
        }
      };

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "connected") {
          setStatus("connected");
          if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (statsIntervalRef.current) window.clearInterval(statsIntervalRef.current);
          statsIntervalRef.current = window.setInterval(() => pollStats(pc), STATS_INTERVAL_MS);
        } else if (s === "failed") {
          // one auto-retry, then surface a Retry button
          if (!autoRetriedRef.current) {
            autoRetriedRef.current = true;
            setAttempt((a) => a + 1);
            setTimeout(() => connect(), 800);
          } else {
            setStatus("failed");
            setErrMsg("Connection failed. Please retry.");
          }
        } else if (s === "disconnected") {
          // Brief network blip — give it 5s to recover, else auto-reconnect once
          window.setTimeout(() => {
            if (pcRef.current === pc && pc.connectionState === "disconnected") {
              if (!autoRetriedRef.current) {
                autoRetriedRef.current = true;
                connect();
              } else {
                setStatus("failed");
                setErrMsg("Connection lost.");
              }
            }
          }, 5_000);
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          addIceCandidate(trainingId, host.id, appUser.uid, "caller", e.candidate.toJSON()).catch(() => {});
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await viewerSendOffer(trainingId, host.id, appUser.uid, offer);

      // 15s timeout — if no media flowing yet, mark as timeout
      timeoutRef.current = window.setTimeout(() => {
        if (pcRef.current === pc && pc.connectionState !== "connected") {
          setStatus("timeout");
          setErrMsg("Taking too long to connect. Please retry.");
        }
      }, CONNECT_TIMEOUT_MS);

      const ansUnsub = viewerListenForAnswer(trainingId, host.id, appUser.uid, async (ans) => {
        if (pc.signalingState === "have-local-offer") {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(ans));
          } catch (err) {
            console.warn("setRemoteDescription failed", err);
          }
        }
      });
      unsubsRef.current.push(ansUnsub);

      const iceUnsub = onIceCandidates(trainingId, host.id, appUser.uid, "callee", (c) => {
        pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      });
      unsubsRef.current.push(iceUnsub);
    } catch (err: any) {
      console.error("Viewer connect failed", err);
      setStatus("failed");
      setErrMsg(err?.message || "Failed to connect to trainer.");
    }
  }, [appUser, trainingId, host.id, teardown]);

  const handleRetry = () => {
    autoRetriedRef.current = false;
    setAttempt((a) => a + 1);
    connect();
  };

  useEffect(() => {
    autoRetriedRef.current = false;
    connect();
    return teardown;
    // host.id changes when trainer ends/restarts; reconnect cleanly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId, host.id, appUser?.uid]);

  return (
    <div className="relative bg-gradient-to-br from-[#0c1224] to-[#1a1a3a] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
      <div className="aspect-video relative bg-black">
        <video ref={videoRef} autoPlay playsInline muted={false} className="w-full h-full object-cover" />

        {status === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-2 border-blue-400 border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-white/70 text-xs font-medium">Connecting to {host.name}…</p>
              {attempt > 0 && <p className="text-white/40 text-[10px] mt-1">Attempt {attempt + 1}</p>}
            </div>
          </div>
        )}

        {(status === "failed" || status === "timeout") && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 px-4">
            <div className="text-center max-w-[260px]">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-red-300" />
              </div>
              <p className="text-white text-sm font-semibold mb-1">
                {status === "timeout" ? "Connection timeout" : "Connection failed"}
              </p>
              <p className="text-white/50 text-[11px] mb-3 leading-relaxed">{errMsg}</p>
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
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
          {status === "connected" && quality !== "unknown" && (() => {
            const cfg = {
              good: { Icon: SignalHigh, cls: "bg-emerald-500/80 border-emerald-300/50", label: "Good" },
              medium: { Icon: SignalMedium, cls: "bg-amber-500/80 border-amber-300/50", label: "Fair" },
              poor: { Icon: SignalLow, cls: "bg-red-500/80 border-red-300/50", label: "Poor" },
            }[quality];
            const tip = qualityDetails
              ? `${cfg.label} · ${qualityDetails.rtt}ms RTT · ${qualityDetails.jitter}ms jitter · ${qualityDetails.loss}% loss`
              : cfg.label;
            return (
              <span
                title={tip}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-white text-[9px] font-semibold ${cfg.cls}`}
              >
                <cfg.Icon className="w-2.5 h-2.5" />
                {cfg.label}
              </span>
            );
          })()}
          {!host.micOn && <span className="bg-red-500/80 p-1 rounded"><MicOff className="w-2.5 h-2.5 text-white" /></span>}
          {status === "connected" && host.micOn && <span className="bg-emerald-500/80 p-1 rounded"><Mic className="w-2.5 h-2.5 text-white" /></span>}
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

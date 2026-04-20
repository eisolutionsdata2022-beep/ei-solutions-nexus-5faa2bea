import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  createPeerConnection,
  goLive,
  endLive,
  updateHost,
  hostListenForOffers,
  hostSendAnswer,
  addIceCandidate,
  onIceCandidates,
  type LiveMode,
} from "@/lib/webrtc";
import { Button } from "@/components/ui/button";
import { AvatarStream, getAvatarById, AVATAR_2D, type AvatarOption } from "./AvatarStream";
import { AvatarPickerDialog } from "./AvatarPickerDialog";
import { Video, VideoOff, Mic, MicOff, User2, Sparkles, Radio, Square, Maximize2, MonitorUp, MonitorOff } from "lucide-react";
import { toast } from "sonner";

interface Props {
  trainingId: string;
  isLive: boolean;
  onLiveChange: (live: boolean) => void;
  onMaximize?: () => void;
}

/**
 * The trainer's own broadcasting tile. Manages mic, camera/avatar mode,
 * publishes mediastream to all incoming viewer offers under this host's branch.
 */
export function TrainerHostTile({ trainingId, isLive, onLiveChange, onMaximize }: Props) {
  const { appUser } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const audioOnlyStreamRef = useRef<MediaStream | null>(null);
  const avatarStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const broadcastStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const unsubsRef = useRef<Array<() => void>>([]);

  // audio mixing (mic + system audio when screen-sharing)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const screenAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const screenGainRef = useRef<GainNode | null>(null);
  const mixedAudioTrackRef = useRef<MediaStreamTrack | null>(null);

  const [mode, setMode] = useState<LiveMode>("camera");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [avatarId, setAvatarId] = useState<string>(AVATAR_2D[0].id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [screenSharing, setScreenSharing] = useState(false);
  const [micVolume, setMicVolume] = useState(1); // 0..1.5
  const [systemVolume, setSystemVolume] = useState(1); // 0..1.5

  // replace video track on all existing peer connections
  const replaceVideoOnPeers = (vid: MediaStreamTrack | null) => {
    peersRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender && vid) sender.replaceTrack(vid).catch(() => {});
    });
  };

  // replace audio track on all existing peer connections
  const replaceAudioOnPeers = (aud: MediaStreamTrack | null) => {
    peersRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
      if (sender && aud) sender.replaceTrack(aud).catch(() => {});
    });
  };

  // ensure a single AudioContext + destination for mixing
  const ensureMixGraph = (): MediaStreamAudioDestinationNode => {
    if (!audioCtxRef.current) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      audioCtxRef.current = new Ctx();
    }
    if (!audioDestRef.current) {
      audioDestRef.current = audioCtxRef.current.createMediaStreamDestination();
    }
    return audioDestRef.current;
  };

  // (re)connect mic → micGain → destination
  const connectMicToMix = () => {
    const cam = cameraStreamRef.current;
    if (!cam) return;
    const dest = ensureMixGraph();
    micSourceRef.current?.disconnect();
    micGainRef.current?.disconnect();
    const micStream = new MediaStream(cam.getAudioTracks());
    if (micStream.getAudioTracks().length === 0) return;
    micSourceRef.current = audioCtxRef.current!.createMediaStreamSource(micStream);
    micGainRef.current = audioCtxRef.current!.createGain();
    micGainRef.current.gain.value = micOn ? micVolume : 0;
    micSourceRef.current.connect(micGainRef.current).connect(dest);
    mixedAudioTrackRef.current = dest.stream.getAudioTracks()[0] || null;
  };

  // connect screen audio → screenGain → destination
  const connectScreenAudioToMix = (screenStream: MediaStream) => {
    if (screenStream.getAudioTracks().length === 0) return;
    const dest = ensureMixGraph();
    screenAudioSourceRef.current?.disconnect();
    screenGainRef.current?.disconnect();
    const sa = new MediaStream(screenStream.getAudioTracks());
    screenAudioSourceRef.current = audioCtxRef.current!.createMediaStreamSource(sa);
    screenGainRef.current = audioCtxRef.current!.createGain();
    screenGainRef.current.gain.value = systemVolume;
    screenAudioSourceRef.current.connect(screenGainRef.current).connect(dest);
    mixedAudioTrackRef.current = dest.stream.getAudioTracks()[0] || null;
  };

  const disconnectScreenAudio = () => {
    screenAudioSourceRef.current?.disconnect();
    screenAudioSourceRef.current = null;
    screenGainRef.current?.disconnect();
    screenGainRef.current = null;
  };

  // live-update gain when sliders move
  useEffect(() => {
    if (micGainRef.current) micGainRef.current.gain.value = micOn ? micVolume : 0;
  }, [micVolume, micOn]);
  useEffect(() => {
    if (screenGainRef.current) screenGainRef.current.gain.value = systemVolume;
  }, [systemVolume]);

  // build a single broadcast stream (audio + video track that we swap)
  const ensureBroadcastStream = (videoTrack: MediaStreamTrack | null): MediaStream => {
    if (!broadcastStreamRef.current) broadcastStreamRef.current = new MediaStream();
    const bs = broadcastStreamRef.current;
    // remove old video tracks
    bs.getVideoTracks().forEach((t) => bs.removeTrack(t));
    if (videoTrack) bs.addTrack(videoTrack);
    // ensure audio — prefer mixed track (mic + system audio), fall back to raw mic
    bs.getAudioTracks().forEach((t) => bs.removeTrack(t));
    const mixed = mixedAudioTrackRef.current;
    if (mixed) {
      bs.addTrack(mixed);
    } else if (cameraStreamRef.current) {
      const at = cameraStreamRef.current.getAudioTracks()[0];
      if (at) bs.addTrack(at);
    }
    return bs;
  };

  // start camera (gets audio + video). Audio reused across modes.
  const startCamera = async () => {
    if (cameraStreamRef.current) return cameraStreamRef.current;
    if (!window.isSecureContext) {
      throw new Error("Camera/mic require HTTPS. Open the site over https:// to go live.");
    }
    // Pre-check permission state for a clearer error
    try {
      // @ts-expect-error - microphone is a valid PermissionName in Chromium
      const micPerm = await navigator.permissions?.query?.({ name: "microphone" });
      if (micPerm?.state === "denied") {
        throw new Error("Microphone is blocked. Please allow it in browser site settings.");
      }
    } catch (e: any) {
      if (e?.message?.includes("blocked")) throw e;
      // Safari / older browsers skip pre-check
    }
    const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    cameraStreamRef.current = s;
    connectMicToMix();
    return s;
  };

  // ============ GO LIVE ============
  const handleGoLive = async () => {
    if (!appUser) return;
    try {
      await startCamera();
      const cam = cameraStreamRef.current!;
      if (videoRef.current) videoRef.current.srcObject = cam;
      const vid = cam.getVideoTracks()[0];
      const stream = ensureBroadcastStream(mode === "camera" ? vid : null);

      await goLive(trainingId, appUser.uid, appUser.name || appUser.email, mode, mode === "avatar" ? { type: getAvatarById(avatarId)?.type || "2d", id: avatarId } : undefined);

      // listen for incoming viewer offers under this host
      const unsub = hostListenForOffers(trainingId, appUser.uid, async (viewerId, offer) => {
        // Returning viewer (refresh / retry) — close stale peer first so a
        // fresh setRemoteDescription/createAnswer cycle succeeds.
        const existing = peersRef.current.get(viewerId);
        if (existing) {
          try { existing.close(); } catch { /* noop */ }
          peersRef.current.delete(viewerId);
        }
        const pc = createPeerConnection();
        peersRef.current.set(viewerId, pc);
        setViewerCount(peersRef.current.size);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        pc.onicecandidate = (e) => {
          if (e.candidate) addIceCandidate(trainingId, appUser.uid, viewerId, "callee", e.candidate.toJSON()).catch(() => {});
        };
        pc.onconnectionstatechange = () => {
          if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
            try { pc.close(); } catch { /* noop */ }
            peersRef.current.delete(viewerId);
            setViewerCount(peersRef.current.size);
          }
        };
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await hostSendAnswer(trainingId, appUser.uid, viewerId, answer);
          const iceUnsub = onIceCandidates(trainingId, appUser.uid, viewerId, "caller", (c) => {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          });
          unsubsRef.current.push(iceUnsub);
        } catch (err) {
          console.error("Host answer failed", err);
        }
      });
      unsubsRef.current.push(unsub);

      onLiveChange(true);
      toast.success("You are live! 🔴");
    } catch (err: any) {
      console.error(err);
      const name = err?.name;
      let msg = err?.message || "Failed to go live";
      if (name === "NotAllowedError") msg = "Camera/microphone permission denied. Allow access and retry.";
      else if (name === "NotFoundError") msg = "No camera or microphone found on this device.";
      else if (name === "NotReadableError") msg = "Camera/mic in use by another app. Close it and retry.";
      toast.error(msg);
    }
  };

  // ============ END LIVE ============
  const handleEndLive = async () => {
    if (!appUser) return;
    unsubsRef.current.forEach((u) => u());
    unsubsRef.current = [];
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    setViewerCount(0);
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    avatarStreamRef.current?.getTracks().forEach((t) => t.stop());
    avatarStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenSharing(false);
    broadcastStreamRef.current?.getTracks().forEach((t) => t.stop());
    broadcastStreamRef.current = null;
    // tear down audio mix graph
    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
    micGainRef.current?.disconnect();
    micGainRef.current = null;
    screenAudioSourceRef.current?.disconnect();
    screenAudioSourceRef.current = null;
    screenGainRef.current?.disconnect();
    screenGainRef.current = null;
    mixedAudioTrackRef.current = null;
    audioDestRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    try { await endLive(trainingId, appUser.uid); } catch {}
    onLiveChange(false);
    toast.info("Live ended");
  };

  // unmount cleanup
  useEffect(() => {
    return () => {
      if (isLive && appUser) {
        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();
        unsubsRef.current.forEach((u) => u());
        cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
        broadcastStreamRef.current?.getTracks().forEach((t) => t.stop());
        endLive(trainingId, appUser.uid).catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // toggle mic
  const toggleMic = async () => {
    const s = cameraStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    const next = !micOn;
    setMicOn(next);
    if (isLive && appUser) await updateHost(trainingId, appUser.uid, { micOn: next });
  };

  // toggle camera (only relevant in camera mode)
  const toggleCamera = async () => {
    if (mode !== "camera") return;
    const s = cameraStreamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    const next = !cameraOn;
    setCameraOn(next);
    if (isLive && appUser) await updateHost(trainingId, appUser.uid, { cameraOn: next });
  };

  // switch mode camera ↔ avatar
  const switchToAvatar = async () => {
    if (!cameraStreamRef.current) await startCamera();
    setMode("avatar");
    if (isLive && appUser) {
      await updateHost(trainingId, appUser.uid, { mode: "avatar", avatarType: getAvatarById(avatarId)?.type || "2d", avatarId });
    }
  };
  const switchToCamera = async () => {
    setMode("camera");
    const cam = cameraStreamRef.current;
    if (cam && isLive && !screenSharing) {
      const vid = cam.getVideoTracks()[0];
      ensureBroadcastStream(vid);
      replaceVideoOnPeers(vid);
      if (videoRef.current) videoRef.current.srcObject = cam;
    }
    if (isLive && appUser) await updateHost(trainingId, appUser.uid, { mode: "camera", cameraOn: true });
  };

  // when avatar canvas stream is ready, swap track on peers
  const handleAvatarStream = (s: MediaStream) => {
    avatarStreamRef.current = s;
    if (mode !== "avatar" || screenSharing) return;
    const vid = s.getVideoTracks()[0];
    const stream = ensureBroadcastStream(vid);
    replaceVideoOnPeers(vid);
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  // ============ SCREEN SHARE ============
  const startScreenShare = async () => {
    if (!isLive || !appUser) {
      toast.error("Start Live first");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        // request system/tab audio — browser may ignore (e.g. window source) but with no error
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as MediaTrackConstraints,
      });
      screenStreamRef.current = s;
      const vid = s.getVideoTracks()[0];
      // auto-stop when user ends share via browser UI
      vid.onended = () => { void stopScreenShare(); };

      // mix system audio in if the browser actually delivered an audio track
      const hasSysAudio = s.getAudioTracks().length > 0;
      if (hasSysAudio) {
        connectMicToMix(); // make sure mic is in the graph
        connectScreenAudioToMix(s);
        // swap the mixed track onto every peer's audio sender
        if (mixedAudioTrackRef.current) replaceAudioOnPeers(mixedAudioTrackRef.current);
        // auto-cleanup if user stops only the audio share
        s.getAudioTracks()[0].onended = () => disconnectScreenAudio();
      }

      const stream = ensureBroadcastStream(vid);
      replaceVideoOnPeers(vid);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setScreenSharing(true);
      await updateHost(trainingId, appUser.uid, { mode: "camera", cameraOn: true });
      toast.success(hasSysAudio ? "Screen + system audio sharing started" : "Screen sharing started (no system audio)");
    } catch (err: any) {
      if (err?.name !== "NotAllowedError") {
        console.error(err);
        toast.error(err?.message || "Failed to share screen");
      }
    }
  };

  const stopScreenShare = async () => {
    const s = screenStreamRef.current;
    if (s) s.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenSharing(false);
    // unhook system audio from the mix; mic-only continues
    disconnectScreenAudio();
    // restore previous source (avatar canvas or camera)
    let vid: MediaStreamTrack | null = null;
    if (mode === "avatar" && avatarStreamRef.current) {
      vid = avatarStreamRef.current.getVideoTracks()[0] || null;
    } else if (cameraStreamRef.current) {
      vid = cameraStreamRef.current.getVideoTracks()[0] || null;
    }
    const stream = ensureBroadcastStream(vid);
    replaceVideoOnPeers(vid);
    if (videoRef.current) {
      videoRef.current.srcObject = mode === "camera" ? cameraStreamRef.current : stream;
    }
    toast.info("Screen sharing stopped");
  };

  const onPickAvatar = async (a: AvatarOption) => {
    setAvatarId(a.id);
    setPickerOpen(false);
    if (isLive && appUser && mode === "avatar") {
      await updateHost(trainingId, appUser.uid, { avatarType: a.type, avatarId: a.id });
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-[#0c1224] to-[#1a1a3a] rounded-2xl border border-blue-500/20 overflow-hidden shadow-2xl shadow-blue-500/10">
      {/* preview */}
      <div className="aspect-video relative bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        {mode === "camera" && !cameraOn && isLive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2 text-3xl font-bold text-white/60">
                {appUser?.name?.[0]?.toUpperCase() || "T"}
              </div>
              <p className="text-white/40 text-xs">Camera Off</p>
            </div>
          </div>
        )}
        {!isLive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0c1224]/90 to-[#1a1a3a]/90">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
                <Radio className="w-7 h-7 text-blue-400" />
              </div>
              <p className="text-white/70 text-sm font-medium">Ready to broadcast</p>
            </div>
          </div>
        )}

        {/* badges */}
        {isLive && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="bg-red-600 text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1 font-bold shadow-lg shadow-red-600/40">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
            <span className={`text-[10px] px-2 py-1 rounded-md font-medium ${mode === "avatar" ? "bg-purple-500/30 text-purple-200 border border-purple-500/40" : "bg-blue-500/30 text-blue-200 border border-blue-500/40"}`}>
              {mode === "avatar" ? <><Sparkles className="w-3 h-3 inline mr-1" />Avatar</> : <><User2 className="w-3 h-3 inline mr-1" />Camera</>}
            </span>
          </div>
        )}

        {isLive && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {!micOn && <span className="bg-red-500/80 p-1.5 rounded-md"><MicOff className="w-3 h-3 text-white" /></span>}
            {onMaximize && (
              <button onClick={onMaximize} className="bg-black/50 hover:bg-black/70 p-1.5 rounded-md backdrop-blur-sm">
                <Maximize2 className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        )}

        {isLive && (
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <span className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg border border-white/10">
              You · {appUser?.name || "Trainer"}
            </span>
            <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-lg border border-white/10">
              👀 {viewerCount} watching
            </span>
          </div>
        )}
      </div>

      {/* hidden avatar canvas (always mounted when in avatar mode) */}
      {mode === "avatar" && cameraStreamRef.current && (
        <AvatarStream
          avatarId={avatarId}
          audioStream={cameraStreamRef.current}
          onCanvasStream={handleAvatarStream}
        />
      )}

      {/* control bar */}
      <div className="px-3 py-2.5 bg-[#0a0f1f] border-t border-white/5 flex items-center gap-1.5 flex-wrap">
        {!isLive ? (
          <Button onClick={handleGoLive} size="sm" className="bg-red-600 hover:bg-red-700 text-white font-semibold h-8 text-xs">
            <Radio className="w-3.5 h-3.5 mr-1" /> Start Live
          </Button>
        ) : (
          <Button onClick={handleEndLive} size="sm" variant="destructive" className="h-8 text-xs">
            <Square className="w-3.5 h-3.5 mr-1" /> End Live
          </Button>
        )}
        <button
          onClick={toggleMic}
          disabled={!isLive}
          className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-40 ${
            micOn ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-red-500/20 border-red-500/40 text-red-300"
          }`}
          title={micOn ? "Mute" : "Unmute"}
        >
          {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={toggleCamera}
          disabled={!isLive || mode !== "camera"}
          className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-40 ${
            cameraOn ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-red-500/20 border-red-500/40 text-red-300"
          }`}
          title="Toggle camera"
        >
          {cameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
        </button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button
          onClick={mode === "camera" ? switchToAvatar : switchToCamera}
          className={`h-8 px-2.5 rounded-lg flex items-center gap-1 border text-[11px] font-medium transition-colors ${
            mode === "avatar"
              ? "bg-purple-500/20 border-purple-500/40 text-purple-200 hover:bg-purple-500/30"
              : "bg-blue-500/20 border-blue-500/40 text-blue-200 hover:bg-blue-500/30"
          }`}
        >
          {mode === "avatar" ? <><User2 className="w-3.5 h-3.5" /> Use Camera</> : <><Sparkles className="w-3.5 h-3.5" /> Use Avatar</>}
        </button>
        <button
          onClick={() => setPickerOpen(true)}
          className="h-8 px-2.5 rounded-lg flex items-center gap-1 border border-white/10 bg-white/5 hover:bg-white/10 text-white text-[11px]"
        >
          Pick Avatar
        </button>
        <button
          onClick={screenSharing ? stopScreenShare : startScreenShare}
          disabled={!isLive}
          className={`h-8 px-2.5 rounded-lg flex items-center gap-1 border text-[11px] font-medium transition-colors disabled:opacity-40 ${
            screenSharing
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          }`}
          title={screenSharing ? "Stop sharing" : "Share screen"}
        >
          {screenSharing ? <><MonitorOff className="w-3.5 h-3.5" /> Stop Share</> : <><MonitorUp className="w-3.5 h-3.5" /> Share Screen</>}
        </button>

        {/* audio mix sliders */}
        <div className="flex items-center gap-2 ml-1 px-2 h-8 rounded-lg border border-white/10 bg-white/5">
          <label className="flex items-center gap-1.5 text-[10px] text-white/70" title="Microphone volume">
            <Mic className="w-3 h-3" />
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={micVolume}
              onChange={(e) => setMicVolume(parseFloat(e.target.value))}
              disabled={!isLive}
              className="w-16 accent-blue-400 disabled:opacity-40"
            />
            <span className="w-7 text-right tabular-nums">{Math.round(micVolume * 100)}%</span>
          </label>
          <div className="w-px h-4 bg-white/10" />
          <label
            className={`flex items-center gap-1.5 text-[10px] ${screenSharing ? "text-white/70" : "text-white/30"}`}
            title={screenSharing ? "System audio volume" : "Start screen share to enable"}
          >
            <MonitorUp className="w-3 h-3" />
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={systemVolume}
              onChange={(e) => setSystemVolume(parseFloat(e.target.value))}
              disabled={!screenSharing}
              className="w-16 accent-emerald-400 disabled:opacity-40"
            />
            <span className="w-7 text-right tabular-nums">{Math.round(systemVolume * 100)}%</span>
          </label>
        </div>
      </div>

      <AvatarPickerDialog
        open={pickerOpen}
        currentId={avatarId}
        onPick={onPickAvatar}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

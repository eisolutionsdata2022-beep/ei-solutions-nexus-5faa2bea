import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  createPeerConnection,
  createRoom,
  closeRoom,
  isRoomActive,
  addParticipant,
  removeParticipant,
  onParticipants,
  storeOffer,
  storeAnswer,
  onAnswer,
  onOffer,
  addIceCandidate,
  onIceCandidates,
  type RoomParticipant,
} from "@/lib/webrtc";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { TrainingChat } from "@/components/training/TrainingChat";
import { TrainingQA } from "@/components/training/TrainingQA";
import { TrainingAIBot } from "@/components/training/TrainingAIBot";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  MessageCircle,
  HelpCircle,
  Bot,
  Users,
  LayoutGrid,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface VideoRoomProps {
  trainingId: string;
  trainingTitle: string;
  role: "trainer" | "retailer";
  onLeave: () => void;
}

type SidebarTab = "chat" | "qa" | "bot" | "participants" | null;

export function VideoRoom({ trainingId, trainingTitle, role, onLeave }: VideoRoomProps) {
  const { appUser } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [cameraOn, setCameraOn] = useState(role === "trainer");
  const [micOn, setMicOn] = useState(role === "trainer");
  const [screenSharing, setScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [connected, setConnected] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(null);
  const [gridView, setGridView] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const unsubsRef = useRef<Array<() => void>>([]);

  const isTrainer = role === "trainer";

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const cleanup = useCallback(() => {
    unsubsRef.current.forEach((u) => u());
    unsubsRef.current = [];
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  // Participants listener
  useEffect(() => {
    const unsub = onParticipants(trainingId, setParticipants);
    unsubsRef.current.push(unsub);
    return () => unsub();
  }, [trainingId]);

  // Initialize WebRTC
  useEffect(() => {
    if (!appUser) return;
    const init = async () => {
      try {
        if (isTrainer) {
          await createRoom(trainingId, appUser.uid, appUser.name || appUser.email);
          await addParticipant(trainingId, appUser.uid, appUser.name || appUser.email, "trainer");

          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;

          const unsub = onParticipants(trainingId, async (parts) => {
            const retailers = parts.filter((p) => p.role === "retailer");
            for (const retailer of retailers) {
              if (pcRef.current) continue;
              const offerUnsub = onOffer(trainingId, retailer.id, async (offer) => {
                const pc = createPeerConnection();
                pcRef.current = pc;
                stream.getTracks().forEach((track) => pc.addTrack(track, stream));
                pc.onicecandidate = (e) => {
                  if (e.candidate) addIceCandidate(trainingId, retailer.id, "caller", e.candidate.toJSON());
                };
                pc.onconnectionstatechange = () => {
                  if (pc.connectionState === "connected") setConnected(true);
                  if (pc.connectionState === "disconnected" || pc.connectionState === "failed") setConnected(false);
                };
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await storeAnswer(trainingId, retailer.id, answer);
                const iceUnsub = onIceCandidates(trainingId, retailer.id, "callee", (candidate) => {
                  pc.addIceCandidate(new RTCIceCandidate(candidate));
                });
                unsubsRef.current.push(iceUnsub);
              });
              unsubsRef.current.push(offerUnsub);
            }
          });
          unsubsRef.current.push(unsub);
          setConnected(true);
        } else {
          const active = await isRoomActive(trainingId);
          if (!active) {
            toast.error("Live class has not started yet");
            onLeave();
            return;
          }
          await addParticipant(trainingId, appUser.uid, appUser.name || appUser.email, "retailer");
          const pc = createPeerConnection();
          pcRef.current = pc;
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
            stream.getAudioTracks().forEach((t) => (t.enabled = false));
          } catch { /* no mic is fine */ }
          pc.ontrack = (e) => {
            if (remoteVideoRef.current && e.streams[0]) remoteVideoRef.current.srcObject = e.streams[0];
          };
          pc.onicecandidate = (e) => {
            if (e.candidate) addIceCandidate(trainingId, appUser.uid, "callee", e.candidate.toJSON());
          };
          pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") setConnected(true);
            if (pc.connectionState === "disconnected" || pc.connectionState === "failed") setConnected(false);
          };
          pc.addTransceiver("video", { direction: "recvonly" });
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await storeOffer(trainingId, appUser.uid, offer);
          const answerUnsub = onAnswer(trainingId, appUser.uid, async (answer) => {
            if (pc.signalingState === "have-local-offer") await pc.setRemoteDescription(new RTCSessionDescription(answer));
          });
          unsubsRef.current.push(answerUnsub);
          const iceUnsub = onIceCandidates(trainingId, appUser.uid, "caller", (candidate) => {
            pc.addIceCandidate(new RTCIceCandidate(candidate));
          });
          unsubsRef.current.push(iceUnsub);
          setConnected(true);
        }
      } catch (err) {
        console.error("WebRTC init error:", err);
        toast.error("Failed to initialize video call");
      }
    };
    init();
    return () => {
      if (appUser) {
        removeParticipant(trainingId, appUser.uid);
        if (isTrainer) closeRoom(trainingId);
      }
      cleanup();
    };
  }, [appUser, trainingId, isTrainer, cleanup, onLeave]);

  const toggleCamera = async () => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks.forEach((t) => (t.enabled = !t.enabled));
      setCameraOn((prev) => !prev);
    }
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn((prev) => !prev);
  };

  const toggleScreenShare = async () => {
    if (!isTrainer || !pcRef.current) return;
    try {
      if (!screenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);
        screenTrack.onended = () => {
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          if (camTrack && sender) sender.replaceTrack(camTrack);
          setScreenSharing(false);
        };
        setScreenSharing(true);
      } else {
        const camTrack = localStreamRef.current?.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (camTrack && sender) await sender.replaceTrack(camTrack);
        setScreenSharing(false);
      }
    } catch (err) {
      console.error("Screen share error:", err);
    }
  };

  const handleLeave = async () => {
    if (appUser) {
      await removeParticipant(trainingId, appUser.uid);
      if (isTrainer) await closeRoom(trainingId);
    }
    cleanup();
    onLeave();
  };

  const toggleSidebar = (tab: SidebarTab) => {
    setSidebarTab((prev) => (prev === tab ? null : tab));
  };

  const handleEscalateToTrainer = async (question: string) => {
    if (!appUser) return;
    try {
      await addDoc(collection(db, "trainings", trainingId, "chat"), {
        userId: appUser.uid,
        userName: appUser.name || appUser.email,
        message: `🤖 [Escalated from AI Bot] ${question}`,
        createdAt: new Date().toISOString(),
      });
      setSidebarTab("chat");
    } catch {
      toast.error("Failed to escalate");
    }
  };

  const sidebarTabLabels: Record<string, string> = {
    chat: "Live Chat",
    qa: "Q&A",
    bot: "AI Assistant",
    participants: "Participants",
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0c1d] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#13132a] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-red-500"}`} />
          <h2 className="text-white font-semibold text-sm truncate max-w-[300px]">{trainingTitle}</h2>
          {screenSharing && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-medium">
              Screen Sharing
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/50 text-xs font-mono">{formatTime(elapsed)}</span>
          <span className="text-white/50 text-xs flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {participants.length}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isTrainer ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"}`}>
            {isTrainer ? "Trainer" : "Trainee"}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 flex flex-col p-3 gap-3 min-w-0">
          {/* Main Video */}
          <div className="flex-1 relative bg-[#1a1a35] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5">
            {isTrainer ? (
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            )}
            {isTrainer && !cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a35] to-[#0c0c1d]">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl font-bold text-white/60">
                      {appUser?.name?.[0]?.toUpperCase() || "T"}
                    </span>
                  </div>
                  <p className="text-white/40 text-sm">Camera Off</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg border border-white/10">
                {isTrainer ? "You (Trainer)" : "Trainer"}
              </span>
              {!micOn && (
                <span className="bg-red-500/80 p-1 rounded-lg">
                  <MicOff className="w-3 h-3 text-white" />
                </span>
              )}
            </div>
          </div>

          {/* Participants Strip */}
          {participants.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {participants
                .filter((p) => p.id !== appUser?.uid)
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex-shrink-0 w-32 h-24 bg-[#1a1a35] rounded-xl flex flex-col items-center justify-center border border-white/5 hover:border-white/20 transition-colors group relative"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-white text-sm font-bold mb-1.5 border border-white/10">
                      {p.name[0]?.toUpperCase()}
                    </div>
                    <span className="text-white/60 text-[10px] truncate max-w-[110px] font-medium">{p.name}</span>
                    <span className="text-[8px] text-white/30 mt-0.5">{p.role}</span>
                    {!p.hasAudio && (
                      <div className="absolute top-1.5 right-1.5">
                        <MicOff className="w-2.5 h-2.5 text-red-400" />
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarTab && (
          <div className="w-80 bg-[#13132a] border-l border-white/5 flex flex-col animate-in slide-in-from-right-2 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-white text-sm font-semibold">{sidebarTabLabels[sidebarTab] || ""}</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/50 hover:text-white" onClick={() => setSidebarTab(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              {sidebarTab === "chat" && <TrainingChat trainingId={trainingId} />}
              {sidebarTab === "qa" && <TrainingQA trainingId={trainingId} role={role} />}
              {sidebarTab === "bot" && (
                <TrainingAIBot
                  trainingTitle={trainingTitle}
                  onEscalateToTrainer={!isTrainer ? handleEscalateToTrainer : undefined}
                />
              )}
              {sidebarTab === "participants" && (
                <div className="p-3 space-y-2">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-white text-xs font-bold border border-white/10">
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">
                          {p.name} {p.id === appUser?.uid && "(You)"}
                        </p>
                        <p className="text-[10px] text-white/40 capitalize">{p.role}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {p.hasAudio ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-red-400" />}
                        {p.hasVideo ? <Video className="w-3 h-3 text-emerald-400" /> : <VideoOff className="w-3 h-3 text-white/20" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#13132a] border-t border-white/5">
        {/* Left: Info */}
        <div className="flex items-center gap-2 w-48">
          <span className="text-white/40 text-[10px] hidden md:block">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        {/* Center: Media Controls */}
        <div className="flex items-center gap-2">
          {isTrainer && (
            <ControlButton
              active={cameraOn}
              icon={cameraOn ? Video : VideoOff}
              label={cameraOn ? "Camera On" : "Camera Off"}
              onClick={toggleCamera}
              danger={!cameraOn}
            />
          )}

          <ControlButton
            active={micOn}
            icon={micOn ? Mic : MicOff}
            label={micOn ? "Mic On" : "Mic Off"}
            onClick={toggleMic}
            danger={!micOn}
          />

          {isTrainer && (
            <ControlButton
              active={screenSharing}
              icon={MonitorUp}
              label={screenSharing ? "Stop Sharing" : "Share Screen"}
              onClick={toggleScreenShare}
              highlight={screenSharing}
            />
          )}

          <div className="w-px h-8 bg-white/10 mx-1" />

          <Button
            onClick={handleLeave}
            className="bg-red-600 hover:bg-red-700 text-white px-6 h-10 rounded-xl font-medium text-sm shadow-lg shadow-red-600/20"
          >
            <PhoneOff className="w-4 h-4 mr-2" />
            {isTrainer ? "End Session" : "Leave"}
          </Button>
        </div>

        {/* Right: Sidebar Toggles */}
        <div className="flex items-center gap-1 w-48 justify-end">
          <SidebarButton icon={Users} label="People" active={sidebarTab === "participants"} onClick={() => toggleSidebar("participants")} count={participants.length} />
          <SidebarButton icon={MessageCircle} label="Chat" active={sidebarTab === "chat"} onClick={() => toggleSidebar("chat")} />
          <SidebarButton icon={HelpCircle} label="Q&A" active={sidebarTab === "qa"} onClick={() => toggleSidebar("qa")} />
          <SidebarButton icon={Bot} label="AI" active={sidebarTab === "bot"} onClick={() => toggleSidebar("bot")} />
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  active,
  icon: Icon,
  label,
  onClick,
  danger,
  highlight,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200
        ${danger ? "bg-red-500/20 hover:bg-red-500/30 border border-red-500/30" : ""}
        ${highlight ? "bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30" : ""}
        ${!danger && !highlight ? "bg-white/5 hover:bg-white/10 border border-white/10" : ""}
      `}
      title={label}
    >
      <Icon className={`w-4 h-4 ${danger ? "text-red-400" : highlight ? "text-blue-400" : "text-white"}`} />
      <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[9px] text-white/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

function SidebarButton({
  icon: Icon,
  label,
  active,
  onClick,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center w-12 h-10 rounded-lg transition-all duration-200
        ${active ? "bg-white/10 border border-white/20" : "hover:bg-white/5 border border-transparent"}
      `}
      title={label}
    >
      <Icon className={`w-4 h-4 ${active ? "text-white" : "text-white/50"}`} />
      <span className={`text-[8px] mt-0.5 ${active ? "text-white" : "text-white/40"}`}>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
          {count}
        </span>
      )}
    </button>
  );
}

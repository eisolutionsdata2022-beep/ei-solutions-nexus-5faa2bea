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
import { Input } from "@/components/ui/input";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface VideoRoomProps {
  trainingId: string;
  trainingTitle: string;
  role: "trainer" | "retailer";
  onLeave: () => void;
}

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
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatMsg, setChatMsg] = useState("");
  const [showChat, setShowChat] = useState(false);
  const unsubsRef = useRef<Array<() => void>>([]);

  const isTrainer = role === "trainer";

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

  // Chat listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "trainings", trainingId, "chat"), (snap) => {
      const msgs: any[] = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
      setChatMessages(msgs);
    });
    return unsub;
  }, [trainingId]);

  // Participants listener
  useEffect(() => {
    const unsub = onParticipants(trainingId, setParticipants);
    unsubsRef.current.push(unsub);
    return () => unsub();
  }, [trainingId]);

  // Initialize
  useEffect(() => {
    if (!appUser) return;
    const init = async () => {
      try {
        if (isTrainer) {
          // Create room and get local media
          await createRoom(trainingId, appUser.uid, appUser.name || appUser.email);
          await addParticipant(trainingId, appUser.uid, appUser.name || appUser.email, "trainer");

          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;

          // Wait for retailer offers
          const unsub = onParticipants(trainingId, async (parts) => {
            const retailers = parts.filter((p) => p.role === "retailer");
            for (const retailer of retailers) {
              if (pcRef.current) continue; // Simple: 1 connection for now
              // Listen for offer from this retailer
              const offerUnsub = onOffer(trainingId, retailer.id, async (offer) => {
                const pc = createPeerConnection();
                pcRef.current = pc;

                stream.getTracks().forEach((track) => pc.addTrack(track, stream));

                pc.onicecandidate = (e) => {
                  if (e.candidate) {
                    addIceCandidate(trainingId, retailer.id, "caller", e.candidate.toJSON());
                  }
                };

                pc.onconnectionstatechange = () => {
                  if (pc.connectionState === "connected") setConnected(true);
                  if (pc.connectionState === "disconnected" || pc.connectionState === "failed") setConnected(false);
                };

                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await storeAnswer(trainingId, retailer.id, answer);

                // Listen for callee ICE candidates
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
          // Retailer: check room active, join and create offer
          const active = await isRoomActive(trainingId);
          if (!active) {
            toast.error("Live class has not started yet");
            onLeave();
            return;
          }

          await addParticipant(trainingId, appUser.uid, appUser.name || appUser.email, "retailer");

          const pc = createPeerConnection();
          pcRef.current = pc;

          // Get local audio (optional video for retailers)
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
            stream.getAudioTracks().forEach((t) => (t.enabled = false)); // muted by default
          } catch {
            // No mic access is fine for retailers
          }

          pc.ontrack = (e) => {
            if (remoteVideoRef.current && e.streams[0]) {
              remoteVideoRef.current.srcObject = e.streams[0];
            }
          };

          pc.onicecandidate = (e) => {
            if (e.candidate) {
              addIceCandidate(trainingId, appUser.uid, "callee", e.candidate.toJSON());
            }
          };

          pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") setConnected(true);
            if (pc.connectionState === "disconnected" || pc.connectionState === "failed") setConnected(false);
          };

          // Add a transceiver to receive video
          pc.addTransceiver("video", { direction: "recvonly" });

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await storeOffer(trainingId, appUser.uid, offer);

          // Listen for answer from trainer
          const answerUnsub = onAnswer(trainingId, appUser.uid, async (answer) => {
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
          });
          unsubsRef.current.push(answerUnsub);

          // Listen for caller ICE candidates
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
    const audioTracks = localStreamRef.current.getAudioTracks();
    audioTracks.forEach((t) => (t.enabled = !t.enabled));
    setMicOn((prev) => !prev);
  };

  const toggleScreenShare = async () => {
    if (!isTrainer || !pcRef.current) return;
    try {
      if (!screenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          // Revert to camera
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

  const sendChat = async () => {
    if (!chatMsg.trim() || !appUser) return;
    try {
      await addDoc(collection(db, "trainings", trainingId, "chat"), {
        userId: appUser.uid,
        userName: appUser.name || appUser.email,
        message: chatMsg.trim(),
        createdAt: new Date().toISOString(),
      });
      setChatMsg("");
    } catch {
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a14] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#12121f] border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <h2 className="text-white font-semibold text-sm truncate max-w-[200px] md:max-w-none">{trainingTitle}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {participants.length}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          {/* Main video */}
          <div className="relative w-full max-w-3xl aspect-video bg-[#1a1a2e] rounded-xl overflow-hidden shadow-2xl">
            {isTrainer ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            {isTrainer && !cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-white/50" />
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
              {isTrainer ? "You (Trainer)" : "Trainer"}
            </div>
            {screenSharing && (
              <div className="absolute top-3 right-3 bg-red-500/80 text-white text-xs px-2 py-1 rounded-md">
                Screen Sharing
              </div>
            )}
          </div>

          {/* Participants strip */}
          {participants.length > 1 && (
            <div className="flex gap-2 overflow-x-auto max-w-3xl w-full pb-2">
              {participants
                .filter((p) => p.id !== appUser?.uid)
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex-shrink-0 w-28 h-20 bg-[#1a1a2e] rounded-lg flex flex-col items-center justify-center border border-white/10"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-white text-xs font-bold mb-1">
                      {p.name[0]?.toUpperCase()}
                    </div>
                    <span className="text-white/70 text-[10px] truncate max-w-[100px]">{p.name}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Chat panel */}
        {showChat && (
          <div className="w-80 bg-[#12121f] border-l border-white/10 flex flex-col">
            <div className="px-4 py-3 border-b border-white/10">
              <h3 className="text-white text-sm font-semibold">Live Chat</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 && (
                <p className="text-white/30 text-xs text-center py-4">No messages yet</p>
              )}
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`text-xs p-2 rounded-lg ${
                    m.userId === appUser?.uid ? "bg-primary/20 ml-4" : "bg-white/5 mr-4"
                  }`}
                >
                  <p className="text-primary/70 font-medium mb-0.5">{m.userName}</p>
                  <p className="text-white/80">{m.message}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-white/10 flex gap-2">
              <Input
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                placeholder="Type..."
                className="bg-white/5 border-white/10 text-white text-xs h-8"
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
              />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendChat}>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-4 bg-[#12121f] border-t border-white/10">
        {isTrainer && (
          <>
            <Button
              variant={cameraOn ? "outline" : "destructive"}
              size="icon"
              onClick={toggleCamera}
              className={cameraOn ? "border-white/20 text-white hover:bg-white/10" : ""}
            >
              {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
            <Button
              variant={screenSharing ? "destructive" : "outline"}
              size="icon"
              onClick={toggleScreenShare}
              className={!screenSharing ? "border-white/20 text-white hover:bg-white/10" : ""}
            >
              <MonitorUp className="w-4 h-4" />
            </Button>
          </>
        )}

        <Button
          variant={micOn ? "outline" : "destructive"}
          size="icon"
          onClick={toggleMic}
          className={micOn ? "border-white/20 text-white hover:bg-white/10" : ""}
        >
          {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </Button>

        <Button
          variant={showChat ? "secondary" : "outline"}
          size="icon"
          onClick={() => setShowChat(!showChat)}
          className={!showChat ? "border-white/20 text-white hover:bg-white/10" : ""}
        >
          <Send className="w-4 h-4" />
        </Button>

        <Button variant="destructive" size="icon" onClick={handleLeave}>
          <PhoneOff className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

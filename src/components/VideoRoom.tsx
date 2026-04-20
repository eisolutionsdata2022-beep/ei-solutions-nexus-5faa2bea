import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  ensureRoom,
  closeRoomIfEmpty,
  isRoomActive,
  addParticipant,
  removeParticipant,
  onParticipants,
  onHosts,
  type RoomParticipant,
  type LiveHost,
} from "@/lib/webrtc";
import { onBackChannels, type BackChannel } from "@/lib/student-backchannel";
import { onPermissions, type PermissionRequest } from "@/lib/training-permissions";
import { Button } from "@/components/ui/button";
import { TrainingChat } from "@/components/training/TrainingChat";
import { TrainingQA } from "@/components/training/TrainingQA";
import { TrainingAIBot } from "@/components/training/TrainingAIBot";
import { TrainerHostTile } from "@/components/training/TrainerHostTile";
import { HostViewerTile } from "@/components/training/HostViewerTile";
import { ReviewSubmitDialog } from "@/components/training/ReviewSubmitDialog";
import { StudentControls } from "@/components/training/StudentControls";
import { TrainerApprovalPanel } from "@/components/training/TrainerApprovalPanel";
import { StudentBackChannelTile } from "@/components/training/StudentBackChannelTile";
import { InRoomInstallButton } from "@/components/training/InRoomInstallButton";
import {
  PhoneOff, MessageCircle, HelpCircle, Bot, Users, X, Star, Hand,
} from "lucide-react";
import { toast } from "sonner";

interface VideoRoomProps {
  trainingId: string;
  trainingTitle: string;
  role: "trainer" | "retailer";
  onLeave: () => void;
}

type SidebarTab = "chat" | "qa" | "bot" | "participants" | "approvals" | null;

export function VideoRoom({ trainingId, trainingTitle, role, onLeave }: VideoRoomProps) {
  const { appUser } = useAuth();
  const [hosts, setHosts] = useState<LiveHost[]>([]);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [backChannels, setBackChannels] = useState<BackChannel[]>([]);
  const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(null);
  const [elapsed, setElapsed] = useState(0);
  const [iAmLive, setIAmLive] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const isTrainer = role === "trainer";
  const pendingCount = useMemo(() => permissions.filter((p) => p.status === "pending").length, [permissions]);

  // session timer
  useEffect(() => {
    const i = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // Trainer: alert (beep + browser notification + toast) on NEW pending requests
  const seenPendingIds = useRef<Set<string>>(new Set());
  const notifPrimedRef = useRef(false);
  useEffect(() => {
    if (!isTrainer) return;
    // Ask for browser notification permission once
    if (!notifPrimedRef.current && typeof window !== "undefined" && "Notification" in window) {
      notifPrimedRef.current = true;
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, [isTrainer]);

  useEffect(() => {
    if (!isTrainer) return;
    const currentPending = permissions.filter((p) => p.status === "pending");
    const currentIds = new Set(currentPending.map((p) => p.id));

    // Find newly-arrived pending requests
    const newOnes = currentPending.filter((p) => !seenPendingIds.current.has(p.id));

    if (newOnes.length > 0 && seenPendingIds.current.size > 0) {
      // (skip first snapshot to avoid alerting on initial load)
      // Beep
      try {
        const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
        if (Ctor) {
          const ctx = new Ctor();
          const playTone = (freq: number, start: number, dur: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
            osc.connect(gain).connect(ctx.destination);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur + 0.05);
          };
          playTone(880, 0, 0.18);
          playTone(1175, 0.2, 0.22);
          setTimeout(() => ctx.close().catch(() => {}), 800);
        }
      } catch {
        /* ignore */
      }

      // Browser notification
      try {
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
          const first = newOnes[0];
          const title = newOnes.length === 1 ? `✋ ${first.studentName} raised hand` : `✋ ${newOnes.length} new requests`;
          const body = newOnes.length === 1
            ? `Wants ${first.type === "mic" ? "Microphone" : first.type === "cam" ? "Camera" : "Screen Share"}`
            : newOnes.map((p) => `${p.studentName} · ${p.type}`).join("\n");
          const n = new Notification(title, { body, tag: `perm-${trainingId}`, renotify: true } as NotificationOptions);
          n.onclick = () => { window.focus(); n.close(); };
        }
      } catch {
        /* ignore */
      }

      // In-app toast
      const first = newOnes[0];
      toast.info(
        newOnes.length === 1
          ? `✋ ${first.studentName} requests ${first.type === "mic" ? "Microphone" : first.type === "cam" ? "Camera" : "Screen Share"}`
          : `✋ ${newOnes.length} new permission requests`,
        {
          action: sidebarTab !== "approvals" ? { label: "View", onClick: () => setSidebarTab("approvals") } : undefined,
        }
      );
    }

    seenPendingIds.current = currentIds;
  }, [permissions, isTrainer, trainingId, sidebarTab]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // setup room + participant
  useEffect(() => {
    if (!appUser) return;
    let active = true;
    (async () => {
      try {
        if (isTrainer) {
          await ensureRoom(trainingId, appUser.uid, appUser.name || appUser.email);
        } else {
          const ok = await isRoomActive(trainingId);
          if (!ok && active) {
            toast.error("Live class has not started yet");
            onLeave();
            return;
          }
        }
        if (active) {
          await addParticipant(trainingId, appUser.uid, appUser.name || appUser.email, role);
        }
      } catch (e) {
        console.error("Room setup failed", e);
      }
    })();

    const unsubH = onHosts(trainingId, setHosts);
    const unsubP = onParticipants(trainingId, setParticipants);
    const unsubBC = onBackChannels(trainingId, setBackChannels);
    const unsubPerm = onPermissions(trainingId, setPermissions);

    return () => {
      active = false;
      unsubH();
      unsubP();
      unsubBC();
      unsubPerm();
      if (appUser) {
        removeParticipant(trainingId, appUser.uid).catch(() => {});
        if (isTrainer) closeRoomIfEmpty(trainingId).catch(() => {});
      }
    };
  }, [appUser, trainingId, isTrainer, role, onLeave]);

  // Other hosts (excluding self) — that I should subscribe to as a viewer
  const otherHosts = useMemo(
    () => hosts.filter((h) => h.id !== appUser?.uid),
    [hosts, appUser?.uid]
  );

  const trainerCount = hosts.length;
  const studentCount = participants.filter((p) => p.role === "retailer").length;
  const onlineCount = participants.length;

  const handleLeave = async () => {
    if (appUser) {
      await removeParticipant(trainingId, appUser.uid).catch(() => {});
      if (isTrainer) await closeRoomIfEmpty(trainingId).catch(() => {});
    }
    if (!isTrainer) {
      // ask retailer for review before leaving
      setShowReview(true);
      return;
    }
    onLeave();
  };

  const handleReviewClose = () => {
    setShowReview(false);
    onLeave();
  };

  const sidebarLabels: Record<string, string> = {
    chat: "Live Chat",
    qa: "Q&A",
    bot: "AI Assistant",
    participants: "People",
    approvals: "Hand-Raise Requests",
  };

  // grid columns based on visible tile count
  const visibleTrainerTiles = (isTrainer ? 1 : 0) + otherHosts.length;
  const gridCols =
    visibleTrainerTiles <= 1 ? "grid-cols-1" :
    visibleTrainerTiles === 2 ? "grid-cols-1 md:grid-cols-2" :
    visibleTrainerTiles <= 4 ? "grid-cols-1 md:grid-cols-2" :
    "grid-cols-2 lg:grid-cols-3";

  return (
    <div className="fixed inset-0 z-50 bg-[radial-gradient(ellipse_at_top,_#0f1f3a_0%,_#0a0e1f_60%,_#06070f_100%)] flex flex-col">
      {/* LED scanline overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(59,130,246,0.04)_0px,rgba(59,130,246,0.04)_1px,transparent_1px,transparent_4px)] z-0" />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2.5 bg-[#0a0f1f]/90 backdrop-blur-xl border-b border-blue-500/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Star className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm truncate">{trainingTitle}</h2>
            <p className="text-blue-300/60 text-[10px]">Digital Classroom · Live</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Stat label="Trainers" value={trainerCount} color="text-red-300" />
          <Stat label="Students" value={studentCount} color="text-emerald-300" />
          <Stat label="Online" value={onlineCount} color="text-blue-300" />
          <span className="text-white/50 text-xs font-mono hidden sm:inline">{formatTime(elapsed)}</span>
          {!isTrainer && <InRoomInstallButton />}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isTrainer ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"}`}>
            {isTrainer ? "Trainer" : "Student"}
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-3 gap-3 min-w-0 overflow-y-auto">
          {/* Trainer tiles grid */}
          <div className={`grid ${gridCols} gap-3 auto-rows-min`}>
            {isTrainer && (
              <TrainerHostTile
                trainingId={trainingId}
                isLive={iAmLive}
                onLiveChange={setIAmLive}
              />
            )}
            {otherHosts.map((h) => (
              <HostViewerTile key={h.id} trainingId={trainingId} trainingTitle={trainingTitle} host={h} />
            ))}
            {!isTrainer && otherHosts.length === 0 && (
              <div className="aspect-video rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center bg-black/30">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                    <Star className="w-7 h-7 text-white/30" />
                  </div>
                  <p className="text-white/50 text-sm">Waiting for trainer to start live…</p>
                </div>
              </div>
            )}
          </div>

          {/* Trainer-only: approved students' back-channel streams (private) */}
          {isTrainer && backChannels.length > 0 && (
            <div className="bg-emerald-500/5 backdrop-blur-sm rounded-xl border border-emerald-500/20 p-2.5">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-emerald-200/80 text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Hand className="w-3 h-3" /> Approved Students Speaking
                </p>
                <span className="text-emerald-300 text-[10px]">{backChannels.length} live · only you see this</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {backChannels.map((bc) => (
                  <StudentBackChannelTile key={bc.id} trainingId={trainingId} channel={bc} />
                ))}
              </div>
            </div>
          )}

          {/* Students strip */}
          {studentCount > 0 && (
            <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-white/5 p-2.5">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-white/60 text-[11px] uppercase tracking-wider font-semibold">Students Online</p>
                <span className="text-blue-300 text-[10px]">{studentCount}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {participants
                  .filter((p) => p.role === "retailer")
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex-shrink-0 flex flex-col items-center gap-1 min-w-[60px]"
                      title={p.name}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-blue-500/30 flex items-center justify-center text-white text-xs font-bold border border-white/10">
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-white/50 text-[9px] truncate max-w-[60px]">{p.name.split(" ")[0]}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarTab && (
          <div className="w-80 bg-[#0a0f1f]/95 backdrop-blur-xl border-l border-white/5 flex flex-col animate-in slide-in-from-right-2 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-white text-sm font-semibold">{sidebarLabels[sidebarTab] || ""}</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10" onClick={() => setSidebarTab(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              {sidebarTab === "chat" && <TrainingChat trainingId={trainingId} />}
              {sidebarTab === "qa" && <TrainingQA trainingId={trainingId} role={role} />}
              {sidebarTab === "bot" && (
                <TrainingAIBot trainingTitle={trainingTitle} />
              )}
              {sidebarTab === "participants" && (
                <div className="p-3 space-y-2 overflow-y-auto">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border border-white/10 ${p.role === "trainer" ? "bg-gradient-to-br from-amber-500/40 to-red-500/40" : "bg-gradient-to-br from-emerald-500/30 to-blue-500/30"}`}>
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">
                          {p.name} {p.id === appUser?.uid && "(You)"}
                        </p>
                        <p className="text-[10px] text-white/40 capitalize">{p.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {sidebarTab === "approvals" && isTrainer && (
                <TrainerApprovalPanel trainingId={trainingId} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 flex flex-col gap-2 px-3 sm:px-4 py-2.5 bg-[#0a0f1f]/90 backdrop-blur-xl border-t border-blue-500/10">
        {/* Student permission controls (mobile-friendly, always visible to retailers) */}
        {!isTrainer && (
          <div className="flex items-center justify-center">
            <StudentControls trainingId={trainingId} />
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="text-white/40 text-[10px] hidden md:block">
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleLeave}
              className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-5 h-10 rounded-xl font-medium text-sm shadow-lg shadow-red-600/20"
            >
              <PhoneOff className="w-4 h-4 mr-1.5" />
              {isTrainer ? "Exit" : "Leave"}
            </Button>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {isTrainer && (
              <SidebarBtn icon={Hand} label="Hands" active={sidebarTab === "approvals"} count={pendingCount} onClick={() => setSidebarTab(sidebarTab === "approvals" ? null : "approvals")} />
            )}
            <SidebarBtn icon={Users} label="People" active={sidebarTab === "participants"} count={onlineCount} onClick={() => setSidebarTab(sidebarTab === "participants" ? null : "participants")} />
            <SidebarBtn icon={MessageCircle} label="Chat" active={sidebarTab === "chat"} onClick={() => setSidebarTab(sidebarTab === "chat" ? null : "chat")} />
            <SidebarBtn icon={HelpCircle} label="Q&A" active={sidebarTab === "qa"} onClick={() => setSidebarTab(sidebarTab === "qa" ? null : "qa")} />
            <SidebarBtn icon={Bot} label="AI" active={sidebarTab === "bot"} onClick={() => setSidebarTab(sidebarTab === "bot" ? null : "bot")} />
          </div>
        </div>
      </div>

      {/* Review on exit (retailer only) */}
      {showReview && !isTrainer && (
        <ReviewSubmitDialog
          open={showReview}
          trainingId={trainingId}
          trainingTitle={trainingTitle}
          onClose={handleReviewClose}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="hidden sm:flex flex-col items-center px-2">
      <span className={`text-sm font-bold leading-none ${color}`}>{value}</span>
      <span className="text-[9px] text-white/40 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function SidebarBtn({ icon: Icon, label, active, count, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center w-12 h-10 rounded-lg transition-all ${
        active ? "bg-blue-500/20 border border-blue-500/40" : "hover:bg-white/5 border border-transparent"
      }`}
      title={label}
    >
      <Icon className={`w-4 h-4 ${active ? "text-blue-300" : "text-white/60"}`} />
      <span className={`text-[8px] mt-0.5 ${active ? "text-blue-200" : "text-white/40"}`}>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
          {count}
        </span>
      )}
    </button>
  );
}

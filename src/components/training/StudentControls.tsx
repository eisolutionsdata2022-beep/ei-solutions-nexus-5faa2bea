/**
 * Student-side controls in a live class.
 * - Mic / Camera / Screen-share buttons (all OFF by default).
 * - Tap → request permission from trainer (Firestore doc).
 * - Trainer approves → button enables, capture starts, stream goes only to trainers.
 * - Trainer rejects → toast + button reset.
 * - Trainer revokes → stream stops, button locks.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  requestPermission,
  withdrawPermission,
  onPermissions,
  permissionMap,
  type PermissionType,
  type PermissionStatus,
} from "@/lib/training-permissions";
import {
  announceBackChannel,
  updateBackChannel,
  closeBackChannel,
  studentListenForOffers,
  studentSendAnswer,
  bcAddIce,
  onBcIce,
} from "@/lib/student-backchannel";
import { createPeerConnection } from "@/lib/webrtc";
import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, Hand, Hourglass, Lock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  trainingId: string;
}

export function StudentControls({ trainingId }: Props) {
  const { appUser } = useAuth();
  const [perms, setPerms] = useState<{ mic: PermissionStatus | null; cam: PermissionStatus | null; screen: PermissionStatus | null }>({
    mic: null, cam: null, screen: null,
  });

  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const broadcastStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const unsubsRef = useRef<Array<() => void>>([]);
  const announcedRef = useRef(false);

  // Subscribe to my own permission docs
  useEffect(() => {
    if (!appUser) return;
    const unsub = onPermissions(trainingId, (list) => {
      const mine = permissionMap(list, appUser.uid);
      setPerms({
        mic: mine.mic?.status ?? null,
        cam: mine.cam?.status ?? null,
        screen: mine.screen?.status ?? null,
      });
    });
    return unsub;
  }, [appUser, trainingId]);

  // -------- BUILD / UPDATE BROADCAST STREAM --------
  const ensureBroadcast = useCallback(() => {
    if (!broadcastStreamRef.current) broadcastStreamRef.current = new MediaStream();
    const bs = broadcastStreamRef.current;
    bs.getTracks().forEach((t) => bs.removeTrack(t));
    // Priority: screen video > cam video. Mic always.
    const sv = screenStreamRef.current?.getVideoTracks()[0];
    const cv = camStreamRef.current?.getVideoTracks()[0];
    const ma = micStreamRef.current?.getAudioTracks()[0];
    if (sv) bs.addTrack(sv);
    else if (cv) bs.addTrack(cv);
    if (ma) bs.addTrack(ma);
    return bs;
  }, []);

  // -------- ANNOUNCE/REFRESH BACKCHANNEL --------
  const refreshAnnouncement = useCallback(async () => {
    if (!appUser) return;
    const hasMic = perms.mic === "approved" && !!micStreamRef.current;
    const hasCam = perms.cam === "approved" && !!camStreamRef.current;
    const hasScreen = perms.screen === "approved" && !!screenStreamRef.current;
    const any = hasMic || hasCam || hasScreen;
    if (!any) {
      if (announcedRef.current) {
        announcedRef.current = false;
        await closeBackChannel(trainingId, appUser.uid);
      }
      return;
    }
    if (!announcedRef.current) {
      announcedRef.current = true;
      await announceBackChannel(trainingId, appUser.uid, appUser.name || appUser.email, { hasMic, hasCam, hasScreen });
      // start listening for trainer offers
      const unsubO = studentListenForOffers(trainingId, appUser.uid, async (trainerId, offer) => {
        const existing = peersRef.current.get(trainerId);
        if (existing) try { existing.close(); } catch {}
        const pc = createPeerConnection();
        peersRef.current.set(trainerId, pc);
        const stream = ensureBroadcast();
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        pc.onicecandidate = (e) => {
          if (e.candidate) bcAddIce(trainingId, appUser.uid, trainerId, "callee", e.candidate.toJSON()).catch(() => {});
        };
        pc.onconnectionstatechange = () => {
          if (["failed", "closed"].includes(pc.connectionState)) {
            try { pc.close(); } catch {}
            peersRef.current.delete(trainerId);
          }
        };
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await studentSendAnswer(trainingId, appUser.uid, trainerId, answer);
          const iceUnsub = onBcIce(trainingId, appUser.uid, trainerId, "caller", (c) => {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          });
          unsubsRef.current.push(iceUnsub);
        } catch (err) {
          console.error("Student answer failed", err);
        }
      });
      unsubsRef.current.push(unsubO);
    } else {
      await updateBackChannel(trainingId, appUser.uid, { hasMic, hasCam, hasScreen });
      // swap any new tracks on existing peer connections
      const stream = ensureBroadcast();
      peersRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        stream.getVideoTracks().forEach((vt) => {
          const s = senders.find((s) => s.track?.kind === "video");
          if (s) s.replaceTrack(vt).catch(() => {});
        });
        stream.getAudioTracks().forEach((at) => {
          const s = senders.find((s) => s.track?.kind === "audio");
          if (s) s.replaceTrack(at).catch(() => {});
        });
      });
    }
  }, [appUser, trainingId, perms, ensureBroadcast]);

  useEffect(() => { void refreshAnnouncement(); }, [refreshAnnouncement]);

  // -------- HANDLE APPROVED → CAPTURE / REVOKED → STOP --------
  useEffect(() => {
    let cancelled = false;
    const apply = async () => {
      // MIC
      if (perms.mic === "approved" && !micStreamRef.current) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
          micStreamRef.current = s;
          toast.success("Microphone enabled by trainer");
          await refreshAnnouncement();
        } catch (e: any) {
          toast.error(e?.message || "Could not access microphone");
        }
      } else if ((perms.mic === "revoked" || perms.mic === "rejected" || perms.mic === null) && micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        if (perms.mic === "revoked") toast.info("Trainer disabled your microphone");
        await refreshAnnouncement();
      }
      // CAM
      if (perms.cam === "approved" && !camStreamRef.current) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
          if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
          camStreamRef.current = s;
          toast.success("Camera enabled by trainer");
          await refreshAnnouncement();
        } catch (e: any) {
          toast.error(e?.message || "Could not access camera");
        }
      } else if ((perms.cam === "revoked" || perms.cam === "rejected" || perms.cam === null) && camStreamRef.current) {
        camStreamRef.current.getTracks().forEach((t) => t.stop());
        camStreamRef.current = null;
        if (perms.cam === "revoked") toast.info("Trainer disabled your camera");
        await refreshAnnouncement();
      }
      // SCREEN — must be triggered by user gesture. We don't auto-start; instead, we
      // surface a "Start sharing" tap when status flips to approved (handled in click).
      if ((perms.screen === "revoked" || perms.screen === "rejected" || perms.screen === null) && screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        if (perms.screen === "revoked") toast.info("Trainer stopped your screen share");
        await refreshAnnouncement();
      }
    };
    void apply();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perms.mic, perms.cam, perms.screen]);

  // toast only on rejection event change
  useEffect(() => {
    if (perms.mic === "rejected") toast.error("Trainer denied microphone request");
  }, [perms.mic]);
  useEffect(() => {
    if (perms.cam === "rejected") toast.error("Trainer denied camera request");
  }, [perms.cam]);
  useEffect(() => {
    if (perms.screen === "rejected") toast.error("Trainer denied screen-share request");
  }, [perms.screen]);

  // -------- CLEANUP --------
  useEffect(() => {
    return () => {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((pc) => { try { pc.close(); } catch {} });
      peersRef.current.clear();
      unsubsRef.current.forEach((u) => { try { u(); } catch {} });
      unsubsRef.current = [];
      if (appUser && announcedRef.current) {
        closeBackChannel(trainingId, appUser.uid).catch(() => {});
      }
      // Clean up any pending requests
      if (appUser) {
        ["mic", "cam", "screen"].forEach((t) => {
          withdrawPermission(trainingId, appUser.uid, t as PermissionType).catch(() => {});
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = async (type: PermissionType) => {
    if (!appUser) return;
    const status = perms[type];
    if (status === "pending") {
      await withdrawPermission(trainingId, appUser.uid, type);
      toast.info("Request cancelled");
      return;
    }
    if (status === "approved") {
      // Special case: screen-share needs a user gesture to actually start
      if (type === "screen" && !screenStreamRef.current) {
        try {
          const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
          screenStreamRef.current = s;
          s.getVideoTracks()[0].onended = () => {
            screenStreamRef.current?.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
            withdrawPermission(trainingId, appUser.uid, "screen").catch(() => {});
            void refreshAnnouncement();
          };
          await refreshAnnouncement();
          toast.success("Screen sharing started");
          return;
        } catch (e: any) {
          if (e?.name !== "NotAllowedError") toast.error(e?.message || "Failed to share screen");
          return;
        }
      }
      // Toggle off → withdraw permission (releases capture)
      await withdrawPermission(trainingId, appUser.uid, type);
      toast.info(`${labelOf(type)} stopped`);
      return;
    }
    // pending/rejected/revoked/null → request
    await requestPermission(trainingId, appUser.uid, appUser.name || appUser.email, type);
    toast.info("Request sent — waiting for trainer approval");
  };

  return (
    <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10">
      <CtrlBtn type="mic" status={perms.mic} onClick={() => handleClick("mic")} />
      <CtrlBtn type="cam" status={perms.cam} onClick={() => handleClick("cam")} />
      <CtrlBtn type="screen" status={perms.screen} onClick={() => handleClick("screen")} />
    </div>
  );
}

function labelOf(t: PermissionType) {
  return t === "mic" ? "Microphone" : t === "cam" ? "Camera" : "Screen share";
}

function CtrlBtn({ type, status, onClick }: { type: PermissionType; status: PermissionStatus | null; onClick: () => void }) {
  const isApproved = status === "approved";
  const isPending = status === "pending";
  const ICONS = {
    mic: { on: Mic, off: MicOff },
    cam: { on: Video, off: VideoOff },
    screen: { on: MonitorUp, off: MonitorOff },
  } as const;
  const Icon = isApproved ? ICONS[type].on : ICONS[type].off;
  const ring =
    isApproved ? "bg-emerald-500/30 border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/40" :
    isPending ? "bg-amber-500/20 border-amber-400/50 text-amber-200 hover:bg-amber-500/30 animate-pulse" :
    status === "rejected" || status === "revoked" ? "bg-red-500/15 border-red-400/40 text-red-200 hover:bg-red-500/20" :
    "bg-white/5 border-white/15 text-white/80 hover:bg-white/10";
  const StatusIcon = isPending ? Hourglass : (status === "rejected" || status === "revoked") ? Lock : Hand;
  const tip =
    isApproved ? `${labelOf(type)} on — tap to stop` :
    isPending ? "Waiting for trainer approval" :
    status === "rejected" ? "Trainer denied — tap to ask again" :
    status === "revoked" ? "Trainer stopped you — tap to ask again" :
    `Request ${labelOf(type).toLowerCase()}`;
  return (
    <button
      onClick={onClick}
      title={tip}
      className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border transition-all relative ${ring}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[9px] mt-0.5 font-semibold uppercase tracking-wide">
        {type === "screen" ? "Share" : type === "cam" ? "Cam" : "Mic"}
      </span>
      {!isApproved && (
        <span className="absolute -top-1 -right-1 bg-black/70 rounded-full p-0.5 border border-white/20">
          <StatusIcon className="w-2.5 h-2.5" />
        </span>
      )}
    </button>
  );
}

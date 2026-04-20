/**
 * Trainer-side approval panel.
 * Shows pending student permission requests + currently-approved students,
 * with one-click approve/reject/revoke and bulk controls.
 */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  onPermissions,
  decidePermission,
  withdrawPermission,
  type PermissionRequest,
  type PermissionType,
} from "@/lib/training-permissions";
import { Button } from "@/components/ui/button";
import { Mic, Video, MonitorUp, Check, X, Ban, Hand, MicOff, VideoOff, StopCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  trainingId: string;
}

const LABEL: Record<PermissionType, string> = {
  mic: "Microphone",
  cam: "Camera",
  screen: "Screen share",
};

const ICON: Record<PermissionType, React.ComponentType<{ className?: string }>> = {
  mic: Mic,
  cam: Video,
  screen: MonitorUp,
};

export function TrainerApprovalPanel({ trainingId }: Props) {
  const { appUser } = useAuth();
  const [perms, setPerms] = useState<PermissionRequest[]>([]);

  useEffect(() => {
    return onPermissions(trainingId, setPerms);
  }, [trainingId]);

  const pending = useMemo(() => perms.filter((p) => p.status === "pending"), [perms]);
  const active = useMemo(() => perms.filter((p) => p.status === "approved"), [perms]);

  const decide = async (p: PermissionRequest, status: "approved" | "rejected" | "revoked") => {
    if (!appUser) return;
    await decidePermission(trainingId, p.studentId, p.type, status, appUser.uid);
  };

  const remove = async (p: PermissionRequest) => {
    await withdrawPermission(trainingId, p.studentId, p.type);
  };

  const bulkRevoke = async (type: PermissionType | "all") => {
    if (!appUser) return;
    const targets = active.filter((p) => type === "all" || p.type === type);
    if (targets.length === 0) {
      toast.info(`No active ${type === "all" ? "permissions" : LABEL[type as PermissionType].toLowerCase()} to revoke.`);
      return;
    }
    await Promise.all(
      targets.map((p) => decidePermission(trainingId, p.studentId, p.type, "revoked", appUser.uid))
    );
    toast.success(`Revoked ${targets.length} ${type === "all" ? "permission(s)" : LABEL[type as PermissionType].toLowerCase()}.`);
  };

  const rejectAllPending = async () => {
    if (!appUser || pending.length === 0) return;
    await Promise.all(
      pending.map((p) => decidePermission(trainingId, p.studentId, p.type, "rejected", appUser.uid))
    );
    toast.success(`Rejected ${pending.length} pending request(s).`);
  };

  // Group active by student
  const byStudent = useMemo(() => {
    const m = new Map<string, { name: string; perms: PermissionRequest[] }>();
    for (const p of active) {
      if (!m.has(p.studentId)) m.set(p.studentId, { name: p.studentName, perms: [] });
      m.get(p.studentId)!.perms.push(p);
    }
    return Array.from(m.entries()).map(([id, v]) => ({ id, ...v }));
  }, [active]);

  const hasActive = active.length > 0;
  const hasPending = pending.length > 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-4">
      {/* Bulk actions */}
      {(hasActive || hasPending) && (
        <section className="bg-white/5 border border-white/10 rounded-lg p-2.5">
          <h4 className="text-white/80 text-[10px] font-bold uppercase tracking-wider mb-2">
            Quick Classroom Controls
          </h4>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => bulkRevoke("mic")}
              disabled={!active.some((p) => p.type === "mic")}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-red-500/15 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-red-200 border border-red-400/30 text-[11px] font-semibold transition-colors"
            >
              <MicOff className="w-3.5 h-3.5" /> Mute All
            </button>
            <button
              onClick={() => bulkRevoke("cam")}
              disabled={!active.some((p) => p.type === "cam")}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-red-500/15 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-red-200 border border-red-400/30 text-[11px] font-semibold transition-colors"
            >
              <VideoOff className="w-3.5 h-3.5" /> Cameras Off
            </button>
            <button
              onClick={() => bulkRevoke("screen")}
              disabled={!active.some((p) => p.type === "screen")}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-red-500/15 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-red-200 border border-red-400/30 text-[11px] font-semibold transition-colors"
            >
              <StopCircle className="w-3.5 h-3.5" /> Stop Screens
            </button>
            <button
              onClick={() => bulkRevoke("all")}
              disabled={!hasActive}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-red-600/30 hover:bg-red-600/50 disabled:opacity-40 disabled:cursor-not-allowed text-white border border-red-400/50 text-[11px] font-bold transition-colors"
            >
              <Ban className="w-3.5 h-3.5" /> Revoke All
            </button>
          </div>
          {hasPending && (
            <button
              onClick={rejectAllPending}
              className="w-full mt-1.5 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-amber-500/15 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 text-[11px] font-semibold transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Reject All Pending ({pending.length})
            </button>
          )}
        </section>
      )}

      {/* Pending */}
      <section>
        <h4 className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
          <Hand className="w-3.5 h-3.5 text-amber-300" />
          Pending Requests {pending.length > 0 && (
            <span className="bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded text-[10px] border border-amber-400/40">
              {pending.length}
            </span>
          )}
        </h4>
        {pending.length === 0 ? (
          <p className="text-white/40 text-xs px-2 py-3">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((p) => {
              const Icon = ICON[p.type];
              return (
                <div key={p.id} className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-2.5 flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/40 to-orange-500/40 flex items-center justify-center text-white text-xs font-bold border border-white/10 shrink-0">
                    {p.studentName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{p.studentName}</p>
                    <p className="text-amber-200 text-[10px] flex items-center gap-1 mt-0.5">
                      <Icon className="w-3 h-3" /> wants {LABEL[p.type]}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" onClick={() => decide(p, "approved")} className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => decide(p, "rejected")} className="h-8 w-8 text-red-300 hover:bg-red-500/20 hover:text-red-200">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Active speakers */}
      <section>
        <h4 className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-300" />
          Currently Approved {byStudent.length > 0 && (
            <span className="bg-emerald-500/20 text-emerald-200 px-1.5 py-0.5 rounded text-[10px] border border-emerald-400/40">
              {byStudent.length}
            </span>
          )}
        </h4>
        {byStudent.length === 0 ? (
          <p className="text-white/40 text-xs px-2 py-3">No students currently sharing.</p>
        ) : (
          <div className="space-y-2">
            {byStudent.map((s) => (
              <div key={s.id} className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/40 to-blue-500/40 flex items-center justify-center text-white text-xs font-bold border border-white/10">
                    {s.name[0]?.toUpperCase()}
                  </div>
                  <p className="text-white text-xs font-semibold flex-1 truncate">{s.name}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.perms.map((p) => {
                    const Icon = ICON[p.type];
                    return (
                      <button
                        key={p.id}
                        onClick={() => decide(p, "revoked")}
                        title={`Stop ${LABEL[p.type]}`}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 hover:bg-red-500/30 text-emerald-100 hover:text-red-200 border border-emerald-400/30 hover:border-red-400/50 transition-colors text-[10px] font-semibold"
                      >
                        <Icon className="w-3 h-3" />
                        {LABEL[p.type]}
                        <Ban className="w-2.5 h-2.5 ml-1 opacity-60" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* All recent (for trainer audit) */}
      {perms.filter((p) => p.status !== "approved" && p.status !== "pending").length > 0 && (
        <section className="opacity-70">
          <h4 className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-2">Recent Decisions</h4>
          <div className="space-y-1">
            {perms.filter((p) => p.status === "rejected" || p.status === "revoked").slice(-5).reverse().map((p) => {
              const Icon = ICON[p.type];
              return (
                <div key={p.id} className="flex items-center gap-2 text-white/60 text-[11px] px-2 py-1.5 rounded bg-white/5">
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="truncate flex-1">{p.studentName} — {LABEL[p.type]}</span>
                  <span className={`text-[9px] uppercase ${p.status === "rejected" ? "text-red-300" : "text-orange-300"}`}>
                    {p.status}
                  </span>
                  <button
                    onClick={() => remove(p)}
                    className="text-white/30 hover:text-white"
                    title="Clear"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

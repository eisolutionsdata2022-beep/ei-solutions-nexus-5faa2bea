/**
 * Staff IPPB notifier — fires a toast + chime when a retailer advances
 * a request to a staff-turn step (i.e. it becomes staff's turn to act).
 *
 * Detection logic:
 *  - Track previous (currentStep, turn, updatedAt) per request id.
 *  - If a request transitions so that `turn` is now "staff" AND it wasn't
 *    "staff" before (or step changed), and we've already seen the request
 *    once (so initial subscribe doesn't spam), notify.
 *  - Skip terminal statuses.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { STEP_LABELS, STEP_TURN, type IPPBRequest } from "@/lib/ippb-types";

const TERMINAL = new Set(["success", "failed", "cancelled"]);

// Tiny synthesised "ding" — no asset file needed. Two short sine beeps.
function playChime() {
  try {
    const Ctx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.18);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* ignore */
  }
}

interface Snapshot {
  step: string;
  turn: string;
  updatedAt: string;
}

export function useIPPBStaffNotifications(rows: IPPBRequest[], staffId?: string) {
  const prev = useRef<Map<string, Snapshot>>(new Map());
  const initialized = useRef(false);

  useEffect(() => {
    const map = prev.current;

    // First snapshot: just record state, don't fire.
    if (!initialized.current) {
      rows.forEach((r) => {
        map.set(r.id, {
          step: r.currentStep,
          turn: r.turn ?? STEP_TURN[r.currentStep],
          updatedAt: r.updatedAt,
        });
      });
      initialized.current = true;
      return;
    }

    rows.forEach((r) => {
      if (TERMINAL.has(r.status)) return;
      const turn = r.turn ?? STEP_TURN[r.currentStep];
      const before = map.get(r.id);
      const next: Snapshot = {
        step: r.currentStep,
        turn,
        updatedAt: r.updatedAt,
      };
      map.set(r.id, next);

      if (!before) {
        // Brand-new request appeared after first snapshot. Notify only if
        // it's already staff-turn (rare) — typically new requests start at
        // basic_details (retailer turn), so skip silently.
        if (turn === "staff") {
          toast.info(`🆕 New IPPB request – ${STEP_LABELS[r.currentStep]}`, {
            description: `${r.requestNo} • ${r.retailerName}`,
          });
          playChime();
        }
        return;
      }

      const becameStaffTurn = before.turn !== "staff" && turn === "staff";
      const stepAdvancedToStaffTurn =
        before.step !== r.currentStep && turn === "staff";

      if (!becameStaffTurn && !stepAdvancedToStaffTurn) return;

      // Only ping staff for requests they own (or unclaimed ones).
      if (r.staffId && staffId && r.staffId !== staffId) return;

      toast.success(`▶ Your turn — ${STEP_LABELS[r.currentStep]}`, {
        description: `${r.requestNo} • ${r.retailerName} submitted. Click to process.`,
        duration: 8000,
      });
      playChime();
    });

    // Drop snapshots for requests no longer in the list
    const ids = new Set(rows.map((r) => r.id));
    Array.from(map.keys()).forEach((id) => {
      if (!ids.has(id)) map.delete(id);
    });
  }, [rows, staffId]);
}

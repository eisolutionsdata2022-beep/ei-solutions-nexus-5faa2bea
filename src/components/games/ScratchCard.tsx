import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, RefreshCw, Gift } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getTodayPlay, recordGamePlay, type GamePlay } from "@/lib/games-firebase";

interface ScratchPrize {
  label: string;
  reward: number;
  weight: number;
  emoji: string;
  bg: string;
}

const PRIZES: ScratchPrize[] = [
  { label: "₹20 Cashback", reward: 20, weight: 22, emoji: "💰", bg: "from-emerald-400 to-emerald-600" },
  { label: "₹50 Cashback", reward: 50, weight: 12, emoji: "🎉", bg: "from-amber-400 to-orange-500" },
  { label: "₹5 Coins",     reward: 5,  weight: 30, emoji: "🪙", bg: "from-yellow-400 to-amber-500" },
  { label: "₹10 Coins",    reward: 10, weight: 18, emoji: "🪙", bg: "from-cyan-400 to-blue-500" },
  { label: "Better Luck Next Time", reward: 0, weight: 18, emoji: "🍀", bg: "from-slate-400 to-slate-600" },
];

function pickPrize(): ScratchPrize {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of PRIZES) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return PRIZES[PRIZES.length - 1];
}

const W = 320;
const H = 200;

export function ScratchCard() {
  const { appUser } = useAuth();
  const uid = appUser?.uid;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prize, setPrize] = useState<ScratchPrize | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [scratching, setScratching] = useState(false);
  const [today, setToday] = useState<GamePlay | null>(null);
  const [scratchPct, setScratchPct] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load today's play
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    getTodayPlay(uid, "scratch")
      .then((p) => {
        setToday(p);
        if (p) {
          // Already played — show the result
          setPrize({
            label: p.label,
            reward: p.reward,
            weight: 0,
            emoji: p.reward > 0 ? "🎉" : "🍀",
            bg: p.reward > 0 ? "from-amber-400 to-orange-500" : "from-slate-400 to-slate-600",
          });
          setRevealed(true);
        } else {
          setPrize(pickPrize());
          setRevealed(false);
        }
      })
      .finally(() => setLoading(false));
  }, [uid]);

  // Paint the scratch surface
  useEffect(() => {
    if (revealed || !prize) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // Foil gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#94a3b8");
    grad.addColorStop(0.5, "#cbd5e1");
    grad.addColorStop(1, "#64748b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Sparkle pattern
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 2 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Instruction text
    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✦ SCRATCH HERE ✦", W / 2, H / 2 - 6);
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#374151";
    ctx.fillText("Use mouse / finger to reveal", W / 2, H / 2 + 18);

    setScratchPct(0);
  }, [prize, revealed]);

  const scratch = (clientX: number, clientY: number) => {
    if (revealed || today) return;
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    const y = ((clientY - rect.top) / rect.height) * H;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
  };

  const checkPercentage = () => {
    const c = canvasRef.current;
    if (!c) return 0;
    const ctx = c.getContext("2d");
    if (!ctx) return 0;
    const data = ctx.getImageData(0, 0, W, H).data;
    let cleared = 0;
    const total = data.length / 4;
    // Sample every 16th pixel for perf
    for (let i = 3; i < data.length; i += 64) {
      if (data[i] === 0) cleared++;
    }
    const pct = (cleared / (total / 16)) * 100;
    setScratchPct(pct);
    return pct;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (revealed || today) return;
    setScratching(true);
    (e.target as Element).setPointerCapture(e.pointerId);
    scratch(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!scratching) return;
    scratch(e.clientX, e.clientY);
  };

  const onPointerUp = async () => {
    if (!scratching) return;
    setScratching(false);
    const pct = checkPercentage();
    if (pct > 45 && !revealed && prize && uid) {
      setRevealed(true);
      // Auto-fade remaining foil
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.globalCompositeOperation = "destination-out";
          ctx.fillRect(0, 0, W, H);
        }
      }
      try {
        const play = await recordGamePlay({
          uid,
          game: "scratch",
          reward: prize.reward,
          label: prize.label,
        });
        setToday(play);
        if (prize.reward > 0) {
          toast.success(`🎉 ${prize.label} credited to your wallet!`);
        } else {
          toast("Better luck tomorrow!");
        }
      } catch (e: any) {
        if (e?.message === "ALREADY_PLAYED_TODAY") {
          toast.error("You already played today's scratch card.");
        } else {
          toast.error("Could not save reward.");
        }
      }
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-amber-300/40 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/20 dark:via-amber-950/20 dark:to-orange-950/20">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5" /> Lucky Scratch — Daily 1 free card
            </div>
            <h3 className="mt-2 text-2xl font-bold">Scratch & Reveal</h3>
            <p className="text-sm text-muted-foreground">Win cashback, coins or surprises</p>
          </div>

          {/* Card */}
          <div
            className="relative overflow-hidden rounded-2xl shadow-2xl ring-4 ring-amber-200/60"
            style={{ width: W, height: H }}
          >
            {/* Prize layer */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br ${prize?.bg || "from-slate-400 to-slate-600"} text-white`}
            >
              <div className="text-6xl drop-shadow-lg">{prize?.emoji || "🎁"}</div>
              <div className="mt-2 text-2xl font-extrabold drop-shadow">{prize?.label || "Prize"}</div>
              {prize && prize.reward > 0 && (
                <div className="mt-1 rounded-full bg-white/25 px-3 py-0.5 text-xs font-semibold backdrop-blur">
                  +₹{prize.reward} to wallet
                </div>
              )}
            </div>

            {/* Foil canvas */}
            {!revealed && !today && (
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                className="absolute inset-0 cursor-crosshair touch-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
            )}
          </div>

          {!revealed && !today && (
            <div className="text-xs text-muted-foreground">
              Scratched: {Math.round(scratchPct)}%
            </div>
          )}

          {revealed && today ? (
            <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow-sm">
              <Gift className="h-5 w-5 text-amber-500" />
              <span className="font-semibold">Today's reward: {today.label}</span>
            </div>
          ) : null}

          <Button variant="outline" disabled={!loading && (!!today || revealed)} className="opacity-80">
            {loading ? (
              <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading…</>
            ) : today ? (
              "Come back tomorrow"
            ) : (
              "Scratch the card above 👆"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

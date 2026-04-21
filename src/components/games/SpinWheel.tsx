import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, RotateCcw, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getTodayPlay, recordGamePlay, type GamePlay } from "@/lib/games-firebase";

interface Slice {
  label: string;
  reward: number;
  bonusSpin?: boolean;
  color: string;
  textColor?: string;
  weight: number;
}

const SLICES: Slice[] = [
  { label: "₹10",        reward: 10,  color: "#ef4444", weight: 28 },
  { label: "Try Again",  reward: 0,   color: "#1f2937", textColor: "#fff", weight: 22 },
  { label: "₹50",        reward: 50,  color: "#f59e0b", weight: 14 },
  { label: "Cashback ₹5",reward: 5,   color: "#10b981", weight: 16 },
  { label: "Bonus Spin", reward: 0,   bonusSpin: true, color: "#8b5cf6", textColor: "#fff", weight: 8 },
  { label: "₹100",       reward: 100, color: "#0ea5e9", weight: 4 },
  { label: "₹20",        reward: 20,  color: "#ec4899", weight: 8 },
];

function pickWeightedIndex(slices: Slice[]): number {
  const total = slices.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < slices.length; i++) {
    r -= slices[i].weight;
    if (r <= 0) return i;
  }
  return slices.length - 1;
}

const SIZE = 320;
const RADIUS = SIZE / 2;
const CENTER = SIZE / 2;

function describeSlice(index: number, total: number) {
  const sliceAngle = 360 / total;
  const startAngle = index * sliceAngle - 90;
  const endAngle = startAngle + sliceAngle;
  const start = polar(CENTER, CENTER, RADIUS, startAngle);
  const end = polar(CENTER, CENTER, RADIUS, endAngle);
  const largeArc = sliceAngle > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function SpinWheel() {
  const { appUser } = useAuth();
  const uid = appUser?.uid;

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [today, setToday] = useState<GamePlay | null>(null);
  const [lastResult, setLastResult] = useState<Slice | null>(null);
  const [bonusAvailable, setBonusAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    getTodayPlay(uid, "spin")
      .then((p) => setToday(p))
      .finally(() => setLoading(false));
  }, [uid]);

  const sliceAngle = 360 / SLICES.length;

  const canSpin = useMemo(() => {
    if (!uid || spinning || loading) return false;
    if (bonusAvailable) return true;
    return !today;
  }, [uid, spinning, loading, today, bonusAvailable]);

  const handleSpin = async () => {
    if (!uid || !canSpin) return;
    setSpinning(true);
    setLastResult(null);

    const winnerIdx = pickWeightedIndex(SLICES);
    const winner = SLICES[winnerIdx];

    // Pointer is at top (12 o'clock). Rotate so the chosen slice center is at top.
    const sliceCenter = winnerIdx * sliceAngle + sliceAngle / 2;
    const finalAngle = 360 * 6 + (360 - sliceCenter); // 6 full spins + land
    const newRotation = rotation + finalAngle - (rotation % 360);
    setRotation(newRotation);

    // Wait for CSS animation (4s)
    await new Promise((r) => setTimeout(r, 4200));

    try {
      const wasBonusReplay = bonusAvailable;
      const play = await recordGamePlay({
        uid,
        game: "spin",
        reward: winner.reward,
        label: winner.label,
        bonusSpin: winner.bonusSpin,
        allowReplay: wasBonusReplay,
      });
      setLastResult(winner);
      setBonusAvailable(!!winner.bonusSpin);
      if (!wasBonusReplay) setToday(play);

      if (winner.reward > 0) {
        toast.success(`🎉 You won ${winner.label}! Credited to wallet.`);
      } else if (winner.bonusSpin) {
        toast.success("🎁 Bonus Spin unlocked — spin again!");
      } else {
        toast("Better luck next time!");
      }
    } catch (e: any) {
      if (e?.message === "ALREADY_PLAYED_TODAY") {
        toast.error("You already used today's free spin.");
        const p = await getTodayPlay(uid, "spin");
        setToday(p);
      } else {
        toast.error("Could not save spin result. Try again.");
      }
    } finally {
      setSpinning(false);
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-amber-50 via-rose-50 to-violet-50 dark:from-amber-950/30 dark:via-rose-950/30 dark:to-violet-950/30">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Spin & Win — Daily 1 free spin
            </div>
            <h3 className="mt-2 text-2xl font-bold">Spin the Lucky Wheel</h3>
            <p className="text-sm text-muted-foreground">Win up to ₹100 cashback to your wallet</p>
          </div>

          {/* Wheel */}
          <div className="relative" style={{ width: SIZE + 40, height: SIZE + 40 }}>
            {/* Outer glow ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "conic-gradient(from 0deg, #fbbf24, #f43f5e, #8b5cf6, #06b6d4, #10b981, #fbbf24)",
                padding: 6,
                boxShadow: "0 18px 40px -12px rgba(0,0,0,0.45)",
              }}
            >
              <div className="h-full w-full rounded-full bg-white p-2 dark:bg-slate-900">
                <svg
                  width={SIZE}
                  height={SIZE}
                  viewBox={`0 0 ${SIZE} ${SIZE}`}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning
                      ? "transform 4s cubic-bezier(0.16, 1, 0.3, 1)"
                      : "none",
                  }}
                >
                  {SLICES.map((s, i) => {
                    const midAngle = i * sliceAngle + sliceAngle / 2 - 90;
                    const labelPos = polar(CENTER, CENTER, RADIUS * 0.62, midAngle);
                    return (
                      <g key={i}>
                        <path d={describeSlice(i, SLICES.length)} fill={s.color} stroke="#fff" strokeWidth={2} />
                        <text
                          x={labelPos.x}
                          y={labelPos.y}
                          fill={s.textColor || "#fff"}
                          fontSize={s.label.length > 8 ? 11 : 14}
                          fontWeight="700"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${midAngle + 90}, ${labelPos.x}, ${labelPos.y})`}
                          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
                        >
                          {s.label}
                        </text>
                      </g>
                    );
                  })}
                  {/* Center hub */}
                  <circle cx={CENTER} cy={CENTER} r={28} fill="#fff" stroke="#1f2937" strokeWidth={3} />
                  <circle cx={CENTER} cy={CENTER} r={10} fill="#f43f5e" />
                </svg>
              </div>
            </div>

            {/* Pointer */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: -2 }}
              aria-hidden
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "16px solid transparent",
                  borderRight: "16px solid transparent",
                  borderTop: "28px solid #1f2937",
                  filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))",
                }}
              />
            </div>
          </div>

          {/* Result */}
          {lastResult && (
            <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow-sm">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span className="font-semibold">
                Result: <span className="text-primary">{lastResult.label}</span>
              </span>
            </div>
          )}

          <Button
            size="lg"
            onClick={handleSpin}
            disabled={!canSpin}
            className="min-w-[200px] bg-gradient-to-r from-rose-500 via-amber-500 to-violet-500 text-white shadow-lg hover:opacity-90"
          >
            {spinning ? (
              <>
                <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> Spinning…
              </>
            ) : bonusAvailable ? (
              <>🎁 Use Bonus Spin</>
            ) : today ? (
              <>Come back tomorrow</>
            ) : (
              <>SPIN NOW</>
            )}
          </Button>

          {today && !bonusAvailable && (
            <p className="text-xs text-muted-foreground">
              Today's spin: <strong>{today.label}</strong>
              {today.reward > 0 ? ` (₹${today.reward} credited)` : ""}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

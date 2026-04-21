import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Package, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getTodayPlay, recordGamePlay, type GamePlay } from "@/lib/games-firebase";

interface BoxPrize {
  label: string;
  reward: number;
  emoji: string;
  weight: number;
}

const PRIZES: BoxPrize[] = [
  { label: "₹100 Treasure!", reward: 100, emoji: "💎", weight: 4 },
  { label: "₹50 Cashback",   reward: 50,  emoji: "💰", weight: 12 },
  { label: "₹20 Cashback",   reward: 20,  emoji: "🎁", weight: 22 },
  { label: "₹10 Coins",      reward: 10,  emoji: "🪙", weight: 28 },
  { label: "Empty Box 😅",   reward: 0,   emoji: "📦", weight: 34 },
];

function pickPrize(): BoxPrize {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of PRIZES) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return PRIZES[PRIZES.length - 1];
}

type Mode = 3 | 5;

export function TreasureBox() {
  const { appUser } = useAuth();
  const uid = appUser?.uid;

  const [mode, setMode] = useState<Mode>(3);
  const [today, setToday] = useState<GamePlay | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [openedIdx, setOpenedIdx] = useState<number | null>(null);
  const [prize, setPrize] = useState<BoxPrize | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    getTodayPlay(uid, "box")
      .then((p) => {
        setToday(p);
        if (p) {
          setPrize({
            label: p.label,
            reward: p.reward,
            emoji: p.reward > 0 ? "🎁" : "📦",
            weight: 0,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [uid]);

  const handlePick = async (idx: number) => {
    if (!uid || today || opening) return;
    setOpening(true);
    setOpenedIdx(idx);

    const win = pickPrize();
    setPrize(win);

    // Slight suspense delay
    await new Promise((r) => setTimeout(r, 900));

    try {
      const play = await recordGamePlay({
        uid,
        game: "box",
        reward: win.reward,
        label: win.label,
      });
      setToday(play);
      if (win.reward > 0) {
        toast.success(`🎉 ${win.label} credited to your wallet!`);
      } else {
        toast("So close! Try again tomorrow.");
      }
    } catch (e: any) {
      if (e?.message === "ALREADY_PLAYED_TODAY") {
        toast.error("You already opened a box today.");
      } else {
        toast.error("Could not save reward.");
      }
    } finally {
      setOpening(false);
    }
  };

  const boxColors = [
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-teal-600",
    "from-cyan-500 to-blue-600",
    "from-violet-500 to-fuchsia-600",
  ];

  return (
    <Card className="overflow-hidden border-2 border-violet-300/40 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-rose-50 dark:from-violet-950/20 dark:via-fuchsia-950/20 dark:to-rose-950/20">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" /> Treasure Box — Pick wisely
            </div>
            <h3 className="mt-2 text-2xl font-bold">Mystery Treasure Box</h3>
            <p className="text-sm text-muted-foreground">Choose 1 box, claim its surprise reward</p>
          </div>

          {/* Mode selector */}
          {!today && (
            <div className="inline-flex rounded-full border bg-card p-1 text-sm">
              {[3, 5].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m as Mode)}
                  disabled={opening}
                  className={`rounded-full px-4 py-1 font-semibold transition ${
                    mode === m ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
                  }`}
                >
                  {m} boxes
                </button>
              ))}
            </div>
          )}

          {/* Boxes */}
          <div className={`grid gap-4 ${mode === 3 ? "grid-cols-3" : "grid-cols-5"}`}>
            {Array.from({ length: today ? 1 : mode }).map((_, i) => {
              const isOpened = openedIdx === i || (today && i === 0);
              const showPrize = isOpened && prize;
              return (
                <button
                  key={i}
                  onClick={() => handlePick(i)}
                  disabled={!!today || opening}
                  className={`group relative aspect-square w-20 sm:w-24 rounded-2xl bg-gradient-to-br ${boxColors[i % boxColors.length]} p-1 shadow-xl transition-all duration-300 ${
                    isOpened ? "scale-110" : "hover:scale-105 hover:-translate-y-1"
                  } ${today && i !== 0 ? "opacity-40" : ""} ${opening && openedIdx !== i ? "opacity-50" : ""}`}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                    {showPrize ? (
                      <div className="flex flex-col items-center animate-in zoom-in duration-500">
                        <div className="text-3xl drop-shadow">{prize!.emoji}</div>
                        <div className="mt-0.5 text-[10px] font-bold text-white drop-shadow text-center px-1 leading-tight">
                          {prize!.label}
                        </div>
                      </div>
                    ) : (
                      <>
                        <Package className="h-8 w-8 text-white drop-shadow" strokeWidth={2.5} />
                        <span className="mt-1 text-xs font-bold text-white drop-shadow">#{i + 1}</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {today && prize && (
            <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow-sm">
              <span className="text-2xl">{prize.emoji}</span>
              <span className="font-semibold">
                Today's box: <span className="text-primary">{prize.label}</span>
              </span>
            </div>
          )}

          <Button variant="outline" disabled className="opacity-80">
            {loading ? (
              <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading…</>
            ) : today ? (
              "Come back tomorrow"
            ) : opening ? (
              "Opening box…"
            ) : (
              "Tap a box to open 👆"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

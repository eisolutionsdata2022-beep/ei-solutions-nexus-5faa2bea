/**
 * Daily mini-games for retailers.
 *
 * Three games: spin wheel, scratch card, treasure box.
 * Each user gets ONE free play per UTC-day per game.
 * Rewards (cash) are credited to the REWARDS wallet (not main wallet).
 * Retailer must request an admin-approved transfer to move them to the
 * main wallet — keeps free-money rewards behind a manual gate.
 *
 * Firestore layout:
 *   gamePlays/{uid}_{game}_{YYYY-MM-DD} → { uid, game, day, reward, label, createdAt }
 *   gameStats/{uid}                     → { totalRewards, totalPlays, lastPlayAt }
 */
import {
  doc, getDoc, setDoc, collection, query, where,
  onSnapshot, orderBy, limit, increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { creditRewards } from "./rewards-wallet";

export type GameKey = "spin" | "scratch" | "box";

export interface GamePlay {
  id: string;
  uid: string;
  game: GameKey;
  day: string;       // YYYY-MM-DD
  reward: number;    // ₹ credited
  label: string;     // e.g. "₹50", "Bonus Spin", "Try Again"
  bonusSpin?: boolean;
  createdAt: string;
}

const GAME_LABEL: Record<GameKey, string> = {
  spin: "Spin & Win",
  scratch: "Lucky Scratch",
  box: "Treasure Box",
};

export function todayKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function playId(uid: string, game: GameKey, day: string) {
  return `${uid}_${game}_${day}`;
}

/** Returns today's play record for a game, or null if user hasn't played yet. */
export async function getTodayPlay(uid: string, game: GameKey): Promise<GamePlay | null> {
  const id = playId(uid, game, todayKey());
  const snap = await getDoc(doc(db, "gamePlays", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<GamePlay, "id">) };
}

/**
 * Record a game play and credit reward.
 * Idempotent: if user already played today (and bonusSpin not flagged), throws.
 *
 * Pass `allowReplay: true` only when consuming a previously-earned bonus spin
 * (see consumeBonusSpin).
 */
export async function recordGamePlay(args: {
  uid: string;
  game: GameKey;
  reward: number;     // ₹ credited (0 for "Try Again")
  label: string;
  bonusSpin?: boolean;
  allowReplay?: boolean;
}): Promise<GamePlay> {
  const { uid, game, reward, label, bonusSpin, allowReplay } = args;
  const day = todayKey();
  const id = playId(uid, game, day);
  const ref = doc(db, "gamePlays", id);

  if (!allowReplay) {
    const existing = await getDoc(ref);
    if (existing.exists()) throw new Error("ALREADY_PLAYED_TODAY");
  }

  const record: Omit<GamePlay, "id"> = {
    uid,
    game,
    day,
    reward: Math.max(0, Math.round(reward)),
    label,
    bonusSpin: !!bonusSpin,
    createdAt: new Date().toISOString(),
  };

  // For bonus replays, append a numeric suffix so we don't overwrite the original
  if (allowReplay) {
    const suffixId = `${id}_bonus_${Date.now()}`;
    await setDoc(doc(db, "gamePlays", suffixId), record);
  } else {
    await setDoc(ref, record);
  }

  if (record.reward > 0) {
    try {
      await atomicCredit(uid, record.reward, {
        source: `game_${game}`,
        description: `${GAME_LABEL[game]} reward — ${label}`,
      });
    } catch (err) {
      console.error("Failed to credit game reward", err);
    }
  }

  // Update aggregate stats (best-effort)
  try {
    await setDoc(
      doc(db, "gameStats", uid),
      {
        uid,
        totalRewards: increment(record.reward),
        totalPlays: increment(1),
        lastPlayAt: record.createdAt,
      },
      { merge: true },
    );
  } catch {
    /* non-fatal */
  }

  return { id, ...record };
}

export interface GameStats {
  totalRewards: number;
  totalPlays: number;
  lastPlayAt?: string;
}

export async function getGameStats(uid: string): Promise<GameStats> {
  const snap = await getDoc(doc(db, "gameStats", uid));
  if (!snap.exists()) return { totalRewards: 0, totalPlays: 0 };
  const d = snap.data() as any;
  return {
    totalRewards: Number(d.totalRewards || 0),
    totalPlays: Number(d.totalPlays || 0),
    lastPlayAt: d.lastPlayAt,
  };
}

/** Subscribe to recent plays for a user (last 20). */
export function subscribeRecentPlays(
  uid: string,
  cb: (plays: GamePlay[]) => void,
) {
  const q = query(
    collection(db, "gamePlays"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(20),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: GamePlay[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<GamePlay, "id">) }));
      cb(list);
    },
    () => {
      // Index may not exist yet — fall back to empty list silently
      cb([]);
    },
  );
}

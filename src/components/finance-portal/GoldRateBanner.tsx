/**
 * Today's Gold Rate banner for the Finance dashboard.
 * - Reads daily-cached snapshot from Firestore (live subscription).
 * - On first paint of a new day, calls the server function to fetch a fresh
 *   rate from the public gold-price feed and writes it back to Firestore.
 * - Lets the user trigger a manual refresh.
 */
import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { fetchGoldRateINR } from "@/lib/gold-rate.functions";
import { saveGoldRate, subscribeGoldRate } from "@/lib/finance-firebase";
import type { GoldRateSnapshot } from "@/lib/finance-types";

interface Props {
  ownerId: string;
}

export function GoldRateBanner({ ownerId }: Props) {
  const fetchRate = useServerFn(fetchGoldRateINR);
  const [snap, setSnap] = useState<GoldRateSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!ownerId) return;
    const unsub = subscribeGoldRate(ownerId, setSnap);
    return () => unsub();
  }, [ownerId]);

  // Auto-fetch once per day, on first mount when cache is missing/stale.
  useEffect(() => {
    if (!ownerId) return;
    const today = new Date().toISOString().slice(0, 10);
    const fetchedDay = (snap?.fetchedAt || "").slice(0, 10);
    if (snap === undefined) return; // still loading initial subscribe
    if (snap === null || fetchedDay !== today) {
      void refresh(/*silent*/ true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, snap?.fetchedAt]);

  async function refresh(silent = false) {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const fresh = await fetchRate();
      await saveGoldRate({ ...fresh, retailerId: ownerId });
    } catch {
      // surfaces via the snapshot.error field next render if save succeeded;
      // if even the fetch threw, just stay silent.
      if (!silent) console.error("Gold rate refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  const rate24 = snap?.rate24k;
  const rate22 = snap?.rate22k;
  const isStale = !snap || (snap.fetchedAt || "").slice(0, 10) !== new Date().toISOString().slice(0, 10);
  const sourceLabel =
    snap?.source === "live"
      ? "Live"
      : snap?.source === "manual"
      ? "Manual"
      : snap?.source === "fallback"
      ? "Fallback"
      : "—";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
              Today's Gold Rate · INR/g
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {snap?.fetchedAt
                ? `Updated ${new Date(snap.fetchedAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })} · ${sourceLabel}`
                : "Fetching…"}
            </p>
          </div>
        </div>
        <button
          onClick={() => refresh(false)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Fetching…" : "Refresh"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        <RateBox label="22 Karat" value={rate22} loading={!snap && refreshing} accent />
        <RateBox label="24 Karat" value={rate24} loading={!snap && refreshing} />
      </div>

      {snap?.error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Showing fallback rate — upstream feed unreachable ({snap.error}). Tap Refresh to retry.
          </span>
        </div>
      )}
      {!snap?.error && isStale && snap && (
        <p className="mt-3 text-[11px] text-amber-300/80">
          Rate is from a previous day. Refreshing automatically…
        </p>
      )}
    </div>
  );
}

function RateBox({
  label,
  value,
  loading,
  accent,
}: {
  label: string;
  value?: number;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        accent
          ? "border-amber-400/30 bg-gradient-to-br from-amber-500/15 to-orange-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
        {loading ? (
          <span className="inline-block h-7 w-24 animate-pulse rounded bg-white/5" />
        ) : value ? (
          <>
            ₹{value.toLocaleString("en-IN")}
            <span className="ml-1 text-xs font-normal text-slate-500">/ g</span>
          </>
        ) : (
          "—"
        )}
      </p>
    </div>
  );
}

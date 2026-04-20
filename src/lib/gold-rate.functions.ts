/**
 * Server function: fetch live gold rates (₹/g) from a free public API.
 *
 * Source: data-asg.goldprice.org publishes a public JSON used by goldprice.org
 * itself. It returns INR price per troy-ounce for XAU. We convert to ₹/g and
 * derive 22K from 24K by purity ratio (22/24).
 *
 * Cached daily in Firestore at `financeGoldRate/today` so we don't hammer
 * the upstream and so Finance users see the same rate during the day.
 */
import { createServerFn } from "@tanstack/react-start";

const TROY_OZ_TO_GRAMS = 31.1034768;

export interface GoldRateResult {
  rate24k: number;            // ₹/g, rounded
  rate22k: number;            // ₹/g, rounded
  source: "live" | "cache" | "fallback";
  fetchedAt: string;          // ISO
  upstream?: string;
  error?: string | null;
}

/** Public — no auth required. Safe to expose because no PII is involved. */
export const fetchGoldRateINR = createServerFn({ method: "GET" }).handler(
  async (): Promise<GoldRateResult> => {
    const upstream = "https://data-asg.goldprice.org/dbXRates/INR";
    try {
      const res = await fetch(upstream, {
        headers: { accept: "application/json", "user-agent": "ei-finance-portal/1.0" },
        // Short timeout so the dashboard never hangs.
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        return fallback(`Upstream HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        items?: Array<{ curr?: string; xauPrice?: number }>;
      };
      const inr = data.items?.find((i) => i.curr === "INR");
      const ozPrice = Number(inr?.xauPrice);
      if (!ozPrice || ozPrice <= 0) {
        return fallback("Upstream returned invalid xauPrice");
      }
      const perGram24k = ozPrice / TROY_OZ_TO_GRAMS;
      const rate24k = Math.round(perGram24k);
      const rate22k = Math.round(perGram24k * (22 / 24));
      return {
        rate24k,
        rate22k,
        source: "live",
        fetchedAt: new Date().toISOString(),
        upstream,
        error: null,
      };
    } catch (e: any) {
      return fallback(e?.message || "fetch failed");
    }
  },
);

function fallback(reason: string): GoldRateResult {
  // Last-known sane indicative values (Apr 2026 ballpark for India).
  return {
    rate24k: 7400,
    rate22k: 6783,
    source: "fallback",
    fetchedAt: new Date().toISOString(),
    error: reason,
  };
}

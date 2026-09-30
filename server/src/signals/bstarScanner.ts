import { sma } from "technicalindicators";
import { STOCK_UNIVERSE } from "../providers/universe.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import { dedupeSameDay, checkCanSlimFundamentals } from "./trendScanner.js";
import type { HistoryPoint } from "../providers/types.js";

// B★ breakout system — a second, independent combo alongside the default
// SMA20/50+ADX+Supertrend Trend Following one (see trendScanner.ts).
// Unlike that combo (a SUSTAINED condition, true across a whole uptrend),
// a B★ entry is a one-off EVENT: price clears a tight multi-week
// consolidation on a volume surge, then exits on a close back below MA20.
// Mirrors client/src/utils/bstar.ts's computeBStarSignals exactly.
const BASE_WINDOW = 25; // ~5 trading weeks
const BASE_TIGHTNESS = 0.15; // (base high - base low) / base low, max 15%
const VOLUME_AVG_WINDOW = 20;
const VOLUME_MULTIPLIER = 1.4; // breakout volume must clear 140% of the 20-day average

function isBreakoutDay(points: HistoryPoint[], i: number): boolean {
  if (i < BASE_WINDOW || i < VOLUME_AVG_WINDOW) return false;

  let baseHigh = -Infinity;
  let baseLow = Infinity;
  for (let j = i - BASE_WINDOW; j < i; j++) {
    baseHigh = Math.max(baseHigh, points[j].high);
    baseLow = Math.min(baseLow, points[j].low);
  }
  if (baseLow <= 0 || (baseHigh - baseLow) / baseLow > BASE_TIGHTNESS) return false;

  const today = points[i];
  if (today.close <= baseHigh) return false;

  let volSum = 0;
  for (let j = i - VOLUME_AVG_WINDOW; j < i; j++) volSum += points[j].volume;
  const avgVol = volSum / VOLUME_AVG_WINDOW;
  return avgVol > 0 && today.volume >= avgVol * VOLUME_MULTIPLIER;
}

export interface BStarPositionState {
  isHolding: boolean;
  buyDate: string | null;
  buyPrice: number | null;
}

// Walks the FULL history forward simulating one open-at-a-time B★
// position to answer "is this symbol inside an open B★ trade right now,
// and since when" — a one-off breakout event can't be read off just the
// latest bar the way the sustained Trend Following condition can.
export function computeBStarState(points: HistoryPoint[]): BStarPositionState {
  if (points.length < 51) return { isHolding: false, buyDate: null, buyPrice: null };

  const closes = points.map((p) => p.close);
  const sma20Arr = sma({ period: 20, values: closes });
  const sma50Arr = sma({ period: 50, values: closes });
  const sma20Offset = points.length - sma20Arr.length;
  const sma50Offset = points.length - sma50Arr.length;

  let holding = false;
  let buyDate: string | null = null;
  let buyPrice: number | null = null;

  for (let i = 0; i < points.length; i++) {
    const s20 = i >= sma20Offset ? sma20Arr[i - sma20Offset] : undefined;
    const s50 = i >= sma50Offset ? sma50Arr[i - sma50Offset] : undefined;

    if (!holding) {
      if (s50 !== undefined && points[i].close > s50 && isBreakoutDay(points, i)) {
        holding = true;
        buyDate = points[i].time;
        buyPrice = points[i].close;
      }
    } else if (s20 !== undefined && points[i].close < s20) {
      holding = false;
      buyDate = null;
      buyPrice = null;
    }
  }

  return { isHolding: holding, buyDate, buyPrice };
}

export interface BStarHit {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  changePercent: number;
  buyDate: string;
  buyPrice: number;
  signalReturnPercent: number;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Live, on-demand fallback over the curated ~70-symbol STOCK_UNIVERSE —
// used only until the background Cron scan (signals/backgroundScan.ts,
// full ~1,600-symbol universe) has produced its first result.
export async function scanBStarSignals(): Promise<BStarHit[]> {
  const hits = await mapWithConcurrency(STOCK_UNIVERSE, 20, async (seed): Promise<BStarHit | null> => {
    try {
      const { points: raw } = await getHistoryWithFallback(seed.symbol, "1Y");
      const points = dedupeSameDay(raw);
      if (points.length === 0) return null;
      const state = computeBStarState(points);
      if (!state.isHolding || state.buyDate === null || state.buyPrice === null) return null;

      const hasSolidFundamentals = await checkCanSlimFundamentals(seed.symbol);
      if (!hasSolidFundamentals) return null;

      const last = points[points.length - 1];
      const prev = points.length > 1 ? points[points.length - 2] : null;
      const changePercent = prev && prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0;

      return {
        symbol: seed.symbol,
        name: seed.name,
        exchange: seed.exchange,
        currency: seed.currency,
        price: last.close,
        changePercent,
        buyDate: state.buyDate,
        buyPrice: state.buyPrice,
        signalReturnPercent: ((last.close - state.buyPrice) / state.buyPrice) * 100,
      };
    } catch {
      return null;
    }
  });

  return hits.filter((h): h is BStarHit => h !== null).sort((a, b) => b.buyDate.localeCompare(a.buyDate));
}

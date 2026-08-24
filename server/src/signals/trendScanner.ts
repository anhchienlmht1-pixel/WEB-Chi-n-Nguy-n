import { adx, atr, sma } from "technicalindicators";
import { STOCK_UNIVERSE } from "../providers/universe.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import type { HistoryPoint } from "../providers/types.js";

// Same trend-following combo as the chart's own Mua/Bán markers
// (client/src/utils/signals.ts computeTradingSignals — SMA20 > SMA50,
// ADX(14) > 25, Supertrend(10,3) uptrend for a buy), ported here so it can
// run once across the whole stock universe server-side instead of the
// browser looping through dozens of per-symbol history fetches.

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

// Same-day duplicate bars (see client/src/utils/aggregate.ts's
// dedupeSameDay — the "today" row can arrive twice while KBS is still
// settling it) would misalign every indicator below just as badly here as
// on the chart, so collapse them the same way before computing anything.
function dedupeSameDay(points: HistoryPoint[]): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (prev && dayKey(prev.time) === dayKey(p.time)) {
      out[out.length - 1] = p;
    } else {
      out.push(p);
    }
  }
  return out;
}

// Direction only (not the line's y-value, since nothing here charts it) —
// same ATR-banded flip algorithm as the client's computeSupertrend.
function computeSupertrendDirections(points: HistoryPoint[], period: number, multiplier: number): (1 | -1)[] {
  const atrValues = atr({
    high: points.map((p) => p.high),
    low: points.map((p) => p.low),
    close: points.map((p) => p.close),
    period,
  });
  const offset = points.length - atrValues.length;
  if (offset < 0 || atrValues.length === 0) return [];

  const finalUpper: number[] = [];
  const finalLower: number[] = [];
  const directions: (1 | -1)[] = [];

  for (let i = 0; i < atrValues.length; i++) {
    const idx = offset + i;
    const p = points[idx];
    const hl2 = (p.high + p.low) / 2;
    const basicUpper = hl2 + multiplier * atrValues[i];
    const basicLower = hl2 - multiplier * atrValues[i];

    if (i === 0) {
      finalUpper.push(basicUpper);
      finalLower.push(basicLower);
      directions.push(p.close <= basicUpper ? -1 : 1);
      continue;
    }

    const prevClose = points[idx - 1].close;
    const prevUpper = finalUpper[i - 1];
    const prevLower = finalLower[i - 1];
    const upper = basicUpper < prevUpper || prevClose > prevUpper ? basicUpper : prevUpper;
    const lower = basicLower > prevLower || prevClose < prevLower ? basicLower : prevLower;
    finalUpper.push(upper);
    finalLower.push(lower);

    const prevDirection = directions[i - 1];
    const direction: 1 | -1 = prevDirection === -1 ? (p.close > upper ? 1 : -1) : p.close < lower ? -1 : 1;
    directions.push(direction);
  }

  return directions;
}

// Walk back from the latest bar: is it currently a buy, and if so, how far
// back does the uninterrupted buy streak go (for "tín hiệu từ ngày...").
export function latestBuySince(points: HistoryPoint[]): string | null {
  if (points.length < 51) return null;

  const closes = points.map((p) => p.close);
  const sma20 = sma({ period: 20, values: closes });
  const sma50 = sma({ period: 50, values: closes });
  const adxRows = adx({ high: points.map((p) => p.high), low: points.map((p) => p.low), close: closes, period: 14 });
  const directions = computeSupertrendDirections(points, 10, 3);

  const n = points.length;
  const sma20Offset = n - sma20.length;
  const sma50Offset = n - sma50.length;
  const adxOffset = n - adxRows.length;
  const dirOffset = n - directions.length;

  let since: string | null = null;
  for (let i = n - 1; i >= 0; i--) {
    if (i < sma20Offset || i < sma50Offset || i < adxOffset || i < dirOffset) break;
    const s20 = sma20[i - sma20Offset];
    const s50 = sma50[i - sma50Offset];
    const adxVal = adxRows[i - adxOffset]?.adx;
    const direction = directions[i - dirOffset];
    if (s20 === undefined || s50 === undefined || adxVal === undefined || direction === undefined) break;

    const isBuy = s20 > s50 && adxVal > 25 && direction === 1;
    if (i === n - 1 && !isBuy) return null;
    if (!isBuy) break;
    since = points[i].time;
  }

  return since;
}

export interface BuySignalHit {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  changePercent: number;
  signalSince: string;
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

export async function scanBuySignals(): Promise<BuySignalHit[]> {
  const failed = new Map<string, string>();
  const hits = await mapWithConcurrency(STOCK_UNIVERSE, 20, async (seed): Promise<BuySignalHit | null> => {
    try {
      const { points: raw } = await getHistoryWithFallback(seed.symbol, "1Y");
      const points = dedupeSameDay(raw);
      const since = latestBuySince(points);
      if (!since || points.length === 0) {
        if (points.length === 0) {
          failed.set(seed.symbol, "No historical data");
        }
        return null;
      }

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
        signalSince: since,
      };
    } catch (err) {
      // A single symbol's data being unavailable shouldn't fail the whole
      // scan — it's simply excluded from the result, same as it just not
      // having a buy signal.
      failed.set(seed.symbol, err instanceof Error ? err.message : String(err));
      return null;
    }
  });

  const results = hits
    .filter((h): h is BuySignalHit => h !== null)
    .sort((a, b) => b.signalSince.localeCompare(a.signalSince));

  // Log failures for debugging (especially UPCOM symbols)
  const upcomFailed = Array.from(failed.entries()).filter(([sym]) =>
    STOCK_UNIVERSE.find(s => s.symbol === sym)?.exchange === "UPCOM"
  );
  if (upcomFailed.length > 0) {
    console.warn("[trendScanner] UPCOM stocks failed to scan:",
      Object.fromEntries(upcomFailed));
  }

  return results;
}

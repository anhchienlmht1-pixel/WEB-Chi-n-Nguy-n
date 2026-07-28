import { sma } from "technicalindicators";
import { STOCK_UNIVERSE } from "../providers/universe.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import type { HistoryPoint } from "../providers/types.js";

// Same same-day-duplicate-bar guard as trendScanner.ts (client/src/utils/
// aggregate.ts's dedupeSameDay) — KBS's "today" row can arrive twice while
// end-of-day settlement is still finalizing, which would otherwise throw
// off the SMA computed off the tail of the series.
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}
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

export const MA_PERIODS = [10, 20, 50, 100, 200] as const;
export type MaPeriod = (typeof MA_PERIODS)[number];

function latestSma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const values = sma({ period, values: closes });
  const last = values[values.length - 1];
  return last === undefined ? null : last;
}

export interface MaScanHit {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  changePercent: number;
  ma: Partial<Record<MaPeriod, number | null>>;
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

// Computes every supported MA period (10/20/50/100/200) in one pass per
// symbol — since the expensive part is fetching each symbol's price
// history, not the SMA math itself, this lets the client switch which
// period it filters/sorts by instantly, without a fresh scan per period.
export async function scanMovingAverages(): Promise<MaScanHit[]> {
  const hits = await mapWithConcurrency(STOCK_UNIVERSE, 20, async (seed): Promise<MaScanHit | null> => {
    try {
      const { points: raw } = await getHistoryWithFallback(seed.symbol, "1Y");
      const points = dedupeSameDay(raw);
      if (points.length === 0) return null;

      const closes = points.map((p) => p.close);
      const last = points[points.length - 1];
      const prev = points.length > 1 ? points[points.length - 2] : null;
      const changePercent = prev && prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0;

      const ma: Partial<Record<MaPeriod, number | null>> = {};
      for (const period of MA_PERIODS) ma[period] = latestSma(closes, period);

      return {
        symbol: seed.symbol,
        name: seed.name,
        exchange: seed.exchange,
        currency: seed.currency,
        price: last.close,
        changePercent,
        ma,
      };
    } catch {
      // A single symbol's data being unavailable shouldn't fail the whole
      // scan — it's simply excluded from the result.
      return null;
    }
  });

  return hits.filter((h): h is MaScanHit => h !== null);
}

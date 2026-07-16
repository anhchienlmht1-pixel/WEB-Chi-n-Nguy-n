import { Candle } from "./types";

// VNDirect's dchart API only serves daily ("D") resolution reliably — "W"/"M"
// return a plain-text "Not supported" instead of JSON. So weekly/monthly
// candles are built here by rolling up daily bars client/server-side.
export type ChartResolution = "D" | "W" | "M";

function bucketKey(date: Date, resolution: ChartResolution): string {
  if (resolution === "M") return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
  // ISO week bucket: year + week number of the Thursday of that week.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

/**
 * Rolls daily candles up into weekly or monthly bars: open of the first day
 * in the bucket, close of the last, high/low across the bucket, volume
 * summed. `candles` must already be sorted ascending by time.
 */
export function aggregateCandles(candles: Candle[], resolution: ChartResolution): Candle[] {
  if (resolution === "D" || candles.length === 0) return candles;

  const buckets: Candle[] = [];
  let currentKey: string | null = null;

  for (const candle of candles) {
    const date = new Date(candle.time * 1000);
    const key = bucketKey(date, resolution);
    if (key !== currentKey) {
      buckets.push({ ...candle });
      currentKey = key;
    } else {
      const bucket = buckets[buckets.length - 1];
      bucket.high = Math.max(bucket.high, candle.high);
      bucket.low = Math.min(bucket.low, candle.low);
      bucket.close = candle.close;
      bucket.volume += candle.volume;
      bucket.time = candle.time; // bucket keyed by its last (most recent) trading day
    }
  }

  return buckets;
}

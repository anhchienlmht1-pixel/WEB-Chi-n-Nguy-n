import type { HistoryPoint } from "../types";

// The backend always serves daily bars — weekly/monthly candles are rolled
// up from those here, so switching resolution changes what one candle
// *represents* (a day / a week / a month) instead of just how far back the
// chart looks.
export type ChartResolution = "D" | "W" | "M";

function bucketKey(date: Date, resolution: ChartResolution): string {
  if (resolution === "M") return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

/**
 * Rolls daily points up into weekly or monthly bars: open of the first day
 * in the bucket, close of the last, high/low across the bucket, volume
 * summed. `points` must already be sorted ascending by time.
 */
export function aggregatePoints(points: HistoryPoint[], resolution: ChartResolution): HistoryPoint[] {
  if (resolution === "D" || points.length === 0) return points;

  const buckets: HistoryPoint[] = [];
  let currentKey: string | null = null;

  for (const point of points) {
    const date = new Date(point.time);
    const key = bucketKey(date, resolution);
    if (key !== currentKey) {
      buckets.push({ ...point });
      currentKey = key;
    } else {
      const bucket = buckets[buckets.length - 1];
      bucket.high = Math.max(bucket.high, point.high);
      bucket.low = Math.min(bucket.low, point.low);
      bucket.close = point.close;
      bucket.volume += point.volume;
      bucket.time = point.time; // bucket keyed by its last (most recent) trading day
    }
  }

  return buckets;
}

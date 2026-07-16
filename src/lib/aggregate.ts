import { Candle } from "./types";

function periodKey(unixSeconds: number, period: "week" | "month"): string {
  const date = new Date(unixSeconds * 1000);

  if (period === "month") {
    return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
  }

  // Bucket by the Monday of each ISO-ish week (ignores locale, just needs
  // to be a stable, consistent key).
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

/**
 * Buckets daily candles into weekly/monthly OHLCV candles. VNDirect's
 * dchart endpoint doesn't actually support resolution=W/M (it returns a
 * plain-text "Not supported" body instead of JSON for those), so the
 * weekly/monthly chart views are built client-independent from daily bars
 * instead of trusting the upstream API to do it.
 */
export function aggregateCandles(candles: Candle[], period: "week" | "month"): Candle[] {
  if (candles.length === 0) return [];

  const groups = new Map<string, Candle[]>();
  for (const c of candles) {
    const key = periodKey(c.time, period);
    const list = groups.get(key);
    if (list) list.push(c);
    else groups.set(key, [c]);
  }

  const result: Candle[] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => a.time - b.time);
    const first = group[0];
    const last = group[group.length - 1];
    result.push({
      time: first.time,
      open: first.open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: last.close,
      volume: group.reduce((sum, c) => sum + c.volume, 0),
    });
  }

  return result.sort((a, b) => a.time - b.time);
}

import type { HistoryPoint } from "../types";

export interface SeasonalityTable {
  years: number[];
  // returns[yearIndex][month 0-11] = % change of month-end close vs the
  // previous available month-end close, or null where there's no data.
  returns: (number | null)[][];
}

export function buildMonthlyReturns(points: HistoryPoint[]): SeasonalityTable {
  if (points.length === 0) return { years: [], returns: [] };

  // Last close price seen in each year-month bucket.
  const closeByKey = new Map<string, number>();
  for (const p of [...points].sort((a, b) => a.time.localeCompare(b.time))) {
    const d = new Date(p.time);
    closeByKey.set(`${d.getFullYear()}-${d.getMonth()}`, p.close);
  }

  const buckets = Array.from(closeByKey.entries())
    .map(([key, close]) => {
      const [year, month] = key.split("-").map(Number);
      return { year, month, close };
    })
    .sort((a, b) => a.year - b.year || a.month - b.month);

  const years = Array.from(new Set(buckets.map((b) => b.year))).sort((a, b) => a - b);
  const returns: (number | null)[][] = years.map(() => Array(12).fill(null));

  for (let i = 1; i < buckets.length; i++) {
    const cur = buckets[i];
    const prev = buckets[i - 1];
    const yearIdx = years.indexOf(cur.year);
    returns[yearIdx][cur.month] = ((cur.close - prev.close) / prev.close) * 100;
  }

  return { years, returns };
}

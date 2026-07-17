import type { HistoryPoint } from "../types";
import { toSeconds } from "./indicatorCatalog";

export interface ReturnPoint {
  time: number;
  value: number; // cumulative % return since the first bar
}

export interface ReturnSeries {
  symbol: string;
  points: ReturnPoint[];
}

/** Converts a price series into cumulative % return from its first bar. */
export function toCumulativeReturns(symbol: string, points: HistoryPoint[]): ReturnSeries {
  if (points.length === 0) return { symbol, points: [] };
  const base = points[0].close;
  return {
    symbol,
    points: points.map((p) => ({ time: toSeconds(p), value: base ? ((p.close - base) / base) * 100 : 0 })),
  };
}

/**
 * Equal-weighted average return across symbols, at each date that ALL of
 * them have a bar for — an intersection rather than forward-filling missing
 * days, so the average is never computed from a partially-fabricated point.
 */
export function computePortfolioAverage(seriesList: ReturnSeries[]): ReturnPoint[] {
  const nonEmpty = seriesList.filter((s) => s.points.length > 0);
  if (nonEmpty.length === 0) return [];

  const maps = nonEmpty.map((s) => new Map(s.points.map((p) => [p.time, p.value])));
  const [first, ...rest] = maps;
  const commonTimes = [...first.keys()].filter((t) => rest.every((m) => m.has(t))).sort((a, b) => a - b);

  return commonTimes.map((t) => ({
    t,
    value: maps.reduce((sum, m) => sum + (m.get(t) as number), 0) / maps.length,
  })).map(({ t, value }) => ({ time: t, value }));
}

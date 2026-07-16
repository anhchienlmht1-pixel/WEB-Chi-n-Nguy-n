import type { HistoryPoint } from "../types";

export interface IndicatorPoint {
  time: number; // unix seconds
  value: number;
}

export interface MacdPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

function toSeconds(p: HistoryPoint): number {
  return Math.floor(new Date(p.time).getTime() / 1000);
}

/** Simple moving average — `length - 1` leading points are dropped (no value yet). */
export function sma(points: HistoryPoint[], length: number): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    sum += points[i].close;
    if (i >= length) sum -= points[i - length].close;
    if (i >= length - 1) out.push({ time: toSeconds(points[i]), value: sum / length });
  }
  return out;
}

function ema(values: number[], length: number): number[] {
  const k = 2 / (length + 1);
  const out: number[] = [];
  let prev: number | null = null;
  for (const v of values) {
    prev = prev === null ? v : v * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

/** Wilder's RSI. First `length` points are dropped (need a seed average). */
export function rsi(points: HistoryPoint[], length = 14): IndicatorPoint[] {
  if (points.length <= length) return [];

  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const diff = points[i].close - points[i - 1].close;
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }

  const out: IndicatorPoint[] = [];
  let avgGain = gains.slice(0, length).reduce((a, b) => a + b, 0) / length;
  let avgLoss = losses.slice(0, length).reduce((a, b) => a + b, 0) / length;

  const rsiFromAvg = (g: number, l: number) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  out.push({ time: toSeconds(points[length]), value: rsiFromAvg(avgGain, avgLoss) });

  for (let i = length; i < gains.length; i++) {
    avgGain = (avgGain * (length - 1) + gains[i]) / length;
    avgLoss = (avgLoss * (length - 1) + losses[i]) / length;
    out.push({ time: toSeconds(points[i + 1]), value: rsiFromAvg(avgGain, avgLoss) });
  }

  return out;
}

/** Standard MACD(12,26,9): fast EMA - slow EMA, with a 9-period signal EMA. */
export function macd(points: HistoryPoint[], fast = 12, slow = 26, signalLength = 9): MacdPoint[] {
  if (points.length === 0) return [];

  const closes = points.map((p) => p.close);
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const macdLine = closes.map((_, i) => fastEma[i] - slowEma[i]);
  const signalLine = ema(macdLine, signalLength);

  const start = slow - 1;
  const out: MacdPoint[] = [];
  for (let i = start; i < points.length; i++) {
    out.push({
      time: toSeconds(points[i]),
      macd: macdLine[i],
      signal: signalLine[i],
      histogram: macdLine[i] - signalLine[i],
    });
  }
  return out;
}

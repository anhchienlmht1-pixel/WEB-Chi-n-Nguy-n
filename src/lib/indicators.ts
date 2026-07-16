import { Candle } from "./types";

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface MacdPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

/** Simple moving average — `length - 1` leading points are dropped (no value yet). */
export function sma(candles: Candle[], length: number): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= length) sum -= candles[i - length].close;
    if (i >= length - 1) out.push({ time: candles[i].time, value: sum / length });
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
export function rsi(candles: Candle[], length = 14): IndicatorPoint[] {
  if (candles.length <= length) return [];

  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }

  const out: IndicatorPoint[] = [];
  let avgGain = gains.slice(0, length).reduce((a, b) => a + b, 0) / length;
  let avgLoss = losses.slice(0, length).reduce((a, b) => a + b, 0) / length;

  const rsiFromAvg = (g: number, l: number) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  out.push({ time: candles[length].time, value: rsiFromAvg(avgGain, avgLoss) });

  for (let i = length; i < gains.length; i++) {
    avgGain = (avgGain * (length - 1) + gains[i]) / length;
    avgLoss = (avgLoss * (length - 1) + losses[i]) / length;
    out.push({ time: candles[i + 1].time, value: rsiFromAvg(avgGain, avgLoss) });
  }

  return out;
}

/** Standard MACD(12,26,9): fast EMA - slow EMA, with a 9-period signal EMA. */
export function macd(candles: Candle[], fast = 12, slow = 26, signalLength = 9): MacdPoint[] {
  if (candles.length === 0) return [];

  const closes = candles.map((c) => c.close);
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const macdLine = closes.map((_, i) => fastEma[i] - slowEma[i]);
  const signalLine = ema(macdLine, signalLength);

  // Drop the warm-up period equal to the slow EMA length so the line isn't
  // dominated by an unseasoned early average.
  const start = slow - 1;
  const out: MacdPoint[] = [];
  for (let i = start; i < candles.length; i++) {
    out.push({
      time: candles[i].time,
      macd: macdLine[i],
      signal: signalLine[i],
      histogram: macdLine[i] - signalLine[i],
    });
  }
  return out;
}

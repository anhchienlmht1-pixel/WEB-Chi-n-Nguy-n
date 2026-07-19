import { rsi, atr, sma } from "technicalindicators";
import type { HistoryPoint } from "../types";

export interface BacktestParams {
  rsiPeriod: number;
  rsiThreshold: number; // entry when RSI < threshold (oversold)
  atrPeriod: number;
  slMultiplier: number; // stop-loss = entry - ATR * slMultiplier
  tpMultiplier: number; // take-profit = entry + ATR * tpMultiplier
}

export const DEFAULT_BACKTEST_PARAMS: BacktestParams = {
  rsiPeriod: 14,
  rsiThreshold: 30,
  atrPeriod: 14,
  slMultiplier: 2,
  tpMultiplier: 3,
};

export interface BacktestTrade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  pnlPercent: number;
  exitReason: "SL" | "TP";
}

export interface BacktestStats {
  totalTrades: number;
  winRate: number; // %, 0 when there are no trades
  avgWin: number; // % average of winning trades' pnlPercent
  avgLoss: number; // % average of losing trades' pnlPercent (negative)
  totalPnl: number; // % sum of every trade's pnlPercent
}

export interface BacktestResult {
  trades: BacktestTrade[];
  stats: BacktestStats;
}

function computeStats(trades: BacktestTrade[]): BacktestStats {
  if (trades.length === 0) {
    return { totalTrades: 0, winRate: 0, avgWin: 0, avgLoss: 0, totalPnl: 0 };
  }
  const wins = trades.filter((t) => t.pnlPercent > 0);
  const losses = trades.filter((t) => t.pnlPercent < 0);
  return {
    totalTrades: trades.length,
    winRate: (wins.length / trades.length) * 100,
    avgWin: wins.length > 0 ? wins.reduce((s, t) => s + t.pnlPercent, 0) / wins.length : 0,
    avgLoss: losses.length > 0 ? losses.reduce((s, t) => s + t.pnlPercent, 0) / losses.length : 0,
    totalPnl: trades.reduce((s, t) => s + t.pnlPercent, 0),
  };
}

// Single-position RSI-oversold entry / ATR stop-loss-take-profit exit —
// ported 1:1 from a user-supplied reference backtest (same thresholds,
// same "entry and exit never happen on the same bar" behavior, same
// SL-checked-before-TP tie-break, and an open position at the series' end
// is left out of the trade list rather than force-closed, matching the
// reference exactly). Runs entirely client-side on whatever HistoryPoint[]
// the caller already fetched — no separate backtest API.
export function runRsiAtrBacktest(points: HistoryPoint[], params: BacktestParams): BacktestResult {
  const sorted = [...points].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  const minBars = Math.max(params.rsiPeriod, params.atrPeriod) + 2;
  if (sorted.length < minBars) return { trades: [], stats: computeStats([]) };

  const closes = sorted.map((p) => p.close);
  const highs = sorted.map((p) => p.high);
  const lows = sorted.map((p) => p.low);

  const rsiValues = rsi({ period: params.rsiPeriod, values: closes });
  const atrValues = atr({ period: params.atrPeriod, high: highs, low: lows, close: closes });
  // `technicalindicators` drops leading warm-up bars and returns a shorter,
  // tail-aligned array — re-derive each series' offset into `sorted` once.
  const rsiOffset = sorted.length - rsiValues.length;
  const atrOffset = sorted.length - atrValues.length;
  const rsiAt = (i: number): number | null => {
    const idx = i - rsiOffset;
    return idx >= 0 && idx < rsiValues.length ? rsiValues[idx] : null;
  };
  const atrAt = (i: number): number | null => {
    const idx = i - atrOffset;
    return idx >= 0 && idx < atrValues.length ? atrValues[idx] : null;
  };

  const trades: BacktestTrade[] = [];
  let position: { entryPrice: number; entryDate: string; stopLoss: number; takeProfit: number } | null = null;

  for (const [i, bar] of sorted.entries()) {
    if (!position) {
      const r = rsiAt(i);
      const a = atrAt(i);
      if (r != null && a != null && r < params.rsiThreshold) {
        position = {
          entryPrice: bar.close,
          entryDate: bar.time,
          stopLoss: bar.close - a * params.slMultiplier,
          takeProfit: bar.close + a * params.tpMultiplier,
        };
      }
      continue;
    }

    if (bar.low <= position.stopLoss) {
      trades.push({
        entryDate: position.entryDate,
        entryPrice: position.entryPrice,
        exitDate: bar.time,
        exitPrice: position.stopLoss,
        pnlPercent: ((position.stopLoss - position.entryPrice) / position.entryPrice) * 100,
        exitReason: "SL",
      });
      position = null;
    } else if (bar.high >= position.takeProfit) {
      trades.push({
        entryDate: position.entryDate,
        entryPrice: position.entryPrice,
        exitDate: bar.time,
        exitPrice: position.takeProfit,
        pnlPercent: ((position.takeProfit - position.entryPrice) / position.entryPrice) * 100,
        exitReason: "TP",
      });
      position = null;
    }
  }

  return { trades, stats: computeStats(trades) };
}

export interface SmaOptimizationRow {
  short: number;
  long: number;
  crossovers: number;
  totalReturnPercent: number;
  returnPerTradePercent: number;
}

export const DEFAULT_SHORT_PERIODS = [5, 10, 15, 20, 25];
export const DEFAULT_LONG_PERIODS = [50, 100, 150, 200];

// Left-pads a tail-aligned indicator output back to the full bar count, so
// `values[i]` lines up with `sorted[i]` directly (null before the SMA has
// enough bars, matching pandas' NaN there).
function alignToFull(totalLength: number, values: number[]): (number | null)[] {
  const offset = totalLength - values.length;
  return Array.from({ length: totalLength }, (_, i) => (i >= offset ? values[i - offset] : null));
}

// Grid search over (short, long) SMA period pairs — ported from a
// user-supplied pandas reference. Faithfully reproduces its exact
// (slightly quirky) semantics rather than a "corrected" version: pandas'
// `(SMA_short > SMA_long).astype(int)` evaluates any NaN comparison as
// False, so Signal is 0 — not undefined — during SMA warm-up, and .prod()/
// .sum() silently skip NaN rows (only the very first bar, where both
// Signal.shift(1) and Returns are undefined) rather than the whole
// warm-up window. Getting this wrong would silently change which period
// pair "wins".
export function optimizeSmaCrossover(
  points: HistoryPoint[],
  shortPeriods: number[] = DEFAULT_SHORT_PERIODS,
  longPeriods: number[] = DEFAULT_LONG_PERIODS
): SmaOptimizationRow[] {
  const sorted = [...points].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  const closes = sorted.map((p) => p.close);
  const n = sorted.length;
  if (n < 3) return [];

  const returns: (number | null)[] = closes.map((c, i) => (i === 0 ? null : (c - closes[i - 1]) / closes[i - 1]));
  const smaCache = new Map<number, (number | null)[]>();
  const smaFor = (period: number): (number | null)[] => {
    let cached = smaCache.get(period);
    if (!cached) {
      cached = n > period ? alignToFull(n, sma({ period, values: closes })) : Array(n).fill(null);
      smaCache.set(period, cached);
    }
    return cached;
  };

  const rows: SmaOptimizationRow[] = [];
  for (const short of shortPeriods) {
    for (const long of longPeriods) {
      if (short >= long) continue;
      const smaShort = smaFor(short);
      const smaLong = smaFor(long);

      const signal = closes.map((_, i) => {
        const s = smaShort[i];
        const l = smaLong[i];
        return s != null && l != null && s > l ? 1 : 0;
      });

      let crossovers = 0;
      let product = 1;
      for (let i = 1; i < n; i++) {
        crossovers += Math.abs(signal[i] - signal[i - 1]);
        const r = returns[i];
        if (r != null) product *= 1 + signal[i - 1] * r;
      }
      const totalReturn = product - 1;

      rows.push({
        short,
        long,
        crossovers,
        totalReturnPercent: totalReturn * 100,
        returnPerTradePercent: crossovers > 0 ? (totalReturn / crossovers) * 100 : 0,
      });
    }
  }

  return rows.sort((a, b) => b.totalReturnPercent - a.totalReturnPercent);
}

export interface OutOfSampleRow {
  short: number;
  long: number;
  inSampleReturnPercent: number;
  outOfSampleReturnPercent: number;
  inSampleCrossovers: number;
  outOfSampleCrossovers: number;
}

export interface OutOfSampleResult {
  trainBars: number;
  testBars: number;
  trainPeriod: { from: string; to: string };
  testPeriod: { from: string; to: string };
  rows: OutOfSampleRow[]; // ranked by in-sample return, same order optimizeSmaCrossover would pick a "winner" in
}

// The optimizer above answers "which pair fit this data best" — not "which
// pair will keep working." Ranking and reporting return on the exact same
// window it was chosen from is the textbook overfitting mistake: a pair can
// win in-sample purely by curve-fitting noise in that specific period. This
// holds out the most recent `1 - trainRatio` of the series as a test window
// never used for selection, and reports each pair's in-sample return
// side-by-side with its out-of-sample return so a pair that only "worked"
// in-sample is visible as such rather than presented as the answer.
export function optimizeSmaCrossoverOutOfSample(
  points: HistoryPoint[],
  shortPeriods: number[] = DEFAULT_SHORT_PERIODS,
  longPeriods: number[] = DEFAULT_LONG_PERIODS,
  trainRatio = 0.7
): OutOfSampleResult {
  const sorted = [...points].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  const splitIdx = Math.floor(sorted.length * trainRatio);
  const trainPoints = sorted.slice(0, splitIdx);
  const testPoints = sorted.slice(splitIdx);

  const trainRows = optimizeSmaCrossover(trainPoints, shortPeriods, longPeriods);
  const testRows = optimizeSmaCrossover(testPoints, shortPeriods, longPeriods);
  const testByKey = new Map(testRows.map((r) => [`${r.short}-${r.long}`, r]));

  const rows: OutOfSampleRow[] = trainRows.map((r) => {
    const test = testByKey.get(`${r.short}-${r.long}`);
    return {
      short: r.short,
      long: r.long,
      inSampleReturnPercent: r.totalReturnPercent,
      outOfSampleReturnPercent: test?.totalReturnPercent ?? 0,
      inSampleCrossovers: r.crossovers,
      outOfSampleCrossovers: test?.crossovers ?? 0,
    };
  });

  return {
    trainBars: trainPoints.length,
    testBars: testPoints.length,
    trainPeriod: { from: trainPoints[0]?.time ?? "", to: trainPoints[trainPoints.length - 1]?.time ?? "" },
    testPeriod: { from: testPoints[0]?.time ?? "", to: testPoints[testPoints.length - 1]?.time ?? "" },
    rows,
  };
}

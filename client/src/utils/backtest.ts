import { rsi, atr } from "technicalindicators";
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

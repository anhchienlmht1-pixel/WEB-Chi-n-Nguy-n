import type { HistoryPoint } from "../types";
import { rsi, macd } from "./indicators";
import { computeSupertrend } from "./signals";

export type AlertType = "OVERSOLD" | "BUY" | "REVERSAL";

export interface DailyAlert {
  symbol: string;
  time: string; // ISO of the latest bar
  type: AlertType;
  indicator: "RSI" | "MACD" | "SUPERTREND";
  value: number;
  message: string;
}

const RSI_OVERSOLD = 30;
const RSI_LENGTH = 14;
const MACD_FAST = 12;
const MACD_SLOW = 26;
const MACD_SIGNAL = 9;
const SUPERTREND_PERIOD = 10;
const SUPERTREND_MULTIPLIER = 3;

// Three independent daily alert conditions — ported from a user-supplied
// Python reference (same thresholds/periods, same "crossover happened
// between the last two bars" check for MACD and Supertrend). Runs on
// whatever HistoryPoint[] the caller already has (Watchlist already fetches
// 3M of history per symbol for its sparklines — this reuses that, no extra
// request), so it only needs enough bars for the longest indicator's
// warm-up (MACD's slow+signal) plus one extra bar to detect a crossover.
export function generateDailyAlerts(symbol: string, points: HistoryPoint[]): DailyAlert[] {
  const sorted = [...points].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  if (sorted.length < MACD_SLOW + MACD_SIGNAL + 2) return [];

  const latest = sorted[sorted.length - 1];
  const alerts: DailyAlert[] = [];

  const rsiSeries = rsi(sorted, RSI_LENGTH);
  const lastRsi = rsiSeries[rsiSeries.length - 1];
  if (lastRsi && lastRsi.value < RSI_OVERSOLD) {
    alerts.push({
      symbol,
      time: latest.time,
      type: "OVERSOLD",
      indicator: "RSI",
      value: lastRsi.value,
      message: `${symbol}: RSI = ${lastRsi.value.toFixed(2)} (Quá bán)`,
    });
  }

  const macdSeries = macd(sorted, MACD_FAST, MACD_SLOW, MACD_SIGNAL);
  if (macdSeries.length >= 2) {
    const prevM = macdSeries[macdSeries.length - 2];
    const lastM = macdSeries[macdSeries.length - 1];
    if (prevM.macd < prevM.signal && lastM.macd > lastM.signal) {
      alerts.push({
        symbol,
        time: latest.time,
        type: "BUY",
        indicator: "MACD",
        value: lastM.macd,
        message: `${symbol}: MACD cắt lên (Golden Cross)`,
      });
    }
  }

  const supertrend = computeSupertrend(sorted, SUPERTREND_PERIOD, SUPERTREND_MULTIPLIER);
  if (supertrend.length >= 2) {
    const prevS = supertrend[supertrend.length - 2];
    const lastS = supertrend[supertrend.length - 1];
    if (prevS.direction === -1 && lastS.direction === 1) {
      alerts.push({
        symbol,
        time: latest.time,
        type: "REVERSAL",
        indicator: "SUPERTREND",
        value: lastS.value,
        message: `${symbol}: Supertrend đảo chiều tăng`,
      });
    }
  }

  return alerts;
}

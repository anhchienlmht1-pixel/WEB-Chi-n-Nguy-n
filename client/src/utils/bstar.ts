import { sma } from "technicalindicators";
import type { HistoryPoint } from "../types";
import { toSeconds, alignTail } from "./indicatorCatalog";
import type { TradingSignal } from "./signals";

// B★ breakout system — a second, independent combo alongside the default
// SMA20/50+ADX+Supertrend Trend Following one. Unlike that combo (a
// SUSTAINED condition, true across a whole uptrend), a B★ entry is a
// one-off EVENT: price clears a tight multi-week consolidation on a
// volume surge. So this walks the bars forward simulating a single open
// position at a time (breakout in, MA20-close-below out) rather than
// reading a per-bar condition straight off each row.
const BASE_WINDOW = 25; // ~5 trading weeks
const BASE_TIGHTNESS = 0.15; // (base high - base low) / base low, max 15%
const VOLUME_AVG_WINDOW = 20;
const VOLUME_MULTIPLIER = 1.4; // breakout volume must clear 140% of the 20-day average

function isBreakoutDay(points: HistoryPoint[], i: number): boolean {
  if (i < BASE_WINDOW || i < VOLUME_AVG_WINDOW) return false;

  let baseHigh = -Infinity;
  let baseLow = Infinity;
  for (let j = i - BASE_WINDOW; j < i; j++) {
    baseHigh = Math.max(baseHigh, points[j].high);
    baseLow = Math.min(baseLow, points[j].low);
  }
  if (baseLow <= 0 || (baseHigh - baseLow) / baseLow > BASE_TIGHTNESS) return false;

  const today = points[i];
  if (today.close <= baseHigh) return false;

  let volSum = 0;
  for (let j = i - VOLUME_AVG_WINDOW; j < i; j++) volSum += points[j].volume;
  const avgVol = volSum / VOLUME_AVG_WINDOW;
  return avgVol > 0 && today.volume >= avgVol * VOLUME_MULTIPLIER;
}

// Buy: breakout above a ≤15%-tight ≥5-week base, on ≥1.4x average volume,
// with price above MA50. Sell: close below MA20 (recalculated daily).
// Position sizing (informational only, not simulated here): 15% cố định
// mỗi tín hiệu, không chia lớp như Trend Following.
export function computeBStarSignals(points: HistoryPoint[]): TradingSignal[] {
  if (points.length < 51) return [];

  const closes = points.map((p) => p.close);
  const sma20 = alignTail(points, sma({ period: 20, values: closes }));
  const sma50 = alignTail(points, sma({ period: 50, values: closes }));
  const sma20Map = new Map(sma20.map((d) => [d.time, d.value]));
  const sma50Map = new Map(sma50.map((d) => [d.time, d.value]));

  const transitions: TradingSignal[] = [];
  let holding = false;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const t = toSeconds(p);
    const s20 = sma20Map.get(t);
    const s50 = sma50Map.get(t);

    if (!holding) {
      if (s50 !== undefined && p.close > s50 && isBreakoutDay(points, i)) {
        transitions.push({ time: t, price: p.low, type: "buy", note: "B★ Breakout", source: "bstar" });
        holding = true;
      }
    } else if (s20 !== undefined && p.close < s20) {
      transitions.push({ time: t, price: p.high, type: "sell", note: "B★ Bán (dưới MA20)", source: "bstar" });
      holding = false;
    }
  }

  return transitions;
}

import { sma, adx, atr } from "technicalindicators";
import type { HistoryPoint } from "../types";
import { toSeconds, alignTail, alignTailField } from "./indicatorCatalog";

export interface SupertrendPoint {
  time: number;
  value: number;
  direction: 1 | -1; // 1 = uptrend (line supports price from below), -1 = downtrend
}

// Standard Supertrend algorithm (ATR-banded trend flip), matching the
// column convention of pandas-ta's supertrend() — SUPERT/SUPERTd — since
// that's what the pasted vnstock_ta snippet's output names come from.
export function computeSupertrend(points: HistoryPoint[], period: number, multiplier: number): SupertrendPoint[] {
  const atrValues = atr({
    high: points.map((p) => p.high),
    low: points.map((p) => p.low),
    close: points.map((p) => p.close),
    period,
  });
  const offset = points.length - atrValues.length;
  if (offset < 0 || atrValues.length === 0) return [];

  const finalUpper: number[] = [];
  const finalLower: number[] = [];
  const result: SupertrendPoint[] = [];

  for (let i = 0; i < atrValues.length; i++) {
    const idx = offset + i;
    const p = points[idx];
    const hl2 = (p.high + p.low) / 2;
    const basicUpper = hl2 + multiplier * atrValues[i];
    const basicLower = hl2 - multiplier * atrValues[i];

    if (i === 0) {
      finalUpper.push(basicUpper);
      finalLower.push(basicLower);
      const direction: 1 | -1 = p.close <= basicUpper ? -1 : 1;
      result.push({ time: toSeconds(p), value: direction === -1 ? basicUpper : basicLower, direction });
      continue;
    }

    const prevClose = points[idx - 1].close;
    const prevUpper = finalUpper[i - 1];
    const prevLower = finalLower[i - 1];
    const upper = basicUpper < prevUpper || prevClose > prevUpper ? basicUpper : prevUpper;
    const lower = basicLower > prevLower || prevClose < prevLower ? basicLower : prevLower;
    finalUpper.push(upper);
    finalLower.push(lower);

    const prev = result[i - 1];
    let direction: 1 | -1;
    let value: number;
    if (prev.direction === -1) {
      if (p.close > upper) {
        direction = 1;
        value = lower;
      } else {
        direction = -1;
        value = upper;
      }
    } else {
      if (p.close < lower) {
        direction = -1;
        value = upper;
      } else {
        direction = 1;
        value = lower;
      }
    }
    result.push({ time: toSeconds(p), value, direction });
  }

  return result;
}

export interface TradingSignal {
  time: number;
  price: number;
  type: "buy" | "sell";
  /** Short label drawn next to the marker — tranche number for buys
   * ("Mua 2/3 (+8.0%)"), realized P&L for sells ("Bán hết 2/3 (+12.4%)").
   * Unset only for `all`'s raw per-bar entries, which nothing renders. */
  note?: string;
}

export interface TradingSignalsResult {
  // Every bar matching the buy/sell condition — mirrors the pasted code's
  // df['Buy_Signal'].sum() / df['Sell_Signal'].sum() counts exactly. Used
  // by latestSignal() below, not drawn on the chart.
  all: TradingSignal[];
  // The actual trade events drawn on the chart — see the position-sizing
  // comment above computeTradingSignals for what triggers each one.
  transitions: TradingSignal[];
}

const TRANCHE_COUNT = 3;
// Pyramid into a confirmed uptrend instead of buying 100% at once: tranche
// 1 fires right at entry, tranche 2 once price is 8% above entry, tranche
// 3 once it's 16% above entry (each only while the trend is still intact).
const PYRAMID_STEPS_PCT = [0, 8, 16];

interface OpenTranche {
  price: number;
  sold: boolean;
}

interface Position {
  entryPrice: number;
  tranches: OpenTranche[];
}

function pct(from: number, to: number): string {
  const v = ((to - from) / from) * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

// Buy: SMA20 > SMA50, ADX(14) > 25, Supertrend(10,3) uptrend, Volume > 1.2x avg.
// Sell: (SMA20 < SMA50 or Supertrend downtrend) AND (ADX > 20) AND Volume > 1.0x avg.
//
// Improved signal filtering:
// - Requires volume confirmation to avoid false/excessive signals
// - Sell signals require ADX confirmation (weaker than buy but still confirmed)
// - Reduces whipsaw and low-conviction signals
// - Better convergence of price, trend, momentum, and volume
//
// Position sizing on top of that raw signal (illustrative money-management
// overlay, not the signal itself, and not investment advice): buy in 3
// tranches, adding to the position as the trend proves itself (pyramiding)
// instead of going all-in on the first bar; sell all open tranches when
// trend actually reverses with volume confirmation.
export function computeTradingSignals(points: HistoryPoint[]): TradingSignalsResult {
  if (points.length < 51) return { all: [], transitions: [] };

  const closes = points.map((p) => p.close);
  const volumes = points.map((p) => p.volume);

  // Calculate 20-day average volume for confirmation
  const avgVolume = sma({ period: 20, values: volumes });
  const avgVolumeMap = new Map<number, number>();
  const volumeOffset = points.length - avgVolume.length;
  for (let i = 0; i < avgVolume.length; i++) {
    const idx = volumeOffset + i;
    if (idx >= 0) {
      avgVolumeMap.set(toSeconds(points[idx]), avgVolume[i]);
    }
  }

  const sma20 = alignTail(points, sma({ period: 20, values: closes }));
  const sma50 = alignTail(points, sma({ period: 50, values: closes }));
  const adxRows = adx({
    high: points.map((p) => p.high),
    low: points.map((p) => p.low),
    close: closes,
    period: 14,
  });
  const adxLine = alignTailField(points, adxRows, "adx");
  const supertrend = computeSupertrend(points, 10, 3);

  const sma20Map = new Map(sma20.map((d) => [d.time, d.value]));
  const sma50Map = new Map(sma50.map((d) => [d.time, d.value]));
  const adxMap = new Map(adxLine.map((d) => [d.time, d.value]));
  const directionMap = new Map(supertrend.map((d) => [d.time, d.direction]));

  const all: TradingSignal[] = [];
  const transitions: TradingSignal[] = [];
  let prevType: "buy" | "sell" | null = null;
  let position: Position | null = null;

  for (const p of points) {
    const t = toSeconds(p);
    const s20 = sma20Map.get(t);
    const s50 = sma50Map.get(t);
    const adxVal = adxMap.get(t);
    const direction = directionMap.get(t);
    const avgVol = avgVolumeMap.get(t);
    if (s20 === undefined || s50 === undefined || adxVal === undefined || direction === undefined || avgVol === undefined) continue;

    // Volume confirmation thresholds
    const buyVolumeConfirmed = p.volume > avgVol * 1.2; // Buy requires 20% above average
    const sellVolumeConfirmed = p.volume > avgVol * 1.0; // Sell requires at average or above

    let type: "buy" | "sell" | null = null;
    // Buy: strong signal + volume confirmation
    if (s20 > s50 && adxVal > 25 && direction === 1 && buyVolumeConfirmed) type = "buy";
    // Sell: trend reversal + ADX confirmation + volume confirmation (prevent false breakouts)
    else if ((s20 < s50 || direction === -1) && adxVal > 20 && sellVolumeConfirmed) type = "sell";

    if (type) all.push({ time: t, price: type === "buy" ? p.low : p.high, type });

    if (type === "buy") {
      if (prevType !== "buy") {
        // Fresh entry — start a new position with tranche 1.
        position = { entryPrice: p.close, tranches: [{ price: p.close, sold: false }] };
        transitions.push({ time: t, price: p.low, type: "buy", note: `Mua 1/${TRANCHE_COUNT}` });
      } else if (position) {
        // Pyramid in: add the next tranche once price clears its step.
        const nextIdx = position.tranches.length;
        if (nextIdx < TRANCHE_COUNT && p.close >= position.entryPrice * (1 + PYRAMID_STEPS_PCT[nextIdx] / 100)) {
          position.tranches.push({ price: p.close, sold: false });
          transitions.push({
            time: t,
            price: p.low,
            type: "buy",
            note: `Mua ${nextIdx + 1}/${TRANCHE_COUNT} (${pct(position.entryPrice, p.close)})`,
          });
        }
      }
    } else if (prevType === "buy" && position) {
      // Trend broke — exit whatever tranches are still open, profit or loss.
      const open = position.tranches.filter((tr) => !tr.sold);
      if (open.length > 0) {
        const avgCost = open.reduce((sum, tr) => sum + tr.price, 0) / open.length;
        transitions.push({
          time: t,
          price: p.high,
          type: "sell",
          note: `Bán hết ${open.length}/${TRANCHE_COUNT} (${pct(avgCost, p.close)})`,
        });
      }
      position = null;
    }

    prevType = type;
  }

  return { all, transitions };
}

/** Just the latest bar's signal (or null if neither condition matched) — for compact summaries. */
export function latestSignal(points: HistoryPoint[]): "buy" | "sell" | null {
  if (points.length === 0) return null;
  const { all } = computeTradingSignals(points);
  if (all.length === 0) return null;
  const last = all[all.length - 1];
  return last.time === toSeconds(points[points.length - 1]) ? last.type : null;
}

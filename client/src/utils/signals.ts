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
}

export interface TradingSignalsResult {
  // Every bar matching the buy/sell condition — mirrors the pasted code's
  // df['Buy_Signal'].sum() / df['Sell_Signal'].sum() counts exactly.
  all: TradingSignal[];
  // Only the first bar of each buy/sell streak — what actually gets drawn
  // on the chart, since a marker on every single matching day (often most
  // of a trend) is unreadable clutter rather than a useful entry/exit cue.
  transitions: TradingSignal[];
}

// Buy: SMA20 > SMA50, ADX(14) > 25, Supertrend(10,3) uptrend.
// Sell: SMA20 < SMA50, or Supertrend downtrend.
// (Ported 1:1 from a user-supplied vnstock_ta example — same thresholds,
// same indicator periods.)
export function computeTradingSignals(points: HistoryPoint[]): TradingSignalsResult {
  if (points.length < 51) return { all: [], transitions: [] };

  const closes = points.map((p) => p.close);
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

  for (const p of points) {
    const t = toSeconds(p);
    const s20 = sma20Map.get(t);
    const s50 = sma50Map.get(t);
    const adxVal = adxMap.get(t);
    const direction = directionMap.get(t);
    if (s20 === undefined || s50 === undefined || adxVal === undefined || direction === undefined) continue;

    let type: "buy" | "sell" | null = null;
    if (s20 > s50 && adxVal > 25 && direction === 1) type = "buy";
    else if (s20 < s50 || direction === -1) type = "sell";

    if (type) {
      const signal: TradingSignal = { time: t, price: type === "buy" ? p.low : p.high, type };
      all.push(signal);
      if (type !== prevType) transitions.push(signal);
    }
    prevType = type;
  }

  return { all, transitions };
}

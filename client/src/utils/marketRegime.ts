import { sma, adx } from "technicalindicators";
import type { HistoryPoint, Quote } from "../types";
import { computeSupertrend } from "./signals";

export type MarketRegime = "positive" | "watch" | "caution";

export interface RegimeBar {
  time: string;
  close: number;
  regime: MarketRegime;
}

// Same trend-following combo the rest of the site already uses per-stock
// (SMA20>SMA50, ADX(14)>25, Supertrend(10,3)) — applied to VNINDEX itself
// instead of an individual symbol, to read the market's own regime rather
// than any single stock's. Fed WEEKLY bars (not daily): a "market regime"
// is meant to persist for months, and running this same combo on daily
// closes flips far too often (every minor wiggle crosses SMA20/SMA50),
// which read as noise rather than a regime. Weekly smooths that out while
// still being the identical rule, not a different one.
// "positive" = confirmed uptrend (all 3 agree up), "caution" = confirmed
// downtrend (SMA20<SMA50 or Supertrend down, with ADX strong enough that
// it isn't just noise), "watch" = everything in between (choppy / ADX too
// weak to call a clear trend either way).
export function computeMarketRegimeSeries(points: HistoryPoint[]): RegimeBar[] {
  if (points.length < 51) return [];

  const closes = points.map((p) => p.close);
  const sma20Arr = sma({ period: 20, values: closes });
  const sma50Arr = sma({ period: 50, values: closes });
  const adxArr = adx({ high: points.map((p) => p.high), low: points.map((p) => p.low), close: closes, period: 14 });
  const supertrend = computeSupertrend(points, 10, 3);

  const n = points.length;
  const sma20Offset = n - sma20Arr.length;
  const sma50Offset = n - sma50Arr.length;
  const adxOffset = n - adxArr.length;
  const dirOffset = n - supertrend.length;
  const startOffset = Math.max(sma20Offset, sma50Offset, adxOffset, dirOffset);

  const out: RegimeBar[] = [];
  for (let i = startOffset; i < n; i++) {
    const s20 = sma20Arr[i - sma20Offset];
    const s50 = sma50Arr[i - sma50Offset];
    const adxVal = adxArr[i - adxOffset]?.adx;
    const direction = supertrend[i - dirOffset]?.direction;
    if (s20 === undefined || s50 === undefined || adxVal === undefined || direction === undefined) continue;

    let regime: MarketRegime;
    if (s20 > s50 && direction === 1 && adxVal > 25) regime = "positive";
    else if ((s20 < s50 || direction === -1) && adxVal > 25) regime = "caution";
    else regime = "watch";

    out.push({ time: points[i].time, close: points[i].close, regime });
  }
  return out;
}

export interface RegimeBand {
  startIndex: number;
  endIndex: number;
  startTime: string;
  endTime: string;
  regime: MarketRegime;
}

// Collapses the per-bar series into contiguous same-regime stretches —
// what the chart actually shades as a single colored band.
export function collapseRegimeBands(series: RegimeBar[]): RegimeBand[] {
  const bands: RegimeBand[] = [];
  for (let i = 0; i < series.length; i++) {
    const last = bands[bands.length - 1];
    if (last && last.regime === series[i].regime) {
      last.endIndex = i;
      last.endTime = series[i].time;
    } else {
      bands.push({ startIndex: i, endIndex: i, startTime: series[i].time, endTime: series[i].time, regime: series[i].regime });
    }
  }
  return bands;
}

export interface PositiveTransition {
  time: string;
  price: number;
  peakPrice: number;
  peakGainPct: number;
}

// Marks every "chuyển sang Tích cực" moment with how far price ran up
// afterward — the peak is whatever the series reaches before the NEXT
// confirmed "caution" band starts (i.e. the run this transition kicked
// off), not just within that one green band, since a positive regime can
// flicker through a "watch" patch and resume without truly reversing.
export function findPositiveTransitions(series: RegimeBar[], bands: RegimeBand[]): PositiveTransition[] {
  const transitions: PositiveTransition[] = [];
  for (let b = 0; b < bands.length; b++) {
    const band = bands[b];
    if (band.regime !== "positive") continue;
    const prevBand = bands[b - 1];
    if (prevBand && prevBand.regime === "positive") continue; // not a fresh transition

    const startTime = series[band.startIndex].time;
    const startPrice = series[band.startIndex].close;

    // Walk forward until the next "caution" band (or the end of history),
    // tracking the highest close seen along the way.
    let peak = startPrice;
    for (let i = band.startIndex; i < series.length; i++) {
      const bar = series[i];
      peak = Math.max(peak, bar.close);
      const barBandIdx = bands.findIndex((bd) => i >= bd.startIndex && i <= bd.endIndex);
      if (barBandIdx > b && bands[barBandIdx].regime === "caution") break;
    }

    transitions.push({
      time: startTime,
      price: startPrice,
      peakPrice: peak,
      peakGainPct: ((peak - startPrice) / startPrice) * 100,
    });
  }
  return transitions;
}

export interface RegimeSummary {
  regime: MarketRegime;
  sinceTime: string;
  // Number of consecutive bars (weeks, since computeMarketRegimeSeries is
  // fed weekly data) the current regime has held.
  periodsCount: number;
}

export function summarizeRegimeSeries(series: RegimeBar[]): RegimeSummary | null {
  if (series.length === 0) return null;
  const last = series[series.length - 1];
  let periodsCount = 1;
  for (let i = series.length - 2; i >= 0; i--) {
    if (series[i].regime !== last.regime) break;
    periodsCount++;
  }
  const sinceTime = series[series.length - periodsCount].time;
  return { regime: last.regime, sinceTime, periodsCount };
}

// Today's VNINDEX matched volume vs. its own trailing 250-session (daily)
// average — the only market-wide turnover series this site has history
// for, used as the "Dòng tiền" gauge's money-flow proxy. Deliberately
// daily (unlike the weekly regime classification above): "is money
// flowing in today" is a same-day question, not a months-long one.
export function computeMoneyFlowPct(dailyPoints: HistoryPoint[]): number | null {
  if (dailyPoints.length === 0) return null;
  const last = dailyPoints[dailyPoints.length - 1];
  const windowSize = Math.min(250, dailyPoints.length);
  const recent = dailyPoints.slice(-windowSize);
  const avgVolume = recent.reduce((sum, p) => sum + p.volume, 0) / recent.length;
  return avgVolume > 0 ? (last.volume / avgVolume) * 100 : 0;
}

export function computeSellPressurePct(quotes: Quote[]): number {
  if (quotes.length === 0) return 0;
  const declining = quotes.filter((q) => q.changePercent < 0).length;
  return (declining / quotes.length) * 100;
}

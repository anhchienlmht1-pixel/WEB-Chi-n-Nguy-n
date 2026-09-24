import { adx, atr, sma } from "technicalindicators";
import { STOCK_UNIVERSE } from "../providers/universe.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import { fetchFinancialReport } from "../providers/financials.js";
import { extractKeyRatios } from "../digest/ratios.js";
import type { HistoryPoint } from "../providers/types.js";

// Same trend-following combo as the chart's own Mua/Bán markers
// (client/src/utils/signals.ts computeTradingSignals — SMA20 > SMA50,
// ADX(14) > 25, Supertrend(10,3) uptrend for a buy), ported here so it can
// run once across the whole stock universe server-side instead of the
// browser looping through dozens of per-symbol history fetches.

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

// Same-day duplicate bars (see client/src/utils/aggregate.ts's
// dedupeSameDay — the "today" row can arrive twice while KBS is still
// settling it) would misalign every indicator below just as badly here as
// on the chart, so collapse them the same way before computing anything.
export function dedupeSameDay(points: HistoryPoint[]): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (prev && dayKey(prev.time) === dayKey(p.time)) {
      out[out.length - 1] = p;
    } else {
      out.push(p);
    }
  }
  return out;
}

// Direction only (not the line's y-value, since nothing here charts it) —
// same ATR-banded flip algorithm as the client's computeSupertrend.
function computeSupertrendDirections(points: HistoryPoint[], period: number, multiplier: number): (1 | -1)[] {
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
  const directions: (1 | -1)[] = [];

  for (let i = 0; i < atrValues.length; i++) {
    const idx = offset + i;
    const p = points[idx];
    const hl2 = (p.high + p.low) / 2;
    const basicUpper = hl2 + multiplier * atrValues[i];
    const basicLower = hl2 - multiplier * atrValues[i];

    if (i === 0) {
      finalUpper.push(basicUpper);
      finalLower.push(basicLower);
      directions.push(p.close <= basicUpper ? -1 : 1);
      continue;
    }

    const prevClose = points[idx - 1].close;
    const prevUpper = finalUpper[i - 1];
    const prevLower = finalLower[i - 1];
    const upper = basicUpper < prevUpper || prevClose > prevUpper ? basicUpper : prevUpper;
    const lower = basicLower > prevLower || prevClose < prevLower ? basicLower : prevLower;
    finalUpper.push(upper);
    finalLower.push(lower);

    const prevDirection = directions[i - 1];
    const direction: 1 | -1 = prevDirection === -1 ? (p.close > upper ? 1 : -1) : p.close < lower ? -1 : 1;
    directions.push(direction);
  }

  return directions;
}

interface BuySeriesBar {
  time: string;
  close: number;
  isBuy: boolean;
}

// Same SMA20/SMA50/ADX(14)/Supertrend(10,3) combo as latestBuySince, but
// returned as a full aligned per-bar series (one entry per bar once every
// indicator has warmed up) instead of just the latest streak — exported
// for signals/tradeJournal.ts, which only needs the very last bar's state
// to tell whether a symbol is buying today.
export function computeBuySeries(points: HistoryPoint[]): BuySeriesBar[] {
  const closes = points.map((p) => p.close);
  const sma20 = sma({ period: 20, values: closes });
  const sma50 = sma({ period: 50, values: closes });
  const adxRows = adx({ high: points.map((p) => p.high), low: points.map((p) => p.low), close: closes, period: 14 });
  const directions = computeSupertrendDirections(points, 10, 3);

  const n = points.length;
  const sma20Offset = n - sma20.length;
  const sma50Offset = n - sma50.length;
  const adxOffset = n - adxRows.length;
  const dirOffset = n - directions.length;
  const startOffset = Math.max(sma20Offset, sma50Offset, adxOffset, dirOffset);

  const out: BuySeriesBar[] = [];
  for (let i = startOffset; i < n; i++) {
    const s20 = sma20[i - sma20Offset];
    const s50 = sma50[i - sma50Offset];
    const adxVal = adxRows[i - adxOffset]?.adx;
    const direction = directions[i - dirOffset];
    if (s20 === undefined || s50 === undefined || adxVal === undefined || direction === undefined) continue;
    out.push({ time: points[i].time, close: points[i].close, isBuy: s20 > s50 && adxVal > 25 && direction === 1 });
  }
  return out;
}

// Calculate buy/sell signals with dates
export interface SignalDates {
  buyDate: string;  // When buy signal started
  buyPrice: number; // Close price on buyDate — basis for "% lãi/lỗ từ lúc vào tín hiệu"
  sellDate: string | null;  // When sell signal occurred (null if still holding)
}

// CAN SLIM fundamentals check: ROE, Revenue growth, Earnings growth
// to reduce noise and only show high-quality buy signals
export async function checkCanSlimFundamentals(symbol: string): Promise<boolean> {
  try {
    // Fetch annual income statement for revenue and earnings
    const incomeReport = await fetchFinancialReport(symbol, "KQKD", "year");
    if (incomeReport.periods.length < 2) return true; // Need at least 2 years to compare

    // Find revenue row (Doanh thu thuần / Revenue from sales)
    const revenueItem = incomeReport.items.find(
      (item) =>
        /doanh thu|revenue/i.test((item.name || "").toLowerCase()) &&
        /bán|sales/i.test((item.name || "").toLowerCase())
    );

    // Find net income/earnings row (Lợi nhuận sau thuế / Net income)
    const earningsItem = incomeReport.items.find(
      (item) =>
        (/lợi nhuận|profit|earnings|net income/i.test((item.name || "").toLowerCase()) ||
         /lợi nhuận ròng|lợi nhuận sau|net profit/i.test((item.name || "").toLowerCase())) &&
        !/trước thuế/i.test((item.name || "").toLowerCase()) // Exclude pre-tax profit
    );

    // Get latest and previous year values
    const latestIdx = incomeReport.periods.length - 1;
    const prevIdx = incomeReport.periods.length - 2;

    // Check Revenue growth: latest > previous and both positive
    if (revenueItem) {
      const latestRevenue = revenueItem.values[latestIdx];
      const prevRevenue = revenueItem.values[prevIdx];

      if (latestRevenue !== null && prevRevenue !== null && latestRevenue > 0 && prevRevenue > 0) {
        const revenueGrowth = (latestRevenue - prevRevenue) / prevRevenue;
        if (revenueGrowth < 0) {
          // Revenue must not be declining
          return false;
        }
      }
    }

    // Check Earnings growth: latest > previous and both positive
    if (earningsItem) {
      const latestEarnings = earningsItem.values[latestIdx];
      const prevEarnings = earningsItem.values[prevIdx];

      if (latestEarnings !== null && prevEarnings !== null && latestEarnings > 0 && prevEarnings > 0) {
        const earningsGrowth = (latestEarnings - prevEarnings) / prevEarnings;
        if (earningsGrowth < 0) {
          // Earnings must not be declining
          return false;
        }
      } else if (latestEarnings !== null && latestEarnings <= 0) {
        // Latest earnings must be positive
        return false;
      }
    }

    // Fetch ratio report to check ROE
    const ratioReport = await fetchFinancialReport(symbol, "CSTC", "year");
    const ratios = extractKeyRatios(ratioReport);

    // ROE must be positive
    if (ratios.roe === null || ratios.roe.value <= 0) {
      return false;
    }

    return true;
  } catch {
    // If we can't fetch financial data, don't filter out the signal
    // (it's better to show a signal and have the user verify fundamentals
    // than to hide potentially good signals)
    return true;
  }
}

// Walk back from the latest bar: is it currently a buy, and if so, how far
// back does the uninterrupted buy streak go (for "tín hiệu từ ngày...").
export function latestBuySince(points: HistoryPoint[]): SignalDates | null {
  if (points.length < 51) return null;

  const closes = points.map((p) => p.close);
  const sma20 = sma({ period: 20, values: closes });
  const sma50 = sma({ period: 50, values: closes });
  const adxRows = adx({ high: points.map((p) => p.high), low: points.map((p) => p.low), close: closes, period: 14 });
  const directions = computeSupertrendDirections(points, 10, 3);

  const n = points.length;
  const sma20Offset = n - sma20.length;
  const sma50Offset = n - sma50.length;
  const adxOffset = n - adxRows.length;
  const dirOffset = n - directions.length;

  // Find current buy signal (from end going backward)
  let buyDate: string | null = null;
  let buyPrice: number | null = null;
  let sellDate: string | null = null;

  for (let i = n - 1; i >= 0; i--) {
    if (i < sma20Offset || i < sma50Offset || i < adxOffset || i < dirOffset) break;
    const s20 = sma20[i - sma20Offset];
    const s50 = sma50[i - sma50Offset];
    const adxVal = adxRows[i - adxOffset]?.adx;
    const direction = directions[i - dirOffset];
    if (s20 === undefined || s50 === undefined || adxVal === undefined || direction === undefined) break;

    const isBuy = s20 > s50 && adxVal > 25 && direction === 1;

    // If at the end and not a buy signal, no current buy
    if (i === n - 1 && !isBuy) return null;

    if (!isBuy) {
      // Streak broken — this bar is the boundary right before the current
      // uninterrupted run started. Stop here: everything further back is a
      // separate, non-contiguous episode and must NOT overwrite buyDate
      // (a bug previously let it do so, reporting a far earlier buyDate
      // whenever an older unrelated uptrend also happened to qualify).
      sellDate = points[i].time;
      break;
    }

    buyDate = points[i].time; // Update to earliest buy date within this streak
    buyPrice = points[i].close; // Update alongside — price on that earliest buy date
  }

  if (!buyDate || buyPrice === null) return null;
  return { buyDate, buyPrice, sellDate };
}

export interface BuySignalHit {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  changePercent: number;
  signalSince: string;  // Buy date (for backward compatibility)
  buyDate: string;      // Buy date (new)
  buyPrice: number;     // Close price on buyDate — basis for signalReturnPercent
  signalReturnPercent: number; // % change from buyPrice to current price (cumulative since signal started)
  sellDate: string | null;  // Sell date (null if still holding)
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function scanBuySignals(): Promise<BuySignalHit[]> {
  const failed = new Map<string, string>();
  const hits = await mapWithConcurrency(STOCK_UNIVERSE, 20, async (seed): Promise<BuySignalHit | null> => {
    try {
      const { points: raw } = await getHistoryWithFallback(seed.symbol, "1Y");
      const points = dedupeSameDay(raw);
      const signalDates = latestBuySince(points);
      if (!signalDates || points.length === 0) {
        if (points.length === 0) {
          failed.set(seed.symbol, "No historical data");
        }
        return null;
      }

      // Check CAN SLIM fundamentals: ROE > 0, Revenue growth >= 0, Earnings growth >= 0
      // to reduce noise and improve signal quality
      const hasSolidFundamentals = await checkCanSlimFundamentals(seed.symbol);
      if (!hasSolidFundamentals) {
        return null;
      }

      const last = points[points.length - 1];
      const prev = points.length > 1 ? points[points.length - 2] : null;
      const changePercent = prev && prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0;
      const signalReturnPercent = signalDates.buyPrice
        ? ((last.close - signalDates.buyPrice) / signalDates.buyPrice) * 100
        : 0;

      return {
        symbol: seed.symbol,
        name: seed.name,
        exchange: seed.exchange,
        currency: seed.currency,
        price: last.close,
        changePercent,
        signalSince: signalDates.buyDate,  // For backward compatibility
        buyDate: signalDates.buyDate,
        buyPrice: signalDates.buyPrice,
        signalReturnPercent,
        sellDate: signalDates.sellDate,
      };
    } catch (err) {
      // A single symbol's data being unavailable shouldn't fail the whole
      // scan — it's simply excluded from the result, same as it just not
      // having a buy signal.
      failed.set(seed.symbol, err instanceof Error ? err.message : String(err));
      return null;
    }
  });

  const results = hits
    .filter((h): h is BuySignalHit => h !== null)
    .sort((a, b) => b.signalSince.localeCompare(a.signalSince));

  // Log failures for debugging (especially UPCOM symbols)
  const upcomFailed = Array.from(failed.entries()).filter(([sym]) =>
    STOCK_UNIVERSE.find(s => s.symbol === sym)?.exchange === "UPCOM"
  );
  if (upcomFailed.length > 0) {
    console.warn("[trendScanner] UPCOM stocks failed to scan:",
      Object.fromEntries(upcomFailed));
  }

  return results;
}

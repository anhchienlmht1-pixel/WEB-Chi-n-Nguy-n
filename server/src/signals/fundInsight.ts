import { fetchOpenStockFunds } from "../providers/fmarketFunds.js";
import { getFullMarketQuotes } from "../providers/vnstockProvider.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import { scanBuySignals } from "./trendScanner.js";
import type { Quote, HistoryPoint } from "../providers/types.js";

// Builds the "Fund Insight" payload: where the 44 open funds' money sits
// (how many funds hold each stock and their average weight, from Fmarket)
// crossed with our own price strength — so the top picks are the stocks that
// are both crowded with fund money AND technically strong.

export interface FundInsightStock {
  symbol: string;
  price: number | null;
  changePercent: number | null;
  fundCount: number; // QUỸ CẦM
  avgWeight: number; // TỶ TRỌNG (%)
  priceStrength: number; // SỨC MẠNH GIÁ, 0-99 (RS percentile across held names)
  distanceFromPeak: number | null; // CÁCH ĐỈNH (% below 52-week high, ≤ 0)
  waitingToBuy: boolean; // in our trend buy-signal zone
}

export interface FundInsightPayload {
  asOf: string;
  fundsTotal: number;
  symbolsHeld: number;
  waitingToBuyCount: number;
  vnindex12mChange: number | null;
  fundsBeatingVnindex: number;
  fundsComparable: number;
  topPicks: FundInsightStock[];
  mostHeld: { symbol: string; fundCount: number }[];
  strongest: { symbol: string; priceStrength: number; fundCount: number } | null;
  crowdedWeak: { symbol: string; fundCount: number; priceStrength: number; distanceFromPeak: number | null } | null;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function dedupeSameDay(points: HistoryPoint[]): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (prev && dayKey(prev.time) === dayKey(p.time)) out[out.length - 1] = p;
    else out.push(p);
  }
  return out;
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

interface PriceStats {
  return12m: number | null; // fractional return over the window
  distanceFromPeak: number | null; // % below the window high (≤ 0)
}

function priceStatsFrom(points: HistoryPoint[]): PriceStats {
  const clean = dedupeSameDay(points).filter((p) => Number.isFinite(p.close) && p.close > 0);
  if (clean.length < 2) return { return12m: null, distanceFromPeak: null };
  const first = clean[0].close;
  const last = clean[clean.length - 1].close;
  const peak = Math.max(...clean.map((p) => p.high || p.close));
  const return12m = first > 0 ? last / first - 1 : null;
  const distanceFromPeak = peak > 0 ? (last / peak - 1) * 100 : null;
  return { return12m, distanceFromPeak };
}

// Percentile rank of `value` within `sorted` (ascending), 0..1.
function percentile(sortedAsc: number[], value: number): number {
  if (sortedAsc.length === 0) return 0;
  let below = 0;
  for (const v of sortedAsc) {
    if (v <= value) below++;
    else break;
  }
  return below / sortedAsc.length;
}

export async function buildFundInsight(): Promise<FundInsightPayload> {
  const funds = await fetchOpenStockFunds();

  // Aggregate per stock: how many funds hold it and the weights they assign.
  const agg = new Map<string, { count: number; weights: number[] }>();
  for (const f of funds) {
    for (const h of f.holdings) {
      const e = agg.get(h.stockCode) ?? { count: 0, weights: [] };
      e.count += 1;
      if (Number.isFinite(h.weight) && h.weight > 0) e.weights.push(h.weight);
      agg.set(h.stockCode, e);
    }
  }
  const symbols = Array.from(agg.keys());

  // Prices for every held name (one full-board read, then a lookup map).
  const quoteMap = new Map<string, Quote>();
  try {
    const board = await getFullMarketQuotes("ALL");
    for (const q of board) quoteMap.set(q.symbol, q);
  } catch {
    // Prices are best-effort; the fund aggregation still stands without them.
  }

  // 12-month price stats per held name → relative-strength percentile.
  const stats = await mapWithConcurrency(symbols, 10, async (sym) => {
    try {
      const { points } = await getHistoryWithFallback(sym, "1Y");
      return { sym, ...priceStatsFrom(points) };
    } catch {
      return { sym, return12m: null, distanceFromPeak: null } as { sym: string } & PriceStats;
    }
  });
  const statBySym = new Map(stats.map((s) => [s.sym, s]));
  const sortedReturns = stats
    .map((s) => s.return12m)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);

  // Our own trend buy-signal set = the "vùng chờ mua" zone.
  let buySet = new Set<string>();
  try {
    const buy = await scanBuySignals();
    buySet = new Set(buy.map((b) => b.symbol));
  } catch {
    // If the scan fails, nothing is flagged as waiting-to-buy — the money
    // map is still useful on its own.
  }

  const stocks: FundInsightStock[] = symbols.map((sym) => {
    const e = agg.get(sym)!;
    const st = statBySym.get(sym);
    const q = quoteMap.get(sym);
    const priceStrength =
      st?.return12m != null ? Math.round(percentile(sortedReturns, st.return12m) * 99) : 0;
    return {
      symbol: sym,
      price: q?.price ?? null,
      changePercent: q?.changePercent ?? null,
      fundCount: e.count,
      avgWeight: e.weights.length ? e.weights.reduce((a, b) => a + b, 0) / e.weights.length : 0,
      priceStrength,
      distanceFromPeak: st?.distanceFromPeak ?? null,
      waitingToBuy: buySet.has(sym),
    };
  });

  const byStrength = [...stocks].sort((a, b) => b.priceStrength - a.priceStrength);
  const byFundCount = [...stocks].sort((a, b) => b.fundCount - a.fundCount || b.priceStrength - a.priceStrength);

  // Top picks = fund-held ∩ our buy zone, ranked by price strength.
  const topPicks = stocks
    .filter((s) => s.waitingToBuy)
    .sort((a, b) => b.priceStrength - a.priceStrength);

  // Crowded-but-stuck = among the 10 most-held names, the weakest one that our
  // system has NOT put in the buy zone.
  const crowdedPool = byFundCount.slice(0, 10).filter((s) => !s.waitingToBuy);
  const crowdedWeak = (crowdedPool.length ? crowdedPool : byFundCount.slice(0, 10))
    .slice()
    .sort((a, b) => a.priceStrength - b.priceStrength)[0];

  const strongest = byStrength[0] ?? null;

  // VN-Index 12-month change, for the "quỹ vượt được index" stat.
  let vnindex12mChange: number | null = null;
  try {
    const { points } = await getHistoryWithFallback("VNINDEX", "1Y");
    vnindex12mChange = priceStatsFrom(points).return12m;
    if (vnindex12mChange != null) vnindex12mChange *= 100;
  } catch {
    vnindex12mChange = null;
  }
  const comparableFunds = funds.filter((f) => f.nav12mChange != null);
  const fundsBeatingVnindex =
    vnindex12mChange == null
      ? 0
      : comparableFunds.filter((f) => (f.nav12mChange as number) > (vnindex12mChange as number)).length;

  return {
    asOf: new Date().toISOString(),
    fundsTotal: funds.length,
    symbolsHeld: symbols.length,
    waitingToBuyCount: topPicks.length,
    vnindex12mChange,
    fundsBeatingVnindex,
    fundsComparable: comparableFunds.length,
    topPicks: topPicks.slice(0, 15),
    mostHeld: byFundCount.slice(0, 3).map((s) => ({ symbol: s.symbol, fundCount: s.fundCount })),
    strongest: strongest
      ? { symbol: strongest.symbol, priceStrength: strongest.priceStrength, fundCount: strongest.fundCount }
      : null,
    crowdedWeak: crowdedWeak
      ? {
          symbol: crowdedWeak.symbol,
          fundCount: crowdedWeak.fundCount,
          priceStrength: crowdedWeak.priceStrength,
          distanceFromPeak: crowdedWeak.distanceFromPeak,
        }
      : null,
  };
}

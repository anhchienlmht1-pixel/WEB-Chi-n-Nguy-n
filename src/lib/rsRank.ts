import "server-only";
import { fetchCandles, daysAgo, nowSeconds } from "./vndirect";
import { DEFAULT_BOARD_SYMBOLS } from "./symbols";

// "Sức mạnh giá" (RS) here ranks a symbol's trailing ~3-month price
// performance against this site's own curated board (DEFAULT_BOARD_SYMBOLS,
// ~50 liquid tickers) — NOT the full ~1,600-stock market, and not IBD's
// proprietary weighted-quarter RS Rating formula. Rank 1 = strongest
// performer in that universe. Disclosed on the card itself, not hidden.
const WINDOW_TRADING_DAYS = 63;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CONCURRENCY = 8;

interface UniverseEntry {
  symbol: string;
  changePercent: number;
}

let cache: { data: UniverseEntry[]; expiresAt: number } | null = null;

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

async function trailingChangePercent(symbol: string): Promise<number | null> {
  try {
    const candles = await fetchCandles(symbol, "D", daysAgo(120), nowSeconds());
    if (candles.length < 2) return null;
    const window = candles.slice(-WINDOW_TRADING_DAYS);
    const first = window[0].close;
    const last = window[window.length - 1].close;
    if (!first) return null;
    return ((last - first) / first) * 100;
  } catch {
    return null;
  }
}

async function getUniverseChanges(): Promise<UniverseEntry[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;
  const results = await mapWithConcurrency(DEFAULT_BOARD_SYMBOLS, CONCURRENCY, async (symbol) => ({
    symbol,
    changePercent: await trailingChangePercent(symbol),
  }));
  const data = results.filter((r): r is UniverseEntry => r.changePercent !== null);
  cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

export interface RsRankResult {
  rank: number;
  total: number;
  changePercent: number;
}

export async function computeRsRank(symbol: string): Promise<RsRankResult | null> {
  const universe = await getUniverseChanges();
  let entries = universe;
  if (!entries.some((e) => e.symbol === symbol)) {
    const changePercent = await trailingChangePercent(symbol);
    if (changePercent === null) return null;
    entries = [...entries, { symbol, changePercent }];
  }
  const sorted = [...entries].sort((a, b) => b.changePercent - a.changePercent);
  const idx = sorted.findIndex((e) => e.symbol === symbol);
  if (idx === -1) return null;
  return { rank: idx + 1, total: sorted.length, changePercent: sorted[idx].changePercent };
}

import { StockProvider, TopExchange, TopTradedItem } from "./types.js";

export const VALID_EXCHANGES: TopExchange[] = ["ALL", "HOSE", "HNX", "UPCOM"];

// Uses the provider's native top-traded ranking when available; otherwise
// (or when it fails) falls back to ranking the curated overview universe by
// trading value so the section always renders.
export async function topTradedOf(
  provider: StockProvider,
  exchange: TopExchange
): Promise<TopTradedItem[]> {
  if (provider.getTopTraded) {
    try {
      return await provider.getTopTraded(exchange);
    } catch {
      // fall through to the overview-based ranking
    }
  }
  const quotes = await provider.getMarketOverview();
  return quotes
    .filter((q) => exchange === "ALL" || q.exchange === exchange)
    .map((q) => ({
      symbol: q.symbol,
      exchange: q.exchange,
      name: q.name,
      price: q.price,
      changePercent: q.changePercent,
      volume: q.volume,
      value: q.price * q.volume,
    }))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 10);
}

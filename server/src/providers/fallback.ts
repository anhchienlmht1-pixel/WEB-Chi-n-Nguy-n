import { getProvider, type StockProvider } from "./index.js";
import { kbsMarketProvider } from "./kbsMarketProvider.js";
import { vndirectProvider } from "./vndirectProvider.js";
import { vnstockProvider } from "./vnstockProvider.js";
import type { HistoryPoint, HistoryRange, Quote } from "./types.js";

// Financials already has a multi-source fallback (financials.ts: vndirect/
// kbs/vci/cafef); quote/history had none — a single provider failing meant
// the whole request failed, even though the same three sources (KBS,
// VNDirect, VCI-via-vnstockProvider) all implement getQuote/getHistory.
// The configured DATA_PROVIDER (getProvider()) is tried first so operators
// can still pin a preferred source; these are the fallbacks if it errors.
const FALLBACK_PROVIDERS: StockProvider[] = [kbsMarketProvider, vndirectProvider, vnstockProvider];

function orderedProviders(): StockProvider[] {
  const primary = getProvider();
  const rest = FALLBACK_PROVIDERS.filter((p) => p.id !== primary.id);
  return [primary, ...rest];
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function getQuoteWithFallback(symbol: string): Promise<Quote> {
  const errors: string[] = [];
  for (const provider of orderedProviders()) {
    try {
      return await provider.getQuote(symbol);
    } catch (err) {
      errors.push(`${provider.id}: ${errorMessage(err).slice(0, 150)}`);
    }
  }
  throw Object.assign(new Error(`Tất cả nguồn giá đều lỗi cho ${symbol}. ${errors.join(" | ")}`), {
    status: 502,
  });
}

export async function getHistoryWithFallback(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
  const errors: string[] = [];
  for (const provider of orderedProviders()) {
    try {
      const points = await provider.getHistory(symbol, range);
      if (points.length > 0) return points;
      errors.push(`${provider.id}: dữ liệu rỗng`);
    } catch (err) {
      errors.push(`${provider.id}: ${errorMessage(err).slice(0, 150)}`);
    }
  }
  throw Object.assign(
    new Error(`Tất cả nguồn lịch sử giá đều lỗi cho ${symbol} (${range}). ${errors.join(" | ")}`),
    { status: 502 }
  );
}

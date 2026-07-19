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

// `preferSource`, when given, is tried before everything else — used to
// keep a quote and its accompanying history chart pinned to the same
// provider within one page view. Quote and history are separate requests
// with independent fallback chains; if a source's availability is flaky
// rather than uniformly down, they could otherwise land on two different
// providers for the same symbol in the same view (a stale/inconsistent
// quote-vs-chart mismatch), same failure mode as manually combining two
// sources' data — this just avoids it happening implicitly across requests.
function orderedProviders(preferSource?: string): StockProvider[] {
  const primary = getProvider();
  const rest = FALLBACK_PROVIDERS.filter((p) => p.id !== primary.id);
  const ordered = [primary, ...rest];
  if (!preferSource) return ordered;
  const preferred = ordered.find((p) => p.id === preferSource);
  if (!preferred) return ordered;
  return [preferred, ...ordered.filter((p) => p.id !== preferSource)];
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export interface QuoteWithSource {
  quote: Quote;
  source: string;
}

export interface HistoryWithSource {
  points: HistoryPoint[];
  source: string;
}

export async function getQuoteWithFallback(symbol: string, preferSource?: string): Promise<QuoteWithSource> {
  const errors: string[] = [];
  for (const provider of orderedProviders(preferSource)) {
    try {
      return { quote: await provider.getQuote(symbol), source: provider.id };
    } catch (err) {
      errors.push(`${provider.id}: ${errorMessage(err).slice(0, 150)}`);
    }
  }
  throw Object.assign(new Error(`Tất cả nguồn giá đều lỗi cho ${symbol}. ${errors.join(" | ")}`), {
    status: 502,
  });
}

export async function getHistoryWithFallback(
  symbol: string,
  range: HistoryRange,
  preferSource?: string
): Promise<HistoryWithSource> {
  const errors: string[] = [];
  for (const provider of orderedProviders(preferSource)) {
    try {
      const points = await provider.getHistory(symbol, range);
      if (points.length > 0) return { points, source: provider.id };
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

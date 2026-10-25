import { getProvider, type StockProvider } from "./index.js";
import { kbsMarketProvider } from "./kbsMarketProvider.js";
import { vndirectProvider } from "./vndirectProvider.js";
import { vnstockProvider } from "./vnstockProvider.js";
import { topTradedOf } from "./topTraded.js";
import type { HistoryPoint, HistoryRange, Quote, TopExchange, TopTradedItem } from "./types.js";

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

// How long the current source gets before the next one is started *in
// parallel* (first good answer wins). The old loop only moved on after a
// source failed, so one slow-but-alive source (KBS answering in 6s, say) made
// every request 6s even though the next source would have answered in 300ms.
// Hedging only costs an extra upstream call when the primary is already slow.
const HEDGE_MS = Number(process.env.PROVIDER_HEDGE_MS) || 1500;

// Runs `attempt` against the providers in order: the next one starts when the
// previous fails or after HEDGE_MS, whichever comes first, and the first
// success is returned. Rejects with every provider's error once all failed.
function firstSuccess<T>(
  providers: StockProvider[],
  attempt: (provider: StockProvider) => Promise<T>
): Promise<{ value: T; source: string }> {
  return new Promise((resolve, reject) => {
    const errors: string[] = [];
    let next = 0;
    let running = 0;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const launch = () => {
      clearTimeout(timer);
      if (settled || next >= providers.length) return;
      const provider = providers[next++];
      running++;
      // Promise.resolve().then(): a provider that throws synchronously must
      // count as a failed attempt, not blow up inside a timer callback.
      Promise.resolve()
        .then(() => attempt(provider))
        .then(
        (value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({ value, source: provider.id });
        },
        (err) => {
          running--;
          errors.push(`${provider.id}: ${errorMessage(err).slice(0, 150)}`);
          if (settled) return;
          if (next < providers.length) launch();
          else if (running === 0) {
            settled = true;
            clearTimeout(timer);
            reject(new Error(errors.join(" | ")));
          }
        }
      );
      if (next < providers.length) timer = setTimeout(launch, HEDGE_MS);
    };
    launch();
  });
}

export async function getQuoteWithFallback(symbol: string, preferSource?: string): Promise<QuoteWithSource> {
  try {
    const { value, source } = await firstSuccess(orderedProviders(preferSource), (p) => p.getQuote(symbol));
    return { quote: value, source };
  } catch (err) {
    throw Object.assign(new Error(`Tất cả nguồn giá đều lỗi cho ${symbol}. ${errorMessage(err)}`), {
      status: 502,
    });
  }
}

export async function getHistoryWithFallback(
  symbol: string,
  range: HistoryRange,
  preferSource?: string
): Promise<HistoryWithSource> {
  try {
    const { value, source } = await firstSuccess(orderedProviders(preferSource), async (p) => {
      const points = await p.getHistory(symbol, range);
      if (points.length === 0) throw new Error("dữ liệu rỗng");
      return points;
    });
    return { points: value, source };
  } catch (err) {
    throw Object.assign(
      new Error(`Tất cả nguồn lịch sử giá đều lỗi cho ${symbol} (${range}). ${errorMessage(err)}`),
      { status: 502 }
    );
  }
}

export interface MarketOverviewWithSource {
  quotes: Quote[];
  source: string;
}

// Batch board data (the main "Thị trường" table) previously called
// getProvider() directly with no fallback — a single misconfigured/down
// source took down the whole page even though getQuote/getHistory already
// had a fallback chain. Reuses the same ordering so the board and the
// per-symbol detail view tend to agree on which source answered.
export async function getMarketOverviewWithFallback(): Promise<MarketOverviewWithSource> {
  const errors: string[] = [];
  for (const provider of orderedProviders()) {
    try {
      const quotes = await provider.getMarketOverview();
      if (quotes.length > 0) return { quotes, source: provider.id };
      errors.push(`${provider.id}: dữ liệu rỗng`);
    } catch (err) {
      errors.push(`${provider.id}: ${errorMessage(err).slice(0, 150)}`);
    }
  }
  throw Object.assign(new Error(`Tất cả nguồn bảng giá đều lỗi. ${errors.join(" | ")}`), { status: 502 });
}

export interface TopTradedWithSource {
  items: TopTradedItem[];
  source: string;
}

export async function getTopTradedWithFallback(exchange: TopExchange): Promise<TopTradedWithSource> {
  const errors: string[] = [];
  for (const provider of orderedProviders()) {
    try {
      const items = await topTradedOf(provider, exchange);
      if (items.length > 0) return { items, source: provider.id };
      errors.push(`${provider.id}: dữ liệu rỗng`);
    } catch (err) {
      errors.push(`${provider.id}: ${errorMessage(err).slice(0, 150)}`);
    }
  }
  throw Object.assign(
    new Error(`Tất cả nguồn top giao dịch đều lỗi (${exchange}). ${errors.join(" | ")}`),
    { status: 502 }
  );
}

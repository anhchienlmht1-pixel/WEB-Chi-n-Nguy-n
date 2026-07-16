import { StockProvider, Quote, HistoryPoint, HistoryRange, SearchResult } from "./types.js";
import { getDefaultWatchlist } from "./defaultWatchlist.js";

const BASE = "https://finnhub.io/api/v1";

function apiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new Error("FINNHUB_API_KEY is not set. Get a free key at finnhub.io/register");
  }
  return key;
}

async function fetchJson(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("token", apiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw Object.assign(new Error(`Finnhub request failed: ${res.status}`), { status: res.status });
  }
  return res.json();
}

const RANGE_TO_SECONDS: Record<HistoryRange, { span: number; resolution: string }> = {
  "1D": { span: 60 * 60 * 24, resolution: "5" },
  "1W": { span: 60 * 60 * 24 * 7, resolution: "30" },
  "1M": { span: 60 * 60 * 24 * 30, resolution: "60" },
  "3M": { span: 60 * 60 * 24 * 90, resolution: "D" },
  "6M": { span: 60 * 60 * 24 * 180, resolution: "D" },
  "1Y": { span: 60 * 60 * 24 * 365, resolution: "D" },
  "5Y": { span: 60 * 60 * 24 * 365 * 5, resolution: "W" },
  MAX: { span: 60 * 60 * 24 * 365 * 30, resolution: "M" },
};

export const finnhubProvider: StockProvider = {
  id: "finnhub",

  async getQuote(symbol: string): Promise<Quote> {
    const [q, profile] = await Promise.all([
      fetchJson("/quote", { symbol }),
      fetchJson("/stock/profile2", { symbol }).catch(() => ({})),
    ]);
    if (q.c == null || q.c === 0) {
      throw Object.assign(new Error(`Unknown symbol: ${symbol}`), { status: 404 });
    }
    return {
      symbol,
      name: profile.name ?? symbol,
      exchange: profile.exchange ?? "",
      currency: profile.currency ?? "USD",
      price: q.c,
      change: q.d ?? 0,
      changePercent: q.dp ?? 0,
      open: q.o ?? q.c,
      high: q.h ?? q.c,
      low: q.l ?? q.c,
      prevClose: q.pc ?? q.c,
      volume: 0,
      marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1_000_000 : undefined,
      updatedAt: new Date().toISOString(),
    };
  },

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    return Promise.all(symbols.map((s) => this.getQuote(s)));
  },

  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
    const { span, resolution } = RANGE_TO_SECONDS[range];
    const to = Math.floor(Date.now() / 1000);
    const from = to - span;
    const data = await fetchJson("/stock/candle", {
      symbol,
      resolution,
      from: String(from),
      to: String(to),
    });
    if (data.s !== "ok" || !data.t) {
      throw Object.assign(new Error(`No data for symbol: ${symbol}`), { status: 404 });
    }
    return data.t.map((ts: number, i: number) => ({
      time: new Date(ts * 1000).toISOString(),
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
    }));
  },

  async search(query: string): Promise<SearchResult[]> {
    const data = await fetchJson("/search", { q: query });
    const results = data.result ?? [];
    return results.slice(0, 10).map((r: any) => ({
      symbol: r.symbol,
      name: r.description,
      exchange: r.type ?? "",
    }));
  },

  async getMarketOverview(): Promise<Quote[]> {
    return this.getQuotes(getDefaultWatchlist());
  },
};

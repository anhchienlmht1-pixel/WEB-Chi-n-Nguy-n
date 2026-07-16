import { StockProvider, Quote, HistoryPoint, HistoryRange, SearchResult } from "./types.js";
import { getDefaultWatchlist } from "./defaultWatchlist.js";

const BASE = "https://query1.finance.yahoo.com";
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; StockDashboard/1.0)" };

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw Object.assign(new Error(`Yahoo Finance request failed: ${res.status}`), {
      status: res.status,
    });
  }
  return res.json();
}

function toRangeParams(range: HistoryRange): { range: string; interval: string } {
  switch (range) {
    case "1D":
      return { range: "1d", interval: "5m" };
    case "1W":
      return { range: "5d", interval: "15m" };
    case "1M":
      return { range: "1mo", interval: "1d" };
    case "3M":
      return { range: "3mo", interval: "1d" };
    case "6M":
      return { range: "6mo", interval: "1d" };
    case "1Y":
      return { range: "1y", interval: "1wk" };
    case "5Y":
      return { range: "5y", interval: "1mo" };
    case "MAX":
      return { range: "max", interval: "1mo" };
  }
}

function quoteFromChartMeta(symbol: string, chart: any): Quote {
  const result = chart?.chart?.result?.[0];
  if (!result) {
    throw Object.assign(new Error(`Unknown symbol: ${symbol}`), { status: 404 });
  }
  const meta = result.meta;
  const price = meta.regularMarketPrice ?? meta.previousClose;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose;
  const change = price - prevClose;
  return {
    symbol: meta.symbol ?? symbol,
    name: meta.longName ?? meta.shortName ?? meta.symbol ?? symbol,
    exchange: meta.exchangeName ?? meta.fullExchangeName ?? "",
    currency: meta.currency ?? "USD",
    price,
    change,
    changePercent: prevClose ? (change / prevClose) * 100 : 0,
    open: meta.regularMarketOpen ?? price,
    high: meta.regularMarketDayHigh ?? price,
    low: meta.regularMarketDayLow ?? price,
    prevClose,
    volume: meta.regularMarketVolume ?? 0,
    updatedAt: new Date().toISOString(),
  };
}

export const yahooProvider: StockProvider = {
  id: "yahoo",

  async getQuote(symbol: string): Promise<Quote> {
    const data = await fetchJson(
      `${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
    );
    return quoteFromChartMeta(symbol, data);
  },

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    return Promise.all(symbols.map((s) => this.getQuote(s)));
  },

  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
    const { range: r, interval } = toRangeParams(range);
    const data = await fetchJson(
      `${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${r}`
    );
    const result = data?.chart?.result?.[0];
    if (!result) throw Object.assign(new Error(`Unknown symbol: ${symbol}`), { status: 404 });
    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const points: HistoryPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = quote.close?.[i];
      if (close == null) continue;
      points.push({
        time: new Date(timestamps[i] * 1000).toISOString(),
        open: quote.open?.[i] ?? close,
        high: quote.high?.[i] ?? close,
        low: quote.low?.[i] ?? close,
        close,
        volume: quote.volume?.[i] ?? 0,
      });
    }
    return points;
  },

  async search(query: string): Promise<SearchResult[]> {
    const data = await fetchJson(
      `${BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
    );
    const quotes = data?.quotes ?? [];
    return quotes
      .filter((q: any) => q.symbol)
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname ?? q.longname ?? q.symbol,
        exchange: q.exchange ?? "",
      }));
  },

  async getMarketOverview(): Promise<Quote[]> {
    return this.getQuotes(getDefaultWatchlist());
  },
};

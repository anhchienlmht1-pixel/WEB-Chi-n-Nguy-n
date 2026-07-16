import { StockProvider, Quote, HistoryPoint, HistoryRange, SearchResult } from "./types.js";
import { getDefaultWatchlist } from "./defaultWatchlist.js";

const BASE = "https://www.alphavantage.co/query";

function apiKey(): string {
  const key = process.env.ALPHAVANTAGE_API_KEY;
  if (!key) {
    throw new Error("ALPHAVANTAGE_API_KEY is not set. Get a free key at alphavantage.co/support/#api-key");
  }
  return key;
}

async function fetchJson(params: Record<string, string>): Promise<any> {
  const url = new URL(BASE);
  url.searchParams.set("apikey", apiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw Object.assign(new Error(`Alpha Vantage request failed: ${res.status}`), {
      status: res.status,
    });
  }
  const data = await res.json();
  if (data["Note"] || data["Information"]) {
    throw Object.assign(new Error(data["Note"] || data["Information"]), { status: 429 });
  }
  return data;
}

function toOutputSize(range: HistoryRange): "compact" | "full" {
  return range === "3M" || range === "6M" || range === "1Y" || range === "5Y" ? "full" : "compact";
}

export const alphaVantageProvider: StockProvider = {
  id: "alphavantage",

  async getQuote(symbol: string): Promise<Quote> {
    const data = await fetchJson({ function: "GLOBAL_QUOTE", symbol });
    const q = data["Global Quote"];
    if (!q || !q["05. price"]) {
      throw Object.assign(new Error(`Unknown symbol: ${symbol}`), { status: 404 });
    }
    const price = parseFloat(q["05. price"]);
    const prevClose = parseFloat(q["08. previous close"]);
    return {
      symbol: q["01. symbol"],
      name: q["01. symbol"],
      exchange: "",
      currency: "USD",
      price,
      change: parseFloat(q["09. change"]),
      changePercent: parseFloat((q["10. change percent"] || "0").replace("%", "")),
      open: parseFloat(q["02. open"]),
      high: parseFloat(q["03. high"]),
      low: parseFloat(q["04. low"]),
      prevClose,
      volume: parseInt(q["06. volume"], 10) || 0,
      updatedAt: new Date().toISOString(),
    };
  },

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    // Alpha Vantage has no batch quote endpoint on the free tier; fetch sequentially
    // to stay under the per-second rate limit.
    const results: Quote[] = [];
    for (const s of symbols) {
      results.push(await this.getQuote(s));
    }
    return results;
  },

  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
    const isIntraday = range === "1D";
    const data = await fetchJson(
      isIntraday
        ? { function: "TIME_SERIES_INTRADAY", symbol, interval: "15min", outputsize: "compact" }
        : { function: "TIME_SERIES_DAILY", symbol, outputsize: toOutputSize(range) }
    );
    const seriesKey = Object.keys(data).find((k) => k.toLowerCase().includes("time series"));
    if (!seriesKey || !data[seriesKey]) {
      throw Object.assign(new Error(`Unknown symbol: ${symbol}`), { status: 404 });
    }
    const series = data[seriesKey] as Record<string, Record<string, string>>;
    return Object.entries(series)
      .map(([time, ohlc]) => ({
        time: new Date(time).toISOString(),
        open: parseFloat(ohlc["1. open"]),
        high: parseFloat(ohlc["2. high"]),
        low: parseFloat(ohlc["3. low"]),
        close: parseFloat(ohlc["4. close"]),
        volume: parseInt(ohlc["5. volume"], 10) || 0,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  },

  async search(query: string): Promise<SearchResult[]> {
    const data = await fetchJson({ function: "SYMBOL_SEARCH", keywords: query });
    const matches = data["bestMatches"] ?? [];
    return matches.slice(0, 10).map((m: any) => ({
      symbol: m["1. symbol"],
      name: m["2. name"],
      exchange: m["4. region"] ?? "",
    }));
  },

  async getMarketOverview(): Promise<Quote[]> {
    return this.getQuotes(getDefaultWatchlist());
  },
};

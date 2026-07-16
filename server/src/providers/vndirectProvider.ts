import { StockProvider, Quote, HistoryPoint, HistoryRange, SearchResult } from "./types.js";
import { STOCK_UNIVERSE, findSeed } from "./universe.js";

// VNDirect Securities public (unofficial, undocumented) endpoints — same ones
// that power their own trading platform charts. No API key required, but
// since they're not an official public API they can change shape without
// notice; getHistory() degrades to an empty array instead of throwing when
// the response doesn't look like real data.
const CHART_BASE = "https://dchart-api.vndirect.com.vn/dchart";
const FINFO_BASE = "https://finfo-api.vndirect.com.vn/v4";

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw Object.assign(new Error(`VNDirect request failed: ${res.status}`), {
      status: res.status,
    });
  }
  return res.json();
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface RawPrice {
  code: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  nmVolume: number;
}

async function fetchLatestPrices(symbols: string[], lookbackDays = 10): Promise<Map<string, RawPrice[]>> {
  const to = new Date();
  const from = new Date(to.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const q = `code:${symbols.join(",")}~date:gte:${toDateStr(from)}~date:lte:${toDateStr(to)}`;
  const url = `${FINFO_BASE}/stock_prices?sort=date&q=${encodeURIComponent(q)}&size=${symbols.length * lookbackDays}`;
  const data = await fetchJson(url);
  const rows: RawPrice[] = data?.data ?? [];

  const bySymbol = new Map<string, RawPrice[]>();
  for (const row of rows) {
    const list = bySymbol.get(row.code) ?? [];
    list.push(row);
    bySymbol.set(row.code, list);
  }
  for (const list of bySymbol.values()) {
    list.sort((a, b) => b.date.localeCompare(a.date)); // newest first
  }
  return bySymbol;
}

function toQuote(symbol: string, rows: RawPrice[]): Quote {
  if (!rows || rows.length === 0) {
    throw Object.assign(new Error(`No price data for symbol: ${symbol}`), { status: 404 });
  }
  const [latest, prev] = rows;
  const prevClose = prev?.close ?? latest.close;
  const change = latest.close - prevClose;
  const seed = findSeed(symbol);
  return {
    symbol,
    name: seed?.name ?? symbol,
    exchange: seed?.exchange ?? "",
    currency: "VND",
    price: latest.close,
    change,
    changePercent: prevClose ? (change / prevClose) * 100 : 0,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    prevClose,
    volume: latest.nmVolume ?? 0,
    updatedAt: new Date(`${latest.date}T15:00:00+07:00`).toISOString(),
  };
}

function toRangeParams(range: HistoryRange): { resolution: string; fromMs: number } {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case "1D":
      return { resolution: "15", fromMs: now - day };
    case "1W":
      return { resolution: "60", fromMs: now - 7 * day };
    case "1M":
      return { resolution: "D", fromMs: now - 30 * day };
    case "3M":
      return { resolution: "D", fromMs: now - 90 * day };
    case "6M":
      return { resolution: "D", fromMs: now - 180 * day };
    case "1Y":
      return { resolution: "D", fromMs: now - 365 * day };
    case "5Y":
      return { resolution: "W", fromMs: now - 5 * 365 * day };
    case "MAX":
      return { resolution: "W", fromMs: now - 30 * 365 * day };
  }
}

export const vndirectProvider: StockProvider = {
  id: "vndirect",

  async getQuote(symbol: string): Promise<Quote> {
    const bySymbol = await fetchLatestPrices([symbol]);
    return toQuote(symbol, bySymbol.get(symbol) ?? []);
  },

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];
    const bySymbol = await fetchLatestPrices(symbols);
    return symbols
      .filter((s) => (bySymbol.get(s) ?? []).length > 0)
      .map((s) => toQuote(s, bySymbol.get(s)!));
  },

  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
    const { resolution, fromMs } = toRangeParams(range);
    const from = Math.floor(fromMs / 1000);
    const to = Math.floor(Date.now() / 1000);
    const url = `${CHART_BASE}/history?resolution=${resolution}&symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}`;
    const data = await fetchJson(url);
    if (data?.s !== "ok" || !Array.isArray(data.t)) {
      return [];
    }
    const points: HistoryPoint[] = [];
    for (let i = 0; i < data.t.length; i++) {
      points.push({
        time: new Date(data.t[i] * 1000).toISOString(),
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v?.[i] ?? 0,
      });
    }
    return points;
  },

  // Symbol search stays local: it's a small curated VN universe, and avoids
  // depending on VNDirect's separate (and less certain) symbol-list endpoint.
  async search(query: string): Promise<SearchResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return STOCK_UNIVERSE.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    )
      .slice(0, 10)
      .map((s) => ({ symbol: s.symbol, name: s.name, exchange: s.exchange }));
  },

  async getMarketOverview(): Promise<Quote[]> {
    const fromEnv = process.env.WATCHLIST_SYMBOLS;
    const symbols = fromEnv
      ? fromEnv.split(",").map((s) => s.trim()).filter(Boolean)
      : STOCK_UNIVERSE.map((s) => s.symbol);
    return this.getQuotes(symbols);
  },
};

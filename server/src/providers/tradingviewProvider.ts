import { StockProvider, Quote, HistoryPoint, HistoryRange, SearchResult } from "./types.js";
import { STOCK_UNIVERSE, findSeed } from "./universe.js";
import { vndirectProvider } from "./vndirectProvider.js";

// TradingView's Vietnam market scanner — the same JSON endpoint that powers
// tradingview.com/markets/stocks-vietnam/. Unofficial but public, no API key.
// Prices come back in plain VND for HOSE/HNX tickers.
const SCAN_URL = "https://scanner.tradingview.com/vietnam/scan";

const COLUMNS = [
  "name", // ticker, e.g. "VNM"
  "description", // company name
  "close",
  "change", // percent
  "change_abs",
  "open",
  "high",
  "low",
  "volume",
  "market_cap_basic",
  "exchange",
] as const;

function tickerOf(symbol: string): string {
  const seed = findSeed(symbol);
  const exchange = seed?.exchange === "HNX" ? "HNX" : "HOSE";
  return `${exchange}:${symbol.toUpperCase()}`;
}

async function scan(tickers: string[]): Promise<Map<string, unknown[]>> {
  const res = await fetch(SCAN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; StockDash/1.0)",
    },
    body: JSON.stringify({
      symbols: { tickers, query: { types: [] } },
      columns: COLUMNS,
    }),
  });
  if (!res.ok) {
    throw Object.assign(new Error(`TradingView scanner trả lỗi ${res.status}`), { status: 502 });
  }
  const data = await res.json();
  const rows: Array<{ s: string; d: unknown[] }> = data?.data ?? [];
  return new Map(rows.map((row) => [row.s, row.d]));
}

function toQuote(symbol: string, d: unknown[]): Quote {
  const [, description, close, changePct, changeAbs, open, high, low, volume, marketCap, exchange] =
    d as [string, string, number, number, number, number, number, number, number, number, string];
  if (close == null) {
    throw Object.assign(new Error(`Không có dữ liệu cho mã: ${symbol}`), { status: 404 });
  }
  const seed = findSeed(symbol);
  const prevClose = close - (changeAbs ?? 0);
  return {
    symbol: symbol.toUpperCase(),
    name: seed?.name ?? description ?? symbol,
    exchange: seed?.exchange ?? exchange ?? "",
    currency: "VND",
    price: close,
    change: changeAbs ?? 0,
    changePercent: changePct ?? 0,
    open: open ?? close,
    high: high ?? close,
    low: low ?? close,
    prevClose,
    volume: volume ?? 0,
    marketCap: typeof marketCap === "number" && marketCap > 0 ? marketCap : undefined,
    updatedAt: new Date().toISOString(),
  };
}

export const tradingviewProvider: StockProvider = {
  id: "tradingview",

  async getQuote(symbol: string): Promise<Quote> {
    const ticker = tickerOf(symbol);
    const bySymbol = await scan([ticker]);
    const d = bySymbol.get(ticker);
    if (!d) {
      throw Object.assign(new Error(`Không tìm thấy mã ${symbol} trên TradingView`), { status: 404 });
    }
    return toQuote(symbol, d);
  },

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];
    // Single batch request for the whole board.
    const bySymbol = await scan(symbols.map(tickerOf));
    const quotes: Quote[] = [];
    for (const s of symbols) {
      const d = bySymbol.get(tickerOf(s));
      if (!d) continue;
      try {
        quotes.push(toQuote(s, d));
      } catch {
        // skip symbols with incomplete rows
      }
    }
    if (quotes.length === 0) {
      throw Object.assign(
        new Error("TradingView không trả về dữ liệu cho mã nào — thử lại sau ít phút"),
        { status: 502 }
      );
    }
    return quotes;
  },

  // TradingView has no public REST endpoint for OHLC history — the detail-page
  // chart uses TradingView's official embed widget client-side instead, so this
  // endpoint only matters for direct API consumers. Delegate to VNDirect so it
  // still returns real VN data.
  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
    return vndirectProvider.getHistory(symbol, range);
  },

  // Search stays local against the curated VN universe.
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

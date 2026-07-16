import {
  StockProvider,
  Quote,
  HistoryPoint,
  HistoryRange,
  SearchResult,
  TopExchange,
  TopTradedItem,
} from "./types.js";
import { STOCK_UNIVERSE, findSeed } from "./universe.js";

// Data source used by the vnstock library (vnstocks.com): TCBS's public API
// at apipubaws.tcbs.com.vn. No token required. Prices are in plain VND and
// cover all three Vietnamese exchanges (HOSE / HNX / UPCOM).
const BASE = "https://apipubaws.tcbs.com.vn";

const HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; StockDash/1.0)",
};

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
  if (!res.ok) {
    throw Object.assign(new Error(`TCBS (vnstock) trả lỗi ${res.status}`), { status: 502 });
  }
  return res.json();
}

interface TcbsBar {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradingDate: string;
}

// Daily/weekly/monthly candles — same endpoint the vnstock library's TCBS
// source uses for stock_historical_data().
async function fetchBars(
  symbol: string,
  resolution: "D" | "W" | "M",
  days: number
): Promise<TcbsBar[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 60 * 60;
  const url =
    `${BASE}/stock-insight/v1/stock/bars-long-term` +
    `?ticker=${encodeURIComponent(symbol.toUpperCase())}&type=stock&resolution=${resolution}&from=${from}&to=${to}`;
  const data = await fetchJson(url);
  const bars: TcbsBar[] = data?.data ?? [];
  // Oldest-first as returned; guard anyway.
  return bars
    .filter((b) => b && b.close != null)
    .sort((a, b) => a.tradingDate.localeCompare(b.tradingDate));
}

function quoteFromBars(symbol: string, bars: TcbsBar[]): Quote {
  if (bars.length === 0) {
    throw Object.assign(new Error(`Không có dữ liệu cho mã: ${symbol}`), { status: 404 });
  }
  const latest = bars[bars.length - 1];
  const prev = bars.length > 1 ? bars[bars.length - 2] : latest;
  const prevClose = prev.close;
  const change = latest.close - prevClose;
  const seed = findSeed(symbol);
  return {
    symbol: symbol.toUpperCase(),
    name: seed?.name ?? symbol.toUpperCase(),
    exchange: seed?.exchange ?? "",
    currency: "VND",
    price: latest.close,
    change,
    changePercent: prevClose ? (change / prevClose) * 100 : 0,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    prevClose,
    volume: latest.volume ?? 0,
    updatedAt: new Date(latest.tradingDate).toISOString(),
  };
}

const RANGE_TO_PARAMS: Record<HistoryRange, { resolution: "D" | "W" | "M"; days: number }> = {
  "1D": { resolution: "D", days: 7 }, // TCBS long-term data is end-of-day
  "1W": { resolution: "D", days: 10 },
  "1M": { resolution: "D", days: 35 },
  "3M": { resolution: "D", days: 95 },
  "6M": { resolution: "D", days: 185 },
  "1Y": { resolution: "D", days: 370 },
  "5Y": { resolution: "W", days: 365 * 5 },
};

const EXCHANGE_NAMES: Record<string, string> = {
  HOSE: "HOSE",
  HSX: "HOSE",
  HNX: "HNX",
  UPCOM: "UPCOM",
  UPCoM: "UPCOM",
};

// TCBS stock screener (same endpoint behind vnstock's Screener) — used to
// rank the whole market by trading value/volume across all three exchanges.
async function fetchScreener(): Promise<any[]> {
  const url = `${BASE}/ligo/v1/watchlist/preview?page=0&size=1700`;
  const data = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tcbsID: null,
      filters: [{ key: "exchangeName", value: "HOSE,HNX,UPCOM", operator: "IN" }],
    }),
  });
  const rows = data?.searchData?.pageContent;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw Object.assign(new Error("TCBS screener không trả về dữ liệu"), { status: 502 });
  }
  return rows;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export const vnstockProvider: StockProvider = {
  id: "vnstock",

  async getQuote(symbol: string): Promise<Quote> {
    const bars = await fetchBars(symbol, "D", 10);
    return quoteFromBars(symbol, bars);
  },

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];
    const results = await Promise.allSettled(
      symbols.map(async (s) => quoteFromBars(s, await fetchBars(s, "D", 10)))
    );
    const quotes = results
      .filter((r): r is PromiseFulfilledResult<Quote> => r.status === "fulfilled")
      .map((r) => r.value);
    if (quotes.length === 0) {
      const firstFailure = results.find(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      );
      throw firstFailure?.reason ?? new Error("Không lấy được dữ liệu nào từ TCBS (vnstock)");
    }
    return quotes;
  },

  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
    const { resolution, days } = RANGE_TO_PARAMS[range];
    const bars = await fetchBars(symbol, resolution, days);
    return bars.map((b) => ({
      time: new Date(b.tradingDate).toISOString(),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume ?? 0,
    }));
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

  async getTopTraded(exchange: TopExchange): Promise<TopTradedItem[]> {
    const rows = await fetchScreener();
    const items: TopTradedItem[] = rows
      .map((row) => {
        const symbol = String(row.ticker ?? "").toUpperCase();
        const ex = EXCHANGE_NAMES[String(row.exchangeName ?? "")] ?? String(row.exchangeName ?? "");
        // Field names vary across screener versions — read defensively.
        const valueBnVnd = num(row.totalTradingValue); // reported in billion VND
        const volume = num(row.totalVolume) ?? num(row.volume) ?? num(row.avgTradingVolume5Day);
        const price = num(row.priceNearRealtime) ?? num(row.price) ?? num(row.closePrice);
        const changePercent =
          num(row.percentPriceChange) ??
          num(row.pricePctChg1d) ??
          num(row.priceChangePercent1Day);
        return {
          symbol,
          exchange: ex,
          name: findSeed(symbol)?.name,
          price,
          changePercent,
          volume,
          value: valueBnVnd != null ? valueBnVnd * 1_000_000_000 : undefined,
        };
      })
      .filter((item) => item.symbol && (exchange === "ALL" || item.exchange === exchange));

    items.sort((a, b) => (b.value ?? b.volume ?? 0) - (a.value ?? a.volume ?? 0));
    return items.slice(0, 10);
  },
};

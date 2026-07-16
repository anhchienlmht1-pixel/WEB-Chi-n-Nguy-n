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
// at apipubaws.tcbs.com.vn. No token required, but it rate-limits aggressive
// callers (HTTP 429) — so this provider is built around ONE cached screener
// request for the whole board instead of one request per symbol, and only
// falls back to per-symbol candle calls for small symbol sets.
const BASE = "https://apipubaws.tcbs.com.vn";

const HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; StockDash/1.0)",
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string, init?: RequestInit, attempt = 0): Promise<any> {
  const res = await fetch(url, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
  if ((res.status === 429 || res.status >= 500) && attempt < 1) {
    await sleep(1500);
    return fetchJson(url, init, attempt + 1);
  }
  if (res.status === 429) {
    throw Object.assign(
      new Error("TCBS đang giới hạn tần suất truy cập (429) — vui lòng tải lại sau 1-2 phút"),
      { status: 503 }
    );
  }
  if (!res.ok) {
    throw Object.assign(new Error(`TCBS (vnstock) trả lỗi ${res.status}`), { status: 502 });
  }
  return res.json();
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

const EXCHANGE_NAMES: Record<string, string> = {
  HOSE: "HOSE",
  HSX: "HOSE",
  HNX: "HNX",
  UPCOM: "UPCOM",
  UPCoM: "UPCOM",
};

// ---------------------------------------------------------------------------
// TCBS screener: one POST returns the whole market (~1700 tickers across
// HOSE/HNX/UPCOM) with near-realtime price, % change, volume and trading
// value. Cached in-module for 30s and de-duplicated while in flight, so the
// board, top-10 and watchlist all share a single upstream call.
// ---------------------------------------------------------------------------
const SCREENER_TTL_MS = 30_000;
let screenerCache: { at: number; rows: any[] } | null = null;
let screenerInFlight: Promise<any[]> | null = null;

async function fetchScreener(): Promise<any[]> {
  if (screenerCache && Date.now() - screenerCache.at < SCREENER_TTL_MS) {
    return screenerCache.rows;
  }
  if (screenerInFlight) return screenerInFlight;
  screenerInFlight = (async () => {
    try {
      const data = await fetchJson(`${BASE}/ligo/v1/watchlist/preview?page=0&size=1700`, {
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
      screenerCache = { at: Date.now(), rows };
      return rows;
    } finally {
      screenerInFlight = null;
    }
  })();
  return screenerInFlight;
}

// Screener field names vary between TCBS versions — read defensively.
function rowPrice(row: any): number | undefined {
  return num(row.priceNearRealtime) ?? num(row.price) ?? num(row.closePrice);
}

function rowChangePercent(row: any): number | undefined {
  return (
    num(row.percentPriceChange) ??
    num(row.pricePctChg1d) ??
    num(row.priceChangePercent1Day) ??
    num(row.pricePercentChange1Day)
  );
}

function rowVolume(row: any): number | undefined {
  return (
    num(row.totalVolume) ??
    num(row.volume) ??
    num(row.totalTradingVolume) ??
    num(row.avgTradingVolume5Day)
  );
}

function quoteFromScreenerRow(symbol: string, row: any): Quote | null {
  const price = rowPrice(row);
  if (price == null || price <= 0) return null;
  const pct = rowChangePercent(row);
  const prevClose = pct != null && pct > -100 ? price / (1 + pct / 100) : price;
  const seed = findSeed(symbol);
  const marketCapBn = num(row.marketCap);
  return {
    symbol: symbol.toUpperCase(),
    name: seed?.name ?? String(row.companyName ?? symbol),
    exchange:
      seed?.exchange ?? EXCHANGE_NAMES[String(row.exchangeName ?? "")] ?? String(row.exchangeName ?? ""),
    currency: "VND",
    price,
    change: price - prevClose,
    changePercent: pct ?? 0,
    // The screener has no intraday OHLC; the detail page uses candle data
    // from getQuote() instead, so these placeholders never surface there.
    open: price,
    high: price,
    low: price,
    prevClose,
    volume: rowVolume(row) ?? 0,
    marketCap: marketCapBn != null && marketCapBn > 0 ? marketCapBn * 1_000_000_000 : undefined,
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Daily/weekly candles — same endpoint the vnstock library's TCBS source uses
// for historical data. One request per symbol, so only used for the detail
// page and small watchlists.
// ---------------------------------------------------------------------------
interface TcbsBar {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradingDate: string;
}

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

export const vnstockProvider: StockProvider = {
  id: "vnstock",

  async getQuote(symbol: string): Promise<Quote> {
    // Candles give real OHLC for the detail page; fall back to the (cached)
    // screener row if the candle endpoint is having a bad moment.
    try {
      const bars = await fetchBars(symbol, "D", 10);
      return quoteFromBars(symbol, bars);
    } catch (err) {
      try {
        const rows = await fetchScreener();
        const row = rows.find(
          (r) => String(r.ticker ?? "").toUpperCase() === symbol.toUpperCase()
        );
        const quote = row && quoteFromScreenerRow(symbol, row);
        if (quote) return quote;
      } catch {
        // keep the original error
      }
      throw err;
    }
  },

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];

    // Primary path: single cached screener request covers everything.
    let screenerError: unknown;
    try {
      const rows = await fetchScreener();
      const rowMap = new Map(rows.map((r) => [String(r.ticker ?? "").toUpperCase(), r]));
      const quotes: Quote[] = [];
      for (const s of symbols) {
        const row = rowMap.get(s.toUpperCase());
        const quote = row ? quoteFromScreenerRow(s, row) : null;
        if (quote) quotes.push(quote);
      }
      if (quotes.length > 0) return quotes;
    } catch (err) {
      screenerError = err;
    }

    // Fallback (small sets only, throttled): per-symbol candles. Refusing the
    // fallback for large boards avoids re-triggering TCBS's rate limit.
    if (symbols.length <= 20) {
      const results = await mapLimit(symbols, 4, async (s) =>
        quoteFromBars(s, await fetchBars(s, "D", 10))
      );
      const quotes = results
        .filter((r): r is PromiseFulfilledResult<Quote> => r.status === "fulfilled")
        .map((r) => r.value);
      if (quotes.length > 0) return quotes;
      const firstFailure = results.find(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      );
      throw firstFailure?.reason ?? new Error("Không lấy được dữ liệu nào từ TCBS (vnstock)");
    }

    throw screenerError ?? new Error("Không lấy được dữ liệu nào từ TCBS (vnstock)");
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
        const valueBnVnd = num(row.totalTradingValue); // reported in billion VND
        const price = rowPrice(row);
        const volume = rowVolume(row);
        return {
          symbol,
          exchange: ex,
          name: findSeed(symbol)?.name,
          price,
          changePercent: rowChangePercent(row),
          volume,
          value:
            valueBnVnd != null
              ? valueBnVnd * 1_000_000_000
              : price != null && volume != null
                ? price * volume
                : undefined,
        };
      })
      .filter((item) => item.symbol && (exchange === "ALL" || item.exchange === exchange));

    items.sort((a, b) => (b.value ?? b.volume ?? 0) - (a.value ?? a.volume ?? 0));
    return items.slice(0, 10);
  },
};

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

// Same data source as the vnstock library (vnstocks.com): VCI / Vietcap
// Securities' trading API. Endpoints, payloads and response shapes below were
// verified against the actual vnstock 4.0.4 source (vnstock/explorer/vci/*)
// downloaded from PyPI:
//   - POST /api/price/symbols/getList        {"symbols":[...]}          → price board
//   - POST /api/chart/OHLCChart/gap-chart    {timeFrame,symbols,to,countBack} → OHLCV
//   - GET  /api/price/symbols/getByGroup?group=HOSE|HNX|UPCOM           → symbol lists
// Prices are plain VND. No token required, but browser-like headers with
// Referer/Origin trading.vietcap.com.vn are expected (mirrors the library).
const TRADING = "https://trading.vietcap.com.vn/api";

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7",
  "Content-Type": "application/json",
  Referer: "https://trading.vietcap.com.vn/",
  Origin: "https://trading.vietcap.com.vn",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
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
      new Error("Vietcap (vnstock) đang giới hạn tần suất truy cập — vui lòng tải lại sau 1-2 phút"),
      { status: 503 }
    );
  }
  if (!res.ok) {
    throw Object.assign(new Error(`Vietcap (vnstock) trả lỗi ${res.status}`), { status: 502 });
  }
  return res.json();
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

const BOARD_MAP: Record<string, string> = {
  HOSE: "HOSE",
  HSX: "HOSE",
  HNX: "HNX",
  UPCOM: "UPCOM",
  UPCoM: "UPCOM",
};

// ---------------------------------------------------------------------------
// Price board — one POST covers any number of symbols.
// ---------------------------------------------------------------------------
async function fetchPriceBoard(symbols: string[]): Promise<any[]> {
  const data = await fetchJson(`${TRADING}/price/symbols/getList`, {
    method: "POST",
    body: JSON.stringify({ symbols: symbols.map((s) => s.toUpperCase()) }),
  });
  if (!Array.isArray(data)) {
    throw Object.assign(new Error("Vietcap trả về dữ liệu bảng giá không hợp lệ"), { status: 502 });
  }
  return data;
}

function quoteFromBoardItem(item: any): Quote | null {
  const listing = item?.listingInfo ?? {};
  const match = item?.matchPrice ?? {};
  const symbol = String(listing.symbol ?? "").toUpperCase();
  const price = num(match.matchPrice) ?? num(listing.refPrice);
  if (!symbol || price == null || price <= 0) return null;

  const prevClose = num(listing.refPrice) ?? price;
  const volume = num(match.accumulatedVolume) ?? 0;
  const seed = findSeed(symbol);
  return {
    symbol,
    name: seed?.name ?? String(listing.organName ?? symbol),
    exchange: seed?.exchange ?? BOARD_MAP[String(listing.board ?? "")] ?? String(listing.board ?? ""),
    currency: "VND",
    price,
    change: price - prevClose,
    changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
    open: num(match.openPrice) ?? prevClose,
    high: num(match.highest) ?? price,
    low: num(match.lowest) ?? price,
    prevClose,
    volume,
    updatedAt: new Date().toISOString(),
  };
}

function tradingValueOf(item: any, price: number, volume: number): number {
  let value = num(item?.matchPrice?.accumulatedValue);
  const approx = price * volume;
  if (value != null && approx > 0 && value * 100 < approx) {
    // Some deployments report value in thousand-VND units; normalise.
    value *= 1000;
  }
  return value ?? approx;
}

// ---------------------------------------------------------------------------
// Symbol lists per exchange (for the whole-market top-traded ranking).
// Cached long since listings rarely change.
// ---------------------------------------------------------------------------
const GROUPS: Exclude<TopExchange, "ALL">[] = ["HOSE", "HNX", "UPCOM"];
const GROUP_TTL_MS = 10 * 60 * 1000;
let groupCache: { at: number; bySymbolExchange: Map<string, string> } | null = null;
let groupInFlight: Promise<Map<string, string>> | null = null;

async function fetchGroupSymbols(): Promise<Map<string, string>> {
  if (groupCache && Date.now() - groupCache.at < GROUP_TTL_MS) return groupCache.bySymbolExchange;
  if (groupInFlight) return groupInFlight;
  groupInFlight = (async () => {
    try {
      const bySymbolExchange = new Map<string, string>();
      for (const group of GROUPS) {
        const data = await fetchJson(`${TRADING}/price/symbols/getByGroup?group=${group}`);
        const rows: any[] = Array.isArray(data) ? data : [];
        for (const row of rows) {
          const symbol = String(row?.symbol ?? "").toUpperCase();
          if (symbol) bySymbolExchange.set(symbol, group);
        }
      }
      if (bySymbolExchange.size === 0) {
        throw Object.assign(new Error("Vietcap không trả về danh sách mã"), { status: 502 });
      }
      groupCache = { at: Date.now(), bySymbolExchange };
      return bySymbolExchange;
    } finally {
      groupInFlight = null;
    }
  })();
  return groupInFlight;
}

// Full-market price board, cached 60s and de-duplicated in flight — the
// top-traded tabs all share this one upstream call.
const BOARD_TTL_MS = 60_000;
let boardCache: { at: number; items: any[] } | null = null;
let boardInFlight: Promise<any[]> | null = null;

async function fetchFullBoard(): Promise<any[]> {
  if (boardCache && Date.now() - boardCache.at < BOARD_TTL_MS) return boardCache.items;
  if (boardInFlight) return boardInFlight;
  boardInFlight = (async () => {
    try {
      const bySymbolExchange = await fetchGroupSymbols();
      const items = await fetchPriceBoard([...bySymbolExchange.keys()]);
      boardCache = { at: Date.now(), items };
      return items;
    } finally {
      boardInFlight = null;
    }
  })();
  return boardInFlight;
}

// ---------------------------------------------------------------------------
// OHLCV history (gap-chart) — response item: {o:[],h:[],l:[],c:[],v:[],t:[]}
// with t in unix seconds and prices in plain VND.
// ---------------------------------------------------------------------------
const RANGE_TO_COUNTBACK: Record<HistoryRange, number> = {
  "1D": 2,
  "1W": 7,
  "1M": 24,
  "3M": 68,
  "6M": 134,
  "1Y": 264,
  "5Y": 1310,
  // VN exchanges only exist since ~2000 — 20000 bars comfortably covers any
  // listing's full history since IPO; VCI just returns whatever it actually
  // has, so an overshoot here is harmless.
  MAX: 20000,
};

async function fetchHistoryBars(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
  const data = await fetchJson(`${TRADING}/chart/OHLCChart/gap-chart`, {
    method: "POST",
    body: JSON.stringify({
      timeFrame: "ONE_DAY",
      symbols: [symbol.toUpperCase()],
      to: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      countBack: RANGE_TO_COUNTBACK[range],
    }),
  });
  const list = Array.isArray(data) ? data : (data?.data ?? []);
  const bars = list[0];
  if (!bars || !Array.isArray(bars.t) || bars.t.length === 0) {
    return [];
  }
  const points: HistoryPoint[] = [];
  for (let i = 0; i < bars.t.length; i++) {
    const close = bars.c?.[i];
    if (close == null) continue;
    points.push({
      time: new Date(bars.t[i] * 1000).toISOString(),
      open: bars.o?.[i] ?? close,
      high: bars.h?.[i] ?? close,
      low: bars.l?.[i] ?? close,
      close,
      volume: bars.v?.[i] ?? 0,
    });
  }
  points.sort((a, b) => a.time.localeCompare(b.time));
  return points;
}

export const vnstockProvider: StockProvider = {
  id: "vnstock",

  async getQuote(symbol: string): Promise<Quote> {
    const items = await fetchPriceBoard([symbol]);
    const quote = items.length > 0 ? quoteFromBoardItem(items[0]) : null;
    if (!quote) {
      throw Object.assign(new Error(`Không có dữ liệu cho mã: ${symbol}`), { status: 404 });
    }
    return quote;
  },

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];
    const items = await fetchPriceBoard(symbols);
    const quotes = items
      .map((item) => quoteFromBoardItem(item))
      .filter((q): q is Quote => q !== null);
    if (quotes.length === 0) {
      throw Object.assign(new Error("Vietcap không trả về dữ liệu cho mã nào"), { status: 502 });
    }
    return quotes;
  },

  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
    return fetchHistoryBars(symbol, range);
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
    const [items, bySymbolExchange] = await Promise.all([fetchFullBoard(), fetchGroupSymbols()]);
    const ranked: TopTradedItem[] = [];
    for (const item of items) {
      const listing = item?.listingInfo ?? {};
      const match = item?.matchPrice ?? {};
      const symbol = String(listing.symbol ?? "").toUpperCase();
      const price = num(match.matchPrice) ?? num(listing.refPrice);
      if (!symbol || price == null || price <= 0) continue;
      const ex =
        bySymbolExchange.get(symbol) ??
        BOARD_MAP[String(listing.board ?? "")] ??
        String(listing.board ?? "");
      if (exchange !== "ALL" && ex !== exchange) continue;
      const volume = num(match.accumulatedVolume) ?? 0;
      const prevClose = num(listing.refPrice) ?? price;
      ranked.push({
        symbol,
        exchange: ex,
        name: findSeed(symbol)?.name ?? String(listing.organName ?? ""),
        price,
        changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
        volume,
        value: tradingValueOf(item, price, volume),
      });
    }
    ranked.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return ranked.slice(0, 10);
  },
};

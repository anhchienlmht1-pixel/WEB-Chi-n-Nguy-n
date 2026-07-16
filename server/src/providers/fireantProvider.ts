import { StockProvider, Quote, HistoryPoint, HistoryRange, SearchResult } from "./types.js";
import { STOCK_UNIVERSE, findSeed } from "./universe.js";

// FireAnt public REST API (https://fireant.vn). Requires a Bearer token —
// log in at fireant.vn, open DevTools > Network, find any request to
// restv2.fireant.vn and copy the "Authorization: Bearer <token>" value into
// the FIREANT_TOKEN env var.
//
// FireAnt returns prices in thousand-VND units (e.g. 91.2 == 91,200 VND).
// We scale them up to plain VND to match the rest of the app. If your data
// looks 1000x off, set FIREANT_PRICE_SCALE=1 to disable the scaling.
const BASE = "https://restv2.fireant.vn";

function token(): string {
  const t = process.env.FIREANT_TOKEN;
  if (!t) {
    throw Object.assign(
      new Error(
        "FIREANT_TOKEN chưa được thiết lập. Đăng nhập fireant.vn, mở DevTools > Network, " +
          "copy giá trị 'Authorization: Bearer ...' rồi đặt vào biến môi trường FIREANT_TOKEN."
      ),
      { status: 500 }
    );
  }
  return t;
}

function priceScale(): number {
  const raw = process.env.FIREANT_PRICE_SCALE;
  const n = raw ? Number(raw) : 1000;
  return Number.isFinite(n) && n > 0 ? n : 1000;
}

async function fetchJson(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/json",
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw Object.assign(
      new Error("FireAnt từ chối token (401/403). Token có thể đã hết hạn — lấy token mới từ fireant.vn."),
      { status: 502 }
    );
  }
  if (!res.ok) {
    throw Object.assign(new Error(`FireAnt request failed: ${res.status}`), { status: res.status });
  }
  return res.json();
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface RawQuote {
  symbol: string;
  date: string;
  priceOpen: number;
  priceHigh: number;
  priceLow: number;
  priceClose: number;
  priceAverage?: number;
  priceBasic?: number;
  totalVolume?: number;
  dealVolume?: number;
  nmVolume?: number;
}

const RANGE_DAYS: Record<HistoryRange, number> = {
  "1D": 5, // FireAnt only has end-of-day data, so 1D shows the last few sessions
  "1W": 10,
  "1M": 35,
  "3M": 95,
  "6M": 185,
  "1Y": 370,
  "5Y": 365 * 5,
};

async function fetchHistoricalQuotes(symbol: string, days: number): Promise<RawQuote[]> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const limit = Math.min(days + 10, 4000);
  const path =
    `/symbols/${encodeURIComponent(symbol)}/historical-quotes` +
    `?startDate=${toDateStr(from)}&endDate=${toDateStr(to)}&offset=0&limit=${limit}`;
  const data = await fetchJson(path);
  const rows: RawQuote[] = Array.isArray(data) ? data : [];
  // Normalise to newest-first regardless of what FireAnt returns.
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function volumeOf(row: RawQuote): number {
  return row.totalVolume ?? row.dealVolume ?? row.nmVolume ?? 0;
}

function buildQuote(symbol: string, rows: RawQuote[], marketCap?: number): Quote {
  if (!rows || rows.length === 0) {
    throw Object.assign(new Error(`Không có dữ liệu cho mã: ${symbol}`), { status: 404 });
  }
  const scale = priceScale();
  const [latest, prev] = rows;
  const prevClose = (prev?.priceClose ?? latest.priceBasic ?? latest.priceClose) * scale;
  const price = latest.priceClose * scale;
  const change = price - prevClose;
  const seed = findSeed(symbol);
  return {
    symbol,
    name: seed?.name ?? symbol,
    exchange: seed?.exchange ?? "",
    currency: "VND",
    price,
    change,
    changePercent: prevClose ? (change / prevClose) * 100 : 0,
    open: latest.priceOpen * scale,
    high: latest.priceHigh * scale,
    low: latest.priceLow * scale,
    prevClose,
    volume: volumeOf(latest),
    marketCap,
    updatedAt: new Date(`${latest.date.slice(0, 10)}T15:00:00+07:00`).toISOString(),
  };
}

async function fetchMarketCap(symbol: string): Promise<number | undefined> {
  try {
    const data = await fetchJson(`/symbols/${encodeURIComponent(symbol)}/fundamental`);
    const cap = data?.marketCap;
    return typeof cap === "number" && cap > 0 ? cap : undefined;
  } catch {
    return undefined;
  }
}

export const fireantProvider: StockProvider = {
  id: "fireant",

  async getQuote(symbol: string): Promise<Quote> {
    const [rows, marketCap] = await Promise.all([
      fetchHistoricalQuotes(symbol, 10),
      fetchMarketCap(symbol),
    ]);
    return buildQuote(symbol, rows, marketCap);
  },

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];
    // No batch endpoint on FireAnt — fetch in parallel and drop failures so one
    // bad symbol doesn't sink the whole board. marketCap is skipped here to
    // keep the number of requests down.
    const results = await Promise.allSettled(
      symbols.map(async (s) => buildQuote(s, await fetchHistoricalQuotes(s, 10)))
    );
    return results
      .filter((r): r is PromiseFulfilledResult<Quote> => r.status === "fulfilled")
      .map((r) => r.value);
  },

  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
    const rows = await fetchHistoricalQuotes(symbol, RANGE_DAYS[range]);
    const scale = priceScale();
    // Oldest-first for charting.
    return rows
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({
        time: new Date(`${row.date.slice(0, 10)}T00:00:00+07:00`).toISOString(),
        open: row.priceOpen * scale,
        high: row.priceHigh * scale,
        low: row.priceLow * scale,
        close: row.priceClose * scale,
        volume: volumeOf(row),
      }));
  },

  // Search stays local against the curated VN universe — reliable and avoids
  // depending on a separate FireAnt search endpoint.
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

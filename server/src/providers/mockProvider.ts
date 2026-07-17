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
import { INDEX_UNIVERSE, findIndexSeed } from "./indices.js";

const INDEX_BASE_PRICES: Record<string, number> = {
  VNINDEX: 1250,
  HNXINDEX: 230,
  UPINDEX: 95,
  VN30: 1310,
  VN30F1M: 1312,
  VN30F2M: 1315,
  VN30F1Q: 1318,
  VN30F2Q: 1320,
};

interface Seed {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  basePrice: number;
}

function findAnySeed(symbol: string): Seed | undefined {
  const stock = findSeed(symbol);
  if (stock) return stock;
  const index = findIndexSeed(symbol);
  if (index) {
    return {
      symbol: index.symbol,
      name: index.name,
      exchange: index.kind === "futures" ? "Phái sinh" : "Chỉ số",
      currency: "điểm",
      basePrice: INDEX_BASE_PRICES[index.symbol] ?? 1000,
    };
  }
  return undefined;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
}

// Drifts slowly over real time so repeated polls look "live" without being wild.
function liveDriftFactor(symbol: string): number {
  const minuteBucket = Math.floor(Date.now() / 15000); // changes every 15s
  const rand = mulberry32(stringSeed(symbol) ^ minuteBucket);
  return (rand() - 0.5) * 0.01; // +/-0.5%
}

function buildQuote(symbol: string): Quote {
  const seed = findAnySeed(symbol);
  if (!seed) {
    throw Object.assign(new Error(`Unknown symbol: ${symbol}`), { status: 404 });
  }
  const dayRand = mulberry32(stringSeed(seed.symbol) ^ new Date().getDate());
  const dayChangePercent = (dayRand() - 0.45) * 4; // biased slightly positive, +/-~2%
  const drift = liveDriftFactor(seed.symbol);
  const prevClose = seed.basePrice;
  const price = prevClose * (1 + (dayChangePercent + drift) / 100);
  const change = price - prevClose;
  const high = Math.max(price, prevClose) * (1 + dayRand() * 0.006);
  const low = Math.min(price, prevClose) * (1 - dayRand() * 0.006);
  const open = prevClose * (1 + (dayRand() - 0.5) * 0.01);
  const volume = Math.floor(500_000 + dayRand() * 4_500_000);

  return {
    symbol: seed.symbol,
    name: seed.name,
    exchange: seed.exchange,
    currency: seed.currency,
    price: round2(price),
    change: round2(change),
    changePercent: round2((change / prevClose) * 100),
    open: round2(open),
    high: round2(high),
    low: round2(low),
    prevClose: round2(prevClose),
    volume,
    marketCap: Math.floor(price * volume * 37),
    updatedAt: new Date().toISOString(),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const RANGE_DAYS: Record<HistoryRange, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "5Y": 365 * 5,
  MAX: 365 * 30,
};

function buildHistory(symbol: string, range: HistoryRange): HistoryPoint[] {
  const seed = findAnySeed(symbol);
  if (!seed) {
    throw Object.assign(new Error(`Unknown symbol: ${symbol}`), { status: 404 });
  }
  const days = RANGE_DAYS[range];
  const intraday = range === "1D";
  const rand = mulberry32(stringSeed(seed.symbol) * 7919 + days);
  const now = Date.now();
  const stepMs = intraday ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const steps = intraday ? 78 : days; // ~78 five-minute bars in a trading day

  // Walk backwards from the live price so the series always ends exactly at
  // the current quote, avoiding a discontinuous jump on the chart.
  const reversed: HistoryPoint[] = [];
  let close = buildQuote(symbol).price;

  for (let i = 0; i <= steps; i++) {
    const t = new Date(now - i * stepMs);
    const volatility = intraday ? 0.003 : 0.018;
    const changePct = (rand() - 0.5) * volatility * 2;
    const open = i === steps ? close : close / (1 + changePct);
    const high = Math.max(open, close) * (1 + rand() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - rand() * volatility * 0.5);
    reversed.push({
      time: t.toISOString(),
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume: Math.floor(50_000 + rand() * 500_000),
    });
    close = open;
  }

  return reversed.reverse();
}

export const mockProvider: StockProvider = {
  id: "mock",

  async getQuote(symbol: string): Promise<Quote> {
    return buildQuote(symbol);
  },

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    return symbols.map((s) => buildQuote(s));
  },

  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
    return buildHistory(symbol, range);
  },

  async search(query: string): Promise<SearchResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const indexMatches: SearchResult[] = INDEX_UNIVERSE.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).map((s) => ({ symbol: s.symbol, name: s.name, exchange: s.kind === "futures" ? "Phái sinh" : "Chỉ số" }));
    const stockMatches: SearchResult[] = STOCK_UNIVERSE.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).map((s) => ({ symbol: s.symbol, name: s.name, exchange: s.exchange }));
    return [...indexMatches, ...stockMatches].slice(0, 10);
  },

  async getMarketOverview(): Promise<Quote[]> {
    return STOCK_UNIVERSE.map((s) => buildQuote(s.symbol));
  },

  async getTopTraded(exchange: TopExchange): Promise<TopTradedItem[]> {
    return STOCK_UNIVERSE.filter((s) => exchange === "ALL" || s.exchange === exchange)
      .map((s) => {
        const q = buildQuote(s.symbol);
        return {
          symbol: q.symbol,
          exchange: q.exchange,
          name: q.name,
          price: q.price,
          changePercent: q.changePercent,
          volume: q.volume,
          value: q.price * q.volume,
        };
      })
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      .slice(0, 10);
  },
};

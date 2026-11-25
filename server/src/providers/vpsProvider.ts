import type { HistoryPoint, HistoryRange, Quote, SearchResult, StockProvider } from "./types.js";
import { STOCK_UNIVERSE, findSeed } from "./universe.js";
import { findIndexSeed } from "./indices.js";
import { fetchWithTimeout } from "./http.js";
import { kbsMarketProvider } from "./kbsMarketProvider.js";

// Bảng giá thời gian thực từ datafeed công khai của bảng giá VPS
// (bgapidatafeed.vps.com.vn — cùng nguồn trình duyệt của banggia.vps.com.vn gọi).
// Không phải API có cấp phép: VPS có thể đổi hoặc chặn bất cứ lúc nào, nên
//  - mỗi lô mã chỉ gọi tối đa một lần mỗi CACHE_MS (dù bao nhiêu người xem),
//  - lỗi thì mọi nơi gọi tự rơi về nguồn kế tiếp (KBS) qua chuỗi fallback.
// Lịch sử giá và tìm kiếm vẫn dùng KBS.
//
// Đơn vị của VPS: giá theo nghìn đồng (Quote của web đổi sang đồng), khối lượng
// theo lô 10 cổ phiếu (lot 525150 = 5.251.500 cp), giá trị chỉ số theo triệu đồng.

const BASE = "https://bgapidatafeed.vps.com.vn";
const CACHE_MS = Number(process.env.VPS_CACHE_MS) || 3000;
const VOL_UNIT = 10;
const BATCH = 100;

// Mã chỉ số trên datafeed VPS
const INDEX_CODES: Record<string, string> = { VNINDEX: "10", VN30: "11", HNXINDEX: "02", UPCOMINDEX: "03" };
const INDEX_BY_CODE = Object.fromEntries(Object.entries(INDEX_CODES).map(([k, v]) => [v, k]));
const EXCHANGE_BY_INDEX: Record<string, string> = { VNINDEX: "HOSE", VN30: "HOSE", HNXINDEX: "HNX", UPCOMINDEX: "UPCOM" };
const MARKET_TO_EXCHANGE: Record<string, string> = { STO: "HOSE", STX: "HNX", UPX: "UPCOM" };

const cache = new Map<string, { at: number; data: Promise<unknown> }>();
async function getJson<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data as Promise<T>;
  const data = (async () => {
    const res = await fetchWithTimeout(`${BASE}${path}`, {
      headers: { Accept: "application/json", Referer: "https://banggia.vps.com.vn/", Origin: "https://banggia.vps.com.vn" },
    }, 5000);
    if (!res.ok) throw Object.assign(new Error(`VPS ${res.status} ${path.slice(0, 60)}`), { status: 502 });
    return (await res.json()) as T;
  })();
  cache.set(path, { at: Date.now(), data });
  data.catch(() => cache.delete(path));
  if (cache.size > 500) for (const [k, v] of cache) if (Date.now() - v.at > 60_000) cache.delete(k);
  return data;
}

const n = (v: unknown): number | undefined => {
  const x = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(x) ? x : undefined;
};

interface VpsStock {
  sym: string;
  marketId?: string;
  c?: number;
  f?: number;
  r?: number;
  lastPrice?: number;
  lot?: number;
  openPrice?: string;
  highPrice?: string;
  lowPrice?: string;
  avePrice?: string;
  fBVol?: string;
  fSVolume?: string;
  fRoom?: string;
  g1?: string; g2?: string; g3?: string; g4?: string; g5?: string; g6?: string;
}

interface VpsIndex {
  mc: string;
  cIndex?: number;
  oIndex?: number;
  vol?: number;
  value?: number;
  ot?: string;
  time?: string;
}

function stockQuote(x: VpsStock): Quote | null {
  const symbol = String(x.sym ?? "").toUpperCase();
  const ref = n(x.r);
  // chưa khớp lệnh nào trong phiên: giá hiện tại = tham chiếu
  const last = n(x.lastPrice) || ref;
  if (!symbol || !last || !ref) return null;
  const seed = findSeed(symbol);
  const vol = n(x.lot);
  // Quote của web tính giá cổ phiếu theo đồng (như KBS): VPS trả nghìn đồng → ×1000
  const k = (v: number) => Math.round(v * 1000);
  return {
    symbol,
    name: seed?.name ?? symbol,
    exchange: seed?.exchange ?? MARKET_TO_EXCHANGE[x.marketId ?? ""] ?? "",
    currency: "VND",
    price: k(last),
    change: k(last - ref),
    changePercent: Math.round(((last - ref) / ref) * 10000) / 100,
    open: k(n(x.openPrice) || last),
    high: k(n(x.highPrice) || last),
    low: k(n(x.lowPrice) || last),
    prevClose: k(ref),
    volume: vol != null ? vol * VOL_UNIT : 0,
    updatedAt: new Date().toISOString(),
    foreignBuyVolume: n(x.fBVol) != null ? n(x.fBVol)! * VOL_UNIT : undefined,
    foreignSellVolume: n(x.fSVolume) != null ? n(x.fSVolume)! * VOL_UNIT : undefined,
    foreignRoom: n(x.fRoom),
  };
}

function indexQuote(x: VpsIndex): Quote | null {
  const symbol = INDEX_BY_CODE[x.mc];
  const cur = n(x.cIndex), prev = n(x.oIndex);
  if (!symbol || !cur || !prev) return null;
  // ot = "thay đổi|%|giá trị (triệu đồng)|số mã tăng|số mã giảm|số mã đứng giá"
  const ot = String(x.ot ?? "").split("|");
  const value = n(ot[2]);
  return {
    symbol,
    name: findIndexSeed(symbol)?.name ?? symbol,
    exchange: EXCHANGE_BY_INDEX[symbol],
    currency: "VND",
    price: cur,
    change: Math.round((cur - prev) * 100) / 100,
    changePercent: Math.round(((cur - prev) / prev) * 10000) / 100,
    open: prev,
    high: cur,
    low: cur,
    prevClose: prev,
    volume: n(x.vol) ?? 0,
    updatedAt: new Date().toISOString(),
    value: value != null ? value * 1_000_000 : undefined,
    advances: n(ot[3]),
    declines: n(ot[4]),
    noChanges: n(ot[5]),
  };
}

async function fetchStocks(symbols: string[]): Promise<Quote[]> {
  const out: Quote[] = [];
  const batches: string[][] = [];
  for (let i = 0; i < symbols.length; i += BATCH) batches.push(symbols.slice(i, i + BATCH));
  const res = await Promise.all(batches.map((b) => getJson<VpsStock[]>(`/getliststockdata/${b.join(",")}`)));
  for (const arr of res) for (const x of Array.isArray(arr) ? arr : []) {
    const q = stockQuote(x);
    if (q) out.push(q);
  }
  return out;
}

/** Dòng bảng giá thô của VPS (giá nghìn đồng, khối lượng lô 10 cp) — cho thống kê phiên. */
export interface VpsRawStock {
  symbol: string;
  ref: number;
  last: number;
  ceiling?: number;
  floor?: number;
  volume: number;
  foreignBuy: number;
  foreignSell: number;
}
export async function getVpsRawStocks(symbols: string[]): Promise<VpsRawStock[]> {
  const batches: string[][] = [];
  for (let i = 0; i < symbols.length; i += BATCH) batches.push(symbols.slice(i, i + BATCH));
  const res = await Promise.all(batches.map((b) => getJson<VpsStock[]>(`/getliststockdata/${b.join(",")}`).catch(() => [] as VpsStock[])));
  const out: VpsRawStock[] = [];
  for (const arr of res) for (const x of Array.isArray(arr) ? arr : []) {
    const ref = n(x.r);
    if (!x.sym || !ref) continue;
    out.push({
      symbol: String(x.sym).toUpperCase(),
      ref,
      last: n(x.lastPrice) || ref,
      ceiling: n(x.c),
      floor: n(x.f),
      volume: (n(x.lot) ?? 0) * VOL_UNIT,
      foreignBuy: (n(x.fBVol) ?? 0) * VOL_UNIT,
      foreignSell: (n(x.fSVolume) ?? 0) * VOL_UNIT,
    });
  }
  return out;
}

/** Danh sách mã của một sàn trên datafeed VPS (vd. "hose"); rỗng nếu VPS không trả. */
export async function getVpsExchangeSymbols(exchange: string): Promise<string[]> {
  const arr = await getJson<unknown>(`/getlistckindex/${exchange}`);
  const xs = Array.isArray(arr) ? arr : [];
  return xs.map((x) => String(typeof x === "string" ? x : (x as { sym?: string; code?: string })?.sym ?? (x as { code?: string })?.code ?? "").toUpperCase()).filter((s) => /^[A-Z0-9]{3}$/.test(s));
}

export async function getVpsIndexRaw(symbol: string): Promise<Quote | null> {
  return (await fetchIndices([symbol]))[0] ?? null;
}

async function fetchIndices(symbols: string[]): Promise<Quote[]> {
  const codes = symbols.map((s) => INDEX_CODES[s]).filter(Boolean);
  if (!codes.length) return [];
  const arr = await getJson<VpsIndex[]>(`/getlistindexdetail/${codes.join(",")}`);
  return (Array.isArray(arr) ? arr : []).map(indexQuote).filter((q): q is Quote => q !== null);
}

/** Bước giá mua/bán 3 mức và giá trần/sàn/tham chiếu của một mã (đơn vị: nghìn đồng, cổ phiếu). */
export interface OrderBook {
  symbol: string;
  ceiling: number | null;
  floor: number | null;
  ref: number | null;
  bids: { price: number; volume: number }[];
  asks: { price: number; volume: number }[];
  updatedAt: string;
}

export async function getVpsOrderBook(symbol: string): Promise<OrderBook> {
  const arr = await getJson<VpsStock[]>(`/getliststockdata/${encodeURIComponent(symbol.toUpperCase())}`);
  const x = Array.isArray(arr) ? arr[0] : undefined;
  if (!x) throw Object.assign(new Error(`VPS không có dữ liệu ${symbol}`), { status: 404 });
  const lvl = (g?: string) => {
    const [p, v] = String(g ?? "").split("|");
    const price = parseFloat(p), vol = parseFloat(v);
    // "ATO"/"ATC" hoặc 0: bỏ
    return Number.isFinite(price) && price > 0 && Number.isFinite(vol) ? { price, volume: vol * VOL_UNIT } : null;
  };
  return {
    symbol: x.sym,
    ceiling: n(x.c) ?? null,
    floor: n(x.f) ?? null,
    ref: n(x.r) ?? null,
    bids: [x.g1, x.g2, x.g3].map(lvl).filter((v): v is { price: number; volume: number } => v !== null),
    asks: [x.g4, x.g5, x.g6].map(lvl).filter((v): v is { price: number; volume: number } => v !== null),
    updatedAt: new Date().toISOString(),
  };
}

interface VpsTrade {
  sequence?: number;
  lastPrice?: number;
  lastVol?: number;
  time?: string;
  side?: string;
  change?: string;
}

export interface TapeTrade {
  time: string;
  price: number;
  volume: number;
  /** "B" mua chủ động, "S" bán chủ động, "" chưa xác định (ATO/ATC) */
  side: "B" | "S" | "";
  change: number;
}

/**
 * Lệnh khớp trong phiên: `limit` lệnh mới nhất, tổng hợp mua/bán chủ động và
 * khối lượng theo từng mức giá (tính trên toàn bộ lệnh trong phiên).
 */
export async function getVpsTape(symbol: string, limit = 150) {
  const arr = await getJson<VpsTrade[]>(`/getliststocktrade/${encodeURIComponent(symbol.toUpperCase())}`);
  const all = (Array.isArray(arr) ? arr : [])
    .map((t) => ({
      seq: n(t.sequence) ?? 0,
      time: t.time ?? "",
      price: n(t.lastPrice) ?? 0,
      volume: (n(t.lastVol) ?? 0) * VOL_UNIT,
      side: (t.side === "B" || t.side === "S" ? t.side : "") as TapeTrade["side"],
      change: n(t.change) ?? 0,
    }))
    .filter((t) => t.price > 0 && t.volume > 0)
    .sort((a, b) => (a.time !== b.time ? (a.time < b.time ? 1 : -1) : b.seq - a.seq));
  let buy = 0, sell = 0, other = 0;
  const lv = new Map<number, { price: number; buy: number; sell: number; other: number }>();
  for (const t of all) {
    const l = lv.get(t.price) ?? { price: t.price, buy: 0, sell: 0, other: 0 };
    if (t.side === "B") (buy += t.volume), (l.buy += t.volume);
    else if (t.side === "S") (sell += t.volume), (l.sell += t.volume);
    else (other += t.volume), (l.other += t.volume);
    lv.set(t.price, l);
  }
  const total = buy + sell + other;
  return {
    symbol: symbol.toUpperCase(),
    trades: all.slice(0, limit).map(({ seq: _s, ...t }) => t) as TapeTrade[],
    summary: { count: all.length, total, buy, sell, other, avg: all.length ? Math.round(total / all.length) : 0 },
    levels: [...lv.values()].sort((a, b) => b.price - a.price).map((l) => ({ ...l, total: l.buy + l.sell + l.other })),
  };
}

export const vpsProvider: StockProvider = {
  id: "vps",

  async getQuote(symbol: string): Promise<Quote> {
    const s = symbol.toUpperCase();
    if (INDEX_CODES[s]) {
      const q = (await fetchIndices([s]))[0];
      if (q) return q;
      return kbsMarketProvider.getQuote(symbol);
    }
    if (findIndexSeed(s)) return kbsMarketProvider.getQuote(symbol); // phái sinh, chỉ số khác
    // Cổ phiếu: giá khớp từ VPS, các trường VPS không có (sở hữu nước ngoài…) lấy từ KBS
    const [v, k] = await Promise.allSettled([fetchStocks([s]), kbsMarketProvider.getQuote(symbol)]);
    const vq = v.status === "fulfilled" ? v.value[0] : undefined;
    const kq = k.status === "fulfilled" ? k.value : undefined;
    if (vq && kq) {
      const { foreignRoom, ...live } = vq;
      return { ...kq, ...live, name: kq.name, exchange: kq.exchange || vq.exchange, foreignRoom: kq.foreignRoom ?? foreignRoom };
    }
    if (vq) return vq;
    if (kq) return kq;
    throw Object.assign(new Error(`Không có dữ liệu cho mã ${symbol}`), { status: 404 });
  },

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (!symbols.length) return [];
    const up = symbols.map((s) => s.toUpperCase());
    const idx = up.filter((s) => INDEX_CODES[s]);
    const stocks = up.filter((s) => !INDEX_CODES[s] && !findIndexSeed(s));
    const [a, b] = await Promise.all([fetchIndices(idx), fetchStocks(stocks)]);
    const got = new Set([...a, ...b].map((q) => q.symbol));
    const rest = up.filter((s) => !got.has(s));
    const c = rest.length ? await kbsMarketProvider.getQuotes(rest).catch(() => []) : [];
    const all = [...a, ...b, ...c];
    if (!all.length) throw Object.assign(new Error("VPS không trả về dữ liệu"), { status: 502 });
    return all;
  },

  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
    return kbsMarketProvider.getHistory(symbol, range);
  },

  async search(query: string): Promise<SearchResult[]> {
    return kbsMarketProvider.search(query);
  },

  async getMarketOverview(): Promise<Quote[]> {
    const fromEnv = process.env.WATCHLIST_SYMBOLS;
    const symbols = fromEnv ? fromEnv.split(",").map((s) => s.trim()).filter(Boolean) : STOCK_UNIVERSE.map((s) => s.symbol);
    return this.getQuotes(symbols);
  },
};

import { StockProvider, Quote, HistoryPoint, HistoryRange, SearchResult } from "./types.js";
import { STOCK_UNIVERSE, findSeed } from "./universe.js";
import { INDEX_UNIVERSE, findIndexSeed } from "./indices.js";

// KB Securities (KBS) — the *current* default market-data source of the
// vnstock library's unified `Market`/`Fundamental` classes (verified against
// vnstock's actual source on GitHub: vnstock/explorer/kbs/{quote,trading,
// const}.py — README's own API structure tree lists `Market.equity.ohlcv()`,
// `Market.equity.quote()` and `Fundamental.equity.ratios()` as all sourced
// from [KBS]). Financial ratios (src/lib kbs.ts equivalent — see
// kbsFinancials.ts in this repo) already used KBS; this brings quotes/OHLCV
// onto the same, currently-maintained source instead of the older
// Vietcap/VCI endpoints in vnstockProvider.ts.
const IIS_BASE = "https://kbbuddywts.kbsec.com.vn/iis-server/investment";

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
  "Content-Type": "application/json",
  Referer: "https://kbbuddywts.kbsec.com.vn/",
  Origin: "https://kbbuddywts.kbsec.com.vn",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, { ...init, headers: { ...HEADERS, ...(init?.headers ?? {}) } });
  const rawBody = await res.text();
  if (!res.ok) {
    console.error(`[kbs-market] HTTP ${res.status} for ${url}: ${rawBody.slice(0, 400)}`);
    throw Object.assign(
      new Error(`KBS trả lỗi ${res.status} cho ${url}. Nội dung: ${rawBody.slice(0, 300)}`),
      { status: 502 }
    );
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    console.error(`[kbs-market] non-JSON response for ${url}: ${rawBody.slice(0, 400)}`);
    throw Object.assign(new Error(`KBS trả về dữ liệu không phải JSON cho ${url}`), { status: 502 });
  }
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

const EXCHANGE_CODE_MAP: Record<string, string> = {
  HOSE: "HOSE",
  HSX: "HOSE",
  HNX: "HNX",
  XHNF: "HNX",
  UPCOM: "UPCOM",
};

function isIndexOrFutures(symbol: string): { exchange: string; currency: string } | null {
  const idx = findIndexSeed(symbol);
  if (!idx) return null;
  return { exchange: idx.kind === "futures" ? "Phái sinh" : "Chỉ số", currency: "điểm" };
}

// ---------------------------------------------------------------------------
// Price board — POST /stock/iss with {"code": "ACB,VCB,..."} (comma-joined,
// not an array). Field codes verified against KBS explorer's _PRICE_BOARD_MAP.
// ---------------------------------------------------------------------------
async function fetchPriceBoard(symbols: string[]): Promise<any[]> {
  const code = symbols.map((s) => s.toUpperCase()).join(",");
  const data = await fetchJson(`${IIS_BASE}/stock/iss`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : null;
  if (list === null) {
    const preview = JSON.stringify(data).slice(0, 500);
    console.error(`[kbs-market] /stock/iss unexpected shape: ${preview}`);
    throw Object.assign(new Error(`KBS trả về bảng giá không hợp lệ. Raw: ${preview}`), { status: 502 });
  }
  return list;
}

function foreignOwnershipPercent(item: any): number | undefined {
  const foreignShares = num(item?.FO);
  const listedShares = num(item?.LS);
  if (foreignShares == null || listedShares == null || listedShares <= 0) return undefined;
  return (foreignShares / listedShares) * 100;
}

function quoteFromBoardItem(item: any): Quote | null {
  const symbol = String(item?.SB ?? "").toUpperCase();
  const price = num(item?.CP);
  if (!symbol || price == null || price <= 0) return null;

  const prevClose = num(item?.RE) ?? price;
  const change = num(item?.CH) ?? price - prevClose;
  const changePercent = num(item?.CHP) ?? (prevClose ? (change / prevClose) * 100 : 0);
  const idxInfo = isIndexOrFutures(symbol);
  const seed = findSeed(symbol);

  return {
    symbol,
    name: seed?.name ?? findIndexSeed(symbol)?.name ?? symbol,
    exchange: seed?.exchange ?? idxInfo?.exchange ?? EXCHANGE_CODE_MAP[String(item?.EX ?? "")] ?? String(item?.EX ?? ""),
    currency: idxInfo?.currency ?? "VND",
    price,
    change,
    changePercent,
    open: num(item?.OP) ?? prevClose,
    high: num(item?.HI) ?? price,
    low: num(item?.LO) ?? price,
    prevClose,
    volume: num(item?.TT) ?? 0,
    updatedAt: new Date().toISOString(),
    // Foreign-investor fields only apply to stocks (KBS's index/futures rows
    // don't carry them) — verified against KBS explorer's _PRICE_BOARD_MAP:
    // FB=foreign_buy_volume, FS=foreign_sell_volume, FR=foreign_room (shares
    // remaining before the ownership cap). FO is labeled "foreign_ownership_
    // ratio" in that mapping, but the value KBS actually returns is a raw
    // share count (foreign-held shares), not a ratio — confirmed live: ACB
    // came back with FO ≈ 1.74 billion, matching its real foreign-held share
    // count, not a percentage. LS (listed_shares, i.e. total shares
    // outstanding) is on the same price-board row, so divide it out here.
    foreignBuyVolume: idxInfo ? undefined : num(item?.FB),
    foreignSellVolume: idxInfo ? undefined : num(item?.FS),
    foreignOwnershipPercent: idxInfo ? undefined : foreignOwnershipPercent(item),
    foreignRoom: idxInfo ? undefined : num(item?.FR),
  };
}

// ---------------------------------------------------------------------------
// OHLCV history — GET /stocks/{symbol}/data_{suffix} or /index/{symbol}/data_{suffix},
// params sdate/edate in DD-MM-YYYY. Stock/ETF prices come back x1000 (KBS
// convention, same as the finance-info endpoint) and need dividing down;
// index/derivative values are already the full point value.
//
// KBS's own suffix scheme (verified against vnstock's KBS explorer source,
// explorer/kbs/const.py _INTERVAL_MAP) isn't just "day" — <n>P gives real
// intraday bars (1P/5P/15P/30P = minutes, 60P = hourly). "1D" used to
// silently fall back to 3 days of *daily* bars here, which isn't intraday
// at all; it now pulls genuine 15-minute bars for the current session,
// matching the resolution vndirectProvider.ts already uses for the same
// range so switching provider doesn't change chart granularity.
// ---------------------------------------------------------------------------
const RANGE_TO_DAYS: Record<HistoryRange, number> = {
  "1D": 3,
  "1W": 10,
  "1M": 35,
  "3M": 100,
  "6M": 190,
  "1Y": 380,
  "5Y": 5 * 365,
  MAX: 30 * 365,
};

// KBS interval suffix per range — only "1D" gets true intraday granularity;
// everything else stays on daily bars (unchanged, already works well).
const RANGE_TO_SUFFIX: Record<HistoryRange, string> = {
  "1D": "15P",
  "1W": "day",
  "1M": "day",
  "3M": "day",
  "6M": "day",
  "1Y": "day",
  "5Y": "day",
  MAX: "day",
};

function toKbsDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

async function fetchHistoryBars(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
  const isIndex = findIndexSeed(symbol)?.kind === "index";
  const upperSymbol = symbol.toUpperCase();
  const pathSegment = isIndex ? "index" : "stocks";

  const days = RANGE_TO_DAYS[range];
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const suffix = RANGE_TO_SUFFIX[range];
  const dataKey = `data_${suffix}`;

  const url = new URL(`${IIS_BASE}/${pathSegment}/${encodeURIComponent(upperSymbol)}/${dataKey}`);
  url.searchParams.set("sdate", toKbsDate(start));
  url.searchParams.set("edate", toKbsDate(end));

  const data = await fetchJson(url.toString());
  const bars: any[] = data?.[dataKey];
  if (!Array.isArray(bars) || bars.length === 0) {
    const preview = JSON.stringify(data).slice(0, 400);
    console.error(`[kbs-market] no ${dataKey} bars for ${upperSymbol}: ${preview}`);
    return [];
  }

  const scaleDown = !isIndex; // stocks/ETFs are quoted x1000 by KBS; indices aren't.
  const scale = (raw: number | undefined, fallback: number) => {
    const v = raw ?? fallback;
    return scaleDown ? v / 1000 : v;
  };
  const points: HistoryPoint[] = [];
  let skipped = 0;
  for (const bar of bars) {
    const rawClose = num(bar.c);
    if (rawClose == null || rawClose <= 0) {
      skipped++;
      continue;
    }
    const open = scale(num(bar.o), rawClose);
    const high = scale(num(bar.h), rawClose);
    const low = scale(num(bar.l), rawClose);
    const close = scale(rawClose, rawClose);
    // KBS's "today" row on data_day is live/in-flux until end-of-day
    // settlement finalizes — right around and after market close it can
    // briefly come back with a degenerate bar (0/negative OHLC, or high <
    // low). That single bad point wrecks the whole chart's autoscale, so
    // reject it here rather than let a broken candle through.
    if (open <= 0 || high <= 0 || low <= 0 || high < low) {
      skipped++;
      continue;
    }
    points.push({ time: new Date(bar.t).toISOString(), open, high, low, close, volume: num(bar.v) ?? 0 });
  }
  if (skipped > 0) {
    console.error(`[kbs-market] skipped ${skipped} invalid bar(s) for ${upperSymbol} (${dataKey})`);
  }
  points.sort((a, b) => a.time.localeCompare(b.time));
  return points;
}

export const kbsMarketProvider: StockProvider = {
  id: "kbs",

  async getQuote(symbol: string): Promise<Quote> {
    const items = await fetchPriceBoard([symbol]);
    const quote = items.length > 0 ? quoteFromBoardItem(items[0]) : null;
    if (!quote) {
      const preview = items.length > 0 ? JSON.stringify(items[0]).slice(0, 400) : "(mảng rỗng)";
      throw Object.assign(new Error(`Không có dữ liệu cho mã: ${symbol}. Raw item từ KBS: ${preview}`), {
        status: 404,
      });
    }
    return quote;
  },

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];
    const items = await fetchPriceBoard(symbols);
    const quotes = items.map((item) => quoteFromBoardItem(item)).filter((q): q is Quote => q !== null);
    if (quotes.length === 0) {
      const preview = items.length > 0 ? JSON.stringify(items[0]).slice(0, 400) : "(mảng rỗng)";
      throw Object.assign(
        new Error(`KBS không trả về dữ liệu cho mã nào (nhận ${items.length} dòng). Raw item mẫu: ${preview}`),
        { status: 502 }
      );
    }
    return quotes;
  },

  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
    return fetchHistoryBars(symbol, range);
  },

  // Search stays local against the curated VN universe + index list.
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
    const fromEnv = process.env.WATCHLIST_SYMBOLS;
    const symbols = fromEnv
      ? fromEnv.split(",").map((s) => s.trim()).filter(Boolean)
      : STOCK_UNIVERSE.map((s) => s.symbol);
    return this.getQuotes(symbols);
  },

  // No native ranking endpoint wired up yet — topTradedOf() already falls
  // back to ranking getMarketOverview()'s quotes by trading value when a
  // provider has no getTopTraded, which is perfectly adequate here.
};
